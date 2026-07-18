"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  AdminApiError,
  createAdminBanner,
  deleteAdminBanner,
  fetchAdminBanner,
  fetchAdminBanners,
  fetchAdminMedia,
  updateAdminBanner,
} from "@/lib/api/admin-catalog";
import type {
  AdminBannerDto,
  AdminCreateBannerInput,
  AdminMediaDto,
} from "@/src/server/admin/dto";
import AdminEmptyState from "../../components/AdminEmptyState";
import AdminFilter from "../../components/AdminFilter";
import AdminForm, { AdminFormField } from "../../components/AdminForm";
import AdminPageHeader from "../../components/AdminPageHeader";
import AdminPagination from "../../components/AdminPagination";
import AdminSearch from "../../components/AdminSearch";
import AdminTable, { type AdminTableColumn } from "../../components/AdminTable";

const emptyForm = (): AdminCreateBannerInput => ({
  title: "",
  subtitle: "",
  imageMediaId: "",
  mobileImageMediaId: null,
  linkUrl: "",
  linkLabel: "",
  sortOrder: 0,
  isActive: true,
  startsAt: null,
  endsAt: null,
});

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function isImageMedia(media: AdminMediaDto): boolean {
  if (media.mimeType) return media.mimeType.toLowerCase().startsWith("image/");
  return /\.(avif|bmp|gif|jpe?g|png|svg|webp)(\?|$)/i.test(media.url);
}

function BannerLinkPreview({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  if (!href) {
    return <div className="admin-banner-preview__frame">{children}</div>;
  }
  const external = /^https?:\/\//i.test(href);
  if (external) {
    return (
      <a
        className="admin-banner-preview__frame"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    );
  }
  return (
    <Link className="admin-banner-preview__frame" href={href}>
      {children}
    </Link>
  );
}

export default function AdminBannersClient() {
  const [items, setItems] = useState<AdminBannerDto[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AdminCreateBannerInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [mediaLibrary, setMediaLibrary] = useState<AdminMediaDto[]>([]);
  const [startsAtLocal, setStartsAtLocal] = useState("");
  const [endsAtLocal, setEndsAtLocal] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadBanners = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAdminBanners({
        search: debouncedSearch || undefined,
        status: status === "all" ? undefined : status,
        page,
        pageSize: 10,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(
        err instanceof AdminApiError ? err.message : "Unable to load banners.",
      );
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status, page]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadBanners();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadBanners]);

  useEffect(() => {
    if (mode === "list") return;
    void (async () => {
      try {
        const result = await fetchAdminMedia({
          status: "active",
          page: 1,
          pageSize: 100,
        });
        setMediaLibrary(result.items.filter(isImageMedia));
      } catch {
        setMediaLibrary([]);
      }
    })();
  }, [mode]);

  const selectedDesktop = useMemo(
    () => mediaLibrary.find((m) => m.id === form.imageMediaId) ?? null,
    [mediaLibrary, form.imageMediaId],
  );
  const selectedMobile = useMemo(
    () =>
      mediaLibrary.find((m) => m.id === form.mobileImageMediaId) ??
      selectedDesktop,
    [mediaLibrary, form.mobileImageMediaId, selectedDesktop],
  );

  const columns: AdminTableColumn<AdminBannerDto>[] = [
    {
      key: "preview",
      header: "Preview",
      render: (row) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="admin-media-thumb"
          src={row.imageUrl}
          alt={row.imageAltText ?? row.title}
        />
      ),
    },
    { key: "title", header: "Title", render: (row) => row.title },
    { key: "sort", header: "Sort", render: (row) => row.sortOrder },
    {
      key: "schedule",
      header: "Schedule",
      render: (row) => {
        if (!row.startsAt && !row.endsAt) return "Always";
        const start = row.startsAt
          ? new Date(row.startsAt).toLocaleString("en-GB", {
              timeZone: "Asia/Bangkok",
            })
          : "—";
        const end = row.endsAt
          ? new Date(row.endsAt).toLocaleString("en-GB", {
              timeZone: "Asia/Bangkok",
            })
          : "—";
        return `${start} → ${end}`;
      },
    },
    {
      key: "active",
      header: "Active",
      render: (row) => (
        <span
          className={`admin-badge ${row.isActive ? "admin-badge--active" : "admin-badge--inactive"}`}
        >
          {row.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="admin-actions">
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={() => void openEdit(row.id)}
          >
            Edit
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={() => setConfirmDeleteId(row.id)}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  function openCreate() {
    setMode("create");
    setEditingId(null);
    setForm(emptyForm());
    setStartsAtLocal("");
    setEndsAtLocal("");
    setFormError(null);
    setSuccess(null);
  }

  async function openEdit(id: string) {
    setFormError(null);
    setSuccess(null);
    try {
      const banner = await fetchAdminBanner(id);
      setForm({
        title: banner.title,
        subtitle: banner.subtitle ?? "",
        imageMediaId: banner.imageMediaId,
        mobileImageMediaId: banner.mobileImageMediaId,
        linkUrl: banner.linkUrl ?? "",
        linkLabel: banner.linkLabel ?? "",
        sortOrder: banner.sortOrder,
        isActive: banner.isActive,
        startsAt: banner.startsAt,
        endsAt: banner.endsAt,
      });
      setStartsAtLocal(toDatetimeLocalValue(banner.startsAt));
      setEndsAtLocal(toDatetimeLocalValue(banner.endsAt));
      setEditingId(id);
      setMode("edit");
    } catch (err) {
      setError(
        err instanceof AdminApiError ? err.message : "Unable to load banner.",
      );
    }
  }

  async function saveForm() {
    setSaving(true);
    setFormError(null);
    setSuccess(null);
    try {
      if (!form.imageMediaId) {
        throw new AdminApiError("Desktop image is required.", {
          code: "VALIDATION_ERROR",
          status: 400,
        });
      }
      const payload: AdminCreateBannerInput = {
        ...form,
        subtitle: form.subtitle || null,
        mobileImageMediaId: form.mobileImageMediaId || null,
        linkUrl: form.linkUrl || null,
        linkLabel: form.linkLabel || null,
        startsAt: fromDatetimeLocalValue(startsAtLocal),
        endsAt: fromDatetimeLocalValue(endsAtLocal),
      };
      if (mode === "edit" && editingId) {
        await updateAdminBanner(editingId, payload);
        setSuccess("Banner updated.");
      } else {
        await createAdminBanner(payload);
        setSuccess("Banner created.");
      }
      setMode("list");
      setEditingId(null);
      await loadBanners();
    } catch (err) {
      setFormError(
        err instanceof AdminApiError ? err.message : "Unable to save banner.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!confirmDeleteId) return;
    setSaving(true);
    setError(null);
    try {
      await deleteAdminBanner(confirmDeleteId);
      setSuccess("Banner deleted. Media records were not removed.");
      setConfirmDeleteId(null);
      await loadBanners();
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? err.message
          : "Unable to delete banner.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (mode === "create" || mode === "edit") {
    return (
      <>
        <AdminPageHeader
          title={mode === "create" ? "Create banner" : "Edit banner"}
          description="Select desktop and optional mobile images from the Media Library."
        />
        {formError ? (
          <div className="admin-alert admin-alert--error" role="alert">
            {formError}
          </div>
        ) : null}

        <div className="admin-banner-preview-grid">
          <div className="admin-banner-preview">
            <p className="admin-banner-preview__label">Desktop preview</p>
            <BannerLinkPreview href={form.linkUrl ?? ""}>
              {selectedDesktop ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedDesktop.url}
                  alt={
                    selectedDesktop.altText ?? (form.title || "Desktop banner")
                  }
                />
              ) : (
                <span className="admin-banner-preview__empty">
                  Select a desktop image
                </span>
              )}
            </BannerLinkPreview>
          </div>
          <div className="admin-banner-preview admin-banner-preview--mobile">
            <p className="admin-banner-preview__label">Mobile preview</p>
            <BannerLinkPreview href={form.linkUrl ?? ""}>
              {selectedMobile ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedMobile.url}
                  alt={
                    selectedMobile.altText ?? (form.title || "Mobile banner")
                  }
                />
              ) : (
                <span className="admin-banner-preview__empty">
                  Falls back to desktop image
                </span>
              )}
            </BannerLinkPreview>
          </div>
        </div>

        <AdminForm
          disabled={saving}
          submitLabel={saving ? "Saving…" : "Save"}
          secondaryLabel="Cancel"
          onSecondary={() => {
            setMode("list");
            setEditingId(null);
          }}
          onSubmit={(event) => {
            event.preventDefault();
            void saveForm();
          }}
        >
          <AdminFormField label="Title" htmlFor="banner-title">
            <input
              id="banner-title"
              className="admin-form__input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </AdminFormField>
          <AdminFormField label="Subtitle" htmlFor="banner-subtitle">
            <input
              id="banner-subtitle"
              className="admin-form__input"
              value={form.subtitle ?? ""}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
            />
          </AdminFormField>
          <AdminFormField label="Link label" htmlFor="banner-link-label">
            <input
              id="banner-link-label"
              className="admin-form__input"
              value={form.linkLabel ?? ""}
              onChange={(e) => setForm({ ...form, linkLabel: e.target.value })}
            />
          </AdminFormField>
          <AdminFormField label="Link URL" htmlFor="banner-link-url">
            <input
              id="banner-link-url"
              className="admin-form__input"
              value={form.linkUrl ?? ""}
              onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
              placeholder="/menu or https://…"
            />
          </AdminFormField>
          <AdminFormField label="Sort order" htmlFor="banner-sort">
            <input
              id="banner-sort"
              className="admin-form__input"
              type="number"
              step={1}
              value={form.sortOrder}
              onChange={(e) =>
                setForm({
                  ...form,
                  sortOrder: Number.parseInt(e.target.value, 10) || 0,
                })
              }
              required
            />
          </AdminFormField>
          <AdminFormField label="Starts at" htmlFor="banner-starts">
            <input
              id="banner-starts"
              className="admin-form__input"
              type="datetime-local"
              value={startsAtLocal}
              onChange={(e) => setStartsAtLocal(e.target.value)}
            />
          </AdminFormField>
          <AdminFormField label="Ends at" htmlFor="banner-ends">
            <input
              id="banner-ends"
              className="admin-form__input"
              type="datetime-local"
              value={endsAtLocal}
              onChange={(e) => setEndsAtLocal(e.target.value)}
            />
          </AdminFormField>
          <AdminFormField label="Active" htmlFor="banner-active">
            <label className="admin-form__checkbox">
              <input
                id="banner-active"
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm({ ...form, isActive: e.target.checked })
                }
              />
              Banner is active
            </label>
          </AdminFormField>

          <AdminFormField label="Desktop image (required)" htmlFor="banner-desktop">
            <div className="admin-media-picker" id="banner-desktop">
              {mediaLibrary.length === 0 ? (
                <p className="admin-page-header__description">
                  No active image media found. Upload images in Media first.
                </p>
              ) : (
                mediaLibrary.map((media) => {
                  const selected = form.imageMediaId === media.id;
                  return (
                    <button
                      key={media.id}
                      type="button"
                      className={`admin-media-picker__item${selected ? " admin-media-picker__item--selected" : ""}`}
                      onClick={() =>
                        setForm({ ...form, imageMediaId: media.id })
                      }
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={media.url}
                        alt={media.altText ?? media.title ?? "Media"}
                      />
                      <span className="admin-media-picker__label">
                        {media.title || media.url}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </AdminFormField>

          <AdminFormField label="Mobile image (optional)" htmlFor="banner-mobile">
            <div className="admin-media-picker" id="banner-mobile">
              <button
                type="button"
                className={`admin-media-picker__item${!form.mobileImageMediaId ? " admin-media-picker__item--selected" : ""}`}
                onClick={() =>
                  setForm({ ...form, mobileImageMediaId: null })
                }
              >
                <span className="admin-media-picker__label">
                  Use desktop image
                </span>
              </button>
              {mediaLibrary.map((media) => {
                const selected = form.mobileImageMediaId === media.id;
                return (
                  <button
                    key={`mobile-${media.id}`}
                    type="button"
                    className={`admin-media-picker__item${selected ? " admin-media-picker__item--selected" : ""}`}
                    onClick={() =>
                      setForm({ ...form, mobileImageMediaId: media.id })
                    }
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={media.url}
                      alt={media.altText ?? media.title ?? "Media"}
                    />
                    <span className="admin-media-picker__label">
                      {media.title || media.url}
                    </span>
                  </button>
                );
              })}
            </div>
          </AdminFormField>
        </AdminForm>
      </>
    );
  }

  return (
    <>
      <AdminPageHeader
        title="Banners"
        description="Manage homepage hero banners, scheduling, and media."
      />

      {success ? (
        <div className="admin-alert admin-alert--success" role="status">
          {success}
        </div>
      ) : null}
      {error ? (
        <div className="admin-alert admin-alert--error" role="alert">
          {error}{" "}
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={() => void loadBanners()}
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="admin-toolbar">
        <AdminSearch
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search banners…"
        />
        <AdminFilter
          label="Status"
          value={status}
          options={[
            { value: "all", label: "All statuses" },
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ]}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        />
        <button
          type="button"
          className="admin-btn admin-btn--primary"
          onClick={openCreate}
        >
          Add
        </button>
      </div>

      {loading ? (
        <AdminEmptyState title="Loading" text="Loading banners…" />
      ) : (
        <>
          <AdminTable
            columns={columns}
            rows={items}
            emptyMessage="No banners found."
            getRowKey={(row) => row.id}
          />
          <AdminPagination
            page={page}
            pageSize={10}
            total={total}
            onPageChange={setPage}
          />
        </>
      )}

      {confirmDeleteId ? (
        <div className="admin-confirm" role="alertdialog">
          <p>
            Delete this banner? Linked Media files will not be deleted.
          </p>
          <div className="admin-actions">
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              disabled={saving}
              onClick={() => void confirmDelete()}
            >
              Confirm
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={() => setConfirmDeleteId(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
