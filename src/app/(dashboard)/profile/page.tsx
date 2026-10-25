"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

const THEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "midnight", label: "Midnight Blue" },
];

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const { setTheme, theme } = useTheme();

  const [name, setName] = useState(session?.user?.name || "");
  const [email, setEmail] = useState(session?.user?.email || "");
  const [newPassword, setNewPassword] = useState("");
  const [salesTax, setSalesTax] = useState("8.25");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => {
        if (data.salesTax != null) setSalesTax(String(data.salesTax));
      })
      .catch(() => {});
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    const body: any = { name, email, theme, salesTax: parseFloat(salesTax) || 0 };
    if (newPassword) body.newPassword = newPassword;

    const res = await fetch("/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      await update({ name, email, theme });
      setNewPassword("");
      setMessage("Profile updated successfully");
    } else {
      const data = await res.json();
      setError(data.error || "Update failed");
    }
    setSaving(false);
  }

  function handleThemeChange(value: string) {
    setTheme(value);
  }

  const initials =
    name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase() || "?";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="heading-fade mb-8 text-2xl font-bold">Profile</h1>

      <div className="mb-8 flex items-center gap-4 rounded-xl border-2 border-border/60 bg-card p-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
          {initials}
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground">{name}</p>
          <p className="text-sm text-muted-foreground">{email}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {message && (
          <div className="rounded-lg bg-green-500/10 px-4 py-2 text-sm text-green-400">
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="rounded-xl border-2 border-border/60 bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Personal Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border-2 border-border/60 bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Change Password
          </h2>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Leave blank to keep current"
              className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="rounded-xl border-2 border-border/60 bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Sales Tax
          </h2>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Sales Tax Rate (%)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                value={salesTax}
                onChange={(e) => setSalesTax(e.target.value)}
                className="w-32 rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Used to calculate sales tax on list items (e.g. 8.25 for Texas)
            </p>
          </div>
        </div>

        <div className="rounded-xl border-2 border-border/60 bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Theme</h2>
          <div className="grid grid-cols-3 gap-3">
            {THEMES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => handleThemeChange(t.value)}
                className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                  theme === t.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
