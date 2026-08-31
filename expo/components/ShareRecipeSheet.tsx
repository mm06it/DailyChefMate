import { Check, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import Avatar from "@/components/Avatar";
import Colors from "@/constants/colors";
import { useLanguage } from "@/hooks/use-language";
import { useSocial } from "@/hooks/use-social";
import { Recipe } from "@/types/recipe";

interface ShareRecipeSheetProps {
  recipe: Recipe | null;
  visible: boolean;
  onClose: () => void;
}

export default function ShareRecipeSheet({ recipe, visible, onClose }: ShareRecipeSheetProps) {
  const { t } = useLanguage();
  const { friends, shareRecipe } = useSocial();
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
              <X size={24} color={Colors.text} />
            </Pressable>
            <Text style={styles.title}>{t("shareRecipe")}</Text>
            <Pressable
              onPress={handleSend}
              disabled={!canSend}
              hitSlop={10}
              testID="share-recipe-send"
            >
              <Text style={[styles.sendTop, !canSend && styles.sendTopDisabled]}>
                {done ? t("messageSent") : t("send")}
                {selected.size > 0 ? ` (${selected.size})` : ""}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.recipeName} numberOfLines={1}>
            {recipe.name}
          </Text>

          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder={t("addNote")}
            placeholderTextColor={Colors.textLight}
            maxLength={500}
            multiline
            testID="share-recipe-note"
          />

          {friends.length === 0 ? (
            <Text style={styles.empty}>{t("noFriendsYet")}</Text>
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
                    <Avatar name={f.displayName || f.username} initials={f.initials} size={40} />
                    <View style={styles.friendText}>
                      <Text style={styles.friendName} numberOfLines={1}>
                        {f.displayName || f.username}
                      </Text>
                      {!!f.username && <Text style={styles.friendHandle}>@{f.username}</Text>}
                    </View>
                    <View style={[styles.checkCircle, isSel && styles.checkCircleOn]}>
                      {isSel && <Check size={16} color={Colors.white} />}
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

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    maxHeight: "85%",
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700", color: Colors.text },
  sendTop: { fontSize: 15, fontWeight: "800", color: Colors.primary },
  sendTopDisabled: { color: Colors.textLight },
  recipeName: { fontSize: 14, color: Colors.textLight, marginTop: 10, marginBottom: 12 },
  noteInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.card,
    minHeight: 60,
    marginBottom: 12,
  },
  empty: { textAlign: "center", color: Colors.textLight, marginTop: 24, fontSize: 15 },
  friendScroll: { flexGrow: 0 },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  friendText: { flex: 1 },
  friendName: { fontSize: 15, fontWeight: "600", color: Colors.text },
  friendHandle: { fontSize: 13, color: Colors.textLight, marginTop: 2 },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: Colors.textLight,
    alignItems: "center",
    justifyContent: "center",
  },
  checkCircleOn: { backgroundColor: Colors.success, borderColor: Colors.success },
});
