"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AdminApiError,
  createAdminCategory,
  deleteAdminCategory,
  fetchAdminCategories,
  fetchAdminCategory,
  updateAdminCategory,
} from "@/lib/api/admin-catalog";
import type {
  AdminCategoryListItemDto,
  AdminCreateCategoryInput,
} from "@/src/server/admin/dto";
import AdminEmptyState from "../../components/AdminEmptyState";
import AdminFilter from "../../components/AdminFilter";
import AdminForm, { AdminFormField } from "../../components/AdminForm";
import AdminPageHeader from "../../components/AdminPageHeader";
import AdminPagination from "../../components/AdminPagination";
import AdminSearch from "../../components/AdminSearch";
import AdminTable, { type AdminTableColumn } from "../../components/AdminTable";

const emptyForm = (): AdminCreateCategoryInput => ({
  name: "",
  slug: "",
  description: "",
  sortOrder: 0,
  isActive: true,
});

export default function AdminCategoriesClient() {
  const [items, setItems] = useState<AdminCategoryListItemDto[]>([]);
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
  const [form, setForm] = useState<AdminCreateCategoryInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAdminCategories({
        search: debouncedSearch || undefined,
        status: status === "all" ? undefined : status,
        page,
        pageSize: 10,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? err.message
          : "Unable to load categories.",
      );
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status, page]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCategories();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadCategories]);

  const columns: AdminTableColumn<AdminCategoryListItemDto>[] = [
    { key: "name", header: "Name", render: (row) => row.name },
    { key: "slug", header: "Slug", render: (row) => row.slug },
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
    { key: "sort", header: "Sort", render: (row) => row.sortOrder },
    {
      key: "count",
      header: "Products",
      render: (row) => row.productCount,
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
    setFormError(null);
    setSuccess(null);
  }

  async function openEdit(id: string) {
    setFormError(null);
    setSuccess(null);
    try {
      const category = await fetchAdminCategory(id);
      setForm({
        name: category.name,
        slug: category.slug,
        description: category.description ?? "",
        sortOrder: category.sortOrder,
        isActive: category.isActive,
      });
      setEditingId(id);
      setMode("edit");
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? err.message
          : "Unable to load category.",
      );
    }
  }

  async function saveForm() {
    setSaving(true);
    setFormError(null);
    setSuccess(null);
    try {
      if (mode === "edit" && editingId) {
        await updateAdminCategory(editingId, form);
        setSuccess("Category updated.");
      } else {
        await createAdminCategory(form);
        setSuccess("Category created.");
      }
      setMode("list");
      setEditingId(null);
      await loadCategories();
    } catch (err) {
      setFormError(
        err instanceof AdminApiError
          ? err.message
          : "Unable to save category.",
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
      await deleteAdminCategory(confirmDeleteId);
      setSuccess("Category deleted.");
      setConfirmDeleteId(null);
      await loadCategories();
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? err.message
          : "Unable to delete category.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (mode === "create" || mode === "edit") {
    return (
      <>
        <AdminPageHeader
          title={mode === "create" ? "Create category" : "Edit category"}
          description="Categories with products cannot be deleted."
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
          onSecondary={() => {
            setMode("list");
            setEditingId(null);
          }}
          onSubmit={(event) => {
            event.preventDefault();
            void saveForm();
          }}
        >
          <AdminFormField label="Name" htmlFor="category-name">
            <input
              id="category-name"
              className="admin-form__input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </AdminFormField>
          <AdminFormField label="Slug" htmlFor="category-slug">
            <input
              id="category-slug"
              className="admin-form__input"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              required
            />
          </AdminFormField>
          <AdminFormField label="Description" htmlFor="category-description">
            <textarea
              id="category-description"
              className="admin-form__textarea"
              value={form.description ?? ""}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </AdminFormField>
          <AdminFormField label="Sort order" htmlFor="category-sort">
            <input
              id="category-sort"
              className="admin-form__input"
              type="number"
              step={1}
              value={form.sortOrder}
              onChange={(e) =>
                setForm({ ...form, sortOrder: Number(e.target.value) })
              }
            />
          </AdminFormField>
          <AdminFormField label="Active" htmlFor="category-active">
            <select
              id="category-active"
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
        title="Categories"
        description="Manage menu categories."
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
            onClick={() => void loadCategories()}
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
          placeholder="Search categories…"
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
        <AdminEmptyState title="Loading" text="Loading categories…" />
      ) : (
        <>
          <AdminTable
            columns={columns}
            rows={items}
            emptyMessage="No categories found."
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
            Delete this category? Categories that still contain products cannot
            be deleted.
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
