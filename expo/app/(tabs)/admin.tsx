import { useMutation, useQuery } from "convex/react";
import { useFocusEffect } from "expo-router";
import { Check, Search, X } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { Animated, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import CollapsingTabHeader, {
  headerTranslateY,
  onHeaderScroll,
  resetHeader,
  useHeaderContentPadding,
} from "@/components/CollapsingTabHeader";
import SelectMenu, { SelectOption } from "@/components/SelectMenu";
import type { Theme } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { useTheme } from "@/hooks/use-theme";
import { useLanguage } from "@/hooks/use-language";
import { useSocial } from "@/hooks/use-social";
import { useIsDesktop } from "@/hooks/use-responsive";
import { Text } from "@/components/ui/Text";

// Category / status colours are functional signals, so they stay distinct —
// but sourced from the theme's status tokens so they read in dark mode.
function catColor(t: Theme, category: string): string {
  return category === "bug"
    ? t.danger
    : category === "report_user"
      ? t.warning
      : category === "feedback"
        ? t.accent
        : t.textMuted;
}
function statusDot(t: Theme, s: string): string {
  return s === "new"
    ? t.accent
    : s === "seen"
      ? t.accent
      : s === "in_progress"
        ? t.warning
        : s === "done"
          ? t.success
          : t.textMuted;
}

type AdminMsg = {
  id: string;
  category: string;
  message: string;
  from: { username: string; email: string };
  reported: { username: string; email: string } | null;
  createdAt: number;
  status: string;
  priority: number;
};

type AdminStatus = "new" | "seen" | "in_progress" | "done" | "read";

const isClosedStatus = (s: string) => s === "done" || s === "read";

function statusLabel(s: string, t: (k: string) => string) {
  return s === "done"
    ? t("statusDone")
    : s === "read"
      ? t("statusRead")
      : s === "in_progress"
        ? t("statusInProgress")
        : s === "seen"
          ? t("statusSeen")
          : t("statusNew");
}

function statusOptions(theme: Theme, category: string, t: (k: string) => string): SelectOption[] {
  const mk = (v: string): SelectOption => ({ value: v, label: statusLabel(v, t), dot: statusDot(theme, v) });
  return category === "feedback" || category === "other"
    ? [mk("new"), mk("read")]
    : [mk("new"), mk("seen"), mk("in_progress"), mk("done")];
}

function catLabelOf(category: string, t: (k: string) => string) {
  return category === "report_user"
    ? t("adminCatReport")
    : category === "bug"
      ? t("adminCatBug")
      : category === "feedback"
        ? t("adminCatFeedback")
        : t("adminCatOther");
}

function AdminMessageCard({
  msg,
  expanded,
  onToggle,
  onStatus,
  t,
}: {
  msg: AdminMsg;
  expanded: boolean;
  onToggle: () => void;
  onStatus: (s: AdminStatus) => void;
  t: (k: string) => string;
}) {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const color = catColor(theme, msg.category);
  const status = msg.status === "new" || !msg.status ? "new" : msg.status;
  const closed = isClosedStatus(status);

  return (
    <Pressable
      style={[styles.adminMsg, { borderLeftColor: color }, closed && styles.adminMsgDone]}
      onPress={onToggle}
    >
      <View style={styles.adminMsgTop}>
        <View style={[styles.catTag, { backgroundColor: color }]}>
          <Text variant="caption" weight="bold" style={styles.catTagText}>
            {catLabelOf(msg.category, t)}
          </Text>
        </View>
        {msg.category === "bug" && <Text variant="label" weight="bold" style={{ color: theme.danger }}>!!!</Text>}
        {msg.category === "report_user" && <Text variant="label" weight="bold" style={{ color: theme.warning }}>!!</Text>}
        <View style={styles.adminMsgSpacer} />
        <SelectMenu
          compact
          value={status}
          options={statusOptions(theme, msg.category, t)}
          onChange={(v) => onStatus(v as AdminStatus)}
          title={t("status")}
          testID={`admin-status-${msg.id}`}
        />
      </View>

      <Text variant="bodySm" numberOfLines={expanded ? undefined : 3}>
        {msg.message}
      </Text>

      {!expanded && <Text variant="caption" color="muted" style={styles.adminHint}>{t("tapForDetails")}</Text>}

      {expanded && (
        <View style={styles.adminDetails}>
          <Text variant="caption" color="secondary">
            {t("fromLabel")}: {msg.from.username || "—"} ({msg.from.email || "—"})
          </Text>
          {msg.reported && (
            <Text variant="caption" color="secondary">
              {t("reportedUserLabel")}: {msg.reported.username || "—"} ({msg.reported.email || "—"})
            </Text>
          )}
          <Text variant="caption" color="secondary">
            {t("sentAtLabel")}: {new Date(msg.createdAt).toLocaleString()}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export default function AdminPanelScreen() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const isDesktop = useIsDesktop();
  const topPad = useHeaderContentPadding();
  const { myProfile } = useSocial();
  useFocusEffect(useCallback(() => resetHeader(), []));

  const adminInbox = useQuery(api.social.adminInbox) ?? null;
  const setAdminMessageStatus = useMutation(api.social.setAdminMessageStatus);

  const [expandedMsg, setExpandedMsg] = useState<string | null>(null);
  const [adminSearch, setAdminSearch] = useState("");
  const [adminCatFilter, setAdminCatFilter] = useState<
    "all" | "bug" | "report_user" | "feedback" | "other"
  >("all");

  const ADMIN_TIERS: { key: string; label: string; cats: string[] }[] = [
    { key: "high", label: t("prioTierHigh"), cats: ["bug"] },
    { key: "med", label: t("prioTierMedium"), cats: ["report_user"] },
    { key: "feedback", label: t("adminCatFeedback"), cats: ["feedback"] },
    { key: "other", label: t("adminCatOther"), cats: ["other"] },
  ];

  const adminCard = (m: NonNullable<typeof adminInbox>[number]) => (
    <AdminMessageCard
      key={m.id}
      msg={m}
      expanded={expandedMsg === m.id}
      onToggle={() => setExpandedMsg((cur) => (cur === m.id ? null : m.id))}
      onStatus={(s) => setAdminMessageStatus({ id: m.id as Id<"adminMessages">, status: s })}
      t={t}
    />
  );

  const renderTiers = (list: NonNullable<typeof adminInbox>) =>
    ADMIN_TIERS.map((tier) => {
      const items = list.filter((m) => tier.cats.includes(m.category));
      if (items.length === 0) return null;
      return (
        <View key={tier.key}>
          <Text variant="label" weight="bold" style={styles.adminGroupHead}>{tier.label}</Text>
          <View style={styles.adminGrid}>{items.map(adminCard)}</View>
        </View>
      );
    });

  const renderBoard = () => {
    if (!adminInbox) return null;
    const q = adminSearch.trim().toLowerCase();
    const filtered = adminInbox.filter(
      (m) =>
        (adminCatFilter === "all" || m.category === adminCatFilter) &&
        (q === "" ||
          m.message.toLowerCase().includes(q) ||
          m.from.username.toLowerCase().includes(q) ||
          m.from.email.toLowerCase().includes(q)),
    );
    const open = filtered.filter((m) => !isClosedStatus(m.status));
    const done = filtered.filter((m) => isClosedStatus(m.status));
    const catFilterOptions: SelectOption[] = [
      { value: "all", label: t("adminCatAll") },
      { value: "bug", label: t("adminCatBug"), dot: theme.danger },
      { value: "report_user", label: t("adminCatReport"), dot: theme.warning },
      { value: "feedback", label: t("adminCatFeedback"), dot: theme.accent },
      { value: "other", label: t("adminCatOther"), dot: theme.textMuted },
    ];

    return (
      <View style={styles.adminBox}>
        <Text variant="h3" style={styles.adminTitle}>{t("adminInboxTitle")}</Text>

        <View style={styles.filterRow}>
          <View style={styles.searchMini}>
            <Search size={16} color={theme.textMuted} />
            <TextInput
              style={[styles.searchInput, Platform.OS === "web" && webNoOutline]}
              value={adminSearch}
              onChangeText={setAdminSearch}
              placeholder={t("adminSearchPlaceholder")}
              placeholderTextColor={theme.textMuted}
              returnKeyType="search"
              testID="admin-search"
            />
            {adminSearch.length > 0 && (
              <Pressable onPress={() => setAdminSearch("")} hitSlop={8} testID="admin-search-clear">
                <X size={14} color={theme.textSecondary} />
              </Pressable>
            )}
          </View>
          <SelectMenu
            value={adminCatFilter}
            options={catFilterOptions}
            onChange={(v) => setAdminCatFilter(v as typeof adminCatFilter)}
            title={t("adminFilterCategory")}
            testID="admin-cat-filter"
          />
        </View>

        <Text variant="label" weight="bold" style={styles.adminSubhead}>{t("openSection")}</Text>
        {open.length > 0 ? (
          renderTiers(open)
        ) : (
          <Text variant="bodySm" color="muted" style={styles.adminEmptyLine}>{t("nothingOpen")}</Text>
        )}

        {done.length > 0 && (
          <>
            <View style={styles.doneDivider}>
              <Check size={14} color={theme.success} />
              <Text variant="label" weight="bold" style={styles.adminSubhead}>{t("doneSection")}</Text>
            </View>
            {renderTiers(done)}
          </>
        )}

        {filtered.length === 0 && (
          <Text variant="bodySm" color="muted" style={styles.adminEmptyLine}>{t("adminNoResults")}</Text>
        )}
      </View>
    );
  };

  if (myProfile && !myProfile.isAdmin) {
    return <View style={styles.container} />;
  }

  const body = (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      onScroll={isDesktop ? undefined : onHeaderScroll}
      scrollEventThrottle={16}
      testID="admin-panel-scroll"
    >
      {renderBoard()}
    </ScrollView>
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
    </View>
  );
}

const webNoOutline = { outlineStyle: "none" } as unknown as { [k: string]: string };

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    bodyWrap: { flex: 1 },
    content: { padding: t.space[5], paddingBottom: 140 },

    adminBox: { marginBottom: t.space[5] },
    adminTitle: { marginBottom: t.space[4] },
    adminSubhead: {
      color: t.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginTop: t.space[3],
      marginBottom: t.space[2],
    },
    adminEmptyLine: { fontStyle: "italic", paddingVertical: t.space[3] },
    doneDivider: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.space[2],
      marginTop: t.space[4],
      borderTopWidth: t.borderWidth.hairline,
      borderTopColor: t.border,
      paddingTop: t.space[3],
    },
    filterRow: { flexDirection: "row", alignItems: "center", gap: t.space[3], marginBottom: t.space[4] },
    searchMini: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.space[2],
      width: 160,
      backgroundColor: t.surfaceSunken,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      borderRadius: t.radius.pill,
      paddingHorizontal: t.space[3],
      paddingVertical: t.space[2],
    },
    searchInput: { flex: 1, fontFamily: t.font.body, fontSize: 13, color: t.textPrimary, padding: 0 },
    adminGroupHead: { color: t.textPrimary, marginTop: t.space[3], marginBottom: t.space[2] },
    adminGrid: { flexDirection: "row", flexWrap: "wrap", gap: t.space[3] },
    adminMsg: {
      width: 300,
      maxWidth: "100%",
      backgroundColor: t.surface,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      borderLeftWidth: 3,
      borderRadius: t.radius.md,
      padding: t.space[3],
    },
    adminMsgDone: { opacity: 0.55 },
    adminMsgTop: { flexDirection: "row", alignItems: "center", gap: t.space[2], marginBottom: t.space[2] },
    adminMsgSpacer: { flex: 1 },
    catTag: { borderRadius: t.radius.pill, paddingHorizontal: t.space[3], paddingVertical: 3 },
    catTagText: { color: "#FFFFFF" },
    adminHint: { marginTop: t.space[2] },
    adminDetails: { marginTop: t.space[3], gap: t.space[2] },
  });
