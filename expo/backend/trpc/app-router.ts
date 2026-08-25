import { createTRPCRouter } from "./create-context";
import recipesRouter from "./routes/recipes/search/route";

export const appRouter = createTRPCRouter({
  recipes: createTRPCRouter({
    search: recipesRouter,
  }),
});

export type AppRouter = typeof appRouter;