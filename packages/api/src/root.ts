import { createTRPCRouter } from "./trpc";
import { medicationRouter } from "./router/medication";
import { weightRouter } from "./router/weight";
import { injectionRouter } from "./router/injection";
import { vitalsRouter } from "./router/vitals";
import { foodRouter } from "./router/food";

export const appRouter = createTRPCRouter({
  medication: medicationRouter,
  weight: weightRouter,
  injection: injectionRouter,
  vitals: vitalsRouter,
  food: foodRouter,
});

export type AppRouter = typeof appRouter;
