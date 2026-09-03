import { useAction } from "convex/react";
import * as ImageManipulator from "expo-image-manipulator";
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

// A raw phone photo is far too big to send as a base64 action argument, so
// downscale + re-compress before encoding: long edge <= 1600 px, JPEG q0.55.
// That's ~150–500 KB, plenty for OCR and well within Convex's arg limit.
async function toCompactBase64(uri: string): Promise<string | null> {
  try {
    const out = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1600 } }], {
      compress: 0.55,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    });
    return out.base64 ?? null;
  } catch {
    return null;
  }
}

// Opens the camera / photo library, downscales, returns the image as base64.
export async function pickRecipePhoto(
  source: "camera" | "library",
): Promise<PickedPhoto | null> {
  let uri: string | null = null;

  if (source === "camera") {
    if (Platform.OS !== "web") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return null;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 1, allowsEditing: true });
    if (res.canceled || !res.assets?.[0]?.uri) return null;
    uri = res.assets[0].uri;
  } else {
    if (Platform.OS !== "web") {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return null;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
      allowsEditing: true,
    });
    if (res.canceled || !res.assets?.[0]?.uri) return null;
    uri = res.assets[0].uri;
  }

  const base64 = await toCompactBase64(uri);
  if (!base64) return null;
  return { base64, mimeType: "image/jpeg" };
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
