import { createTRPCRouter } from "./trpc";
import { medicationRouter } from "./router/medication";
import { weightRouter } from "./router/weight";

export const appRouter = createTRPCRouter({
  medication: medicationRouter,
  weight: weightRouter,
});

export type AppRouter = typeof appRouter;
