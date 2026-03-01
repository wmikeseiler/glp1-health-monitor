import { createBrowserClient as createClient } from "@supabase/ssr";

export function createBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // Return a mock client when Supabase is not configured
    return {
      auth: {
        getUser: async () => ({
          data: { user: { id: "demo-user", email: "demo@example.com" } },
          error: null,
        }),
        signOut: async () => ({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
    } as any;
  }

  return createClient(supabaseUrl, supabaseKey);
}
