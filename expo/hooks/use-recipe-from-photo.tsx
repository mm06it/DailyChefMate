import { useAction } from "convex/react";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useRef, useState } from "react";
import { Animated, Platform } from "react-native";

import { api } from "@/convex/_generated/api";

export interface PickedPhoto {
  base64: string;
  mimeType: string;
}

// Mirrors the return of convex/recipeVision.ts `parseRecipeFromPhoto`.
export interface ParsedRecipe {
  name: string;
  servings: number | null;
  category: string | null;
  mode: "cooking" | "baking" | null;
  prepTimeMin: number | null;
  cookTimeMin: number | null;
  ovenHeatC: number | null;
  ovenTimeMin: number | null;
  ingredients: { name: string; amount: string }[];
  steps: string[];
}

// Opens the camera / photo library and returns the picked image as base64.
// No upload — the bytes go straight to the vision action.
export async function pickRecipePhoto(
  source: "camera" | "library",
): Promise<PickedPhoto | null> {
  if (source === "camera") {
    if (Platform.OS !== "web") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return null;
    }
    const res = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.5,
      allowsEditing: true,
    });
    if (res.canceled || !res.assets?.[0]?.base64) return null;
    const a = res.assets[0];
    return { base64: a.base64!, mimeType: a.mimeType ?? "image/jpeg" };
  }

  if (Platform.OS !== "web") {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return null;
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    base64: true,
    quality: 0.5,
    allowsEditing: true,
  });
  if (res.canceled || !res.assets?.[0]?.base64) return null;
  const a = res.assets[0];
  return { base64: a.base64!, mimeType: a.mimeType ?? "image/jpeg" };
}

// Drives the vision call + a simulated progress value (a single completion
// gives no real % — this eases toward 90% over the expected duration and snaps
// to 100% when the result lands).
export function useRecipeFromPhoto() {
  const parseAction = useAction(api.recipeVision.parseRecipeFromPhoto);
  const [parsing, setParsing] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  const parse = useCallback(
    async (picked: PickedPhoto): Promise<ParsedRecipe> => {
      setParsing(true);
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 0.9,
        duration: 18000,
        useNativeDriver: false,
      }).start();
      try {
        const result = await parseAction({
          imageBase64: picked.base64,
          mimeType: picked.mimeType,
        });
        await new Promise<void>((resolve) => {
          Animated.timing(progress, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
          }).start(() => resolve());
        });
        return result;
      } finally {
        setParsing(false);
      }
    },
    [parseAction, progress],
  );

  return { parsing, progress, parse };
}
