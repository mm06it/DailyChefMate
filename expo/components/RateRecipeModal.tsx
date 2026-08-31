import { X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import RatingStars from "@/components/RatingStars";
import Colors from "@/constants/colors";
import { useLanguage } from "@/hooks/use-language";
import { useRatings } from "@/hooks/use-ratings";
import { Recipe } from "@/types/recipe";

interface RateRecipeModalProps {
  recipe: Recipe | null;
  visible: boolean;
  onClose: () => void; // called on "Später" / X
  onDone?: () => void; // called after a rating is submitted
}

export default function RateRecipeModal({ recipe, visible, onClose, onDone }: RateRecipeModalProps) {
  const { t } = useLanguage();
  const { rate, myRating } = useRatings();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const recipeId = recipe?.id;
  useEffect(() => {
    if (visible && recipeId) {
      setStars(myRating(recipeId) ?? 0);
      setComment("");
      setSaving(false);
    }
    // Seed only when the modal opens for a recipe — not on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, recipeId]);

  if (!recipe) return null;

  const submit = async () => {
    if (stars < 1 || saving) return;
    setSaving(true);
    try {
      await rate({
        recipeId: recipe.id,
        rating: stars,
        comment: comment.trim() || undefined,
        recipeName: recipe.name,
        recipeImage: recipe.image || undefined,
      });
      onDone?.();
    } catch (e) {
      console.error("rate failed", e);
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{t("rateRecipe")}</Text>
            <Pressable onPress={onClose} hitSlop={10} testID="rate-close">
              <X size={24} color={Colors.text} />
            </Pressable>
          </View>

          <Text style={styles.recipeName} numberOfLines={2}>
            {recipe.name}
          </Text>

          <View style={styles.starsWrap}>
            <RatingStars value={stars} size={38} gap={8} onChange={setStars} />
          </View>

          <TextInput
            style={styles.input}
            value={comment}
            onChangeText={setComment}
            placeholder={t("optionalComment")}
            placeholderTextColor={Colors.textLight}
            multiline
            maxLength={300}
            testID="rate-comment"
          />

          <View style={styles.actions}>
            <Pressable style={[styles.btn, styles.btnGhost]} onPress={onClose} testID="rate-later">
              <Text style={styles.btnGhostText}>{t("later")}</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnPrimary, stars < 1 && styles.btnDisabled]}
              onPress={submit}
              disabled={stars < 1 || saving}
              testID="rate-submit"
            >
              <Text style={styles.btnPrimaryText}>{t("sendRating")}</Text>
            </Pressable>
          </View>
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
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700", color: Colors.text },
  recipeName: { fontSize: 14, color: Colors.textLight, marginTop: 4 },
  starsWrap: { alignItems: "center", paddingVertical: 20 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.card,
    minHeight: 64,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  actions: { flexDirection: "row", gap: 12 },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  btnGhost: { backgroundColor: Colors.cardSecondary },
  btnGhostText: { fontSize: 15, fontWeight: "600", color: Colors.text },
  btnPrimary: { backgroundColor: Colors.primary },
  btnPrimaryText: { fontSize: 15, fontWeight: "700", color: Colors.white },
  btnDisabled: { opacity: 0.5 },
});
