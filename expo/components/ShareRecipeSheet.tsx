import { Check, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import Avatar from "@/components/Avatar";
import type { Theme } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { useTheme } from "@/hooks/use-theme";
import { useLanguage } from "@/hooks/use-language";
import { useSocial } from "@/hooks/use-social";
import { useToast } from "@/components/Toast";
import { Text } from "@/components/ui/Text";
import { Recipe } from "@/types/recipe";

interface ShareRecipeSheetProps {
  recipe: Recipe | null;
  visible: boolean;
  onClose: () => void;
}

export default function ShareRecipeSheet({ recipe, visible, onClose }: ShareRecipeSheetProps) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { friends, shareRecipe } = useSocial();
  const { showToast } = useToast();
  const [note, setNote] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (visible) {
      setNote("");
      setSelected(new Set());
      setSending(false);
      setDone(false);
    }
  }, [visible]);

  if (!recipe) return null;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSend = async () => {
    if (selected.size === 0 || sending) return;
    setSending(true);
    try {
      for (const id of selected) {
        await shareRecipe(id, recipe, note.trim() || undefined);
      }
      setDone(true);
      showToast(t("recipeSharedToast"), { icon: "share" });
      setTimeout(onClose, 700);
    } catch (e) {
      console.error("shareRecipe failed", e);
      setSending(false);
    }
  };

  const canSend = selected.size > 0 && !sending;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={10} testID="share-recipe-close">
              <X size={22} color={theme.textSecondary} />
            </Pressable>
            <Text variant="h3">{t("shareRecipe")}</Text>
            <Pressable onPress={handleSend} disabled={!canSend} hitSlop={10} testID="share-recipe-send">
              <Text variant="label" weight="bold" style={{ color: canSend ? theme.accent : theme.textMuted }}>
                {done ? t("messageSent") : t("send")}
                {selected.size > 0 ? ` (${selected.size})` : ""}
              </Text>
            </Pressable>
          </View>

          <Text variant="bodySm" color="secondary" numberOfLines={1} style={styles.recipeName}>
            {recipe.name}
          </Text>

          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder={t("addNote")}
            placeholderTextColor={theme.textMuted}
            maxLength={500}
            multiline
            testID="share-recipe-note"
          />

          {friends.length === 0 ? (
            <Text variant="body" color="secondary" center style={styles.empty}>{t("noFriendsYet")}</Text>
          ) : (
            <ScrollView style={styles.friendScroll} showsVerticalScrollIndicator={false}>
              {friends.map((f) => {
                const isSel = selected.has(f.id);
                return (
                  <Pressable
                    key={f.id}
                    style={styles.friendRow}
                    onPress={() => toggle(f.id)}
                    testID={`share-recipe-friend-${f.id}`}
                  >
                    <Avatar
                      name={f.displayName || f.username}
                      initials={f.initials}
                      color={f.avatarColor ?? undefined}
                      emoji={f.avatarEmoji ?? undefined}
                      size={40}
                    />
                    <View style={styles.friendText}>
                      <Text variant="title" numberOfLines={1}>{f.displayName || f.username}</Text>
                      {!!f.username && <Text variant="bodySm" color="secondary">@{f.username}</Text>}
                    </View>
                    <View style={[styles.checkCircle, isSel && styles.checkCircleOn]}>
                      {isSel && <Check size={16} color={theme.textOnAccent} />}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
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
      maxHeight: "85%",
      ...t.elevation.lg,
    },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    recipeName: { marginTop: t.space[3], marginBottom: t.space[3] },
    noteInput: {
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      borderRadius: t.radius.md,
      paddingHorizontal: t.space[4],
      paddingVertical: t.space[3],
      fontFamily: t.font.body,
      fontSize: 15,
      color: t.textPrimary,
      backgroundColor: t.surfaceSunken,
      minHeight: 60,
      marginBottom: t.space[3],
    },
    empty: { marginTop: t.space[7] },
    friendScroll: { flexGrow: 0 },
    friendRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.space[4],
      paddingVertical: t.space[3],
      borderBottomWidth: t.borderWidth.hairline,
      borderBottomColor: t.border,
    },
    friendText: { flex: 1 },
    checkCircle: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 2,
      borderColor: t.borderStrong,
      alignItems: "center",
      justifyContent: "center",
    },
    checkCircleOn: { backgroundColor: t.success, borderColor: t.success },
  });
