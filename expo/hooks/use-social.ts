import createContextHook from "@nkzw/create-context-hook";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useCallback, useMemo } from "react";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Recipe } from "@/types/recipe";

export interface MiniProfile {
  id: string;
  username: string;
  displayName: string;
  initials: string;
}

// Strip runtime-only browse fields before snapshotting a recipe — same as
// use-meal-plan's toRecipeSnapshot.
function toRecipeSnapshot(recipe: Recipe) {
  const {
    isFavorite: _f,
    area: _a,
    usedIngredients: _u,
    missedIngredients: _m,
    ...rest
  } = recipe;
  return rest;
}

export const [SocialContext, useSocial] = createContextHook(() => {
  const { isAuthenticated } = useConvexAuth();
  const skip = isAuthenticated ? {} : "skip";

  const friendsQ = useQuery(api.social.friends, skip);
  const requestsQ = useQuery(api.social.friendRequests, skip);
  const badgeQ = useQuery(api.social.badgeCount, skip);
  const myProfileQ = useQuery(api.social.myProfile, skip);

  const sendRequestMut = useMutation(api.social.sendFriendRequest);
  const respondMut = useMutation(api.social.respondFriendRequest);
  const removeFriendMut = useMutation(api.social.removeFriend);
  const blockMut = useMutation(api.social.block);
  const unblockMut = useMutation(api.social.unblock);
  const reportMut = useMutation(api.social.report);
  const shareRecipeMut = useMutation(api.social.shareRecipe);
  const markSharesSeenMut = useMutation(api.social.markAllSharesSeen);
  const saveSharedMut = useMutation(api.social.saveSharedRecipe);
  const setProfileMut = useMutation(api.social.setSocialProfile);

  const sendFriendRequest = useCallback(
    (query: string) => sendRequestMut({ query }),
    [sendRequestMut],
  );
  const respondFriendRequest = useCallback(
    (userId: string, accept: boolean) => respondMut({ userId: userId as Id<"users">, accept }),
    [respondMut],
  );
  const removeFriend = useCallback(
    (userId: string) => removeFriendMut({ userId: userId as Id<"users"> }),
    [removeFriendMut],
  );
  const blockUser = useCallback(
    (userId: string) => blockMut({ userId: userId as Id<"users"> }),
    [blockMut],
  );
  const unblockUser = useCallback(
    (userId: string) => unblockMut({ userId: userId as Id<"users"> }),
    [unblockMut],
  );
  const reportUser = useCallback(
    (targetUserId: string, context: string, reason: string, refId?: string) =>
      reportMut({ targetUserId: targetUserId as Id<"users">, context, reason, refId }),
    [reportMut],
  );
  const shareRecipe = useCallback(
    (toUserId: string, recipe: Recipe, note?: string) =>
      shareRecipeMut({ toUserId: toUserId as Id<"users">, recipe: toRecipeSnapshot(recipe), note }),
    [shareRecipeMut],
  );
  const markSharesSeen = useCallback(() => markSharesSeenMut({}), [markSharesSeenMut]);
  const saveSharedRecipe = useCallback(
    (id: string) => saveSharedMut({ id: id as Id<"recipeShares"> }),
    [saveSharedMut],
  );
  const setSocialProfile = useCallback(
    (args: {
      displayName?: string;
      bio?: string;
      discoverable?: boolean;
      feedVisibility?: "friends" | "private";
    }) => setProfileMut(args),
    [setProfileMut],
  );

  return useMemo(
    () => ({
      friends: (friendsQ ?? []) as MiniProfile[],
      incoming: (requestsQ?.incoming ?? []) as MiniProfile[],
      outgoing: (requestsQ?.outgoing ?? []) as MiniProfile[],
      badgeCount: (badgeQ ?? 0) as number,
      myProfile: myProfileQ ?? null,
      sendFriendRequest,
      respondFriendRequest,
      removeFriend,
      blockUser,
      unblockUser,
      reportUser,
      shareRecipe,
      markSharesSeen,
      saveSharedRecipe,
      setSocialProfile,
    }),
    [
      friendsQ,
      requestsQ,
      badgeQ,
      myProfileQ,
      sendFriendRequest,
      respondFriendRequest,
      removeFriend,
      blockUser,
      unblockUser,
      reportUser,
      shareRecipe,
      markSharesSeen,
      saveSharedRecipe,
      setSocialProfile,
    ],
  );
});
