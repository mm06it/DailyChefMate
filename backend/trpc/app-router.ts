import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import recipesRouter from "./routes/recipes/search/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  recipes: createTRPCRouter({
    search: recipesRouter,
  }),
});

export type AppRouter = typeof appRouter;