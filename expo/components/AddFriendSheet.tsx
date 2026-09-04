import { useQuery } from "convex/react";
import { Search, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";

import Avatar from "@/components/Avatar";
import type { Theme } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { errorCode } from "@/lib/error-code";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { useTheme } from "@/hooks/use-theme";
import { useLanguage } from "@/hooks/use-language";
import { useSocial } from "@/hooks/use-social";
import { Text } from "@/components/ui/Text";

interface AddFriendSheetProps {
  visible: boolean;
  onClose: () => void;
}

const webNoOutline = { outlineStyle: "none" } as unknown as { [k: string]: string };

export default function AddFriendSheet({ visible, onClose }: AddFriendSheetProps) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { sendFriendRequest } = useSocial();
  const [input, setInput] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = input.trim();
    const id = setTimeout(() => setDebounced(q), q.length ? 300 : 0);
    return () => clearTimeout(id);
  }, [input]);

  const submitted = debounced;
  const result = useQuery(
    api.social.findUser,
    submitted.length >= 2 ? { query: submitted } : "skip",
  );

  useEffect(() => {
    if (visible) {
      setInput("");
      setDebounced("");
      setSentTo(null);
      setError(null);
    }
  }, [visible]);

  const reasonText = (reason: string | undefined) => {
    if (reason === "self") return t("cannotAddSelf");
    if (reason === "blocked") return t("userBlocked");
    return t("userSearchNotFound");
  };

  const handleSend = async (userId: string) => {
    setError(null);
    try {
      const res = await sendFriendRequest(submitted.trim());
      setSentTo(userId);
      if (res?.status === "accepted") setSentTo(userId);
    } catch (e) {
      const msg = errorCode(e);
      if (msg.includes("ALREADY_FRIENDS")) setError(t("alreadyFriends"));
      else if (msg.includes("USER_NOT_FOUND")) setError(t("userSearchNotFound"));
      else if (msg.includes("CANNOT_ADD_SELF")) setError(t("cannotAddSelf"));
      else if (msg.includes("BLOCKED")) setError(t("userBlocked"));
      else setError(t("userSearchNotFound"));
    }
  };

  const renderResult = () => {
    if (submitted.length < 2) return null;
    if (result === undefined) return <ActivityIndicator style={{ marginTop: 20 }} color={theme.accent} />;
    if (!("user" in result) || !result.user) {
      const reason = "reason" in result ? result.reason : undefined;
      return <Text variant="bodySm" color="secondary" center style={styles.hint}>{reasonText(reason)}</Text>;
    }

    const user = result.user;
    const status = "status" in result ? result.status : "none";
    const alreadyLinked =
      status === "accepted" || status === "pending_out" || status === "blocked" || sentTo === user.id;
    const buttonLabel =
      status === "blocked"
        ? t("userBlocked")
        : sentTo === user.id || status === "pending_out"
          ? t("friendRequestSent")
          : status === "accepted"
            ? t("alreadyFriends")
            : status === "pending_in"
              ? t("accept")
              : t("sendRequest");

    return (
      <View style={styles.resultCard}>
        <Avatar
          name={user.displayName || user.username}
          initials={user.initials}
          color={user.avatarColor ?? undefined}
          emoji={user.avatarEmoji ?? undefined}
          size={44}
        />
        <View style={styles.resultText}>
          <Text variant="title" numberOfLines={1}>{user.displayName || user.username}</Text>
          {!!user.username && <Text variant="bodySm" color="secondary">@{user.username}</Text>}
        </View>
        <Pressable
          style={[styles.sendBtn, alreadyLinked && styles.sendBtnMuted]}
          onPress={() => !alreadyLinked && handleSend(user.id)}
          disabled={alreadyLinked}
          testID="add-friend-send"
        >
          <Text
            variant="label"
            weight="bold"
            style={{ color: alreadyLinked ? theme.textMuted : theme.textOnAccent }}
          >
            {buttonLabel}
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text variant="h3">{t("addFriend")}</Text>
            <Pressable onPress={onClose} hitSlop={10} testID="add-friend-close">
              <X size={22} color={theme.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.searchRow}>
            <Search size={18} color={theme.textMuted} style={styles.searchIcon} />
            <TextInput
              style={[styles.input, Platform.OS === "web" && webNoOutline]}
              value={input}
              onChangeText={(v) => {
                setInput(v);
                setSentTo(null);
                setError(null);
              }}
              placeholder={t("emailOrUsername")}
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              returnKeyType="search"
              testID="add-friend-input"
            />
          </View>

          {error && <Text variant="bodySm" color="danger" style={styles.error}>{error}</Text>}
          {renderResult()}
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: t.overlay },
    sheet: {
      backgroundColor: t.surfaceRaised,
      borderTopLeftRadius: t.radius.xl,
      borderTopRightRadius: t.radius.xl,
      padding: t.space[6],
      paddingBottom: t.space[9],
      minHeight: 260,
      ...t.elevation.lg,
    },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: t.space[4] },
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      borderRadius: t.radius.md,
      paddingHorizontal: t.space[4],
      backgroundColor: t.surfaceSunken,
    },
    searchIcon: { marginRight: t.space[3] },
    input: { flex: 1, paddingVertical: 10, fontFamily: t.font.body, fontSize: 15, color: t.textPrimary },
    hint: { marginTop: t.space[6] },
    error: { marginTop: t.space[3] },
    resultCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.space[4],
      marginTop: t.space[5],
      padding: t.space[4],
      borderRadius: t.radius.md,
      backgroundColor: t.surfaceSunken,
    },
    resultText: { flex: 1 },
    sendBtn: { backgroundColor: t.accent, borderRadius: t.radius.pill, paddingHorizontal: t.space[4], paddingVertical: t.space[2] },
    sendBtnMuted: { backgroundColor: t.surfaceSunken, borderWidth: t.borderWidth.hairline, borderColor: t.border },
  });
