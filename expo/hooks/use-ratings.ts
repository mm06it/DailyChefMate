import createContextHook from "@nkzw/create-context-hook";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useCallback, useMemo } from "react";

import { useToast } from "@/components/Toast";
import { getTranslation } from "@/constants/translations";
import { api } from "@/convex/_generated/api";
import { useLanguage } from "@/hooks/use-language";

export interface RatingStat {
  avg: number;
  count: number;
}

export const [RatingsContext, useRatings] = createContextHook(() => {
  const { isAuthenticated } = useConvexAuth();
  const skip = isAuthenticated ? {} : "skip";
  const { showToast } = useToast();
  const { currentLanguage } = useLanguage();

  const statsQ = useQuery(api.ratings.ratingStats, skip);
  const myRatingsQ = useQuery(api.ratings.myRatings, skip);
  const rateMut = useMutation(api.ratings.rate);

  const statsById = useMemo(() => {
    const m = new Map<string, RatingStat>();
    for (const s of statsQ ?? []) m.set(s.recipeId, { avg: s.avg, count: s.count });
    return m;
  }, [statsQ]);

  const myRatingById = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of myRatingsQ ?? []) m.set(r.recipeId, r.rating);
    return m;
  }, [myRatingsQ]);

  const rate = useCallback(
    async (args: {
      recipeId: string;
      rating: number;
      comment?: string;
      recipeName: string;
      recipeImage?: string;
    }) => {
      await rateMut(args);
      showToast(getTranslation(currentLanguage, "ratingSaved"), { icon: "star" });
    },
    [rateMut, showToast, currentLanguage],
  );

  return useMemo(
    () => ({
      getRatingStats: (recipeId: string): RatingStat | null => statsById.get(recipeId) ?? null,
      myRating: (recipeId: string): number | null => myRatingById.get(recipeId) ?? null,
      myRatedIds: new Set(myRatingById.keys()),
      rate,
    }),
    [statsById, myRatingById, rate],
  );
});
