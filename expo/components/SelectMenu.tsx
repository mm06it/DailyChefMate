import { Check, ChevronDown } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/colors';

export type SelectOption = { value: string; label: string; dot?: string };

interface Props {
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
  /** Smaller trigger — for use inside a card. */
  compact?: boolean;
  /** Modal heading. */
  title?: string;
  testID?: string;
}

// Dot + label dropdown. Trigger pill + fade Modal overlay (portals to the
// root, so it works inside a FlatList header without clipping). Mirrors the
// LanguageSelector pattern.
export default function SelectMenu({ value, options, onChange, compact, title, testID }: Props) {
  const [open, setOpen] = useState(false);
  const current = useMemo(() => options.find((o) => o.value === value) ?? options[0], [options, value]);

  return (
    <>
      <Pressable
        style={[styles.trigger, compact && styles.triggerCompact]}
        onPress={() => setOpen(true)}
        testID={testID}
      >
        {current?.dot && <View style={[styles.dot, { backgroundColor: current.dot }]} />}
        <Text style={[styles.triggerText, compact && styles.triggerTextCompact]} numberOfLines={1}>
          {current?.label ?? ''}
        </Text>
        <ChevronDown size={compact ? 13 : 16} color={Colors.textLight} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            {title && <Text style={styles.sheetTitle}>{title}</Text>}
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
                  {active && <Check size={16} color={Colors.primary} />}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  triggerCompact: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    gap: 4,
  },
  triggerText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  triggerTextCompact: {
    fontSize: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 12,
    minWidth: 240,
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  rowActive: {
    backgroundColor: Colors.primaryLight,
  },
  rowText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  rowTextActive: {
    fontWeight: '700',
    color: Colors.primary,
  },
});
