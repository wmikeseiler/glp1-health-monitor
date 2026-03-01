import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@glp1/api";
import { createClient } from "~/lib/supabase/server";

const handler = async (req: Request) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async () => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      return { userId: user?.id ?? null };
    },
  });
};

export { handler as GET, handler as POST };
