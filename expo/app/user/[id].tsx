import { useQuery } from "convex/react";
import { Stack, router, useLocalSearchParams } from "expo-router";
import {
  Ban,
  Calendar,
  Check,
  ChefHat,
  Flag,
  Flame,
  ShieldCheck,
  Star,
  Users as UsersIcon,
} from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import Avatar from "@/components/Avatar";
import InlineConfirm from "@/components/InlineConfirm";
import RecipeCard from "@/components/RecipeCard";
import { useToast } from "@/components/Toast";
import type { Theme } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { useTheme } from "@/hooks/use-theme";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useDailyChefMateStore } from "@/hooks/use-dailychefmate-store";
import { useLanguage } from "@/hooks/use-language";
import { useSocial, type AdminCategory } from "@/hooks/use-social";
import { Recipe } from "@/types/recipe";

const ADMIN_CATS: AdminCategory[] = ["feedback", "bug", "report_user", "other"];

export default function UserProfileScreen() {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLanguage();
  const {
    sendFriendRequest,
    sendFriendRequestTo,
    respondFriendRequest,
    removeFriend,
    blockUser,
    unblockUser,
    sendAdminMessage,
  } = useSocial();
  const { cacheRecipes } = useDailyChefMateStore();
  const { showToast } = useToast();

  const [confirm, setConfirm] = useState<null | "remove" | "block" | "unblock">(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSent, setReportSent] = useState(false);
  const [listMode, setListMode] = useState<"created" | "favorites" | "cooked" | "friends">("created");

  // admin-message form
  const [adminCat, setAdminCat] = useState<AdminCategory>("feedback");
  const [adminMsg, setAdminMsg] = useState("");
  const [adminWho, setAdminWho] = useState("");
  const [adminSent, setAdminSent] = useState(false);
  const checkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!adminSent) return;
    Animated.spring(checkAnim, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
    const timer = setTimeout(() => router.back(), 3000);
    return () => clearTimeout(timer);
  }, [adminSent, checkAnim]);

  const data = useQuery(api.social.userPublic, id ? { userId: id as Id<"users"> } : "skip");

  const recipes: Recipe[] = useMemo(
    () => (data?.recipes ?? []).map((r: any) => ({ ...r, isFavorite: false })),
    [data],
  );
  const favorites: Recipe[] = useMemo(
    () => (data?.favorites ?? []).map((r: any) => ({ ...r, isFavorite: false })),
    [data],
  );
  const cooked: Recipe[] = useMemo(
    () => (data?.cooked ?? []).map((r: any) => ({ ...r, isFavorite: false })),
    [data],
  );
  const friendsList: any[] = useMemo(() => data?.friendsList ?? [], [data]);

  if (data === undefined) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: t("friendProfile") }} />
        <Text style={styles.muted}>…</Text>
      </View>
    );
  }
  if (data === null) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: t("friendProfile") }} />
        <Text style={styles.muted}>{t("userNotFound")}</Text>
      </View>
    );
  }

  const name = data.displayName || data.username;
  const memberSince = new Date(data.memberSince).toLocaleDateString();

  const openRecipe = (r: Recipe) => {
    cacheRecipes([r]);
    router.push(`/recipe-detail?id=${r.id}`);
  };

  // ---- Admin profile: message form ----
  if (data.isAdmin && !data.isSelf) {
    const catLabel = (c: AdminCategory) =>
      c === "feedback"
        ? t("adminCatFeedback")
        : c === "bug"
          ? t("adminCatBug")
          : c === "report_user"
            ? t("adminCatReport")
            : t("adminCatOther");

    const isReport = adminCat === "report_user";
    const minLen = isReport ? 10 : 1;
    const valid = adminMsg.trim().length >= minLen;

    const submit = async () => {
      if (!valid) return;
      try {
        await sendAdminMessage({
          category: adminCat,
          message: adminMsg,
          reportedQuery: isReport ? adminWho.trim() || undefined : undefined,
        });
        setAdminSent(true);
        setAdminMsg("");
        setAdminWho("");
      } catch (e) {
        console.error("sendAdminMessage failed", e);
      }
    };

    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: name || t("friendProfile") }} />
        <View style={styles.adminForm}>
          <View style={styles.header}>
            <Avatar
              name={name}
              initials={data.initials}
              color={data.avatarColor ?? undefined}
              emoji={data.avatarEmoji ?? undefined}
              size={72}
            />
            <View style={styles.adminBadge}>
              <ShieldCheck size={14} color={theme.textOnAccent} />
              <Text style={styles.adminBadgeText}>Admin</Text>
            </View>
            <Text style={styles.pageName}>{name}</Text>
          </View>

          {adminSent ? (
            <View style={styles.sentWrap}>
              <Animated.View
                style={[
                  styles.sentCircle,
                  { transform: [{ scale: checkAnim }], opacity: checkAnim },
                ]}
              >
                <Check size={40} color={theme.textOnAccent} />
              </Animated.View>
              <Text style={styles.sentText}>{t("adminThanks")}</Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>{t("helpAndFeedback")}</Text>

              <View style={styles.catRow}>
                {ADMIN_CATS.map((c) => (
                  <Pressable
                    key={c}
                    style={[styles.catChip, adminCat === c && styles.catChipOn]}
                    onPress={() => setAdminCat(c)}
                  >
                    <Text style={[styles.catChipText, adminCat === c && styles.catChipTextOn]}>
                      {catLabel(c)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {isReport && (
                <TextInput
                  style={styles.input}
                  value={adminWho}
                  onChangeText={setAdminWho}
                  placeholder={t("adminReportWhoLabel")}
                  placeholderTextColor={theme.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              )}

              <TextInput
                style={[styles.input, styles.textArea]}
                value={adminMsg}
                onChangeText={setAdminMsg}
                placeholder={isReport ? t("reportReasonMin") : t("yourMessage")}
                placeholderTextColor={theme.textMuted}
                multiline
                maxLength={2000}
              />
              {isReport && adminMsg.trim().length > 0 && adminMsg.trim().length < 10 && (
                <Text style={styles.hintText}>{t("reportReasonMin")}</Text>
              )}

              <Pressable
                style={[styles.primaryBtn, !valid && styles.primaryBtnDisabled]}
                onPress={submit}
                disabled={!valid}
              >
                <Text style={styles.primaryBtnText}>{t("send")}</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    );
  }

  // ---- Normal profile ----
  const statusButton = () => {
    if (data.isSelf) return null;
    if (data.blockedByThem) {
      return <Text style={styles.muted}>{t("blockedByThisUser")}</Text>;
    }
    if (data.iBlocked) {
      return confirm === "unblock" ? (
        <InlineConfirm
          question={t("confirmUnblock")}
          confirmLabel={t("unblock")}
          onConfirm={() => {
            unblockUser(data.id);
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      ) : (
        <View style={styles.blockedWrap}>
          <Text style={styles.muted}>{t("youBlockedThisUser")}</Text>
          <Pressable style={[styles.statusBtn, styles.statusMuted]} onPress={() => setConfirm("unblock")}>
            <Text style={styles.statusMutedText}>{t("unblock")}</Text>
          </Pressable>
        </View>
      );
    }
    if (data.status === "accepted") {
      return confirm === "remove" ? (
        <InlineConfirm
          question={t("confirmRemoveFriend")}
          confirmLabel={t("removeFriend")}
          destructive
          onConfirm={() => {
            removeFriend(data.id);
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      ) : (
        <View style={styles.blockedWrap}>
          <Text style={[styles.statusChip, styles.statusChipAccepted]}>
            {t("requestAcceptedStatus")}
          </Text>
          <Pressable style={[styles.statusBtn, styles.statusMuted]} onPress={() => setConfirm("remove")}>
            <Text style={styles.statusMutedText}>{t("removeFriend")}</Text>
          </Pressable>
        </View>
      );
    }
    if (data.status === "pending_out") {
      return confirm === "remove" ? (
        <InlineConfirm
          question={t("confirmCancelRequest")}
          confirmLabel={t("cancelRequest")}
          destructive
          onConfirm={() => {
            removeFriend(data.id);
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      ) : (
        <View style={styles.blockedWrap}>
          <Text style={[styles.statusChip, styles.statusChipPending]}>{t("requestSentStatus")}</Text>
          <Pressable style={[styles.statusBtn, styles.statusMuted]} onPress={() => setConfirm("remove")}>
            <Text style={styles.statusMutedText}>{t("cancelRequest")}</Text>
          </Pressable>
        </View>
      );
    }
    if (data.status === "declined") {
      return (
        <View style={styles.blockedWrap}>
          <Text style={[styles.statusChip, styles.statusChipDeclined]}>{t("requestDeclinedStatus")}</Text>
          <Pressable
            style={[styles.statusBtn, styles.statusPrimary]}
            onPress={() => sendFriendRequest(data.username || "").catch(() => {})}
          >
            <Text style={styles.statusPrimaryText}>{t("resendRequest")}</Text>
          </Pressable>
        </View>
      );
    }
    if (data.status === "pending_in") {
      return (
        <View style={styles.inlineRow}>
          <Pressable style={[styles.statusBtn, styles.statusPrimary]} onPress={() => respondFriendRequest(data.id, true)}>
            <Text style={styles.statusPrimaryText}>{t("accept")}</Text>
          </Pressable>
          <Pressable style={[styles.statusBtn, styles.statusMuted]} onPress={() => respondFriendRequest(data.id, false)}>
            <Text style={styles.statusMutedText}>{t("decline")}</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <Pressable
        style={[styles.statusBtn, styles.statusPrimary]}
        onPress={() => sendFriendRequest(data.username || "").catch(() => {})}
      >
        <Text style={styles.statusPrimaryText}>{t("sendRequest")}</Text>
      </Pressable>
    );
  };

  const canSeeLists = data.isSelf || data.status === "accepted";
  const recipeList =
    listMode === "created" ? recipes : listMode === "favorites" ? favorites : cooked;
  const showingFriends = listMode === "friends";
  const listData: any[] = !canSeeLists ? [] : showingFriends ? friendsList : recipeList;

  const friendStatusLabel = (s: string) =>
    s === "accepted"
      ? t("requestAcceptedStatus")
      : s === "pending_out"
        ? t("requestSentStatus")
        : s === "pending_in"
          ? t("incomingRequests")
          : s === "declined"
            ? t("requestDeclinedStatus")
            : t("sendRequest");

  const renderFriendListItem = (f: any) => (
    <View style={styles.pfRow} key={f.id}>
      <Pressable
        style={styles.pfMain}
        onPress={() => router.push(`/user/${f.id}` as any)}
      >
        <Avatar
          name={f.displayName || f.username}
          initials={f.initials}
          color={f.avatarColor ?? undefined}
          emoji={f.avatarEmoji ?? undefined}
          size={40}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.pfName} numberOfLines={1}>
            {f.displayName || f.username}
          </Text>
          {!!f.username && <Text style={styles.pfHandle}>@{f.username}</Text>}
        </View>
      </Pressable>
      {f.viewerStatus === "none" || f.viewerStatus === "declined" ? (
        <Pressable
          style={styles.pfAddBtn}
          onPress={() => sendFriendRequestTo(f.id).catch(() => {})}
        >
          <Text style={styles.pfAddText}>{t("addFriend")}</Text>
        </Pressable>
      ) : (
        <Text style={styles.pfStatus}>{friendStatusLabel(f.viewerStatus)}</Text>
      )}
    </View>
  );

  const Stat = ({
    icon,
    label,
    value,
    onPress,
    active,
  }: {
    icon: React.ReactNode;
    label: string;
    value: number;
    onPress?: () => void;
    active?: boolean;
  }) => (
    <Pressable
      style={[styles.statCard, active && styles.statCardActive]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.statIconWrap}>{icon}</View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: name || t("friendProfile") }} />
      <FlatList
        data={listData}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) =>
          showingFriends ? (
            renderFriendListItem(item)
          ) : (
            <Pressable onPress={() => openRecipe(item)}>
              <RecipeCard recipe={item} />
            </Pressable>
          )
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Avatar
              name={name}
              initials={data.initials}
              color={data.avatarColor ?? undefined}
              emoji={data.avatarEmoji ?? undefined}
              size={72}
            />
            <Text style={styles.pageName}>{name}</Text>
            {!!data.username && <Text style={styles.handle}>@{data.username}</Text>}
            {!!data.bio && <Text style={styles.bio}>{data.bio}</Text>}
            <View style={styles.statusWrap}>{statusButton()}</View>

            {!data.isSelf && !data.blockedByThem && !data.iBlocked && (
              <View style={styles.dangerRow}>
                {confirm === "block" ? (
                  <InlineConfirm
                    style={styles.blockConfirm}
                    question={t("confirmBlock")}
                    confirmLabel={t("blockUser")}
                    destructive
                    onConfirm={() => {
                      blockUser(data.id);
                      setConfirm(null);
                    }}
                    onCancel={() => setConfirm(null)}
                  />
                ) : (
                  <>
                    <Pressable style={styles.dangerBtn} onPress={() => setConfirm("block")}>
                      <Ban size={15} color={theme.danger} />
                      <Text style={styles.dangerText}>{t("blockUser")}</Text>
                    </Pressable>
                    <Pressable style={styles.dangerBtn} onPress={() => setReportOpen((v) => !v)}>
                      <Flag size={15} color={theme.danger} />
                      <Text style={styles.dangerText}>{t("reportUser")}</Text>
                    </Pressable>
                  </>
                )}
              </View>
            )}

            {reportOpen && !data.isSelf && (
              <View style={styles.reportBox}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={reportReason}
                  onChangeText={setReportReason}
                  placeholder={t("reportReasonMin")}
                  placeholderTextColor={theme.textMuted}
                  multiline
                  maxLength={2000}
                />
                {reportReason.trim().length > 0 && reportReason.trim().length < 10 && (
                  <Text style={styles.hintText}>{t("reportReasonMin")}</Text>
                )}
                <Pressable
                  style={[styles.primaryBtn, reportReason.trim().length < 10 && styles.primaryBtnDisabled]}
                  disabled={reportReason.trim().length < 10}
                  onPress={async () => {
                    try {
                      await sendAdminMessage({
                        category: "report_user",
                        message: reportReason.trim(),
                        reportedUserId: data.id,
                      });
                      setReportSent(true);
                      setReportReason("");
                      setReportOpen(false);
                      showToast(t("reportSentThanks"), { icon: "flag" });
                    } catch (e) {
                      console.error("report failed", e);
                    }
                  }}
                >
                  <Text style={styles.primaryBtnText}>{t("submitReport")}</Text>
                </Pressable>
              </View>
            )}
            {reportSent && <Text style={styles.okText}>{t("reportSent")}</Text>}

            {/* Stats */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, styles.statCardWide, styles.statWideRow]}>
                <Calendar size={18} color={theme.accent} />
                <View>
                  <Text style={styles.statValueSmall}>{memberSince}</Text>
                  <Text style={styles.statLabel}>{t("memberSince")}</Text>
                </View>
              </View>
              {data.stats && (
                <>
                  <Stat
                    icon={<ChefHat size={20} color={theme.accent} />}
                    label={t("createdRecipesCount")}
                    value={data.stats.createdCount}
                    active={canSeeLists && listMode === "created"}
                    onPress={canSeeLists ? () => setListMode("created") : undefined}
                  />
                  <Stat
                    icon={<Star size={20} color={theme.accent} />}
                    label={t("favoriteRecipesCount")}
                    value={data.stats.favoritesCount}
                    active={canSeeLists && listMode === "favorites"}
                    onPress={canSeeLists ? () => setListMode("favorites") : undefined}
                  />
                  <Stat
                    icon={<Flame size={20} color={theme.accent} />}
                    label={t("cookedRecipesCount")}
                    value={data.stats.cookedCount}
                    active={canSeeLists && listMode === "cooked"}
                    onPress={canSeeLists ? () => setListMode("cooked") : undefined}
                  />
                  <Stat
                    icon={<UsersIcon size={20} color={theme.accent} />}
                    label={t("friendsCount")}
                    value={data.stats.friendsCount}
                    active={canSeeLists && listMode === "friends"}
                    onPress={canSeeLists ? () => setListMode("friends") : undefined}
                  />
                  <View style={[styles.statCard, styles.statCardWide, styles.statWideRow, styles.statWideRowCenter]}>
                    <Star size={18} color={theme.star} fill={theme.star} />
                    <View style={{ alignItems: "center" }}>
                      <Text style={styles.statValueSmall}>
                        {(data.stats.recipeRatingCount ?? 0) > 0
                          ? `★ ${(data.stats.recipeRatingAvg ?? 0).toFixed(1)}`
                          : "–"}
                        {"  ·  "}
                        {data.stats.distinctRaters ?? 0} {t("ratedByPeople")}
                      </Text>
                      <Text style={styles.statLabel}>{t("avgRecipeRating")}</Text>
                    </View>
                  </View>
                </>
              )}
            </View>

            {canSeeLists && (
              <Text style={styles.sectionTitle}>
                {listMode === "created" ? (
                  <>
                    {t("createdRecipesCount")}
                    <Text style={styles.sectionTitleMuted}>
                      {"  ("}
                      {recipes.filter((r: any) => r.visibility !== "private").length} {t("publicWord")}
                      {")"}
                    </Text>
                  </>
                ) : listMode === "favorites" ? (
                  t("favoriteRecipesCount")
                ) : listMode === "cooked" ? (
                  t("cookedRecipesCount")
                ) : (
                  t("friendsCount")
                )}
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          canSeeLists ? (
            <Text style={styles.muted}>
              {showingFriends ? t("noFriendsYet") : t("noHomemadeRecipes")}
            </Text>
          ) : null
        }
      />
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  muted: { color: t.textSecondary, fontSize: 15, textAlign: "center", marginTop: 24 },
  okText: { color: t.success, fontSize: 13, fontWeight: "600", marginTop: 8, textAlign: "center" },
  listContent: { padding: 16 },
  header: { alignItems: "center", marginBottom: 8 },
  pageName: { fontSize: 22, fontWeight: "700", color: t.textPrimary, marginTop: 12 },
  handle: { fontSize: 14, color: t.textSecondary, marginTop: 2 },
  bio: { fontSize: 14, color: t.textPrimary, marginTop: 10, textAlign: "center" },
  statusWrap: { marginTop: 16 },
  blockedWrap: { alignItems: "center", gap: 8 },
  inlineRow: { flexDirection: "row", gap: 8 },
  statusBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999 },
  statusPrimary: { backgroundColor: t.accent },
  statusPrimaryText: { color: t.textOnAccent, fontWeight: "700" },
  statusMuted: { backgroundColor: t.surfaceSunken },
  statusChip: {
    fontSize: 13,
    fontWeight: "800",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: "hidden",
  },
  statusChipPending: { backgroundColor: t.surfaceSunken, color: t.textSecondary },
  statusChipDeclined: { backgroundColor: t.dangerSubtle, color: t.danger },
  statusChipAccepted: { backgroundColor: t.successSubtle, color: t.success },
  pfRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: t.border,
  },
  pfMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  pfName: { fontSize: 15, fontWeight: "600", color: t.textPrimary },
  pfHandle: { fontSize: 12, color: t.textSecondary, marginTop: 2 },
  pfAddBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: t.accent,
  },
  pfAddText: { color: t.textOnAccent, fontWeight: "700", fontSize: 12 },
  pfStatus: { fontSize: 12, color: t.textSecondary, fontWeight: "600" },
  statusMutedText: { color: t.textPrimary, fontWeight: "600" },

  dangerRow: { flexDirection: "row", gap: 16, marginTop: 16 },
  dangerBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6 },
  dangerText: { color: t.danger, fontSize: 13, fontWeight: "600" },
  blockConfirm: { marginTop: 16, alignSelf: "stretch" },
  reportBox: { alignSelf: "stretch", marginTop: 12, gap: 10 },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 20,
    alignSelf: "stretch",
  },
  statCard: {
    minWidth: "47%",
    flexGrow: 1,
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 12,
    padding: 14,
  },
  statCardWide: { minWidth: "100%" },
  statWideRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  statWideRowCenter: { justifyContent: "center" },
  statCardActive: { borderColor: t.accent, backgroundColor: t.surfaceSunken },
  statIconWrap: { marginBottom: 6 },
  statValue: { fontSize: 20, fontWeight: "800", color: t.textPrimary },
  statValueSmall: { fontSize: 15, fontWeight: "700", color: t.textPrimary },
  statLabel: { fontSize: 12, color: t.textSecondary, marginTop: 2 },

  hintText: { fontSize: 12, color: t.danger, marginTop: -4 },
  sentWrap: { alignItems: "center", paddingVertical: 40, gap: 16 },
  sentCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: t.success,
    alignItems: "center",
    justifyContent: "center",
  },
  sentText: { fontSize: 15, fontWeight: "600", color: t.textPrimary, textAlign: "center" },

  sectionTitle: {
    alignSelf: "flex-start",
    fontSize: 16,
    fontWeight: "700",
    color: t.textPrimary,
    marginTop: 24,
    marginBottom: 8,
  },
  sectionTitleMuted: {
    fontSize: 14,
    fontWeight: "600",
    color: t.textSecondary,
  },

  adminForm: { padding: 16 },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: t.accent,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 8,
  },
  adminBadgeText: { color: t.textOnAccent, fontWeight: "800", fontSize: 12 },
  catRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  catChipOn: { backgroundColor: t.accent, borderColor: t.accent },
  catChipText: { fontSize: 13, fontWeight: "600", color: t.textPrimary },
  catChipTextOn: { color: t.textOnAccent },
  input: {
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: t.textPrimary,
    backgroundColor: t.surface,
    marginBottom: 10,
  },
  textArea: { minHeight: 90, textAlignVertical: "top" },
  primaryBtn: {
    backgroundColor: t.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: t.textOnAccent, fontWeight: "700", fontSize: 15 },
});
