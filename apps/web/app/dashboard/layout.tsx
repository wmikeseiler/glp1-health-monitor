import { createClient } from "~/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardNav } from "./nav";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      <DashboardNav userEmail={user.email || ""} />
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "24px 24px 60px" }}>
        {children}
      </main>
    </div>
  );
}
