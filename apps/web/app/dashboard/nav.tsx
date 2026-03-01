"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createBrowserClient } from "~/lib/supabase/browser";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", exact: true },
  { href: "/dashboard/weight", label: "Weight" },
  { href: "/dashboard/injections", label: "Injections" },
  { href: "/dashboard/vitals", label: "Vitals" },
  { href: "/dashboard/food", label: "Food" },
  { href: "/dashboard/recipes", label: "Recipes" },
  { href: "/dashboard/reports", label: "Reports" },
];

interface DashboardNavProps {
  userEmail: string;
}

export function DashboardNav({ userEmail }: DashboardNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  function isActive(link: { href: string; exact?: boolean }) {
    if (link.exact) return pathname === link.href;
    return pathname.startsWith(link.href);
  }

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <nav
      style={{
        background: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Main bar */}
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "0 24px",
          height: 56,
          display: "flex",
          alignItems: "center",
          gap: 24,
        }}
      >
        {/* Brand */}
        <Link
          href="/dashboard"
          style={{
            fontWeight: 700,
            fontSize: 16,
            color: "#111827",
            textDecoration: "none",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          GLP-1 Health Monitor
        </Link>

        {/* Desktop nav links */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            flex: 1,
            overflowX: "auto",
          }}
          className="nav-desktop"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: isActive(link) ? 600 : 400,
                color: isActive(link) ? "#2563eb" : "#374151",
                background: isActive(link) ? "#eff6ff" : "transparent",
                textDecoration: "none",
                whiteSpace: "nowrap",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side: email + settings + sign out */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
            marginLeft: "auto",
          }}
        >
          <span
            style={{
              fontSize: 13,
              color: "#6b7280",
              maxWidth: 160,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={userEmail}
          >
            {userEmail}
          </span>

          <Link
            href="/dashboard/settings"
            title="Settings"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 6,
              color: pathname.startsWith("/dashboard/settings") ? "#2563eb" : "#6b7280",
              background: pathname.startsWith("/dashboard/settings") ? "#eff6ff" : "transparent",
              textDecoration: "none",
              fontSize: 18,
              transition: "background 0.15s, color 0.15s",
            }}
          >
            &#9881;
          </Link>

          <button
            onClick={handleSignOut}
            disabled={signingOut}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid #e5e7eb",
              background: "#fff",
              color: "#374151",
              fontSize: 13,
              fontWeight: 500,
              cursor: signingOut ? "not-allowed" : "pointer",
              opacity: signingOut ? 0.6 : 1,
              whiteSpace: "nowrap",
              transition: "background 0.15s",
            }}
          >
            {signingOut ? "Signing out..." : "Sign Out"}
          </button>

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            style={{
              display: "none",
              padding: "6px",
              borderRadius: 6,
              border: "1px solid #e5e7eb",
              background: "#fff",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
            }}
            className="nav-hamburger"
          >
            {menuOpen ? "\u2715" : "\u2630"}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div
          style={{
            borderTop: "1px solid #e5e7eb",
            padding: "8px 24px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
          className="nav-mobile"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{
                padding: "10px 12px",
                borderRadius: 6,
                fontSize: 15,
                fontWeight: isActive(link) ? 600 : 400,
                color: isActive(link) ? "#2563eb" : "#374151",
                background: isActive(link) ? "#eff6ff" : "transparent",
                textDecoration: "none",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/dashboard/settings"
            onClick={() => setMenuOpen(false)}
            style={{
              padding: "10px 12px",
              borderRadius: 6,
              fontSize: 15,
              fontWeight: pathname.startsWith("/dashboard/settings") ? 600 : 400,
              color: pathname.startsWith("/dashboard/settings") ? "#2563eb" : "#374151",
              background: pathname.startsWith("/dashboard/settings") ? "#eff6ff" : "transparent",
              textDecoration: "none",
            }}
          >
            Settings
          </Link>
        </div>
      )}

      {/* Responsive styles via a style tag */}
      <style>{`
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-hamburger { display: flex !important; }
        }
        @media (min-width: 769px) {
          .nav-mobile { display: none !important; }
        }
      `}</style>
    </nav>
  );
}
