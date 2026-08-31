import { useMutation } from "convex/react";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useState } from "react";
import { Platform } from "react-native";

import { useToast } from "@/components/Toast";
import { getTranslation } from "@/constants/translations";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useLanguage } from "@/hooks/use-language";

const MAX_BYTES = 8 * 1024 * 1024;

export interface PickedImage {
  uri: string;
  mimeType: string;
}

// Opens the photo library and returns the picked asset (no upload yet).
export async function pickRecipeImage(): Promise<PickedImage | null> {
  if (Platform.OS !== "web") {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return null;
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.7,
    allowsEditing: true,
    aspect: [4, 3],
  });
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  return { uri: a.uri, mimeType: a.mimeType || "image/jpeg" };
}

export function useRecipeImageUpload() {
  const { showToast } = useToast();
  const { currentLanguage } = useLanguage();
  const tr = useCallback((k: string) => getTranslation(currentLanguage, k), [currentLanguage]);

  const generateUploadUrl = useMutation(api.customRecipes.generateImageUploadUrl);
  const setRecipeImage = useMutation(api.customRecipes.setRecipeImage);
  const clearRecipeImage = useMutation(api.customRecipes.clearRecipeImage);
  const [uploading, setUploading] = useState(false);

  // Upload an already-picked asset and attach it to a recipe.
  const uploadPicked = useCallback(
    async (recipeId: string, picked: PickedImage): Promise<boolean> => {
      setUploading(true);
      try {
        const blob = await (await fetch(picked.uri)).blob();
        if (blob.size > MAX_BYTES) {
          showToast(tr("photoTooLarge"), { icon: "info", variant: "info" });
          return false;
        }
        const uploadUrl = await generateUploadUrl({});
        const up = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": blob.type || picked.mimeType },
          body: blob,
        });
        if (!up.ok) throw new Error(`upload failed ${up.status}`);
        const { storageId } = (await up.json()) as { storageId: string };
        await setRecipeImage({ id: recipeId as Id<"customRecipes">, storageId: storageId as Id<"_storage"> });
        showToast(tr("photoUploaded"), { icon: "check" });
        return true;
      } catch (e) {
        console.error("recipe image upload failed", e);
        showToast(tr("photoUploadFailed"), { icon: "info", variant: "info" });
        return false;
      } finally {
        setUploading(false);
      }
    },
    [generateUploadUrl, setRecipeImage, showToast, tr],
  );

  // Pick + upload in one go (for the recipe-detail camera button / edit form).
  const pickAndUpload = useCallback(
    async (recipeId: string): Promise<boolean> => {
      const picked = await pickRecipeImage();
      if (!picked) return false;
      return uploadPicked(recipeId, picked);
    },
    [uploadPicked],
  );

  const removeImage = useCallback(
    async (recipeId: string) => {
      try {
        await clearRecipeImage({ id: recipeId as Id<"customRecipes"> });
        showToast(tr("photoRemoved"), { icon: "info", variant: "info" });
      } catch (e) {
        console.error("clearRecipeImage failed", e);
      }
    },
    [clearRecipeImage, showToast, tr],
  );

  return { pickAndUpload, uploadPicked, removeImage, uploading };
}
