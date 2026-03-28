import React, { memo } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';
import { useLanguage } from '@/hooks/use-language';

interface ConfirmDialogProps {
  visible: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  testID?: string;
}

function ConfirmDialogComponent({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  testID,
}: ConfirmDialogProps) {
  const { t } = useLanguage();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <View style={styles.card} testID={testID ?? 'confirm-dialog'}>
          {!!title && <Text style={styles.title}>{title}</Text>}
          {!!message && <Text style={styles.message}>{message}</Text>}

          <View style={styles.actions}>
            <Pressable
              style={[styles.button, styles.cancel]}
              onPress={onCancel}
              testID="confirm-dialog-cancel"
            >
              <Text style={styles.cancelText}>{cancelLabel ?? t('cancel') ?? 'Abbrechen'}</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.confirm]}
              onPress={onConfirm}
              testID="confirm-dialog-confirm"
            >
              <Text style={styles.confirmText}>{confirmLabel ?? t('delete') ?? 'OK'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancel: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  confirm: {
    backgroundColor: Colors.primary,
  },
  cancelText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export const ConfirmDialog = memo(ConfirmDialogComponent);
export type { ConfirmDialogProps };
