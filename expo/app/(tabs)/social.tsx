import { useScrollToTop } from "@react-navigation/native";
import { useQuery } from "convex/react";
import { router, useFocusEffect } from "expo-router";
import { Bell, CalendarPlus, Check, ChefHat, UserPlus, Users, X } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";

import AddFriendSheet from "@/components/AddFriendSheet";
import AddToPlanModal from "@/components/AddToPlanModal";
import Avatar from "@/components/Avatar";
import CollapsingTabHeader, {
  headerTranslateY,
  onHeaderScroll,
  resetHeader,
  useHeaderContentPadding,
} from "@/components/CollapsingTabHeader";
import Colors from "@/constants/colors";
import { api } from "@/convex/_generated/api";
import { useDailyChefMateStore } from "@/hooks/use-dailychefmate-store";
import { useLanguage } from "@/hooks/use-language";
import { useSocial } from "@/hooks/use-social";
import { useIsDesktop } from "@/hooks/use-responsive";
import { Recipe } from "@/types/recipe";

type SocialView = "feed" | "friends" | "inbox";

function toRecipe(snapshot: any): Recipe {
  return { ...snapshot, isFavorite: false } as Recipe;
}

export default function SocialScreen() {
  const { t } = useLanguage();
  const isDesktop = useIsDesktop();
  const topPad = useHeaderContentPadding();
  const listRef = useRef<FlatList<any>>(null);
  useScrollToTop(listRef);
  useFocusEffect(useCallback(() => resetHeader(), []));

  const [view, setView] = useState<SocialView>("feed");
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [planRecipe, setPlanRecipe] = useState<Recipe | null>(null);

  const {
    friends,
    incoming,
    outgoing,
    respondFriendRequest,
    removeFriend,
    markSharesSeen,
    saveSharedRecipe,
  } = useSocial();
  const { cacheRecipes } = useDailyChefMateStore();

  const feed = useQuery(api.social.feed) ?? [];
  const inbox = useQuery(api.social.shareInbox) ?? [];

  useEffect(() => {
    if (view === "inbox") markSharesSeen().catch(() => {});
  }, [view, inbox.length, markSharesSeen]);

  const openRecipe = useCallback(
    (snapshot: any) => {
      const r = toRecipe(snapshot);
      cacheRecipes([r]);
      router.push(`/recipe-detail?id=${r.id}`);
    },
    [cacheRecipes],
  );

  const segment = (
    <View style={styles.segment}>
      {(["feed", "friends", "inbox"] as SocialView[]).map((v) => {
        const active = view === v;
        const Icon = v === "feed" ? ChefHat : v === "friends" ? Users : Bell;
        const label = v === "feed" ? t("feed") : v === "friends" ? t("friends") : t("inbox");
        return (
          <Pressable
            key={v}
            style={[styles.segmentBtn, active && styles.segmentBtnActive]}
            onPress={() => setView(v)}
            testID={`social-view-${v}`}
          >
            <Icon size={16} color={active ? Colors.white : Colors.textLight} />
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  // ---- Feed ----
  const renderFeedItem = ({ item }: { item: (typeof feed)[number] }) => {
    const name = item.actor.displayName || item.actor.username;
    const verb = item.type === "created_recipe" ? t("feedCreated") : t("feedShared");
    return (
      <View style={styles.feedCard}>
        <View style={styles.feedHead}>
          <Avatar name={name} initials={item.actor.initials} size={36} />
          <Text style={styles.feedLine} numberOfLines={2}>
            <Text style={styles.feedName}>{name}</Text> {verb}
          </Text>
        </View>
        {item.recipe && (
          <Pressable style={styles.recipeRow} onPress={() => openRecipe(item.recipe)}>
            {item.recipe.image ? (
              <Image source={{ uri: item.recipe.image }} style={styles.recipeThumb} />
            ) : (
              <View style={[styles.recipeThumb, styles.thumbFallback]}>
                <ChefHat size={20} color={Colors.textLight} />
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
              <CalendarPlus size={20} color={Colors.primary} />
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
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>{t("noFeedYet")}</Text>
          <Pressable style={styles.cta} onPress={() => setAddFriendOpen(true)}>
            <UserPlus size={18} color={Colors.white} />
            <Text style={styles.ctaText}>{t("addFriend")}</Text>
          </Pressable>
        </View>
      }
    />
  );

  // ---- Friends ----
  const friendsData = useMemo(
    () => [
      { kind: "add" as const, key: "add" },
      ...incoming.map((p) => ({ kind: "incoming" as const, key: `in-${p.id}`, profile: p })),
      ...outgoing.map((p) => ({ kind: "outgoing" as const, key: `out-${p.id}`, profile: p })),
      ...friends.map((p) => ({ kind: "friend" as const, key: `fr-${p.id}`, profile: p })),
    ],
    [incoming, outgoing, friends],
  );

  const renderFriendRow = ({ item }: { item: (typeof friendsData)[number] }) => {
    if (item.kind === "add") {
      return (
        <Pressable style={styles.addFriendBtn} onPress={() => setAddFriendOpen(true)} testID="friends-add">
          <UserPlus size={18} color={Colors.primary} />
          <Text style={styles.addFriendText}>{t("addFriend")}</Text>
        </Pressable>
      );
    }
    const p = item.profile;
    const name = p.displayName || p.username;
    return (
      <View style={styles.friendRow}>
        <Pressable
          style={styles.friendMain}
          onPress={() => router.push(`/user/${p.id}` as any)}
          testID={`friend-${p.id}`}
        >
          <Avatar name={name} initials={p.initials} size={40} />
          <View style={styles.friendText}>
            <Text style={styles.friendName} numberOfLines={1}>
              {name}
            </Text>
            {item.kind === "incoming" && <Text style={styles.friendMeta}>{t("incomingRequests")}</Text>}
            {item.kind === "outgoing" && <Text style={styles.friendMeta}>{t("pendingRequests")}</Text>}
            {item.kind === "friend" && !!p.username && (
              <Text style={styles.friendMeta}>@{p.username}</Text>
            )}
          </View>
        </Pressable>

        {item.kind === "incoming" && (
          <View style={styles.rowActions}>
            <Pressable
              style={[styles.pillBtn, styles.pillPrimary]}
              onPress={() => respondFriendRequest(p.id, true)}
              testID={`friend-accept-${p.id}`}
            >
              <Check size={16} color={Colors.white} />
            </Pressable>
            <Pressable
              style={[styles.pillBtn, styles.pillMuted]}
              onPress={() => respondFriendRequest(p.id, false)}
              testID={`friend-decline-${p.id}`}
            >
              <X size={16} color={Colors.text} />
            </Pressable>
          </View>
        )}
        {item.kind === "outgoing" && (
          <Pressable style={[styles.pillBtn, styles.pillMuted]} onPress={() => removeFriend(p.id)}>
            <X size={16} color={Colors.text} />
          </Pressable>
        )}
        {item.kind === "friend" && (
          <Pressable style={[styles.pillBtn, styles.pillMuted]} onPress={() => removeFriend(p.id)}>
            <X size={16} color={Colors.text} />
          </Pressable>
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
      ListEmptyComponent={<Text style={styles.emptyText}>{t("noFriendsYet")}</Text>}
    />
  );

  // ---- Inbox ----
  const renderInboxItem = ({ item }: { item: (typeof inbox)[number] }) => {
    const name = item.from.displayName || item.from.username;
    return (
      <View style={styles.feedCard}>
        <View style={styles.feedHead}>
          <Avatar name={name} initials={item.from.initials} size={36} />
          <Text style={styles.feedLine} numberOfLines={2}>
            <Text style={styles.feedName}>{name}</Text> {t("sharedWithYou")}
          </Text>
        </View>
        {!!item.note && <Text style={styles.note}>“{item.note}”</Text>}
        <Pressable style={styles.recipeRow} onPress={() => openRecipe(item.recipe)}>
          {item.recipe.image ? (
            <Image source={{ uri: item.recipe.image }} style={styles.recipeThumb} />
          ) : (
            <View style={[styles.recipeThumb, styles.thumbFallback]}>
              <ChefHat size={20} color={Colors.textLight} />
            </View>
          )}
          <Text style={styles.recipeName} numberOfLines={2}>
            {item.recipe.name}
          </Text>
        </Pressable>
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
          <Pressable
            style={styles.actionBtn}
            onPress={() => setPlanRecipe(toRecipe(item.recipe))}
            testID={`inbox-plan-${item.id}`}
          >
            <Text style={styles.actionText}>{t("addedToWeekPlanShort")}</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const inboxList = (
    <FlatList
      ref={listRef}
      data={inbox}
      keyExtractor={(s) => s.id}
      renderItem={renderInboxItem}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      onScroll={isDesktop ? undefined : onHeaderScroll}
      scrollEventThrottle={16}
      ListEmptyComponent={<Text style={styles.emptyText}>{t("inboxEmpty")}</Text>}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  bodyWrap: { flex: 1 },
  segment: { flexDirection: "row", gap: 8, marginHorizontal: 16, marginTop: 12, marginBottom: 4 },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Colors.cardSecondary,
  },
  segmentBtnActive: { backgroundColor: Colors.primary },
  segmentText: { fontSize: 13, fontWeight: "700", color: Colors.textLight },
  segmentTextActive: { color: Colors.white },
  listContent: { padding: 16, paddingBottom: 48 },

  feedCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  feedHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  feedLine: { flex: 1, fontSize: 14, color: Colors.textLight },
  feedName: { fontWeight: "700", color: Colors.text },
  note: { marginTop: 8, fontSize: 14, color: Colors.text, fontStyle: "italic" },
  recipeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    padding: 8,
    borderRadius: 10,
    backgroundColor: Colors.cardSecondary,
  },
  recipeThumb: { width: 44, height: 44, borderRadius: 8, backgroundColor: Colors.border },
  thumbFallback: { alignItems: "center", justifyContent: "center" },
  recipeName: { flex: 1, fontSize: 15, fontWeight: "600", color: Colors.text },
  planBtn: { padding: 4 },
  inboxActions: { flexDirection: "row", gap: 8, marginTop: 10 },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.cardSecondary,
  },
  actionBtnDone: { borderColor: Colors.border, backgroundColor: Colors.card },
  actionText: { fontSize: 13, fontWeight: "700", color: Colors.primary },
  actionTextDone: { color: Colors.textLight },

  addFriendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.cardSecondary,
    marginBottom: 12,
  },
  addFriendText: { fontSize: 15, fontWeight: "700", color: Colors.primary },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  friendMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  friendText: { flex: 1 },
  friendName: { fontSize: 15, fontWeight: "600", color: Colors.text },
  friendMeta: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  rowActions: { flexDirection: "row", gap: 6 },
  pillBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  pillPrimary: { backgroundColor: Colors.primary },
  pillMuted: { backgroundColor: Colors.cardSecondary },

  emptyWrap: { alignItems: "center", marginTop: 40, gap: 16 },
  emptyText: { textAlign: "center", color: Colors.textLight, marginTop: 32, fontSize: 15 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  ctaText: { color: Colors.white, fontWeight: "700", fontSize: 14 },
});
