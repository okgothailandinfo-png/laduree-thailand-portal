"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AdminApiError,
  createAdminMedia,
  deleteAdminMedia,
  fetchAdminMedia,
} from "@/lib/api/admin-catalog";
import type {
  AdminCreateMediaInput,
  AdminMediaDto,
} from "@/src/server/admin/dto";
import AdminEmptyState from "../../components/AdminEmptyState";
import AdminFilter from "../../components/AdminFilter";
import AdminForm, { AdminFormField } from "../../components/AdminForm";
import AdminPageHeader from "../../components/AdminPageHeader";
import AdminPagination from "../../components/AdminPagination";
import AdminSearch from "../../components/AdminSearch";
import AdminTable, { type AdminTableColumn } from "../../components/AdminTable";

const emptyForm = (): AdminCreateMediaInput => ({
  url: "",
  altText: "",
  title: "",
  isActive: true,
});

export default function AdminMediaClient() {
  const [items, setItems] = useState<AdminMediaDto[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [mode, setMode] = useState<"list" | "create">("list");
  const [form, setForm] = useState<AdminCreateMediaInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadMedia = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAdminMedia({
        search: debouncedSearch || undefined,
        status: status === "all" ? undefined : status,
        page,
        pageSize: 12,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(
        err instanceof AdminApiError ? err.message : "Unable to load media.",
      );
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status, page]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadMedia();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadMedia]);

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setSuccess("URL copied.");
    } catch {
      setError("Unable to copy URL.");
    }
  }

  async function saveForm() {
    setSaving(true);
    setFormError(null);
    setSuccess(null);
    try {
      await createAdminMedia(form);
      setSuccess("Media created.");
      setMode("list");
      setForm(emptyForm());
      await loadMedia();
    } catch (err) {
      setFormError(
        err instanceof AdminApiError ? err.message : "Unable to save media.",
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
      await deleteAdminMedia(confirmDeleteId);
      setSuccess("Media deleted.");
      setConfirmDeleteId(null);
      await loadMedia();
    } catch (err) {
      setError(
        err instanceof AdminApiError ? err.message : "Unable to delete media.",
      );
    } finally {
      setSaving(false);
    }
  }

  const columns: AdminTableColumn<AdminMediaDto>[] = [
    {
      key: "preview",
      header: "Preview",
      render: (row) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={row.url}
          alt={row.altText ?? row.title ?? "Media preview"}
          className="admin-media-thumb"
        />
      ),
    },
    {
      key: "title",
      header: "Title",
      render: (row) => row.title || "—",
    },
    {
      key: "url",
      header: "URL",
      render: (row) => (
        <span className="admin-media-url" title={row.url}>
          {row.url}
        </span>
      ),
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
            onClick={() => void copyUrl(row.url)}
          >
            Copy URL
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

  if (mode === "create") {
    return (
      <>
        <AdminPageHeader
          title="Add media"
          description="URL-based media only. Binary upload is not available in this sprint."
        />
        {formError ? (
          <div className="admin-alert admin-alert--error" role="alert">
            {formError}
          </div>
        ) : null}
        <AdminForm
          disabled={saving}
          submitLabel={saving ? "Saving…" : "Save"}
          secondaryLabel="Cancel"
          onSecondary={() => setMode("list")}
          onSubmit={(event) => {
            event.preventDefault();
            void saveForm();
          }}
        >
          <AdminFormField label="Image URL" htmlFor="media-url">
            <input
              id="media-url"
              className="admin-form__input"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://… or /path.svg"
              required
            />
          </AdminFormField>
          <AdminFormField label="Title" htmlFor="media-title">
            <input
              id="media-title"
              className="admin-form__input"
              value={form.title ?? ""}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </AdminFormField>
          <AdminFormField label="Alt text" htmlFor="media-alt">
            <input
              id="media-alt"
              className="admin-form__input"
              value={form.altText ?? ""}
              onChange={(e) => setForm({ ...form, altText: e.target.value })}
            />
          </AdminFormField>
          <AdminFormField label="Active" htmlFor="media-active">
            <select
              id="media-active"
              className="admin-form__select"
              value={form.isActive ? "true" : "false"}
              onChange={(e) =>
                setForm({ ...form, isActive: e.target.value === "true" })
              }
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </AdminFormField>
        </AdminForm>
      </>
    );
  }

  return (
    <>
      <AdminPageHeader
        title="Media"
        description="Manage URL-based media assets for products."
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
            onClick={() => void loadMedia()}
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
          placeholder="Search media…"
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
          onClick={() => {
            setForm(emptyForm());
            setFormError(null);
            setMode("create");
          }}
        >
          Add
        </button>
      </div>

      {loading ? (
        <AdminEmptyState title="Loading" text="Loading media…" />
      ) : (
        <>
          <AdminTable
            columns={columns}
            rows={items}
            emptyMessage="No media found."
            getRowKey={(row) => row.id}
          />
          <AdminPagination
            page={page}
            pageSize={12}
            total={total}
            onPageChange={setPage}
          />
        </>
      )}

      {confirmDeleteId ? (
        <div className="admin-confirm" role="alertdialog">
          <p>
            Delete this media asset? Media linked to products cannot be deleted.
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
