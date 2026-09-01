import { Check, ChevronDown } from 'lucide-react-native';
import React, { useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import type { Theme } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useTheme } from '@/hooks/use-theme';

export type SelectOption = { value: string; label: string; dot?: string };

interface Props {
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
  /** Smaller trigger — for use inside a card. */
  compact?: boolean;
  /** Menu heading. */
  title?: string;
  testID?: string;
}

const MENU_W = 200;

// Dot + label dropdown. The menu is anchored to the trigger (measured in
// window coords), rendered in a transparent Modal so it isn't clipped by a
// FlatList/ScrollView.
export default function SelectMenu({ value, options, onChange, compact, title, testID }: Props) {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const triggerRef = useRef<View>(null);
  const { width: screenW, height: screenH } = useWindowDimensions();
  const current = useMemo(() => options.find((o) => o.value === value) ?? options[0], [options, value]);

  const openMenu = () => {
    triggerRef.current?.measureInWindow((x, y, w, h) => {
      setAnchor({ x, y, w, h });
      setOpen(true);
    });
  };

  const pos = useMemo(() => {
    if (!anchor) return { top: 0, left: 0 };
    const estH = options.length * 46 + (title ? 32 : 0) + 16;
    const left = Math.max(8, Math.min(anchor.x, screenW - MENU_W - 8));
    const below = anchor.y + anchor.h + 4;
    const top = below + estH + 8 > screenH ? Math.max(8, anchor.y - estH - 4) : below;
    return { top, left };
  }, [anchor, options.length, title, screenW, screenH]);

  return (
    <>
      <Pressable
        ref={triggerRef}
        style={[styles.trigger, compact && styles.triggerCompact]}
        onPress={openMenu}
        testID={testID}
      >
        {current?.dot && <View style={[styles.dot, { backgroundColor: current.dot }]} />}
        <Text style={[styles.triggerText, compact && styles.triggerTextCompact]} numberOfLines={1}>
          {current?.label ?? ''}
        </Text>
        <ChevronDown size={compact ? 13 : 16} color={theme.textSecondary} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={[styles.menu, { top: pos.top, left: pos.left, width: MENU_W }]}>
            {title && <Text style={styles.menuTitle}>{title}</Text>}
            {options.map((o) => {
              const active = o.value === value;
              return (
                <Pressable
                  key={o.value}
                  style={[styles.row, active && styles.rowActive]}
                  onPress={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  testID={testID ? `${testID}-opt-${o.value}` : undefined}
                >
                  {o.dot && <View style={[styles.dot, { backgroundColor: o.dot }]} />}
                  <Text style={[styles.rowText, active && styles.rowTextActive]}>{o.label}</Text>
                  {active && <Check size={16} color={theme.accent} />}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: t.radius.pill,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      backgroundColor: t.surface,
    },
    triggerCompact: {
      paddingHorizontal: 9,
      paddingVertical: 5,
      gap: 4,
    },
    triggerText: {
      fontFamily: t.font.bodySemibold,
      fontSize: 14,
      color: t.textPrimary,
    },
    triggerTextCompact: {
      fontSize: 12,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    backdrop: {
      flex: 1,
    },
    menu: {
      position: 'absolute',
      backgroundColor: t.surfaceRaised,
      borderRadius: t.radius.lg,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      padding: 8,
      ...t.elevation.lg,
    },
    menuTitle: {
      fontFamily: t.font.bodyBold,
      fontSize: 13,
      color: t.textSecondary,
      paddingHorizontal: 8,
      paddingTop: 4,
      paddingBottom: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 11,
      paddingHorizontal: 8,
      borderRadius: t.radius.sm,
    },
    rowActive: {
      backgroundColor: t.accentSubtle,
    },
    rowText: {
      flex: 1,
      fontFamily: t.font.body,
      fontSize: 14,
      color: t.textPrimary,
    },
    rowTextActive: {
      fontFamily: t.font.bodyBold,
      color: t.accent,
    },
  });
