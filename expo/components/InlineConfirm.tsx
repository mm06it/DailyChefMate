import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import Colors from '@/constants/colors';
import { useLanguage } from '@/hooks/use-language';

interface InlineConfirmProps {
  question: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// A yes/no confirmation rendered in place of the triggering control — no
// modal, no browser popup. Used for sign-out and delete-recipe.
export default function InlineConfirm({
  question,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  destructive = false,
  style,
  testID,
}: InlineConfirmProps) {
  const { t } = useLanguage();

  return (
    <View style={[styles.wrap, style]} testID={testID ?? 'inline-confirm'}>
      <Text style={styles.question}>{question}</Text>
      <View style={styles.row}>
        <Pressable
          style={[styles.button, styles.cancel]}
          onPress={onCancel}
          testID="inline-confirm-cancel"
        >
          <Text style={styles.cancelText}>{cancelLabel ?? t('cancel') ?? 'Abbrechen'}</Text>
        </Pressable>
        <Pressable
          style={[styles.button, destructive ? styles.destructive : styles.confirm]}
          onPress={onConfirm}
          testID="inline-confirm-confirm"
        >
          <Text style={styles.confirmText}>{confirmLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  question: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancel: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  confirm: {
    backgroundColor: Colors.primary,
  },
  destructive: {
    backgroundColor: '#ef4444',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
});
