import { useScrollToTop } from "@react-navigation/native";
import { useQuery } from "convex/react";
import { router, useFocusEffect } from "expo-router";
import {
  Bell,
  CalendarPlus,
  Check,
  ChefHat,
  Flame,
  Info,
  Star,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, FlatList, Image, Pressable, StyleSheet, View } from "react-native";

import AddFriendSheet from "@/components/AddFriendSheet";
import AddToPlanModal from "@/components/AddToPlanModal";
import Avatar from "@/components/Avatar";
import CollapsingTabHeader, {
  headerTranslateY,
  onHeaderScroll,
  resetHeader,
  useHeaderContentPadding,
} from "@/components/CollapsingTabHeader";
import InlineConfirm from "@/components/InlineConfirm";
import RatingStars from "@/components/RatingStars";
import type { Theme } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { useTheme } from "@/hooks/use-theme";
import { useDailyChefMateStore } from "@/hooks/use-dailychefmate-store";
import { useLanguage } from "@/hooks/use-language";
import { useSocial } from "@/hooks/use-social";
import { useIsDesktop } from "@/hooks/use-responsive";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Text } from "@/components/ui/Text";
import { Recipe } from "@/types/recipe";

type SocialView = "feed" | "friends" | "inbox";

function toRecipe(snapshot: any): Recipe {
  return { ...snapshot, isFavorite: false } as Recipe;
}

// Small "X" in the top-right corner of a feed/inbox card that opens a
// confirm strip before the message is removed.
function CardDeleteButton({ onPress }: { onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { theme } = useTheme();
  return (
    <Pressable style={styles.cardDelete} hitSlop={10} onPress={onPress} testID="message-delete">
      <X size={15} color={theme.textSecondary} />
    </Pressable>
  );
}

export default function SocialScreen() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const isDesktop = useIsDesktop();
  const topPad = useHeaderContentPadding();
  const listRef = useRef<FlatList<any>>(null);
  useScrollToTop(listRef);
  useFocusEffect(useCallback(() => resetHeader(), []));

  const [view, setView] = useState<SocialView>("feed");
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [planRecipe, setPlanRecipe] = useState<Recipe | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  // Key of the feed/inbox message currently showing its delete-confirm strip.
  const [confirmDeleteMsg, setConfirmDeleteMsg] = useState<string | null>(null);

  const {
    friends,
    incoming,
    outgoing,
    counts,
    myProfile,
    sendFriendRequest,
    respondFriendRequest,
    removeFriend,
    markInboxSeen,
    markFeedSeen,
    saveSharedRecipe,
    dismissFeedEvent,
    deleteInboxItem,
  } = useSocial();
  const { cacheRecipes } = useDailyChefMateStore();

  const feed = useQuery(api.social.feed) ?? [];
  const inbox = useQuery(api.social.inbox) ?? [];

  useEffect(() => {
    if (view === "inbox") markInboxSeen().catch(() => {});
  }, [view, inbox.length, markInboxSeen]);
  useEffect(() => {
    if (view === "feed") markFeedSeen().catch(() => {});
  }, [view, feed.length, markFeedSeen]);

  const openRecipe = useCallback(
    (snapshot: any) => {
      const r = toRecipe(snapshot);
      cacheRecipes([r]);
      router.push(`/recipe-detail?id=${r.id}`);
    },
    [cacheRecipes],
  );

  const segment = (
    <View style={styles.segmentWrap}>
      <SegmentedControl<SocialView>
        options={[
          { value: "feed", label: t("feed"), icon: <ChefHat size={15} color={view === "feed" ? theme.textPrimary : theme.textMuted} />, badge: counts.feed },
          { value: "friends", label: t("friends"), icon: <Users size={15} color={view === "friends" ? theme.textPrimary : theme.textMuted} />, badge: counts.friends },
          { value: "inbox", label: t("inbox"), icon: <Bell size={15} color={view === "inbox" ? theme.textPrimary : theme.textMuted} />, badge: counts.inbox },
        ]}
        value={view}
        onChange={setView}
        testID="social-view"
      />
    </View>
  );

  // ---- Feed ----
  const renderFeedItem = ({ item }: { item: (typeof feed)[number] }) => {
    const name = item.actor.displayName || item.actor.username;
    const verb =
      item.type === "created_recipe"
        ? t("feedCreated")
        : item.type === "rated_recipe"
          ? t("feedRated")
          : t("feedShared");
    const delKey = `feed:${item.id}`;
    return (
      <View style={[styles.card, styles.cardDeletable]}>
        <CardDeleteButton onPress={() => setConfirmDeleteMsg(delKey)} />
        {confirmDeleteMsg === delKey && (
          <InlineConfirm
            style={styles.removeConfirm}
            question={t("confirmDeleteMessage")}
            confirmLabel={t("deleteMessage")}
            destructive
            onConfirm={() => {
              dismissFeedEvent(item.id).catch(() => {});
              setConfirmDeleteMsg(null);
            }}
            onCancel={() => setConfirmDeleteMsg(null)}
          />
        )}
        <View style={styles.cardHead}>
          <Avatar
            name={name}
            initials={item.actor.initials}
            color={item.actor.avatarColor ?? undefined}
            emoji={item.actor.avatarEmoji ?? undefined}
            size={36}
          />
          <Text style={styles.line} numberOfLines={2}>
            <Text style={styles.name}>{name}</Text> {verb}
          </Text>
          {item.type === "rated_recipe" && item.rating != null && (
            <RatingStars value={item.rating} size={13} />
          )}
        </View>
        {item.recipe && (
          <Pressable style={styles.recipeRow} onPress={() => openRecipe(item.recipe)}>
            {item.recipe.image ? (
              <Image source={{ uri: item.recipe.image }} style={styles.recipeThumb} />
            ) : (
              <View style={[styles.recipeThumb, styles.thumbFallback]}>
                <ChefHat size={20} color={theme.textMuted} />
              </View>
            )}
            <Text style={styles.recipeName} numberOfLines={2}>
              {item.recipe.name}
            </Text>
            <Pressable
              hitSlop={8}
              style={styles.planBtn}
              onPress={() => setPlanRecipe(toRecipe(item.recipe))}
              testID="feed-add-to-plan"
            >
              <CalendarPlus size={20} color={theme.accent} />
            </Pressable>
          </Pressable>
        )}
      </View>
    );
  };

  const feedList = (
    <FlatList
      ref={listRef}
      data={feed}
      keyExtractor={(e) => e.id}
      renderItem={renderFeedItem}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      onScroll={isDesktop ? undefined : onHeaderScroll}
      scrollEventThrottle={16}
      ListEmptyComponent={
        <EmptyState
          icon={<Users size={24} color={theme.textMuted} />}
          title={t("noFeedYet")}
          action={{
            label: t("addFriend"),
            leftIcon: <UserPlus size={16} color={theme.textOnAccent} />,
            onPress: () => setAddFriendOpen(true),
          }}
        />
      }
    />
  );

  // ---- Friends ----
  const adminId = myProfile?.adminId ?? null;
  const friendsData = useMemo(
    () => [
      { kind: "add" as const, key: "add" },
      ...(adminId ? [{ kind: "admin" as const, key: "admin" }] : []),
      ...incoming.map((p) => ({ kind: "incoming" as const, key: `in-${p.id}`, profile: p })),
      ...outgoing.map((p) => ({ kind: "outgoing" as const, key: `out-${p.id}`, profile: p })),
      ...friends.map((p) => ({ kind: "friend" as const, key: `fr-${p.id}`, profile: p })),
    ],
    [adminId, incoming, outgoing, friends],
  );

  const renderFriendRow = ({ item }: { item: (typeof friendsData)[number] }) => {
    if (item.kind === "add") {
      return (
        <Pressable style={styles.addFriendBtn} onPress={() => setAddFriendOpen(true)} testID="friends-add">
          <UserPlus size={18} color={theme.accent} />
          <Text style={styles.addFriendText}>{t("addFriend")}</Text>
        </Pressable>
      );
    }
    if (item.kind === "admin") {
      return (
        <Pressable
          style={styles.adminContactBtn}
          onPress={() => router.push(`/user/${adminId}` as any)}
          testID="friends-message-admin"
        >
          <Info size={16} color={theme.accent} />
          <Text style={styles.adminContactText}>{t("messageAdmin")}</Text>
        </Pressable>
      );
    }
    const p = item.profile;
    const name = p.displayName || p.username;
    const removable = item.kind === "friend" || item.kind === "outgoing";
    const declined = item.kind === "outgoing" && item.profile.status === "declined";

    return (
      <View>
        <View style={styles.friendRow}>
          <Pressable
            style={styles.friendMain}
            onPress={() => router.push(`/user/${p.id}` as any)}
            testID={`friend-${p.id}`}
          >
            <Avatar
              name={name}
              initials={p.initials}
              color={p.avatarColor ?? undefined}
              emoji={p.avatarEmoji ?? undefined}
              size={40}
            />
            <View style={styles.friendText}>
              <Text style={styles.friendName} numberOfLines={1}>
                {name}
              </Text>
              {item.kind === "incoming" && <Text style={styles.friendMeta}>{t("incomingRequests")}</Text>}
              {item.kind === "outgoing" && !declined && (
                <Text style={styles.friendMeta}>{t("requestSentStatus")}</Text>
              )}
              {declined && (
                <Text style={[styles.friendMeta, styles.friendMetaDeclined]}>
                  {t("requestDeclinedStatus")}
                </Text>
              )}
              {item.kind === "friend" && !!p.username && (
                <Text style={styles.friendMeta}>@{p.username}</Text>
              )}
            </View>
          </Pressable>

          {declined && (
            <Pressable
              style={[styles.pillBtn, styles.pillPrimary]}
              onPress={() => sendFriendRequest(p.username).catch(() => {})}
              testID={`friend-resend-${p.id}`}
            >
              <UserPlus size={15} color={theme.textOnAccent} />
            </Pressable>
          )}

          {item.kind === "incoming" && (
            <View style={styles.rowActions}>
              <Pressable
                style={[styles.pillBtn, styles.pillPrimary]}
                onPress={() => respondFriendRequest(p.id, true)}
                testID={`friend-accept-${p.id}`}
              >
                <Check size={16} color={theme.textOnAccent} />
              </Pressable>
              <Pressable
                style={[styles.pillBtn, styles.pillMuted]}
                onPress={() => respondFriendRequest(p.id, false)}
                testID={`friend-decline-${p.id}`}
              >
                <X size={16} color={theme.textPrimary} />
              </Pressable>
            </View>
          )}
          {removable && (
            <Pressable
              style={[styles.pillBtn, styles.pillMuted]}
              onPress={() => setConfirmRemove(p.id)}
              testID={`friend-remove-${p.id}`}
            >
              <X size={16} color={theme.textPrimary} />
            </Pressable>
          )}
        </View>

        {confirmRemove === p.id && (
          <InlineConfirm
            style={styles.removeConfirm}
            question={item.kind === "outgoing" ? t("confirmCancelRequest") : t("confirmRemoveFriend")}
            confirmLabel={item.kind === "outgoing" ? t("cancelRequest") : t("removeFriend")}
            destructive
            onConfirm={() => {
              removeFriend(p.id);
              setConfirmRemove(null);
            }}
            onCancel={() => setConfirmRemove(null)}
          />
        )}
      </View>
    );
  };

  const friendsList = (
    <FlatList
      ref={listRef}
      data={friendsData}
      keyExtractor={(i) => i.key}
      renderItem={renderFriendRow}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      onScroll={isDesktop ? undefined : onHeaderScroll}
      scrollEventThrottle={16}
    />
  );

  // ---- Inbox ----
  const renderInboxItem = ({ item }: { item: (typeof inbox)[number] }) => {
    const delKey = `inbox:${item.kind}:${item.id}`;
    const delKind = item.kind === "recipe_share" ? ("share" as const) : ("notification" as const);
    return (
      <View>
        {confirmDeleteMsg === delKey && (
          <InlineConfirm
            style={styles.removeConfirm}
            question={t("confirmDeleteMessage")}
            confirmLabel={t("deleteMessage")}
            destructive
            onConfirm={() => {
              deleteInboxItem(delKind, item.id).catch(() => {});
              setConfirmDeleteMsg(null);
            }}
            onCancel={() => setConfirmDeleteMsg(null)}
          />
        )}
        {renderInboxBody(item)}
        <CardDeleteButton onPress={() => setConfirmDeleteMsg(delKey)} />
      </View>
    );
  };

  const renderInboxBody = (item: (typeof inbox)[number]) => {
    if (item.kind === "recipe_share") {
      const name = item.from?.displayName || item.from?.username || "?";
      return (
        <View style={[styles.card, styles.cardDeletable]}>
          <View style={styles.cardHead}>
            <Avatar
              name={name}
              initials={item.from?.initials ?? "?"}
              color={item.from?.avatarColor ?? undefined}
              emoji={item.from?.avatarEmoji ?? undefined}
              size={36}
            />
            <Text style={styles.line} numberOfLines={2}>
              <Text style={styles.name}>{name}</Text> {t("sharedWithYou")}
            </Text>
          </View>
          {!!item.note && <Text style={styles.note}>“{item.note}”</Text>}
          {item.recipe && (
            <Pressable style={styles.recipeRow} onPress={() => openRecipe(item.recipe)}>
              {item.recipe.image ? (
                <Image source={{ uri: item.recipe.image }} style={styles.recipeThumb} />
              ) : (
                <View style={[styles.recipeThumb, styles.thumbFallback]}>
                  <ChefHat size={20} color={theme.textMuted} />
                </View>
              )}
              <Text style={styles.recipeName} numberOfLines={2}>
                {item.recipe.name}
              </Text>
            </Pressable>
          )}
          <View style={styles.inboxActions}>
            <Pressable
              style={[styles.actionBtn, item.saved && styles.actionBtnDone]}
              onPress={() => saveSharedRecipe(item.id)}
              disabled={item.saved}
              testID={`inbox-save-${item.id}`}
            >
              <Text style={[styles.actionText, item.saved && styles.actionTextDone]}>
                {item.saved ? t("savedRecipeShare") : t("saveRecipeShare")}
              </Text>
            </Pressable>
            {item.recipe && (
              <Pressable
                style={styles.actionBtn}
                onPress={() => setPlanRecipe(toRecipe(item.recipe))}
                testID={`inbox-plan-${item.id}`}
              >
                <Text style={styles.actionText}>{t("addedToWeekPlanShort")}</Text>
              </Pressable>
            )}
          </View>
        </View>
      );
    }

    if (item.kind === "friend_accepted") {
      const name = item.from?.displayName || "?";
      return (
        <View style={[styles.card, styles.cardDeletable]}>
          <View style={styles.cardHead}>
            <Avatar
              name={name}
              initials={item.from?.initials ?? "?"}
              color={item.from?.avatarColor ?? undefined}
              emoji={item.from?.avatarEmoji ?? undefined}
              size={36}
            />
            <Text style={styles.line} numberOfLines={2}>
              <Text style={styles.name}>{name}</Text> {t("friendAcceptedYou")}
            </Text>
            <UserCheck size={18} color={theme.success} />
          </View>
          {item.from?.id && (
            <Pressable
              style={styles.actionBtn}
              onPress={() => router.push(`/user/${item.from!.id}` as any)}
            >
              <Text style={styles.actionText}>{t("friendProfile")}</Text>
            </Pressable>
          )}
        </View>
      );
    }

    if (item.kind === "recipe_favorited" || item.kind === "recipe_cooked") {
      const name = item.from?.displayName || "?";
      const verb = item.kind === "recipe_favorited" ? t("feedFavorited") : t("feedCooked");
      return (
        <View style={[styles.card, styles.cardDeletable]}>
          <View style={styles.cardHead}>
            <Avatar
              name={name}
              initials={item.from?.initials ?? "?"}
              color={item.from?.avatarColor ?? undefined}
              emoji={item.from?.avatarEmoji ?? undefined}
              size={36}
            />
            <Text style={styles.line} numberOfLines={3}>
              <Text style={styles.name}>{name}</Text> {verb}
              {item.recipeName ? <Text style={styles.name}> „{item.recipeName}"</Text> : null}
            </Text>
            {item.kind === "recipe_favorited" ? (
              <Star size={18} color={theme.star} fill={theme.star} />
            ) : (
              <Flame size={18} color={theme.warning} />
            )}
          </View>
        </View>
      );
    }

    if (item.kind === "recipe_rated") {
      const name = item.from?.displayName || "?";
      return (
        <View style={[styles.card, styles.cardDeletable]}>
          <View style={styles.cardHead}>
            <Avatar
              name={name}
              initials={item.from?.initials ?? "?"}
              color={item.from?.avatarColor ?? undefined}
              emoji={item.from?.avatarEmoji ?? undefined}
              size={36}
            />
            <Text style={styles.line} numberOfLines={3}>
              <Text style={styles.name}>{name}</Text> {t("ratedInInbox")}
              {item.recipeName ? <Text style={styles.name}> „{item.recipeName}"</Text> : null}
            </Text>
          </View>
          {item.rating != null && (
            <View style={{ marginTop: 8 }}>
              <RatingStars value={item.rating} size={16} />
            </View>
          )}
          {!!item.message && <Text style={styles.note}>“{item.message}”</Text>}
        </View>
      );
    }

    // info
    return (
      <View style={[styles.card, styles.cardDeletable]}>
        <View style={styles.cardHead}>
          <Info size={20} color={theme.accent} />
          <Text style={styles.line}>{item.message}</Text>
        </View>
      </View>
    );
  };

  const inboxList = (
    <FlatList
      ref={listRef}
      data={inbox}
      keyExtractor={(s) => `${s.kind}-${s.id}`}
      renderItem={renderInboxItem}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      onScroll={isDesktop ? undefined : onHeaderScroll}
      scrollEventThrottle={16}
      ListEmptyComponent={<EmptyState icon={<Bell size={24} color={theme.textMuted} />} title={t("inboxEmpty")} />}
    />
  );

  const body = (
    <>
      {segment}
      {view === "feed" ? feedList : view === "friends" ? friendsList : inboxList}
    </>
  );

  return (
    <View style={styles.container}>
      {!isDesktop && <CollapsingTabHeader />}
      {isDesktop ? (
        body
      ) : (
        <Animated.View
          style={[
            styles.bodyWrap,
            { paddingTop: topPad, marginBottom: -topPad, transform: [{ translateY: headerTranslateY }] },
          ]}
        >
          {body}
        </Animated.View>
      )}

      <AddFriendSheet visible={addFriendOpen} onClose={() => setAddFriendOpen(false)} />
      <AddToPlanModal
        recipe={planRecipe}
        visible={planRecipe !== null}
        onClose={() => setPlanRecipe(null)}
      />
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    bodyWrap: { flex: 1 },
    segmentWrap: { marginHorizontal: t.space[5], marginTop: t.space[4], marginBottom: t.space[1] },
    listContent: { padding: t.space[5], paddingBottom: t.space[10] },

    card: {
      backgroundColor: t.surface,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      borderRadius: t.radius.lg,
      padding: t.space[4],
      marginBottom: t.space[3],
    },
    cardDeletable: { paddingRight: t.space[8] },
    cardDelete: {
      position: "absolute",
      top: t.space[2],
      right: t.space[2],
      padding: 4,
      borderRadius: t.radius.sm,
      backgroundColor: t.surfaceSunken,
    },
    cardHead: { flexDirection: "row", alignItems: "center", gap: t.space[3] },
    line: { flex: 1, fontFamily: t.font.body, fontSize: 14, color: t.textSecondary },
    name: { fontFamily: t.font.bodyBold, color: t.textPrimary },
    note: { marginTop: t.space[2], fontFamily: t.font.body, fontSize: 14, color: t.textPrimary, fontStyle: "italic" },
    recipeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.space[3],
      marginTop: t.space[3],
      padding: t.space[3],
      borderRadius: t.radius.md,
      backgroundColor: t.surfaceSunken,
    },
    recipeThumb: { width: 44, height: 44, borderRadius: t.radius.sm, backgroundColor: t.surface },
    thumbFallback: { alignItems: "center", justifyContent: "center" },
    recipeName: { flex: 1, fontFamily: t.font.bodySemibold, fontSize: 15, color: t.textPrimary },
    planBtn: { padding: 4 },
    inboxActions: { flexDirection: "row", gap: t.space[3], marginTop: t.space[3] },
    actionBtn: {
      paddingHorizontal: t.space[4],
      paddingVertical: t.space[2],
      borderRadius: t.radius.pill,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.accent,
      backgroundColor: t.accentSubtle,
      alignSelf: "flex-start",
      marginTop: t.space[2],
    },
    actionBtnDone: { borderColor: t.border, backgroundColor: t.surface },
    actionText: { fontFamily: t.font.bodyBold, fontSize: 13, color: t.accent },
    actionTextDone: { color: t.textSecondary },

    addFriendBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: t.space[3],
      paddingVertical: t.space[4],
      borderRadius: t.radius.md,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.accent,
      backgroundColor: t.accentSubtle,
      marginBottom: t.space[3],
    },
    addFriendText: { fontFamily: t.font.bodyBold, fontSize: 15, color: t.accent },
    adminContactBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: t.space[3],
      paddingVertical: t.space[3],
      borderRadius: t.radius.md,
      backgroundColor: t.surfaceSunken,
      marginBottom: t.space[3],
    },
    adminContactText: { fontFamily: t.font.bodySemibold, fontSize: 14, color: t.textPrimary },
    friendRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.space[3],
      paddingVertical: t.space[3],
      borderBottomWidth: t.borderWidth.hairline,
      borderBottomColor: t.border,
    },
    friendMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: t.space[3] },
    friendText: { flex: 1 },
    friendName: { fontFamily: t.font.bodySemibold, fontSize: 15, color: t.textPrimary },
    friendMeta: { fontFamily: t.font.body, fontSize: 12, color: t.textSecondary, marginTop: 2 },
    friendMetaDeclined: { color: t.danger, fontFamily: t.font.bodyBold },
    rowActions: { flexDirection: "row", gap: t.space[2] },
    pillBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
    pillPrimary: { backgroundColor: t.accent },
    pillMuted: { backgroundColor: t.surfaceSunken, borderWidth: t.borderWidth.hairline, borderColor: t.border },
    removeConfirm: { paddingVertical: t.space[3] },
  });
