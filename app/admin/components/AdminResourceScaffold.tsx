"use client";

import { useState } from "react";
import AdminEmptyState from "./AdminEmptyState";
import AdminFilter from "./AdminFilter";
import AdminForm, { AdminFormField } from "./AdminForm";
import AdminPageHeader from "./AdminPageHeader";
import AdminPagination from "./AdminPagination";
import AdminSearch from "./AdminSearch";
import AdminTable, { type AdminTableColumn } from "./AdminTable";

type PlaceholderRow = {
  id: string;
  name: string;
  status: string;
};

const PLACEHOLDER_COLUMNS: AdminTableColumn<PlaceholderRow>[] = [
  { key: "id", header: "ID", render: (row) => row.id },
  { key: "name", header: "Name", render: (row) => row.name },
  { key: "status", header: "Status", render: (row) => row.status },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

/**
 * Shared empty CRUD scaffold for list resources.
 * No database operations — architecture only.
 */
export default function AdminResourceScaffold({
  title,
  description,
  searchPlaceholder,
  resourceKey,
}: {
  title: string;
  description: string;
  searchPlaceholder: string;
  resourceKey: string;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const nameId = `${resourceKey}-name`;
  const statusId = `${resourceKey}-status`;

  return (
    <>
      <AdminPageHeader title={title} description={description} />

      <div className="admin-toolbar">
        <AdminSearch
          value={query}
          onChange={setQuery}
          placeholder={searchPlaceholder}
        />
        <AdminFilter
          label="Status"
          value={status}
          options={STATUS_OPTIONS}
          onChange={setStatus}
        />
        <button type="button" className="admin-btn admin-btn--primary" disabled>
          Add
        </button>
      </div>

      <AdminTable
        columns={PLACEHOLDER_COLUMNS}
        rows={[]}
        emptyMessage="No records yet. CRUD will be connected in a later sprint."
        getRowKey={(row) => row.id}
      />

      <AdminPagination
        page={page}
        pageSize={10}
        total={0}
        onPageChange={setPage}
      />

      <div style={{ marginTop: 32 }}>
        <AdminPageHeader
          title={`${title} form`}
          description="Placeholder form — not connected to the database."
        />
        <AdminForm disabled>
          <AdminFormField label="Name" htmlFor={nameId}>
            <input
              id={nameId}
              className="admin-form__input"
              type="text"
              disabled
              placeholder="—"
            />
          </AdminFormField>
          <AdminFormField label="Status" htmlFor={statusId}>
            <select
              id={statusId}
              className="admin-form__select"
              disabled
              defaultValue=""
            >
              <option value="" disabled>
                Select…
              </option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </AdminFormField>
        </AdminForm>
      </div>

      <div style={{ marginTop: 24 }}>
        <AdminEmptyState
          title="CMS functionality pending"
          text="This page is structural only. Data management arrives in a later sprint."
        />
      </div>
    </>
  );
}
