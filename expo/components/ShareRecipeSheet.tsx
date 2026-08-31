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
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) {
      setNote("");
      setSentTo(new Set());
    }
  }, [visible]);

  if (!recipe) return null;

  const handleShare = async (friendId: string) => {
    try {
      await shareRecipe(friendId, recipe, note.trim() || undefined);
      setSentTo((prev) => new Set(prev).add(friendId));
    } catch (e) {
      console.error("shareRecipe failed", e);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{t("shareRecipe")}</Text>
            <Pressable onPress={onClose} hitSlop={10} testID="share-recipe-close">
              <X size={24} color={Colors.text} />
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
                const done = sentTo.has(f.id);
                return (
                  <Pressable
                    key={f.id}
                    style={styles.friendRow}
                    onPress={() => !done && handleShare(f.id)}
                    disabled={done}
                    testID={`share-recipe-friend-${f.id}`}
                  >
                    <Avatar name={f.displayName || f.username} initials={f.initials} size={40} />
                    <View style={styles.friendText}>
                      <Text style={styles.friendName} numberOfLines={1}>
                        {f.displayName || f.username}
                      </Text>
                      {!!f.username && <Text style={styles.friendHandle}>@{f.username}</Text>}
                    </View>
                    {done ? (
                      <Check size={20} color={Colors.success} />
                    ) : (
                      <Text style={styles.sendLabel}>{t("sendRequest")}</Text>
                    )}
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
  recipeName: { fontSize: 14, color: Colors.textLight, marginTop: 4, marginBottom: 12 },
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
  sendLabel: { fontSize: 13, fontWeight: "700", color: Colors.primary },
});
