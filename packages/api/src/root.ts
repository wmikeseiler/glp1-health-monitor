import { createTRPCRouter } from "./trpc";
import { medicationRouter } from "./router/medication";

export const appRouter = createTRPCRouter({
  medication: medicationRouter,
});

export type AppRouter = typeof appRouter;
