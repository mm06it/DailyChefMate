import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { Theme } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useLanguage } from '@/hooks/use-language';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';

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
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={[styles.wrap, style]} testID={testID ?? 'inline-confirm'}>
      <Text variant="title">{question}</Text>
      <View style={styles.row}>
        <Button
          label={cancelLabel ?? t('cancel') ?? 'Abbrechen'}
          variant="secondary"
          onPress={onCancel}
          testID="inline-confirm-cancel"
          style={styles.flex}
        />
        <Button
          label={confirmLabel}
          variant={destructive ? 'danger' : 'primary'}
          onPress={onConfirm}
          testID="inline-confirm-confirm"
          style={styles.flex}
        />
      </View>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    wrap: { gap: t.space[3] },
    row: { flexDirection: 'row', gap: t.space[2] },
    flex: { flex: 1 },
  });
