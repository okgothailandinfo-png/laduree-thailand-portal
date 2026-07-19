"use client";

import { useEffect, useState } from "react";
import { fetchOrderPickupCredentials } from "@/lib/api/orders";
import type { OrderPickupCredentials } from "@/lib/api/types";
import CatalogStatus from "../catalog/CatalogStatus";

type Props = {
  orderId: string;
};

export default function PickupCredentialsCard({ orderId }: Props) {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [credentials, setCredentials] =
    useState<OrderPickupCredentials | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setStatus("loading");
      setErrorMessage(null);
      setQrDataUrl(null);

      try {
        const data = await fetchOrderPickupCredentials(orderId, {
          signal: controller.signal,
        });
        if (cancelled) return;

        const QRCode = (await import("qrcode")).default;
        const dataUrl = await QRCode.toDataURL(data.qrPayload, {
          errorCorrectionLevel: "M",
          margin: 2,
          width: 220,
          color: { dark: "#333333", light: "#ffffff" },
        });
        if (cancelled) return;

        setCredentials(data);
        setQrDataUrl(dataUrl);
        setStatus("success");
      } catch (error) {
        if (cancelled || controller.signal.aborted) return;
        setCredentials(null);
        setQrDataUrl(null);
        setStatus("error");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load pickup credentials.",
        );
      }
    }

    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [orderId, reloadKey]);

  return (
    <section
      className="order-confirmation-card order-confirmation-pickup-creds"
      aria-labelledby="confirmation-pickup-code"
    >
      <h2
        id="confirmation-pickup-code"
        className="order-confirmation-card__title"
      >
        Pickup check-in
      </h2>
      <p className="order-confirmation-meta">
        Present this QR code or pickup code at the boutique to collect your
        order.
      </p>

      {status === "loading" || status === "error" ? (
        <CatalogStatus
          status={status === "loading" ? "loading" : "error"}
          errorMessage={errorMessage}
          onRetry={
            status === "error"
              ? () => setReloadKey((value) => value + 1)
              : undefined
          }
        />
      ) : null}

      {status === "success" && credentials && qrDataUrl ? (
        <div className="order-confirmation-pickup-creds__body">
          <div className="order-confirmation-pickup-creds__qr">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt="Pickup verification QR code"
              width={220}
              height={220}
            />
          </div>
          <div className="order-confirmation-pickup-creds__code-block">
            <p className="order-confirmation-pickup-creds__label">
              Pickup code
            </p>
            <p
              className="order-confirmation-pickup-creds__code"
              aria-label="Pickup code"
            >
              {credentials.pickupCode}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
