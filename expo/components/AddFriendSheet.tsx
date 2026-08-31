import { useQuery } from "convex/react";
import { Search, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import Avatar from "@/components/Avatar";
import Colors from "@/constants/colors";
import { api } from "@/convex/_generated/api";
import { useLanguage } from "@/hooks/use-language";
import { useSocial } from "@/hooks/use-social";

interface AddFriendSheetProps {
  visible: boolean;
  onClose: () => void;
}

export default function AddFriendSheet({ visible, onClose }: AddFriendSheetProps) {
  const { t } = useLanguage();
  const { sendFriendRequest } = useSocial();
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const result = useQuery(
    api.social.findUser,
    submitted.trim() ? { query: submitted.trim() } : "skip",
  );

  useEffect(() => {
    if (visible) {
      setInput("");
      setSubmitted("");
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
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("ALREADY_FRIENDS")) setError(t("alreadyFriends"));
      else if (msg.includes("USER_NOT_FOUND")) setError(t("userSearchNotFound"));
      else if (msg.includes("CANNOT_ADD_SELF")) setError(t("cannotAddSelf"));
      else if (msg.includes("BLOCKED")) setError(t("userBlocked"));
      else setError(t("userSearchNotFound"));
    }
  };

  const renderResult = () => {
    if (!submitted.trim()) return null;
    if (result === undefined) return <ActivityIndicator style={{ marginTop: 20 }} color={Colors.primary} />;
    if (!("user" in result) || !result.user) {
      const reason = "reason" in result ? result.reason : undefined;
      return <Text style={styles.hint}>{reasonText(reason)}</Text>;
    }

    const user = result.user;
    const status = "status" in result ? result.status : "none";
    const alreadyLinked = status === "accepted" || status === "pending_out" || sentTo === user.id;
    const buttonLabel =
      sentTo === user.id || status === "pending_out"
        ? t("friendRequestSent")
        : status === "accepted"
          ? t("alreadyFriends")
          : status === "pending_in"
            ? t("accept")
            : t("sendRequest");

    return (
      <View style={styles.resultCard}>
        <Avatar name={user.displayName || user.username} initials={user.initials} size={44} />
        <View style={styles.resultText}>
          <Text style={styles.resultName} numberOfLines={1}>
            {user.displayName || user.username}
          </Text>
          {!!user.username && <Text style={styles.resultHandle}>@{user.username}</Text>}
        </View>
        <Pressable
          style={[styles.sendBtn, alreadyLinked && styles.sendBtnMuted]}
          onPress={() => !alreadyLinked && handleSend(user.id)}
          disabled={alreadyLinked}
          testID="add-friend-send"
        >
          <Text style={[styles.sendBtnText, alreadyLinked && styles.sendBtnTextMuted]}>
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
            <Text style={styles.title}>{t("addFriend")}</Text>
            <Pressable onPress={onClose} hitSlop={10} testID="add-friend-close">
              <X size={24} color={Colors.text} />
            </Pressable>
          </View>

          <View style={styles.searchRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={t("emailOrUsername")}
              placeholderTextColor={Colors.textLight}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={() => {
                setSentTo(null);
                setError(null);
                setSubmitted(input);
              }}
              returnKeyType="search"
              testID="add-friend-input"
            />
            <Pressable
              style={styles.searchBtn}
              onPress={() => {
                setSentTo(null);
                setError(null);
                setSubmitted(input);
              }}
              testID="add-friend-search"
            >
              <Search size={20} color={Colors.white} />
            </Pressable>
          </View>

          {error && <Text style={styles.error}>{error}</Text>}
          {renderResult()}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    minHeight: 260,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 18, fontWeight: "700", color: Colors.text },
  searchRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.card,
  },
  searchBtn: { backgroundColor: Colors.primary, borderRadius: 20, padding: 10 },
  hint: { marginTop: 20, fontSize: 14, color: Colors.textLight, textAlign: "center" },
  error: { marginTop: 12, fontSize: 13, color: Colors.error },
  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 18,
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.cardSecondary,
  },
  resultText: { flex: 1 },
  resultName: { fontSize: 15, fontWeight: "600", color: Colors.text },
  resultHandle: { fontSize: 13, color: Colors.textLight, marginTop: 2 },
  sendBtn: { backgroundColor: Colors.primary, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  sendBtnMuted: { backgroundColor: Colors.border },
  sendBtnText: { color: Colors.white, fontWeight: "700", fontSize: 13 },
  sendBtnTextMuted: { color: Colors.textLight },
});
