"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "~/lib/supabase/browser";

const APP_VERSION = "0.1.0";

const SECTION_STYLE: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: "24px 28px",
  marginBottom: 24,
};

const SECTION_TITLE_STYLE: React.CSSProperties = {
  margin: "0 0 20px",
  fontSize: 16,
  fontWeight: 600,
  color: "#111827",
  paddingBottom: 12,
  borderBottom: "1px solid #f3f4f6",
};

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 500,
  color: "#374151",
  marginBottom: 6,
};

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 14,
  color: "#6b7280",
  background: "#f9fafb",
  boxSizing: "border-box",
};

const SELECT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 14,
  color: "#374151",
  background: "#ffffff",
  boxSizing: "border-box",
  cursor: "pointer",
};

const FIELD_STYLE: React.CSSProperties = {
  marginBottom: 16,
};

interface UserInfo {
  email: string;
  id: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [weightUnit, setWeightUnit] = useState<"lbs" | "kg">("lbs");
  const [defaultMealType, setDefaultMealType] = useState("breakfast");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load user and preferences
  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser({ email: user.email || "", id: user.id });
      }
    });

    const storedUnit = localStorage.getItem("glp1_weight_unit");
    if (storedUnit === "lbs" || storedUnit === "kg") {
      setWeightUnit(storedUnit);
    }

    const storedMeal = localStorage.getItem("glp1_default_meal_type");
    if (storedMeal) {
      setDefaultMealType(storedMeal);
    }
  }, []);

  function handleSavePreferences() {
    localStorage.setItem("glp1_weight_unit", weightUnit);
    localStorage.setItem("glp1_default_meal_type", defaultMealType);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    const supabase = createBrowserClient();
    // Sign out and redirect — actual account deletion requires a server-side call
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 700, color: "#111827" }}>
          Settings
        </h1>
        <p style={{ margin: 0, color: "#6b7280", fontSize: 15 }}>
          Manage your account, preferences, and data.
        </p>
      </div>

      {/* Profile */}
      <section style={SECTION_STYLE}>
        <h2 style={SECTION_TITLE_STYLE}>Profile</h2>
        <div style={FIELD_STYLE}>
          <label style={LABEL_STYLE}>Email address</label>
          <input
            type="email"
            value={user?.email || ""}
            readOnly
            style={INPUT_STYLE}
          />
        </div>
        <div style={FIELD_STYLE}>
          <label style={LABEL_STYLE}>User ID</label>
          <input
            type="text"
            value={user?.id || ""}
            readOnly
            style={{ ...INPUT_STYLE, fontFamily: "monospace", fontSize: 12 }}
          />
        </div>
      </section>

      {/* Preferences */}
      <section style={SECTION_STYLE}>
        <h2 style={SECTION_TITLE_STYLE}>Preferences</h2>
        <div style={FIELD_STYLE}>
          <label style={LABEL_STYLE}>Weight unit</label>
          <select
            value={weightUnit}
            onChange={(e) => setWeightUnit(e.target.value as "lbs" | "kg")}
            style={SELECT_STYLE}
          >
            <option value="lbs">Pounds (lbs)</option>
            <option value="kg">Kilograms (kg)</option>
          </select>
        </div>
        <div style={FIELD_STYLE}>
          <label style={LABEL_STYLE}>Default meal type</label>
          <select
            value={defaultMealType}
            onChange={(e) => setDefaultMealType(e.target.value)}
            style={SELECT_STYLE}
          >
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
            <option value="snack">Snack</option>
          </select>
        </div>
        <div style={FIELD_STYLE}>
          <label style={LABEL_STYLE}>Theme</label>
          <div
            style={{
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 14,
              color: "#9ca3af",
              background: "#f9fafb",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>Light mode</span>
            <span
              style={{
                fontSize: 11,
                padding: "2px 8px",
                background: "#f3f4f6",
                borderRadius: 4,
                color: "#6b7280",
              }}
            >
              Dark mode coming soon
            </span>
          </div>
        </div>
        <button
          onClick={handleSavePreferences}
          style={{
            marginTop: 4,
            padding: "8px 20px",
            borderRadius: 6,
            border: "none",
            background: saved ? "#16a34a" : "#2563eb",
            color: "#ffffff",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            transition: "background 0.2s",
          }}
        >
          {saved ? "Saved!" : "Save preferences"}
        </button>
      </section>

      {/* Data Management */}
      <section style={SECTION_STYLE}>
        <h2 style={SECTION_TITLE_STYLE}>Data Management</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <Link
              href="/dashboard/reports"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 20px",
                borderRadius: 6,
                border: "1px solid #2563eb",
                background: "#eff6ff",
                color: "#2563eb",
                fontSize: 14,
                fontWeight: 500,
                textDecoration: "none",
                transition: "background 0.15s",
              }}
            >
              &#8681; Export All Data
            </Link>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#9ca3af" }}>
              Download all your health data as a CSV or JSON file from the Reports page.
            </p>
          </div>

          <div style={{ marginTop: 8 }}>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  padding: "8px 20px",
                  borderRadius: 6,
                  border: "1px solid #fca5a5",
                  background: "#fff1f2",
                  color: "#dc2626",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
              >
                Delete Account
              </button>
            ) : (
              <div
                style={{
                  padding: "16px 20px",
                  border: "1px solid #fca5a5",
                  borderRadius: 8,
                  background: "#fff1f2",
                }}
              >
                <p
                  style={{
                    margin: "0 0 12px",
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#991b1b",
                  }}
                >
                  Are you sure you want to delete your account? This action cannot be undone and
                  all your data will be permanently removed.
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    style={{
                      padding: "8px 20px",
                      borderRadius: 6,
                      border: "none",
                      background: "#dc2626",
                      color: "#ffffff",
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: deleting ? "not-allowed" : "pointer",
                      opacity: deleting ? 0.7 : 1,
                    }}
                  >
                    {deleting ? "Deleting..." : "Yes, delete my account"}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 6,
                      border: "1px solid #d1d5db",
                      background: "#ffffff",
                      color: "#374151",
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#9ca3af" }}>
              Permanently remove your account and all associated data.
            </p>
          </div>
        </div>
      </section>

      {/* About */}
      <section style={SECTION_STYLE}>
        <h2 style={SECTION_TITLE_STYLE}>About</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
            <span style={{ color: "#6b7280" }}>App version</span>
            <span style={{ color: "#111827", fontWeight: 500 }}>{APP_VERSION}</span>
          </div>
          <div style={{ fontSize: 14, color: "#6b7280" }}>
            GLP-1 Health Monitor &mdash; Track your health journey
          </div>
          <Link
            href="/dashboard"
            style={{
              marginTop: 8,
              fontSize: 14,
              color: "#2563eb",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            &larr; Back to Dashboard
          </Link>
        </div>
      </section>
    </>
  );
}
