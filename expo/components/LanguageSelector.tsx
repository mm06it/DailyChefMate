import { Languages } from 'lucide-react-native';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';

import type { Theme } from '@/constants/theme';
import { LANGUAGES, LanguageCode } from '@/constants/languages';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage } from '@/hooks/use-language';
import { Text } from '@/components/ui/Text';

export const LanguageSelector: React.FC = () => {
  const { currentLanguage, changeLanguage, t } = useLanguage();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);

  const handleLanguageSelect = (languageCode: LanguageCode) => {
    changeLanguage(languageCode);
    setIsModalVisible(false);
  };

  return (
    <React.Fragment>
      <TouchableOpacity
        style={styles.languageButton}
        onPress={() => setIsModalVisible(true)}
        testID="language-selector-button"
      >
        <Languages size={20} color={theme.textSecondary} />
      </TouchableOpacity>
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setIsModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text variant="h3" center style={styles.modalTitle}>{t('selectLanguage')}</Text>
            {Object.entries(LANGUAGES).map(([code, language]) => {
              const selected = currentLanguage === code;
              return (
                <TouchableOpacity
                  key={code}
                  style={[styles.languageOption, selected && styles.selectedLanguageOption]}
                  onPress={() => handleLanguageSelect(code as LanguageCode)}
                  testID={`language-option-${code}`}
                >
                  <Text style={styles.languageFlag}>{language.flag}</Text>
                  <Text
                    variant="body"
                    weight={selected ? 'semibold' : 'regular'}
                    style={[styles.languageName, selected && { color: theme.accent }]}
                  >
                    {language.name}
                  </Text>
                  {selected && (
                    <View style={styles.checkmark}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </React.Fragment>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    languageButton: { padding: 8, marginLeft: 8 },
    modalOverlay: {
      flex: 1,
      backgroundColor: t.overlay,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: t.surfaceRaised,
      borderRadius: t.radius.lg,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      padding: t.space[6],
      minWidth: 250,
      maxWidth: 300,
      ...t.elevation.lg,
    },
    modalTitle: { marginBottom: t.space[4] },
    languageOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: t.space[3],
      paddingHorizontal: t.space[4],
      borderRadius: t.radius.sm,
      marginBottom: t.space[1],
    },
    selectedLanguageOption: { backgroundColor: t.accentSubtle },
    languageFlag: { fontSize: 20, marginRight: t.space[3] },
    languageName: { flex: 1 },
    checkmark: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: t.accent,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkmarkText: { color: '#FFFFFF', fontSize: 12, fontFamily: t.font.bodyBold },
  });
