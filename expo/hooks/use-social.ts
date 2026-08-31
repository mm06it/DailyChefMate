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
  isAdmin?: boolean;
}

export type AdminCategory = "feedback" | "bug" | "report_user" | "other";

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
  const countsQ = useQuery(api.social.socialCounts, skip);
  const myProfileQ = useQuery(api.social.myProfile, skip);

  const sendRequestMut = useMutation(api.social.sendFriendRequest);
  const respondMut = useMutation(api.social.respondFriendRequest);
  const removeFriendMut = useMutation(api.social.removeFriend);
  const blockMut = useMutation(api.social.block);
  const unblockMut = useMutation(api.social.unblock);
  const shareRecipeMut = useMutation(api.social.shareRecipe);
  const markInboxSeenMut = useMutation(api.social.markInboxSeen);
  const markFeedSeenMut = useMutation(api.social.markFeedSeen);
  const saveSharedMut = useMutation(api.social.saveSharedRecipe);
  const setProfileMut = useMutation(api.social.setSocialProfile);
  const sendAdminMessageMut = useMutation(api.social.sendAdminMessage);

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
  const shareRecipe = useCallback(
    (toUserId: string, recipe: Recipe, note?: string) =>
      shareRecipeMut({ toUserId: toUserId as Id<"users">, recipe: toRecipeSnapshot(recipe), note }),
    [shareRecipeMut],
  );
  const markInboxSeen = useCallback(() => markInboxSeenMut({}), [markInboxSeenMut]);
  const markFeedSeen = useCallback(() => markFeedSeenMut({}), [markFeedSeenMut]);
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
  const sendAdminMessage = useCallback(
    (args: { category: AdminCategory; message: string; reportedUserId?: string; reportedQuery?: string }) =>
      sendAdminMessageMut({
        category: args.category,
        message: args.message,
        reportedUserId: args.reportedUserId as Id<"users"> | undefined,
        reportedQuery: args.reportedQuery,
      }),
    [sendAdminMessageMut],
  );

  const counts = countsQ ?? { feed: 0, friends: 0, inbox: 0 };

  return useMemo(
    () => ({
      friends: (friendsQ ?? []) as MiniProfile[],
      incoming: (requestsQ?.incoming ?? []) as MiniProfile[],
      outgoing: (requestsQ?.outgoing ?? []) as MiniProfile[],
      counts,
      badgeCount: counts.feed + counts.friends + counts.inbox,
      myProfile: myProfileQ ?? null,
      sendFriendRequest,
      respondFriendRequest,
      removeFriend,
      blockUser,
      unblockUser,
      shareRecipe,
      markInboxSeen,
      markFeedSeen,
      saveSharedRecipe,
      setSocialProfile,
      sendAdminMessage,
    }),
    [
      friendsQ,
      requestsQ,
      countsQ,
      myProfileQ,
      counts,
      sendFriendRequest,
      respondFriendRequest,
      removeFriend,
      blockUser,
      unblockUser,
      shareRecipe,
      markInboxSeen,
      markFeedSeen,
      saveSharedRecipe,
      setSocialProfile,
      sendAdminMessage,
    ],
  );
});
