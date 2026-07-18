"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AdminApiError,
  createAdminHomepageContent,
  createAdminHomepageSection,
  deleteAdminHomepageContent,
  deleteAdminHomepageSection,
  fetchAdminHomepageContent,
  fetchAdminHomepageSections,
  updateAdminHomepageContent,
  updateAdminHomepageSection,
} from "@/lib/api/admin-catalog";
import type {
  AdminCreateHomepageContentInput,
  AdminCreateHomepageSectionInput,
  AdminHomepageContentDto,
  AdminHomepageSectionDto,
  HomepageContentTypeDto,
} from "@/src/server/admin/dto";
import AdminEmptyState from "../../components/AdminEmptyState";
import AdminForm, { AdminFormField } from "../../components/AdminForm";
import AdminPageHeader from "../../components/AdminPageHeader";
import AdminTable, { type AdminTableColumn } from "../../components/AdminTable";

const CONTENT_TYPES: { value: HomepageContentTypeDto; label: string }[] = [
  { value: "plain_text", label: "Plain text" },
  { value: "multiline_text", label: "Multiline text" },
  { value: "url", label: "URL" },
  { value: "boolean", label: "Boolean" },
];

const emptySection = (): AdminCreateHomepageSectionInput => ({
  key: "",
  title: "",
  subtitle: "",
  description: "",
  sortOrder: 0,
  isActive: true,
});

const emptyContent = (): AdminCreateHomepageContentInput => ({
  key: "",
  value: "",
  contentType: "plain_text",
  isActive: true,
});

type Mode =
  | { kind: "list" }
  | { kind: "section-create" }
  | { kind: "section-edit"; id: string }
  | { kind: "content-create" }
  | { kind: "content-edit"; id: string };

export default function AdminHomepageClient() {
  const [sections, setSections] = useState<AdminHomepageSectionDto[]>([]);
  const [content, setContent] = useState<AdminHomepageContentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: "list" });
  const [sectionForm, setSectionForm] =
    useState<AdminCreateHomepageSectionInput>(emptySection);
  const [contentForm, setContentForm] =
    useState<AdminCreateHomepageContentInput>(emptyContent);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<
    | { kind: "section"; id: string }
    | { kind: "content"; id: string }
    | null
  >(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sectionRows, contentRows] = await Promise.all([
        fetchAdminHomepageSections(),
        fetchAdminHomepageContent(),
      ]);
      setSections(sectionRows);
      setContent(contentRows);
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? err.message
          : "Unable to load homepage CMS data.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAll();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAll]);

  async function moveSection(id: string, direction: -1 | 1) {
    const ordered = [...sections].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = ordered.findIndex((row) => row.id === id);
    const swapWith = index + direction;
    if (index < 0 || swapWith < 0 || swapWith >= ordered.length) return;
    const current = ordered[index];
    const other = ordered[swapWith];
    setSaving(true);
    setError(null);
    try {
      await Promise.all([
        updateAdminHomepageSection(current.id, {
          sortOrder: other.sortOrder,
        }),
        updateAdminHomepageSection(other.id, {
          sortOrder: current.sortOrder,
        }),
      ]);
      setSuccess("Section order updated.");
      await loadAll();
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? err.message
          : "Unable to reorder sections.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveSection() {
    setSaving(true);
    setFormError(null);
    setSuccess(null);
    try {
      const payload: AdminCreateHomepageSectionInput = {
        ...sectionForm,
        title: sectionForm.title || null,
        subtitle: sectionForm.subtitle || null,
        description: sectionForm.description || null,
      };
      if (mode.kind === "section-edit") {
        await updateAdminHomepageSection(mode.id, payload);
        setSuccess("Section updated.");
      } else {
        await createAdminHomepageSection(payload);
        setSuccess("Section created.");
      }
      setMode({ kind: "list" });
      await loadAll();
    } catch (err) {
      setFormError(
        err instanceof AdminApiError ? err.message : "Unable to save section.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveContent() {
    setSaving(true);
    setFormError(null);
    setSuccess(null);
    try {
      if (mode.kind === "content-edit") {
        await updateAdminHomepageContent(mode.id, contentForm);
        setSuccess("Content updated.");
      } else {
        await createAdminHomepageContent(contentForm);
        setSuccess("Content created.");
      }
      setMode({ kind: "list" });
      await loadAll();
    } catch (err) {
      setFormError(
        err instanceof AdminApiError ? err.message : "Unable to save content.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeleteAction() {
    if (!confirmDelete) return;
    setSaving(true);
    setError(null);
    try {
      if (confirmDelete.kind === "section") {
        await deleteAdminHomepageSection(confirmDelete.id);
        setSuccess("Section deleted.");
      } else {
        await deleteAdminHomepageContent(confirmDelete.id);
        setSuccess("Content deleted.");
      }
      setConfirmDelete(null);
      await loadAll();
    } catch (err) {
      setError(
        err instanceof AdminApiError ? err.message : "Unable to delete.",
      );
    } finally {
      setSaving(false);
    }
  }

  const sectionColumns: AdminTableColumn<AdminHomepageSectionDto>[] = [
    { key: "key", header: "Key", render: (row) => row.key },
    { key: "title", header: "Title", render: (row) => row.title || "—" },
    { key: "sort", header: "Sort", render: (row) => row.sortOrder },
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
            disabled={saving}
            onClick={() => void moveSection(row.id, -1)}
          >
            Up
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            disabled={saving}
            onClick={() => void moveSection(row.id, 1)}
          >
            Down
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={() => {
              setSectionForm({
                key: row.key,
                title: row.title ?? "",
                subtitle: row.subtitle ?? "",
                description: row.description ?? "",
                sortOrder: row.sortOrder,
                isActive: row.isActive,
              });
              setFormError(null);
              setMode({ kind: "section-edit", id: row.id });
            }}
          >
            Edit
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={() => setConfirmDelete({ kind: "section", id: row.id })}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  const contentColumns: AdminTableColumn<AdminHomepageContentDto>[] = [
    { key: "key", header: "Key", render: (row) => row.key },
    {
      key: "type",
      header: "Type",
      render: (row) => row.contentType,
    },
    {
      key: "value",
      header: "Value",
      render: (row) => (
        <span className="admin-cell-clamp">{row.value || "—"}</span>
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
            onClick={() => {
              setContentForm({
                key: row.key,
                value: row.value,
                contentType: row.contentType,
                isActive: row.isActive,
              });
              setFormError(null);
              setMode({ kind: "content-edit", id: row.id });
            }}
          >
            Edit
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={() => setConfirmDelete({ kind: "content", id: row.id })}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  if (mode.kind === "section-create" || mode.kind === "section-edit") {
    return (
      <>
        <AdminPageHeader
          title={
            mode.kind === "section-create" ? "Create section" : "Edit section"
          }
          description="Stable keys drive storefront section wiring. No HTML."
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
          onSecondary={() => setMode({ kind: "list" })}
          onSubmit={(event) => {
            event.preventDefault();
            void saveSection();
          }}
        >
          <AdminFormField label="Key" htmlFor="section-key">
            <input
              id="section-key"
              className="admin-form__input"
              value={sectionForm.key}
              onChange={(e) =>
                setSectionForm({ ...sectionForm, key: e.target.value })
              }
              required
              disabled={mode.kind === "section-edit"}
            />
          </AdminFormField>
          <AdminFormField label="Title" htmlFor="section-title">
            <input
              id="section-title"
              className="admin-form__input"
              value={sectionForm.title ?? ""}
              onChange={(e) =>
                setSectionForm({ ...sectionForm, title: e.target.value })
              }
            />
          </AdminFormField>
          <AdminFormField label="Subtitle" htmlFor="section-subtitle">
            <input
              id="section-subtitle"
              className="admin-form__input"
              value={sectionForm.subtitle ?? ""}
              onChange={(e) =>
                setSectionForm({ ...sectionForm, subtitle: e.target.value })
              }
            />
          </AdminFormField>
          <AdminFormField label="Description" htmlFor="section-description">
            <textarea
              id="section-description"
              className="admin-form__textarea"
              rows={4}
              value={sectionForm.description ?? ""}
              onChange={(e) =>
                setSectionForm({
                  ...sectionForm,
                  description: e.target.value,
                })
              }
            />
          </AdminFormField>
          <AdminFormField label="Sort order" htmlFor="section-sort">
            <input
              id="section-sort"
              className="admin-form__input"
              type="number"
              step={1}
              value={sectionForm.sortOrder}
              onChange={(e) =>
                setSectionForm({
                  ...sectionForm,
                  sortOrder: Number.parseInt(e.target.value, 10) || 0,
                })
              }
            />
          </AdminFormField>
          <AdminFormField label="Status" htmlFor="section-active">
            <select
              id="section-active"
              className="admin-form__input"
              value={sectionForm.isActive ? "true" : "false"}
              onChange={(e) =>
                setSectionForm({
                  ...sectionForm,
                  isActive: e.target.value === "true",
                })
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

  if (mode.kind === "content-create" || mode.kind === "content-edit") {
    return (
      <>
        <AdminPageHeader
          title={
            mode.kind === "content-create" ? "Create content" : "Edit content"
          }
          description="Edit by stable key. Plain text only — no HTML."
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
          onSecondary={() => setMode({ kind: "list" })}
          onSubmit={(event) => {
            event.preventDefault();
            void saveContent();
          }}
        >
          <AdminFormField label="Key" htmlFor="content-key">
            <input
              id="content-key"
              className="admin-form__input"
              value={contentForm.key}
              onChange={(e) =>
                setContentForm({ ...contentForm, key: e.target.value })
              }
              required
              disabled={mode.kind === "content-edit"}
            />
          </AdminFormField>
          <AdminFormField label="Content type" htmlFor="content-type">
            <select
              id="content-type"
              className="admin-form__input"
              value={contentForm.contentType}
              onChange={(e) =>
                setContentForm({
                  ...contentForm,
                  contentType: e.target.value as HomepageContentTypeDto,
                })
              }
            >
              {CONTENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </AdminFormField>
          <AdminFormField label="Value" htmlFor="content-value">
            {contentForm.contentType === "multiline_text" ? (
              <textarea
                id="content-value"
                className="admin-form__textarea"
                rows={6}
                value={contentForm.value}
                onChange={(e) =>
                  setContentForm({ ...contentForm, value: e.target.value })
                }
                required
              />
            ) : contentForm.contentType === "boolean" ? (
              <select
                id="content-value"
                className="admin-form__input"
                value={contentForm.value === "true" ? "true" : "false"}
                onChange={(e) =>
                  setContentForm({ ...contentForm, value: e.target.value })
                }
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            ) : (
              <input
                id="content-value"
                className="admin-form__input"
                value={contentForm.value}
                onChange={(e) =>
                  setContentForm({ ...contentForm, value: e.target.value })
                }
                required
              />
            )}
          </AdminFormField>
          <AdminFormField label="Status" htmlFor="content-active">
            <select
              id="content-active"
              className="admin-form__input"
              value={contentForm.isActive ? "true" : "false"}
              onChange={(e) =>
                setContentForm({
                  ...contentForm,
                  isActive: e.target.value === "true",
                })
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
        title="Homepage"
        description="Manage announcement text, introductory copy, and section titles."
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
            onClick={() => void loadAll()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {loading ? (
        <AdminEmptyState title="Loading" text="Loading homepage CMS…" />
      ) : (
        <>
          <div className="admin-toolbar">
            <h3 className="admin-subsection-title">Sections</h3>
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              onClick={() => {
                setSectionForm(emptySection());
                setFormError(null);
                setMode({ kind: "section-create" });
              }}
            >
              Add section
            </button>
          </div>
          <AdminTable
            columns={sectionColumns}
            rows={[...sections].sort((a, b) => a.sortOrder - b.sortOrder)}
            emptyMessage="No homepage sections yet."
            getRowKey={(row) => row.id}
          />

          <div className="admin-toolbar admin-toolbar--spaced">
            <h3 className="admin-subsection-title">Content</h3>
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              onClick={() => {
                setContentForm(emptyContent());
                setFormError(null);
                setMode({ kind: "content-create" });
              }}
            >
              Add content
            </button>
          </div>
          <AdminTable
            columns={contentColumns}
            rows={content}
            emptyMessage="No homepage content keys yet."
            getRowKey={(row) => row.id}
          />
        </>
      )}

      {confirmDelete ? (
        <div className="admin-confirm" role="alertdialog">
          <p>
            {confirmDelete.kind === "section"
              ? "Delete this homepage section? Products and categories are not affected."
              : "Delete this homepage content key?"}
          </p>
          <div className="admin-actions">
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              disabled={saving}
              onClick={() => void confirmDeleteAction()}
            >
              Confirm
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={() => setConfirmDelete(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
