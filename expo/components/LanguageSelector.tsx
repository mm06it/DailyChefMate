import { Languages } from 'lucide-react-native';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import Colors from '@/constants/colors';
import { LANGUAGES, LanguageCode } from '@/constants/languages';
import { useLanguage } from '@/hooks/use-language';

export const LanguageSelector: React.FC = () => {
  const { currentLanguage, changeLanguage } = useLanguage();
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
        <Languages size={20} color={Colors.primary} />
      </TouchableOpacity>
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sprache wählen</Text>
            {Object.entries(LANGUAGES).map(([code, language]) => (
              <TouchableOpacity
                key={code}
                style={[
                  styles.languageOption,
                  currentLanguage === code && styles.selectedLanguageOption
                ]}
                onPress={() => handleLanguageSelect(code as LanguageCode)}
                testID={`language-option-${code}`}
              >
                <Text style={styles.languageFlag}>{language.flag}</Text>
                <Text style={[
                  styles.languageName,
                  currentLanguage === code && styles.selectedLanguageName
                ]}>
                  {language.name}
                </Text>
                {currentLanguage === code && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </React.Fragment>
  );
};

const styles = StyleSheet.create({
  languageButton: {
    padding: 8,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 20,
    minWidth: 250,
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  selectedLanguageOption: {
    backgroundColor: Colors.primaryLight,
  },
  languageFlag: {
    fontSize: 20,
    marginRight: 12,
  },
  languageName: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  selectedLanguageName: {
    color: Colors.primary,
    fontWeight: '600',
  },
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});