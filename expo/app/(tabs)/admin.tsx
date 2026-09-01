import { useMutation, useQuery } from "convex/react";
import { useFocusEffect } from "expo-router";
import { Check, Search, X } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import CollapsingTabHeader, {
  headerTranslateY,
  onHeaderScroll,
  resetHeader,
  useHeaderContentPadding,
} from "@/components/CollapsingTabHeader";
import SelectMenu, { SelectOption } from "@/components/SelectMenu";
import Colors from "@/constants/colors";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useLanguage } from "@/hooks/use-language";
import { useSocial } from "@/hooks/use-social";
import { useIsDesktop } from "@/hooks/use-responsive";

const CAT_COLOR: Record<string, string> = {
  feedback: "#3B82F6", // blue
  bug: "#EF4444", // red
  report_user: "#F59E0B", // amber
  other: "#8A94A6", // grey
};

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

// Dot colour per status — "new" (blue) is deliberately distinct from the
// closed "read" (grey).
const STATUS_DOT: Record<string, string> = {
  new: "#3B82F6",
  seen: "#6366F1",
  in_progress: "#F59E0B",
  done: "#10B981",
  read: "#8A94A6",
};

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

// Workflow categories get the full flow, informational ones just new/read.
function statusOptions(category: string, t: (k: string) => string): SelectOption[] {
  const mk = (v: string): SelectOption => ({ value: v, label: statusLabel(v, t), dot: STATUS_DOT[v] });
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
  const color = CAT_COLOR[msg.category] ?? CAT_COLOR.other;
  const status = msg.status === "new" || !msg.status ? "new" : msg.status;
  const closed = isClosedStatus(status);

  return (
    <Pressable
      style={[styles.adminMsg, { borderLeftColor: color }, closed && styles.adminMsgDone]}
      onPress={onToggle}
    >
      <View style={styles.adminMsgTop}>
        <View style={[styles.catTag, { backgroundColor: color }]}>
          <Text style={styles.catTagText}>{catLabelOf(msg.category, t)}</Text>
        </View>
        {msg.category === "bug" && <Text style={styles.prioHigh}>!!!</Text>}
        {msg.category === "report_user" && <Text style={styles.prioLow}>!!</Text>}
        <View style={styles.adminMsgSpacer} />
        <SelectMenu
          compact
          value={status}
          options={statusOptions(msg.category, t)}
          onChange={(v) => onStatus(v as AdminStatus)}
          title={t("status")}
          testID={`admin-status-${msg.id}`}
        />
      </View>

      <Text style={styles.adminText} numberOfLines={expanded ? undefined : 3}>
        {msg.message}
      </Text>

      {!expanded && <Text style={styles.adminHint}>{t("tapForDetails")}</Text>}

      {expanded && (
        <View style={styles.adminDetails}>
          <Text style={styles.adminDetailLine}>
            {t("fromLabel")}: {msg.from.username || "—"} ({msg.from.email || "—"})
          </Text>
          {msg.reported && (
            <Text style={styles.adminDetailLine}>
              {t("reportedUserLabel")}: {msg.reported.username || "—"} ({msg.reported.email || "—"})
            </Text>
          )}
          <Text style={styles.adminDetailLine}>
            {t("sentAtLabel")}: {new Date(msg.createdAt).toLocaleString()}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export default function AdminPanelScreen() {
  const { t } = useLanguage();
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
          <Text style={styles.adminGroupHead}>{tier.label}</Text>
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
      { value: "bug", label: t("adminCatBug"), dot: CAT_COLOR.bug },
      { value: "report_user", label: t("adminCatReport"), dot: CAT_COLOR.report_user },
      { value: "feedback", label: t("adminCatFeedback"), dot: CAT_COLOR.feedback },
      { value: "other", label: t("adminCatOther"), dot: CAT_COLOR.other },
    ];

    return (
      <View style={styles.adminBox}>
        <Text style={styles.adminTitle}>{t("adminInboxTitle")}</Text>

        <View style={styles.filterRow}>
          <View style={styles.searchMini}>
            <Search size={16} color={Colors.textLight} />
            <TextInput
              style={styles.searchInput}
              value={adminSearch}
              onChangeText={setAdminSearch}
              placeholder={t("adminSearchPlaceholder")}
              placeholderTextColor={Colors.textLight}
              returnKeyType="search"
              testID="admin-search"
            />
            {adminSearch.length > 0 && (
              <Pressable onPress={() => setAdminSearch("")} hitSlop={8} testID="admin-search-clear">
                <X size={14} color={Colors.textLight} />
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

        <Text style={styles.adminSubhead}>{t("openSection")}</Text>
        {open.length > 0 ? (
          renderTiers(open)
        ) : (
          <Text style={styles.adminEmptyLine}>{t("nothingOpen")}</Text>
        )}

        {done.length > 0 && (
          <>
            <View style={styles.doneDivider}>
              <Check size={14} color={Colors.success} />
              <Text style={styles.adminSubhead}>{t("doneSection")}</Text>
            </View>
            {renderTiers(done)}
          </>
        )}

        {filtered.length === 0 && (
          <Text style={styles.adminEmptyLine}>{t("adminNoResults")}</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  bodyWrap: { flex: 1 },
  content: { padding: 16, paddingBottom: 160 },

  adminBox: { marginBottom: 16 },
  adminTitle: { fontSize: 16, fontWeight: "800", color: Colors.text, marginBottom: 12 },
  adminSubhead: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 8,
    marginBottom: 6,
  },
  adminEmptyLine: {
    fontSize: 14,
    color: Colors.textLight,
    fontStyle: "italic",
    paddingVertical: 10,
  },
  doneDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
  },
  filterRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  searchMini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    width: 160,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 13, color: Colors.text, padding: 0 },
  adminGroupHead: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 10,
    marginBottom: 6,
  },
  adminGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  adminMsg: {
    width: 300,
    maxWidth: "100%",
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    borderRadius: 12,
    padding: 12,
  },
  adminMsgDone: { opacity: 0.55 },
  adminMsgTop: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  adminMsgSpacer: { flex: 1 },
  catTag: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  catTagText: { color: Colors.white, fontSize: 11, fontWeight: "800" },
  prioHigh: { color: "#EF4444", fontSize: 15, fontWeight: "900", letterSpacing: 1 },
  prioLow: { color: "#F59E0B", fontSize: 14, fontWeight: "900", letterSpacing: 1 },
  adminText: { fontSize: 14, color: Colors.text },
  adminHint: { fontSize: 12, color: Colors.textLight, marginTop: 6 },
  adminDetails: { marginTop: 10, gap: 6 },
  adminDetailLine: { fontSize: 12, color: Colors.textLight },
});
