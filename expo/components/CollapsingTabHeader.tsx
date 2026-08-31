import { router } from 'expo-router';
import { ChevronLeft, Settings } from 'lucide-react-native';
import React, { useEffect } from 'react';
import {
  Animated,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/colors';
import { useLanguage } from '@/hooks/use-language';
import ProfileMenuButton from '@/components/ProfileMenuButton';

// Height of the header content below the status bar.
export const HEADER_BODY_HEIGHT = 74;

// One shared value drives every tab's header: only one tab is on screen at
// a time, so a module singleton is simpler than threading a context.
export const headerTranslateY = new Animated.Value(0);

// Full header height incl. the safe-area inset — set by the mounted header
// once it knows the insets, so hide() parks it exactly off-screen.
let fullHeight = HEADER_BODY_HEIGHT;
let hidden = false;
let lastY = 0;

function animateTo(toValue: number) {
  Animated.timing(headerTranslateY, {
    toValue,
    duration: 200,
    useNativeDriver: true,
  }).start();
}

function show() {
  if (!hidden) return;
  hidden = false;
  animateTo(0);
}

function hide() {
  if (hidden) return;
  hidden = true;
  animateTo(-fullHeight);
}

// Attach to a scrollable's onScroll (with scrollEventThrottle={16}).
export function onHeaderScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
  const y = e.nativeEvent.contentOffset.y;
  const dy = y - lastY;
  lastY = y;

  if (y < 4) {
    show();
  } else if (dy > 6 && y > HEADER_BODY_HEIGHT) {
    hide();
  } else if (dy < -6) {
    show();
  }
}

// Call when a screen gains focus so a fresh scroll position doesn't leave
// the header stuck hidden.
export function resetHeader() {
  lastY = 0;
  hidden = false;
  headerTranslateY.setValue(0);
}

// paddingTop a screen's scroll content needs so it starts below the header.
export function useHeaderContentPadding(): number {
  const insets = useSafeAreaInsets();
  return insets.top + HEADER_BODY_HEIGHT;
}

export default function CollapsingTabHeader({ showBack = false }: { showBack?: boolean }) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  useEffect(() => {
    fullHeight = insets.top + HEADER_BODY_HEIGHT;
  }, [insets.top]);

  return (
    <Animated.View
      style={[
        styles.header,
        { paddingTop: insets.top, transform: [{ translateY: headerTranslateY }] },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.body}>
        <View style={styles.side}>
          {showBack ? (
            <Pressable
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace('/(tabs)/refrigerator')
              }
              hitSlop={12}
              testID="header-back"
              accessibilityRole="button"
              accessibilityLabel={t('back')}
            >
              <ChevronLeft size={28} color={Colors.text} />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => router.push('/settings')}
              hitSlop={12}
              testID="header-settings"
              accessibilityRole="button"
              accessibilityLabel={t('settings')}
            >
              <Settings size={24} color={Colors.text} />
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={() => router.push('/(tabs)/(recipes)/all')}
          hitSlop={12}
          testID="header-logo"
          accessibilityRole="button"
          accessibilityLabel="DailyChefMate"
        >
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Pressable>
        <View style={styles.side}>
          <ProfileMenuButton />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  body: {
    height: HEADER_BODY_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  side: {
    minWidth: 44,
    alignItems: 'center',
  },
  logo: {
    width: 84,
    height: 52,
  },
});
