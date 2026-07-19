"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  AdminApiError,
  completeAdminPickup,
  verifyAdminPickup,
} from "@/lib/api/admin-pickup";
import { fetchAdminOrders } from "@/lib/api/admin-orders";
import type { AdminPickupVerifyResultDto } from "@/src/server/admin/dto";
import AdminPageHeader from "../../components/AdminPageHeader";

type ScanState = "idle" | "starting" | "scanning" | "denied" | "unsupported";

function statusLabel(status: string): string {
  if (status === "ready_for_pickup") return "Ready for pickup";
  return status.replaceAll("_", " ");
}

function badgeClass(kind: "order" | "payment" | "verification", value: string): string {
  if (kind === "payment") {
    if (value === "mock_accepted") return "admin-badge admin-badge--active";
    if (value === "failed") return "admin-badge admin-badge--inactive";
    return "admin-badge";
  }
  if (kind === "verification") {
    if (value === "active") return "admin-badge admin-badge--ready";
    if (value === "verified") return "admin-badge admin-badge--active";
    return "admin-badge admin-badge--inactive";
  }
  if (value === "ready_for_pickup") return "admin-badge admin-badge--ready";
  if (value === "completed") return "admin-badge admin-badge--active";
  if (value === "cancelled") return "admin-badge admin-badge--inactive";
  if (value === "preparing") return "admin-badge admin-badge--preparing";
  return "admin-badge";
}

export default function AdminPickupClient() {
  const [manualCode, setManualCode] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [orderHint, setOrderHint] = useState<string | null>(null);
  const [result, setResult] = useState<AdminPickupVerifyResultDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completeNote, setCompleteNote] = useState("");
  const [completeMessage, setCompleteMessage] = useState<string | null>(null);
  const [scanState, setScanState] = useState<ScanState>("idle");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);

  const stopScanner = useCallback(() => {
    if (scanTimerRef.current != null) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanState("idle");
  }, []);

  useEffect(() => () => stopScanner(), [stopScanner]);

  async function runVerify(input: { token: string } | { pickupCode: string }) {
    setBusy(true);
    setError(null);
    setCompleteMessage(null);
    try {
      const data = await verifyAdminPickup(input);
      setResult(data);
      setManualCode("");
      stopScanner();
    } catch (err) {
      setResult(null);
      setError(
        err instanceof AdminApiError
          ? err.message
          : "Pickup verification failed. Check the code and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onManualSubmit(event: FormEvent) {
    event.preventDefault();
    const code = manualCode.trim();
    if (!code) {
      setError("Enter a pickup code.");
      return;
    }
    await runVerify({ pickupCode: code });
  }

  async function onOrderNumberSearch(event: FormEvent) {
    event.preventDefault();
    const q = orderNumber.trim();
    if (!q) {
      setOrderHint(null);
      setError("Enter an order number.");
      return;
    }
    setBusy(true);
    setError(null);
    setOrderHint(null);
    try {
      const page = await fetchAdminOrders({
        search: q,
        page: 1,
        pageSize: 5,
      });
      const match = page.items.find(
        (item) => item.orderNumber.toLowerCase() === q.toLowerCase(),
      );
      if (!match) {
        setOrderHint(null);
        setError("Pickup verification failed. Check the code and try again.");
        return;
      }
      setOrderHint(
        `Found ${match.orderNumber} (${statusLabel(match.orderStatus)}). Enter the customer pickup code to verify.`,
      );
      setResult(null);
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? err.message
          : "Pickup verification failed. Check the code and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onCompleteHandoff() {
    if (!result) return;
    setCompleting(true);
    setError(null);
    setCompleteMessage(null);
    try {
      const completed = await completeAdminPickup(result.orderId, {
        expectedStatus: "ready_for_pickup",
        verificationId: result.verificationId,
        note: completeNote.trim() || null,
      });
      setCompleteMessage(
        completed.alreadyCompleted
          ? `Order ${completed.orderNumber} was already completed.`
          : `Order ${completed.orderNumber} marked completed.`,
      );
      setResult({
        ...result,
        orderStatus: "completed",
        verificationStatus: "verified",
        allowedAction: "none",
      });
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? err.message
          : "Unable to complete pickup handoff.",
      );
    } finally {
      setCompleting(false);
    }
  }

  async function startScanner() {
    setError(null);
    setScanState("starting");

    const BarcodeDetectorCtor = (
      window as unknown as {
        BarcodeDetector?: new (options: {
          formats: string[];
        }) => {
          detect: (
            source: ImageBitmapSource,
          ) => Promise<Array<{ rawValue: string }>>;
        };
      }
    ).BarcodeDetector;

    if (!BarcodeDetectorCtor) {
      setScanState("unsupported");
      setError(
        "Camera QR scanning is not supported in this browser. Use manual pickup code entry.",
      );
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setScanState("unsupported");
      setError(
        "Camera access is unavailable. Use manual pickup code entry.",
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanState("scanning");

      const detector = new BarcodeDetectorCtor({ formats: ["qr_code"] });
      scanTimerRef.current = window.setInterval(() => {
        const video = videoRef.current;
        if (!video || video.readyState < 2) return;
        void detector
          .detect(video)
          .then((codes) => {
            const value = codes[0]?.rawValue?.trim();
            if (value) {
              void runVerify({ token: value });
            }
          })
          .catch(() => {
            /* ignore frame errors while scanning */
          });
      }, 500);
    } catch {
      stopScanner();
      setScanState("denied");
      setError(
        "Camera permission denied. Use manual pickup code entry instead.",
      );
    }
  }

  return (
    <div className="admin-pickup">
      <AdminPageHeader
        title="Pickup check-in"
        description="Scan a customer QR code or enter the pickup code to verify and complete handoff."
      />

      <div className="admin-pickup__grid">
        <section className="admin-pickup__panel">
          <h2 className="admin-pickup__panel-title">Scan QR</h2>
          <p className="admin-pickup__help">
            Camera permission is requested only when you start scanning.
          </p>

          <div className="admin-pickup__scanner">
            {scanState === "scanning" || scanState === "starting" ? (
              <video
                ref={videoRef}
                className="admin-pickup__video"
                muted
                playsInline
              />
            ) : (
              <div className="admin-pickup__scanner-placeholder">
                Camera preview
              </div>
            )}
          </div>

          <div className="admin-pickup__actions">
            {scanState === "scanning" || scanState === "starting" ? (
              <button
                type="button"
                className="admin-btn admin-btn--secondary admin-pickup__btn"
                onClick={stopScanner}
              >
                Stop scanner
              </button>
            ) : (
              <button
                type="button"
                className="admin-btn admin-btn--primary admin-pickup__btn"
                onClick={() => void startScanner()}
                disabled={busy}
              >
                Start camera scan
              </button>
            )}
          </div>

          {(scanState === "denied" || scanState === "unsupported") && (
            <p className="admin-pickup__fallback">
              Manual pickup code entry is available below.
            </p>
          )}
        </section>

        <section className="admin-pickup__panel">
          <h2 className="admin-pickup__panel-title">Manual entry</h2>

          <form className="admin-pickup__form" onSubmit={onManualSubmit}>
            <label className="admin-field" htmlFor="pickup-code">
              <span className="admin-field__label">Pickup code</span>
              <input
                id="pickup-code"
                className="admin-input admin-pickup__input"
                value={manualCode}
                onChange={(event) => setManualCode(event.target.value)}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="Enter pickup code"
                disabled={busy}
              />
            </label>
            <button
              type="submit"
              className="admin-btn admin-btn--primary admin-pickup__btn"
              disabled={busy}
            >
              {busy ? "Verifying…" : "Verify code"}
            </button>
          </form>

          <form className="admin-pickup__form" onSubmit={onOrderNumberSearch}>
            <label className="admin-field" htmlFor="order-number">
              <span className="admin-field__label">
                Order number (fallback)
              </span>
              <input
                id="order-number"
                className="admin-input admin-pickup__input"
                value={orderNumber}
                onChange={(event) => setOrderNumber(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder="Look up order number"
                disabled={busy}
              />
            </label>
            <button
              type="submit"
              className="admin-btn admin-btn--secondary admin-pickup__btn"
              disabled={busy}
            >
              Find order
            </button>
          </form>
          {orderHint ? (
            <p className="admin-pickup__hint">{orderHint}</p>
          ) : null}
        </section>
      </div>

      {error ? (
        <div className="admin-pickup__error" role="alert">
          {error}
        </div>
      ) : null}

      {completeMessage ? (
        <div className="admin-pickup__success" role="status">
          {completeMessage}
        </div>
      ) : null}

      {result ? (
        <section className="admin-pickup__result">
          <h2 className="admin-pickup__panel-title">Verification result</h2>
          <dl className="admin-pickup__meta">
            <div>
              <dt>Customer</dt>
              <dd>{result.customerDisplayName}</dd>
            </div>
            <div>
              <dt>Order number</dt>
              <dd>{result.orderNumber}</dd>
            </div>
            <div>
              <dt>Boutique</dt>
              <dd>
                {result.boutique.name} ({result.boutique.code})
              </dd>
            </div>
            <div>
              <dt>Pickup</dt>
              <dd>
                {result.pickupDate} · {result.pickupTime}
              </dd>
            </div>
            <div>
              <dt>Items</dt>
              <dd>{result.itemCount}</dd>
            </div>
          </dl>

          <div className="admin-pickup__badges">
            <span className={badgeClass("order", result.orderStatus)}>
              {statusLabel(result.orderStatus)}
            </span>
            <span className={badgeClass("payment", result.paymentStatus)}>
              {statusLabel(result.paymentStatus)}
            </span>
            <span
              className={badgeClass("verification", result.verificationStatus)}
            >
              {statusLabel(result.verificationStatus)}
            </span>
          </div>

          {result.allowedAction === "complete_pickup" ? (
            <div className="admin-pickup__complete">
              <label className="admin-field" htmlFor="complete-note">
                <span className="admin-field__label">Note (optional)</span>
                <input
                  id="complete-note"
                  className="admin-input"
                  value={completeNote}
                  onChange={(event) => setCompleteNote(event.target.value)}
                  disabled={completing}
                />
              </label>
              <button
                type="button"
                className="admin-btn admin-btn--primary admin-pickup__btn"
                onClick={() => void onCompleteHandoff()}
                disabled={completing}
              >
                {completing ? "Completing…" : "Confirm handoff"}
              </button>
            </div>
          ) : null}

          {result.allowedAction === "wait_until_ready" ? (
            <p className="admin-pickup__hint">
              Credentials match, but this order is not ready for pickup yet.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
