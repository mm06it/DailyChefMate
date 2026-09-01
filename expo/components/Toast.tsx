import {
  Ban,
  Bookmark,
  CalendarCheck,
  Check,
  Flag,
  Heart,
  Info,
  Send,
  Star,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react-native";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Animated, Pressable, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/hooks/use-theme";

export type ToastIcon =
  | "check"
  | "star"
  | "calendar"
  | "share"
  | "heart"
  | "users"
  | "userPlus"
  | "userCheck"
  | "ban"
  | "info"
  | "flag"
  | "bookmark";

type ToastVariant = "success" | "info";

interface ToastOpts {
  icon?: ToastIcon;
  variant?: ToastVariant;
}

type ShowToast = (message: string, opts?: ToastOpts) => void;

const ICONS: Record<ToastIcon, React.ComponentType<{ size?: number; color?: string }>> = {
  check: Check,
  star: Star,
  calendar: CalendarCheck,
  share: Send,
  heart: Heart,
  users: Users,
  userPlus: UserPlus,
  userCheck: UserCheck,
  ban: Ban,
  info: Info,
  flag: Flag,
  bookmark: Bookmark,
};

const ToastCtx = createContext<{ showToast: ShowToast }>({ showToast: () => {} });

export const useToast = () => useContext(ToastCtx);

interface ToastState {
  key: number;
  message: string;
  icon: ToastIcon;
  variant: ToastVariant;
}

const VISIBLE_MS = 2600;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const [toast, setToast] = useState<ToastState | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const showToast = useCallback<ShowToast>((message, opts) => {
    setToast({
      key: Date.now(),
      message,
      icon: opts?.icon ?? "check",
      variant: opts?.variant ?? "success",
    });
  }, []);

  useEffect(() => {
    if (!toast) return;
    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 90 }).start();
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setToast(null);
      });
    }, VISIBLE_MS);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [toast, anim]);

  const dismiss = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    Animated.timing(anim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setToast(null));
  };

  const Icon = toast ? ICONS[toast.icon] : null;
  const accent = toast?.variant === "info" ? theme.accent : theme.success;

  return (
    <ToastCtx.Provider value={{ showToast }}>
      {children}
      {toast && Icon && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.wrap,
            {
              bottom: insets.bottom + 78,
              opacity: anim,
              transform: [
                { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
                { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
              ],
            },
          ]}
        >
          <Pressable
            style={[styles.toast, { backgroundColor: theme.textPrimary, ...theme.elevation.lg }]}
            onPress={dismiss}
          >
            <Animated.View style={[styles.iconWrap, { backgroundColor: accent }]}>
              <Icon size={16} color="#FFFFFF" />
            </Animated.View>
            <Text
              style={[styles.text, { color: theme.bg, fontFamily: theme.font.bodySemibold }]}
              numberOfLines={2}
            >
              {toast.message}
            </Text>
          </Pressable>
        </Animated.View>
      )}
    </ToastCtx.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "center",
    zIndex: 9999,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    maxWidth: 420,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { fontSize: 14, flexShrink: 1 },
});
