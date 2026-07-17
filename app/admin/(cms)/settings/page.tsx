import AdminForm, { AdminFormField } from "../../components/AdminForm";
import AdminPageHeader from "../../components/AdminPageHeader";

export default function AdminSettingsPage() {
  return (
    <>
      <AdminPageHeader
        title="Settings"
        description="Admin CMS settings. Not connected to persistence yet."
      />
      <AdminForm disabled>
        <AdminFormField label="Site name" htmlFor="settings-site-name">
          <input
            id="settings-site-name"
            className="admin-form__input"
            type="text"
            disabled
            defaultValue="Ladurée Thailand"
          />
        </AdminFormField>
        <AdminFormField label="Timezone" htmlFor="settings-timezone">
          <input
            id="settings-timezone"
            className="admin-form__input"
            type="text"
            disabled
            defaultValue="Asia/Bangkok"
          />
        </AdminFormField>
        <AdminFormField label="Currency" htmlFor="settings-currency">
          <input
            id="settings-currency"
            className="admin-form__input"
            type="text"
            disabled
            defaultValue="THB"
          />
        </AdminFormField>
      </AdminForm>
    </>
  );
}
