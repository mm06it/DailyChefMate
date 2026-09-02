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
  Megaphone,
  Send,
  Sparkles,
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
import { timeAgo } from "@/lib/time-ago";

type SocialView = "feed" | "friends" | "inbox";

function toRecipe(snapshot: any): Recipe {
  return { ...snapshot, isFavorite: false } as Recipe;
}

// ---- Message-type identity (icon chip + tint), shared by feed and inbox ----

type EventKind =
  | "shared"
  | "created"
  | "rated"
  | "cooked"
  | "favorited"
  | "friend"
  | "info";

const feedKind = (type: string): EventKind =>
  type === "created_recipe" ? "created" : type === "rated_recipe" ? "rated" : "shared";

const inboxKind = (kind: string): EventKind => {
  switch (kind) {
    case "recipe_share":
      return "shared";
    case "friend_accepted":
      return "friend";
    case "recipe_favorited":
      return "favorited";
    case "recipe_cooked":
      return "cooked";
    case "recipe_rated":
      return "rated";
    default:
      return "info";
  }
};

// Mirrors the Badge tones so the chip colours match the rest of the design system.
function typeToneColors(t: Theme, kind: EventKind): { bg: string; fg: string } {
  switch (kind) {
    case "shared":
      return { bg: t.accentSubtle, fg: t.accent };
    case "created":
    case "friend":
      return { bg: t.successSubtle, fg: t.success };
    case "cooked":
      return { bg: t.warningSubtle, fg: t.warning };
    case "rated":
    case "favorited":
      return { bg: t.warningSubtle, fg: t.star };
    default:
      return { bg: t.surfaceSunken, fg: t.textSecondary };
  }
}

function TypeGlyph({
  kind,
  color,
  size = 11,
}: {
  kind: EventKind;
  color: string;
  size?: number;
}) {
  switch (kind) {
    case "shared":
      return <Send size={size} color={color} />;
    case "created":
      return <ChefHat size={size} color={color} />;
    case "rated":
      return <Sparkles size={size} color={color} />;
    case "cooked":
      return <Flame size={size} color={color} />;
    case "favorited":
      return <Star size={size} color={color} fill={color} />;
    case "friend":
      return <UserCheck size={size} color={color} />;
    default:
      return <Megaphone size={size} color={color} />;
  }
}

// Actor avatar with the type chip pinned to its lower-right corner. `ringColor`
// is the card background so the chip reads as cut out of the avatar.
function ActorAvatar({
  kind,
  name,
  initials,
  color,
  emoji,
  ringColor,
}: {
  kind: EventKind;
  name: string;
  initials: string;
  color?: string;
  emoji?: string;
  ringColor: string;
}) {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const c = typeToneColors(theme, kind);
  return (
    <View style={styles.avatarWrap}>
      <Avatar name={name} initials={initials} color={color} emoji={emoji} size={36} />
      <View style={[styles.typeBadge, { backgroundColor: c.bg, borderColor: ringColor }]}>
        <TypeGlyph kind={kind} color={c.fg} />
      </View>
    </View>
  );
}

// Bottom-of-card line: relative time, with an unread dot + "Neu" while new.
function CardMeta({ ts, unread }: { ts: number; unread: boolean }) {
  const { t } = useLanguage();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.metaRow}>
      {unread && <View style={styles.unreadDot} />}
      <Text style={styles.metaText}>
        {unread ? `${t("statusNew")} · ${timeAgo(ts, t)}` : timeAgo(ts, t)}
      </Text>
    </View>
  );
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

// Shared chrome for a feed / inbox message: collapsed summary row (avatar +
// type chip + "Name did X" + a "tap to view" nudge), an optional expanded body,
// and the relative-time footer. Tapping the row toggles the body open and, on
// first open, marks the message seen (handled by the caller's `onPress`).
function MessageCard({
  leading,
  name,
  verb,
  object,
  expandable,
  open,
  unread,
  createdAt,
  onPress,
  onRequestDelete,
  deleteStrip,
  children,
}: {
  leading: React.ReactNode;
  name: string;
  verb: string;
  object?: string;
  expandable: boolean;
  open: boolean;
  unread: boolean;
  createdAt: number;
  onPress: () => void;
  onRequestDelete: () => void;
  deleteStrip?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const { t } = useLanguage();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.card, styles.cardDeletable, unread && styles.cardUnread]}>
      <CardDeleteButton onPress={onRequestDelete} />
      {deleteStrip}
      <Pressable style={styles.cardHead} onPress={onPress} disabled={!expandable && !unread}>
        {leading}
        <View style={styles.headText}>
          <Text style={styles.line} numberOfLines={3}>
            {!!name && <Text style={styles.name}>{name}</Text>}
            {!!name && " "}
            {verb}
            {object ? <Text style={styles.name}> „{object}"</Text> : null}
          </Text>
          {expandable && !open && <Text style={styles.hint}>{t("tapToView")}</Text>}
        </View>
      </Pressable>
      {open && children ? <View style={styles.expandBody}>{children}</View> : null}
      <CardMeta ts={createdAt} unread={unread} />
    </View>
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

  const [view, setView] = useState<SocialView>("feed");
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [planRecipe, setPlanRecipe] = useState<Recipe | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  // Key of the feed/inbox message currently showing its delete-confirm strip.
  const [confirmDeleteMsg, setConfirmDeleteMsg] = useState<string | null>(null);
  // Cards the user has tapped open this visit. Collapsed by default; opening a
  // card also marks it seen (turns the unread wash off + drops the count).
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const {
    friends,
    incoming,
    outgoing,
    counts,
    myProfile,
    sendFriendRequest,
    respondFriendRequest,
    removeFriend,
    markFeedEventSeen,
    markInboxItemSeen,
    saveSharedRecipe,
    dismissFeedEvent,
    deleteInboxItem,
  } = useSocial();
  const { cacheRecipes } = useDailyChefMateStore();

  const feed = useQuery(api.social.feed) ?? [];
  const inbox = useQuery(api.social.inbox) ?? [];

  // Fresh visit: collapse every card again.
  useFocusEffect(
    useCallback(() => {
      resetHeader();
      setExpanded(new Set());
    }, []),
  );

  // Toggle a card open/closed. `onOpen` fires only on the collapsed -> open
  // transition (used to mark the message seen).
  const toggleCard = useCallback((key: string, onOpen?: () => void) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
        onOpen?.();
      }
      return next;
    });
  }, []);

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
    const kind = feedKind(item.type);
    const unread = !item.seen;
    const open = expanded.has(delKey);
    return (
      <MessageCard
        leading={
          <ActorAvatar
            kind={kind}
            name={name}
            initials={item.actor.initials}
            color={item.actor.avatarColor ?? undefined}
            emoji={item.actor.avatarEmoji ?? undefined}
            ringColor={unread ? theme.accentSubtle : theme.surface}
          />
        }
        name={name}
        verb={verb}
        expandable
        open={open}
        unread={unread}
        createdAt={item.createdAt}
        onPress={() => toggleCard(delKey, () => markFeedEventSeen(item.id).catch(() => {}))}
        onRequestDelete={() => setConfirmDeleteMsg(delKey)}
        deleteStrip={
          confirmDeleteMsg === delKey ? (
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
          ) : null
        }
      >
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
        {item.type === "rated_recipe" && item.rating != null && (
          <View style={styles.ratingRow}>
            <RatingStars value={item.rating} size={16} />
          </View>
        )}
      </MessageCard>
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
    const kind = inboxKind(item.kind);
    const unread = !item.seen;
    const delKey = `inbox:${item.kind}:${item.id}`;
    const open = expanded.has(delKey);
    const delKind = item.kind === "recipe_share" ? ("share" as const) : ("notification" as const);
    const markSeen = () => markInboxItemSeen(delKind, item.id).catch(() => {});

    const name =
      item.kind === "recipe_share"
        ? item.from?.displayName || item.from?.username || "?"
        : item.from?.displayName || "?";

    let verb = "";
    let object: string | undefined;
    let expandable = false;
    if (item.kind === "recipe_share") {
      verb = t("sharedWithYou");
      expandable = true;
    } else if (item.kind === "friend_accepted") {
      verb = t("friendAcceptedYou");
      expandable = !!item.from?.id;
    } else if (item.kind === "recipe_favorited") {
      verb = t("feedFavorited");
      object = item.recipeName || undefined;
    } else if (item.kind === "recipe_cooked") {
      verb = t("feedCooked");
      object = item.recipeName || undefined;
    } else if (item.kind === "recipe_rated") {
      verb = t("ratedInInbox");
      object = item.recipeName || undefined;
      expandable = item.rating != null || !!item.message;
    } else {
      verb = item.message || "";
    }

    const infoTint = typeToneColors(theme, "info");
    const leading =
      item.kind === "info" ? (
        <View style={[styles.standaloneIcon, { backgroundColor: infoTint.bg }]}>
          <Megaphone size={18} color={infoTint.fg} />
        </View>
      ) : (
        <ActorAvatar
          kind={kind}
          name={name}
          initials={item.from?.initials ?? "?"}
          color={item.from?.avatarColor ?? undefined}
          emoji={item.from?.avatarEmoji ?? undefined}
          ringColor={unread ? theme.accentSubtle : theme.surface}
        />
      );

    const onPress = expandable
      ? () => toggleCard(delKey, markSeen)
      : () => {
          if (unread) markSeen();
        };

    return (
      <MessageCard
        leading={leading}
        name={item.kind === "info" ? "" : name}
        verb={verb}
        object={object}
        expandable={expandable}
        open={open}
        unread={unread}
        createdAt={item.createdAt}
        onPress={onPress}
        onRequestDelete={() => setConfirmDeleteMsg(delKey)}
        deleteStrip={
          confirmDeleteMsg === delKey ? (
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
          ) : null
        }
      >
        {item.kind === "recipe_share" && (
          <>
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
          </>
        )}

        {item.kind === "friend_accepted" && item.from?.id && (
          <Pressable
            style={styles.actionBtn}
            onPress={() => router.push(`/user/${item.from!.id}` as any)}
          >
            <Text style={styles.actionText}>{t("friendProfile")}</Text>
          </Pressable>
        )}

        {item.kind === "recipe_rated" && (
          <>
            {item.rating != null && (
              <View style={styles.ratingRow}>
                <RatingStars value={item.rating} size={16} />
              </View>
            )}
            {!!item.message && <Text style={styles.note}>“{item.message}”</Text>}
          </>
        )}
      </MessageCard>
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
    cardUnread: { backgroundColor: t.accentSubtle, borderColor: t.accentSubtle },
    cardDelete: {
      position: "absolute",
      top: t.space[2],
      right: t.space[2],
      padding: 4,
      borderRadius: t.radius.sm,
      backgroundColor: t.surfaceSunken,
    },
    cardHead: { flexDirection: "row", alignItems: "center", gap: t.space[3] },

    // Actor avatar + type chip (chip pinned to the avatar's top-right corner)
    avatarWrap: { width: 36, height: 36 },
    typeBadge: {
      position: "absolute",
      right: -4,
      top: -4,
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
    },
    standaloneIcon: {
      width: 36,
      height: 36,
      borderRadius: t.radius.md,
      alignItems: "center",
      justifyContent: "center",
    },

    // Collapsed summary row
    headText: { flex: 1 },
    hint: { fontFamily: t.font.bodyMedium, fontSize: 11, color: t.accent, marginTop: 2 },
    expandBody: { marginTop: t.space[1] },
    ratingRow: { marginTop: t.space[3] },

    // Bottom meta line (relative time + unread marker)
    metaRow: { flexDirection: "row", alignItems: "center", gap: t.space[2], marginTop: t.space[3] },
    unreadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: t.accent },
    metaText: { fontFamily: t.font.bodyMedium, fontSize: 11, color: t.textMuted },
    line: { fontFamily: t.font.body, fontSize: 14, color: t.textSecondary },
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
