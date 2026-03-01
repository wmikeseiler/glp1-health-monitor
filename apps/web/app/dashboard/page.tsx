import { createClient } from "~/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DashboardOverview } from "./overview";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <main style={{ maxWidth: 860, margin: "40px auto", padding: 24 }}>
      <h1 style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 700, color: "#111827" }}>Dashboard</h1>
      <p style={{ margin: "0 0 36px", color: "#6b7280", fontSize: 15 }}>Welcome back, {user.email}</p>

      {/* Live summary data — client component with tRPC */}
      <DashboardOverview />

      <div style={{ margin: "40px 0 16px", borderTop: "1px solid #e5e7eb" }} />

      <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 600, color: "#374151" }}>
        Health Tracking
      </h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        <Link
          href="/dashboard/weight"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            padding: "20px 24px",
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            textDecoration: "none",
            minWidth: 180,
            flex: "1 1 180px",
            maxWidth: 240,
            transition: "border-color 0.15s",
          }}
        >
          <span style={{ fontSize: 28 }}>&#9878;</span>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>Weight Tracking</span>
          <span style={{ fontSize: 13, color: "#6b7280" }}>Log and chart your weight progress</span>
        </Link>
        <Link
          href="/dashboard/injections"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            padding: "20px 24px",
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            textDecoration: "none",
            minWidth: 180,
            flex: "1 1 180px",
            maxWidth: 240,
            transition: "border-color 0.15s",
          }}
        >
          <span style={{ fontSize: 28 }}>&#128137;</span>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>Injections</span>
          <span style={{ fontSize: 13, color: "#6b7280" }}>Track doses and rotate injection sites</span>
        </Link>
        <Link
          href="/dashboard/vitals"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            padding: "20px 24px",
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            textDecoration: "none",
            minWidth: 180,
            flex: "1 1 180px",
            maxWidth: 240,
            transition: "border-color 0.15s",
          }}
        >
          <span style={{ fontSize: 28 }}>&#10084;</span>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>Vitals</span>
          <span style={{ fontSize: 13, color: "#6b7280" }}>Monitor blood pressure and heart rate</span>
        </Link>
        <Link
          href="/dashboard/food"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            padding: "20px 24px",
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            textDecoration: "none",
            minWidth: 180,
            flex: "1 1 180px",
            maxWidth: 240,
            transition: "border-color 0.15s",
          }}
        >
          <span style={{ fontSize: 28 }}>&#127869;</span>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>Food Tracking</span>
          <span style={{ fontSize: 13, color: "#6b7280" }}>Log meals and track daily macros</span>
        </Link>
        <Link
          href="/dashboard/recipes"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            padding: "20px 24px",
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            textDecoration: "none",
            minWidth: 180,
            flex: "1 1 180px",
            maxWidth: 240,
            transition: "border-color 0.15s",
          }}
        >
          <span style={{ fontSize: 28 }}>&#127859;</span>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>Recipes</span>
          <span style={{ fontSize: 13, color: "#6b7280" }}>Browse GLP-1 friendly recipes</span>
        </Link>
      </div>
    </main>
  );
}
