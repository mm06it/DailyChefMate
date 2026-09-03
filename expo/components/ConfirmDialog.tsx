import React, { memo } from 'react';
import { Modal, View, StyleSheet } from 'react-native';

import type { Theme } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useLanguage } from '@/hooks/use-language';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';

interface ConfirmDialogProps {
  visible: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  // Optional third choice — renders the buttons in a column. Used for the
  // "discard changes?" prompt (Save / Discard / Keep editing).
  neutralLabel?: string;
  onNeutral?: () => void;
  testID?: string;
}

function ConfirmDialogComponent({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = true,
  onConfirm,
  onCancel,
  neutralLabel,
  onNeutral,
  testID,
}: ConfirmDialogProps) {
  const { t } = useLanguage();
  const styles = useThemedStyles(makeStyles);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card} testID={testID ?? 'confirm-dialog'}>
          {!!title && (
            <Text variant="h3" center>
              {title}
            </Text>
          )}
          {!!message && (
            <Text variant="body" color="secondary" center style={styles.message}>
              {message}
            </Text>
          )}

          {onNeutral ? (
            <View style={styles.actionsColumn}>
              <Button
                label={confirmLabel ?? t('delete') ?? 'OK'}
                variant={destructive ? 'danger' : 'primary'}
                onPress={onConfirm}
                testID="confirm-dialog-confirm"
              />
              <Button
                label={neutralLabel ?? ''}
                variant="primary"
                onPress={onNeutral}
                testID="confirm-dialog-neutral"
              />
              <Button
                label={cancelLabel ?? t('cancel') ?? 'Abbrechen'}
                variant="secondary"
                onPress={onCancel}
                testID="confirm-dialog-cancel"
              />
            </View>
          ) : (
            <View style={styles.actions}>
              <Button
                label={cancelLabel ?? t('cancel') ?? 'Abbrechen'}
                variant="secondary"
                onPress={onCancel}
                testID="confirm-dialog-cancel"
                style={styles.flex}
              />
              <Button
                label={confirmLabel ?? t('delete') ?? 'OK'}
                variant={destructive ? 'danger' : 'primary'}
                onPress={onConfirm}
                testID="confirm-dialog-confirm"
                style={styles.flex}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: t.overlay,
      alignItems: 'center',
      justifyContent: 'center',
      padding: t.space[6],
    },
    card: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: t.surfaceRaised,
      borderRadius: t.radius.lg,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      padding: t.space[6],
      gap: t.space[3],
      ...t.elevation.lg,
    },
    message: { marginBottom: t.space[3] },
    actions: { flexDirection: 'row', gap: t.space[3] },
    actionsColumn: { gap: t.space[2] },
    flex: { flex: 1 },
  });

export const ConfirmDialog = memo(ConfirmDialogComponent);
export type { ConfirmDialogProps };
