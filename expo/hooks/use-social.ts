import createContextHook from "@nkzw/create-context-hook";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useCallback, useMemo } from "react";

import { useToast } from "@/components/Toast";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getTranslation } from "@/constants/translations";
import { useLanguage } from "@/hooks/use-language";
import { Recipe } from "@/types/recipe";

export interface MiniProfile {
  id: string;
  username: string;
  displayName: string;
  initials: string;
  avatarColor?: string | null;
  avatarEmoji?: string | null;
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
  const { showToast } = useToast();
  const { currentLanguage } = useLanguage();
  const tr = useCallback((k: string) => getTranslation(currentLanguage, k), [currentLanguage]);
  const skip = isAuthenticated ? {} : "skip";

  const friendsQ = useQuery(api.social.friends, skip);
  const requestsQ = useQuery(api.social.friendRequests, skip);
  const countsQ = useQuery(api.social.socialCounts, skip);
  const myProfileQ = useQuery(api.social.myProfile, skip);

  const sendRequestMut = useMutation(api.social.sendFriendRequest);
  const sendRequestToMut = useMutation(api.social.sendFriendRequestTo);
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
  const dismissFeedMut = useMutation(api.social.dismissFeedEvent);
  const deleteInboxMut = useMutation(api.social.deleteInboxItem);

  const sendFriendRequest = useCallback(
    async (query: string) => {
      const res = await sendRequestMut({ query });
      showToast(res?.status === "accepted" ? tr("nowFriendsToast") : tr("friendRequestSent"), {
        icon: res?.status === "accepted" ? "userCheck" : "userPlus",
      });
      return res;
    },
    [sendRequestMut, showToast, tr],
  );
  const sendFriendRequestTo = useCallback(
    async (userId: string) => {
      const res = await sendRequestToMut({ userId: userId as Id<"users"> });
      showToast(res?.status === "accepted" ? tr("nowFriendsToast") : tr("friendRequestSent"), {
        icon: res?.status === "accepted" ? "userCheck" : "userPlus",
      });
      return res;
    },
    [sendRequestToMut, showToast, tr],
  );
  const respondFriendRequest = useCallback(
    async (userId: string, accept: boolean) => {
      await respondMut({ userId: userId as Id<"users">, accept });
      showToast(accept ? tr("nowFriendsToast") : tr("requestDeclinedToast"), {
        icon: accept ? "userCheck" : "info",
        variant: accept ? "success" : "info",
      });
    },
    [respondMut, showToast, tr],
  );
  const removeFriend = useCallback(
    async (userId: string) => {
      await removeFriendMut({ userId: userId as Id<"users"> });
      showToast(tr("friendRemovedToast"), { icon: "info", variant: "info" });
    },
    [removeFriendMut, showToast, tr],
  );
  const blockUser = useCallback(
    async (userId: string) => {
      await blockMut({ userId: userId as Id<"users"> });
      showToast(tr("userBlockedToast"), { icon: "ban", variant: "info" });
    },
    [blockMut, showToast, tr],
  );
  const unblockUser = useCallback(
    async (userId: string) => {
      await unblockMut({ userId: userId as Id<"users"> });
      showToast(tr("userUnblockedToast"), { icon: "info", variant: "info" });
    },
    [unblockMut, showToast, tr],
  );
  const shareRecipe = useCallback(
    (toUserId: string, recipe: Recipe, note?: string) =>
      shareRecipeMut({ toUserId: toUserId as Id<"users">, recipe: toRecipeSnapshot(recipe), note }),
    [shareRecipeMut],
  );
  const markInboxSeen = useCallback(() => markInboxSeenMut({}), [markInboxSeenMut]);
  const markFeedSeen = useCallback(() => markFeedSeenMut({}), [markFeedSeenMut]);
  const dismissFeedEvent = useCallback(
    (eventId: string) => dismissFeedMut({ eventId: eventId as Id<"activityEvents"> }),
    [dismissFeedMut],
  );
  const deleteInboxItem = useCallback(
    (kind: "share" | "notification", id: string) => deleteInboxMut({ kind, id }),
    [deleteInboxMut],
  );
  const saveSharedRecipe = useCallback(
    async (id: string) => {
      await saveSharedMut({ id: id as Id<"recipeShares"> });
      showToast(tr("savedToFavoritesToast"), { icon: "bookmark" });
    },
    [saveSharedMut, showToast, tr],
  );
  const setSocialProfile = useCallback(
    (args: {
      displayName?: string;
      bio?: string;
      discoverable?: boolean;
      feedVisibility?: "friends" | "private";
      friendListVisible?: boolean;
      avatarColor?: string;
      avatarEmoji?: string;
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

  const counts = countsQ ?? { feed: 0, friends: 0, inbox: 0, adminOpen: 0 };

  return useMemo(
    () => ({
      friends: (friendsQ ?? []) as MiniProfile[],
      incoming: (requestsQ?.incoming ?? []) as MiniProfile[],
      outgoing: (requestsQ?.outgoing ?? []) as (MiniProfile & {
        status: "pending_out" | "declined";
      })[],
      counts,
      isAdmin: myProfileQ?.isAdmin === true,
      badgeCount: counts.feed + counts.friends + counts.inbox,
      myProfile: myProfileQ ?? null,
      sendFriendRequest,
      sendFriendRequestTo,
      respondFriendRequest,
      removeFriend,
      blockUser,
      unblockUser,
      shareRecipe,
      markInboxSeen,
      markFeedSeen,
      dismissFeedEvent,
      deleteInboxItem,
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
      sendFriendRequestTo,
      respondFriendRequest,
      removeFriend,
      blockUser,
      unblockUser,
      shareRecipe,
      markInboxSeen,
      markFeedSeen,
      dismissFeedEvent,
      deleteInboxItem,
      saveSharedRecipe,
      setSocialProfile,
      sendAdminMessage,
    ],
  );
});
