"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AdminApiError,
  fetchAdminNotificationSettings,
  updateAdminNotificationSettings,
} from "@/lib/api/admin-notifications";
import type { AdminNotificationSettingDto } from "@/src/server/admin/notification.service";
import AdminEmptyState from "../../../components/AdminEmptyState";
import AdminPageHeader from "../../../components/AdminPageHeader";

function settingLabel(key: string): string {
  if (key === "channel.EMAIL") return "Email channel";
  if (key === "channel.LINE") return "LINE channel";
  if (key.startsWith("event.EMAIL.")) {
    return `Email · ${key.replace("event.EMAIL.", "")}`;
  }
  if (key.startsWith("event.LINE.")) {
    return `LINE · ${key.replace("event.LINE.", "")}`;
  }
  return key;
}

export default function AdminNotificationSettingsClient() {
  const [settings, setSettings] = useState<AdminNotificationSettingDto[]>([]);
  const [draft, setDraft] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchAdminNotificationSettings();
      setSettings(rows);
      const next: Record<string, boolean> = {};
      for (const row of rows) next[row.key] = row.isEnabled;
      setDraft(next);
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? err.message
          : "Unable to load notification settings.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const dirty = useMemo(() => {
    return settings.some((row) => draft[row.key] !== row.isEnabled);
  }, [settings, draft]);

  const handleSave = async () => {
    setSaving(true);
    setSuccess(null);
    setError(null);
    try {
      const updates = settings
        .filter((row) => draft[row.key] !== row.isEnabled)
        .map((row) => ({
          key: row.key,
          isEnabled: Boolean(draft[row.key]),
        }));
      if (updates.length === 0) {
        setSuccess("No changes to save.");
        return;
      }
      const rows = await updateAdminNotificationSettings(updates);
      setSettings(rows);
      const next: Record<string, boolean> = {};
      for (const row of rows) next[row.key] = row.isEnabled;
      setDraft(next);
      setSuccess("Notification settings saved.");
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? err.message
          : "Unable to save notification settings.",
      );
    } finally {
      setSaving(false);
    }
  };

  const channelSettings = settings.filter((s) => s.key.startsWith("channel."));
  const emailEvents = settings.filter((s) => s.key.startsWith("event.EMAIL."));
  const lineEvents = settings.filter((s) => s.key.startsWith("event.LINE."));

  if (loading) {
    return (
      <div className="admin-page">
        <AdminEmptyState title="Loading" text="Loading settings…" />
      </div>
    );
  }

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Notification settings"
        description="Enable or disable channels and events. LINE stays off until a LINE identity is linked."
      />

      {error ? (
        <div className="admin-alert admin-alert--error" role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={() => void load()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {success ? (
        <div className="admin-alert admin-alert--success" role="status">
          <p>{success}</p>
        </div>
      ) : null}

      <div className="admin-toolbar">
        <Link href="/admin/notifications" className="admin-btn admin-btn--secondary">
          Back to notifications
        </Link>
        <button
          type="button"
          className="admin-btn admin-btn--primary"
          disabled={saving || !dirty}
          onClick={() => void handleSave()}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <p className="admin-muted-text">
        LINE identity linking is not implemented yet. Enabling LINE will not
        deliver until a valid LINE user ID exists on the customer.
      </p>

      <h3 className="admin-section-title">Channels</h3>
      <ul className="admin-settings-list">
        {channelSettings.map((row) => (
          <li key={row.key}>
            <label className="admin-checkbox">
              <input
                type="checkbox"
                checked={Boolean(draft[row.key])}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    [row.key]: event.target.checked,
                  }))
                }
              />
              <span>{settingLabel(row.key)}</span>
            </label>
          </li>
        ))}
      </ul>

      <h3 className="admin-section-title">Email events</h3>
      <ul className="admin-settings-list">
        {emailEvents.map((row) => (
          <li key={row.key}>
            <label className="admin-checkbox">
              <input
                type="checkbox"
                checked={Boolean(draft[row.key])}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    [row.key]: event.target.checked,
                  }))
                }
              />
              <span>{settingLabel(row.key)}</span>
            </label>
          </li>
        ))}
      </ul>

      <h3 className="admin-section-title">LINE events</h3>
      <ul className="admin-settings-list">
        {lineEvents.map((row) => (
          <li key={row.key}>
            <label className="admin-checkbox">
              <input
                type="checkbox"
                checked={Boolean(draft[row.key])}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    [row.key]: event.target.checked,
                  }))
                }
              />
              <span>{settingLabel(row.key)}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
