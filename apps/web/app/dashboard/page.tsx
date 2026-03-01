import { createClient } from "~/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <main style={{ maxWidth: 800, margin: "40px auto", padding: 24 }}>
      <h1>Dashboard</h1>
      <p>Welcome, {user.email}!</p>
      <p>Your health tracking dashboard is coming soon.</p>
    </main>
  );
}
