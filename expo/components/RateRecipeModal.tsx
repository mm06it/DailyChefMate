import { X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, TextInput, View } from "react-native";

import RatingStars from "@/components/RatingStars";
import type { Theme } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { useTheme } from "@/hooks/use-theme";
import { useLanguage } from "@/hooks/use-language";
import { useRatings } from "@/hooks/use-ratings";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { Recipe } from "@/types/recipe";

interface RateRecipeModalProps {
  recipe: Recipe | null;
  visible: boolean;
  onClose: () => void;
  onDone?: () => void;
}

export default function RateRecipeModal({ recipe, visible, onClose, onDone }: RateRecipeModalProps) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
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
            <Text variant="h3">{t("rateRecipe")}</Text>
            <Pressable onPress={onClose} hitSlop={10} testID="rate-close">
              <X size={22} color={theme.textSecondary} />
            </Pressable>
          </View>

          <Text variant="bodySm" color="secondary" numberOfLines={2} style={styles.recipeName}>
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
            placeholderTextColor={theme.textMuted}
            multiline
            maxLength={300}
            testID="rate-comment"
          />

          <View style={styles.actions}>
            <Button label={t("later")} variant="secondary" onPress={onClose} testID="rate-later" style={styles.flex} />
            <Button
              label={t("sendRating")}
              onPress={submit}
              loading={saving}
              disabled={stars < 1}
              testID="rate-submit"
              style={styles.flex}
            />
          </View>
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
      gap: t.space[2],
      ...t.elevation.lg,
    },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    recipeName: { marginTop: 2 },
    starsWrap: { alignItems: "center", paddingVertical: t.space[6] },
    input: {
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      borderRadius: t.radius.md,
      paddingHorizontal: t.space[4],
      paddingVertical: t.space[3],
      fontFamily: t.font.body,
      fontSize: 15,
      color: t.textPrimary,
      backgroundColor: t.surfaceSunken,
      minHeight: 64,
      textAlignVertical: "top",
      marginBottom: t.space[4],
    },
    actions: { flexDirection: "row", gap: t.space[3] },
    flex: { flex: 1 },
  });
