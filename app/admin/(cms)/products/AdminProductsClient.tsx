"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AdminApiError,
  createAdminProduct,
  deleteAdminProduct,
  fetchAdminCategories,
  fetchAdminMedia,
  fetchAdminProduct,
  fetchAdminProducts,
  updateAdminProduct,
} from "@/lib/api/admin-catalog";
import type {
  AdminCategoryListItemDto,
  AdminCreateProductInput,
  AdminMediaDto,
  AdminProductDetailDto,
  AdminProductImageInput,
  AdminProductListItemDto,
} from "@/src/server/admin/dto";
import AdminEmptyState from "../../components/AdminEmptyState";
import AdminFilter from "../../components/AdminFilter";
import AdminForm, { AdminFormField } from "../../components/AdminForm";
import AdminPageHeader from "../../components/AdminPageHeader";
import AdminPagination from "../../components/AdminPagination";
import AdminSearch from "../../components/AdminSearch";
import AdminTable, { type AdminTableColumn } from "../../components/AdminTable";

type ImageDraft = AdminProductImageInput & { url?: string };

const emptyForm = (): AdminCreateProductInput => ({
  name: "",
  slug: "",
  sku: "",
  description: [],
  priceThb: 0,
  currency: "THB",
  categoryId: "",
  isActive: true,
  available: true,
  sortOrder: 0,
  storageLabel: "",
  storageText: "",
  images: [],
});

function formatPrice(priceThb: number | null): string {
  if (priceThb === null) return "—";
  return `฿${priceThb.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export default function AdminProductsClient() {
  const [items, setItems] = useState<AdminProductListItemDto[]>([]);
  const [categories, setCategories] = useState<AdminCategoryListItemDto[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [categoryId, setCategoryId] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AdminCreateProductInput>(emptyForm);
  const [descriptionText, setDescriptionText] = useState("");
  const [mediaLibrary, setMediaLibrary] = useState<AdminMediaDto[]>([]);
  const [imageDrafts, setImageDrafts] = useState<ImageDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadCategories = useCallback(async () => {
    const result = await fetchAdminCategories({ page: 1, pageSize: 100 });
    setCategories(result.items);
  }, []);

  const loadMediaLibrary = useCallback(async () => {
    const result = await fetchAdminMedia({
      status: "active",
      page: 1,
      pageSize: 100,
    });
    setMediaLibrary(result.items);
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAdminProducts({
        search: debouncedSearch || undefined,
        categoryId: categoryId === "all" ? undefined : categoryId,
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
          : "Unable to load products.",
      );
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, categoryId, status, page]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCategories().catch((err) => {
        setError(
          err instanceof AdminApiError
            ? err.message
            : "Unable to load categories.",
        );
      });
      void loadMediaLibrary().catch(() => {
        // Media library requires prisma; product list can still load.
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadCategories, loadMediaLibrary]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProducts();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadProducts]);

  const categoryOptions = useMemo(
    () => [
      { value: "all", label: "All categories" },
      ...categories.map((category) => ({
        value: category.id,
        label: category.name,
      })),
    ],
    [categories],
  );

  const columns: AdminTableColumn<AdminProductListItemDto>[] = [
    { key: "name", header: "Name", render: (row) => row.name },
    { key: "sku", header: "SKU", render: (row) => row.sku },
    { key: "category", header: "Category", render: (row) => row.categoryName },
    {
      key: "price",
      header: "Price",
      render: (row) => formatPrice(row.priceThb),
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
      key: "available",
      header: "Pickup",
      render: (row) => (row.available ? "Available" : "Unavailable"),
    },
    { key: "sort", header: "Sort", render: (row) => row.sortOrder },
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
    setForm({
      ...emptyForm(),
      categoryId: categories[0]?.id ?? "",
    });
    setImageDrafts([]);
    setDescriptionText("");
    setFormError(null);
    setSuccess(null);
    void loadMediaLibrary().catch(() => undefined);
  }

  async function openEdit(id: string) {
    setFormError(null);
    setSuccess(null);
    try {
      const product = await fetchAdminProduct(id);
      applyProductToForm(product);
      setEditingId(id);
      setMode("edit");
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? err.message
          : "Unable to load product.",
      );
    }
  }

  function applyProductToForm(product: AdminProductDetailDto) {
    setForm({
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      description: product.description,
      priceThb: product.priceThb ?? 0,
      currency: "THB",
      categoryId: product.categoryId,
      isActive: product.isActive,
      available: product.available,
      sortOrder: product.sortOrder,
      storageLabel: product.storageLabel,
      storageText: product.storageText,
      images: product.images.map((image) => ({
        mediaId: image.mediaId,
        altText: image.altText,
        sortOrder: image.sortOrder,
        isPrimary: image.isPrimary,
      })),
    });
    setImageDrafts(
      product.images.map((image) => ({
        mediaId: image.mediaId,
        url: image.url,
        altText: image.altText,
        sortOrder: image.sortOrder,
        isPrimary: image.isPrimary,
      })),
    );
    setDescriptionText(product.description.join("\n"));
    void loadMediaLibrary().catch(() => undefined);
  }

  async function saveForm() {
    setSaving(true);
    setFormError(null);
    setSuccess(null);
    const payload: AdminCreateProductInput = {
      ...form,
      description: descriptionText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      images: imageDrafts.map((image, index) => ({
        mediaId: image.mediaId,
        altText: image.altText ?? null,
        sortOrder: image.sortOrder ?? index,
        isPrimary: image.isPrimary,
      })),
    };
    try {
      if (mode === "edit" && editingId) {
        await updateAdminProduct(editingId, payload);
        setSuccess("Product updated.");
      } else {
        await createAdminProduct(payload);
        setSuccess("Product created.");
      }
      setMode("list");
      setEditingId(null);
      await loadProducts();
    } catch (err) {
      setFormError(
        err instanceof AdminApiError
          ? err.message
          : "Unable to save product.",
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
      const result = await deleteAdminProduct(confirmDeleteId);
      setSuccess(
        result.mode === "deactivated"
          ? "Product deactivated because it is referenced by order history."
          : "Product deleted.",
      );
      setConfirmDeleteId(null);
      await loadProducts();
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? err.message
          : "Unable to delete product.",
      );
    } finally {
      setSaving(false);
    }
  }

  function toggleMediaSelection(media: AdminMediaDto) {
    setImageDrafts((current) => {
      const exists = current.find((image) => image.mediaId === media.id);
      if (exists) {
        const next = current.filter((image) => image.mediaId !== media.id);
        if (next.length > 0 && !next.some((image) => image.isPrimary)) {
          next[0] = { ...next[0], isPrimary: true };
        }
        return next.map((image, index) => ({ ...image, sortOrder: index }));
      }
      return [
        ...current,
        {
          mediaId: media.id,
          url: media.url,
          altText: media.altText,
          sortOrder: current.length,
          isPrimary: current.length === 0,
        },
      ];
    });
  }

  function setPrimaryImage(mediaId: string) {
    setImageDrafts((current) =>
      current.map((image) => ({
        ...image,
        isPrimary: image.mediaId === mediaId,
      })),
    );
  }

  function moveImage(mediaId: string, direction: -1 | 1) {
    setImageDrafts((current) => {
      const index = current.findIndex((image) => image.mediaId === mediaId);
      if (index < 0) return current;
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next.map((image, order) => ({ ...image, sortOrder: order }));
    });
  }

  function removeImage(mediaId: string) {
    setImageDrafts((current) => {
      const next = current.filter((image) => image.mediaId !== mediaId);
      if (next.length > 0 && !next.some((image) => image.isPrimary)) {
        next[0] = { ...next[0], isPrimary: true };
      }
      return next.map((image, order) => ({ ...image, sortOrder: order }));
    });
  }

  if (mode === "create" || mode === "edit") {
    return (
      <>
        <AdminPageHeader
          title={mode === "create" ? "Create product" : "Edit product"}
          description="Select media assets by ID. Price is entered in THB and stored as integer satang."
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
          <AdminFormField label="Name" htmlFor="product-name">
            <input
              id="product-name"
              className="admin-form__input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </AdminFormField>
          <AdminFormField label="Slug" htmlFor="product-slug">
            <input
              id="product-slug"
              className="admin-form__input"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              required
            />
          </AdminFormField>
          <AdminFormField label="SKU" htmlFor="product-sku">
            <input
              id="product-sku"
              className="admin-form__input"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              required
            />
          </AdminFormField>
          <AdminFormField label="Description" htmlFor="product-description">
            <textarea
              id="product-description"
              className="admin-form__textarea"
              value={descriptionText}
              onChange={(e) => setDescriptionText(e.target.value)}
              placeholder="One paragraph per line"
            />
          </AdminFormField>
          <AdminFormField label="Price (THB)" htmlFor="product-price">
            <input
              id="product-price"
              className="admin-form__input"
              type="number"
              min={0}
              step="0.01"
              value={form.priceThb}
              onChange={(e) =>
                setForm({ ...form, priceThb: Number(e.target.value) })
              }
              required
            />
          </AdminFormField>
          <AdminFormField label="Currency" htmlFor="product-currency">
            <input
              id="product-currency"
              className="admin-form__input"
              value="THB"
              disabled
            />
          </AdminFormField>
          <AdminFormField label="Category" htmlFor="product-category">
            <select
              id="product-category"
              className="admin-form__select"
              value={form.categoryId}
              onChange={(e) =>
                setForm({ ...form, categoryId: e.target.value })
              }
              required
            >
              <option value="" disabled>
                Select…
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </AdminFormField>
          <AdminFormField label="Active" htmlFor="product-active">
            <select
              id="product-active"
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
          <AdminFormField label="Available for pickup" htmlFor="product-available">
            <select
              id="product-available"
              className="admin-form__select"
              value={form.available ? "true" : "false"}
              onChange={(e) =>
                setForm({ ...form, available: e.target.value === "true" })
              }
            >
              <option value="true">Available</option>
              <option value="false">Unavailable</option>
            </select>
          </AdminFormField>
          <AdminFormField label="Sort order" htmlFor="product-sort">
            <input
              id="product-sort"
              className="admin-form__input"
              type="number"
              step={1}
              value={form.sortOrder}
              onChange={(e) =>
                setForm({ ...form, sortOrder: Number(e.target.value) })
              }
            />
          </AdminFormField>

          <div>
            <p className="admin-form__label">Media library</p>
            <p className="admin-page-header__description">
              Select gallery images by Media ID. Mark one as primary.
            </p>
            {mediaLibrary.length === 0 ? (
              <AdminEmptyState
                title="No media available"
                text="Add media assets under Media first."
              />
            ) : (
              <div className="admin-media-picker">
                {mediaLibrary.map((media) => {
                  const selected = imageDrafts.some(
                    (image) => image.mediaId === media.id,
                  );
                  return (
                    <button
                      key={media.id}
                      type="button"
                      className={`admin-media-picker__item${selected ? " admin-media-picker__item--selected" : ""}`}
                      onClick={() => toggleMediaSelection(media)}
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
            )}

            <p className="admin-form__label" style={{ marginTop: 16 }}>
              Selected images
            </p>
            {imageDrafts.length === 0 ? (
              <p className="admin-page-header__description">
                No images selected.
              </p>
            ) : (
              <div className="admin-selected-images">
                {imageDrafts.map((image) => (
                  <div className="admin-selected-image" key={image.mediaId}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="admin-media-thumb"
                      src={
                        image.url ||
                        mediaLibrary.find((item) => item.id === image.mediaId)
                          ?.url ||
                        "/product-placeholder.svg"
                      }
                      alt={image.altText ?? "Selected media"}
                    />
                    <div>
                      <div className="admin-media-url">{image.mediaId}</div>
                      <label>
                        <input
                          type="checkbox"
                          checked={image.isPrimary}
                          onChange={() => setPrimaryImage(image.mediaId)}
                        />{" "}
                        Primary
                      </label>
                    </div>
                    <div className="admin-actions">
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary"
                        onClick={() => moveImage(image.mediaId, -1)}
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary"
                        onClick={() => moveImage(image.mediaId, 1)}
                      >
                        Down
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary"
                        onClick={() => removeImage(image.mediaId)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </AdminForm>
      </>
    );
  }

  return (
    <>
      <AdminPageHeader
        title="Products"
        description="Manage product catalogue content."
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
            onClick={() => void loadProducts()}
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
          placeholder="Search products…"
        />
        <AdminFilter
          label="Category"
          value={categoryId}
          options={categoryOptions}
          onChange={(value) => {
            setCategoryId(value);
            setPage(1);
          }}
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
        <AdminEmptyState title="Loading" text="Loading products…" />
      ) : (
        <>
          <AdminTable
            columns={columns}
            rows={items}
            emptyMessage="No products found."
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
            Delete this product? Products referenced by orders will be
            deactivated instead of hard-deleted.
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
