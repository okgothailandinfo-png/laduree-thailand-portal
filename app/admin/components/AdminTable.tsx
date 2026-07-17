import type { ReactNode } from "react";

export type AdminTableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
};

export default function AdminTable<T>({
  columns,
  rows,
  emptyMessage = "No records yet.",
  getRowKey,
}: {
  columns: AdminTableColumn<T>[];
  rows: T[];
  emptyMessage?: string;
  getRowKey: (row: T, index: number) => string;
}) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                className="admin-table__empty"
                colSpan={Math.max(columns.length, 1)}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={getRowKey(row, index)}>
                {columns.map((column) => (
                  <td key={column.key}>{column.render(row)}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
