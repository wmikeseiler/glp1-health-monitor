import { createTRPCRouter } from "./trpc";
import { medicationRouter } from "./router/medication";
import { weightRouter } from "./router/weight";
import { injectionRouter } from "./router/injection";

export const appRouter = createTRPCRouter({
  medication: medicationRouter,
  weight: weightRouter,
  injection: injectionRouter,
});

export type AppRouter = typeof appRouter;
