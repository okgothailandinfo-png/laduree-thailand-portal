export default function AdminEmptyState({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="admin-empty" role="status">
      <p className="admin-empty__title">{title}</p>
      <p className="admin-empty__text">{text}</p>
    </div>
  );
}
