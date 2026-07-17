export default function AdminPageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header className="admin-page-header">
      <h2 className="admin-page-header__title">{title}</h2>
      {description ? (
        <p className="admin-page-header__description">{description}</p>
      ) : null}
    </header>
  );
}
