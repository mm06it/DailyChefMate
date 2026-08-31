import { useQuery } from "convex/react";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Ban, Flag } from "lucide-react-native";
import React, { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import Avatar from "@/components/Avatar";
import RecipeCard from "@/components/RecipeCard";
import Colors from "@/constants/colors";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useDailyChefMateStore } from "@/hooks/use-dailychefmate-store";
import { useLanguage } from "@/hooks/use-language";
import { useSocial } from "@/hooks/use-social";
import { Recipe } from "@/types/recipe";

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLanguage();
  const { sendFriendRequest, respondFriendRequest, removeFriend, blockUser, reportUser } = useSocial();
  const { cacheRecipes } = useDailyChefMateStore();
  const [confirmBlock, setConfirmBlock] = useState(false);

  const data = useQuery(api.social.userPublic, id ? { userId: id as Id<"users"> } : "skip");

  if (data === undefined) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: t("friendProfile") }} />
        <Text style={styles.muted}>…</Text>
      </View>
    );
  }
  if (data === null) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: t("friendProfile") }} />
        <Text style={styles.muted}>{t("userNotFound")}</Text>
      </View>
    );
  }

  const name = data.displayName || data.username;
  const recipes: Recipe[] = (data.recipes ?? []).map((r: any) => ({ ...r, id: r._id, isFavorite: false }));

  const statusButton = () => {
    if (data.isSelf) return null;
    if (data.status === "accepted") {
      return (
        <Pressable style={[styles.statusBtn, styles.statusMuted]} onPress={() => removeFriend(data.id)}>
          <Text style={styles.statusMutedText}>{t("removeFriend")}</Text>
        </Pressable>
      );
    }
    if (data.status === "pending_out") {
      return (
        <Pressable style={[styles.statusBtn, styles.statusMuted]} onPress={() => removeFriend(data.id)}>
          <Text style={styles.statusMutedText}>{t("cancelRequest")}</Text>
        </Pressable>
      );
    }
    if (data.status === "pending_in") {
      return (
        <View style={styles.inlineRow}>
          <Pressable style={[styles.statusBtn, styles.statusPrimary]} onPress={() => respondFriendRequest(data.id, true)}>
            <Text style={styles.statusPrimaryText}>{t("accept")}</Text>
          </Pressable>
          <Pressable style={[styles.statusBtn, styles.statusMuted]} onPress={() => respondFriendRequest(data.id, false)}>
            <Text style={styles.statusMutedText}>{t("decline")}</Text>
          </Pressable>
        </View>
      );
    }
    if (data.status === "blocked") {
      return <Text style={styles.muted}>{t("userBlocked")}</Text>;
    }
    return (
      <Pressable
        style={[styles.statusBtn, styles.statusPrimary]}
        onPress={() => sendFriendRequest(data.username || "").catch(() => {})}
      >
        <Text style={styles.statusPrimaryText}>{t("sendRequest")}</Text>
      </Pressable>
    );
  };

  const openRecipe = (r: Recipe) => {
    cacheRecipes([r]);
    router.push(`/recipe-detail?id=${r.id}`);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: name || t("friendProfile") }} />
      <FlatList
        data={recipes}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => openRecipe(item)}>
            <RecipeCard recipe={item} />
          </Pressable>
        )}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Avatar name={name} initials={data.initials} size={72} />
            <Text style={styles.name}>{name}</Text>
            {!!data.username && <Text style={styles.handle}>@{data.username}</Text>}
            {!!data.bio && <Text style={styles.bio}>{data.bio}</Text>}
            <View style={styles.statusWrap}>{statusButton()}</View>

            {!data.isSelf && (
              <View style={styles.dangerRow}>
                {confirmBlock ? (
                  <>
                    <Pressable
                      style={[styles.dangerBtn, styles.dangerConfirm]}
                      onPress={() => {
                        blockUser(data.id);
                        setConfirmBlock(false);
                        router.back();
                      }}
                    >
                      <Text style={styles.dangerConfirmText}>{t("blockUser")}</Text>
                    </Pressable>
                    <Pressable style={styles.dangerBtn} onPress={() => setConfirmBlock(false)}>
                      <Text style={styles.dangerText}>{t("cancel")}</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Pressable style={styles.dangerBtn} onPress={() => setConfirmBlock(true)}>
                      <Ban size={15} color={Colors.error} />
                      <Text style={styles.dangerText}>{t("blockUser")}</Text>
                    </Pressable>
                    <Pressable
                      style={styles.dangerBtn}
                      onPress={() => reportUser(data.id, "profile", "reported from profile")}
                    >
                      <Flag size={15} color={Colors.error} />
                      <Text style={styles.dangerText}>{t("reportUser")}</Text>
                    </Pressable>
                  </>
                )}
              </View>
            )}

            {recipes.length > 0 && <Text style={styles.sectionTitle}>{t("theirRecipes")}</Text>}
          </View>
        }
        ListEmptyComponent={
          data.status === "accepted" || data.isSelf ? (
            <Text style={styles.muted}>{t("noHomemadeRecipes")}</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  muted: { color: Colors.textLight, fontSize: 15, textAlign: "center", marginTop: 24 },
  listContent: { padding: 16 },
  header: { alignItems: "center", marginBottom: 16 },
  name: { fontSize: 22, fontWeight: "700", color: Colors.text, marginTop: 12 },
  handle: { fontSize: 14, color: Colors.textLight, marginTop: 2 },
  bio: { fontSize: 14, color: Colors.text, marginTop: 10, textAlign: "center" },
  statusWrap: { marginTop: 16 },
  inlineRow: { flexDirection: "row", gap: 8 },
  statusBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999 },
  statusPrimary: { backgroundColor: Colors.primary },
  statusPrimaryText: { color: Colors.white, fontWeight: "700" },
  statusMuted: { backgroundColor: Colors.cardSecondary },
  statusMutedText: { color: Colors.text, fontWeight: "600" },
  dangerRow: { flexDirection: "row", gap: 16, marginTop: 16 },
  dangerBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6 },
  dangerText: { color: Colors.error, fontSize: 13, fontWeight: "600" },
  dangerConfirm: { backgroundColor: Colors.error, paddingHorizontal: 14, borderRadius: 999 },
  dangerConfirmText: { color: Colors.white, fontSize: 13, fontWeight: "700" },
  sectionTitle: {
    alignSelf: "flex-start",
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 24,
    marginBottom: 8,
  },
});
