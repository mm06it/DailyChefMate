import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import createContextHook from '@nkzw/create-context-hook';

import { DEFAULT_LANGUAGE, LanguageCode } from '@/constants/languages';
import { getTranslation } from '@/constants/translations';

const LANGUAGE_STORAGE_KEY = 'fridgy_language';

export const [LanguageContext, useLanguage] = createContextHook(() => {
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      console.log('Loaded language from storage:', stored);
      if (stored && stored in { de: true, en: true, fr: true, es: true, it: true }) {
        setCurrentLanguage(stored as LanguageCode);
      } else {
        console.log('Using default language:', DEFAULT_LANGUAGE);
        setCurrentLanguage(DEFAULT_LANGUAGE);
      }
    } catch (error) {
      console.log('Error loading language:', error);
      setCurrentLanguage(DEFAULT_LANGUAGE);
    } finally {
      setIsLoading(false);
    }
  };

  const changeLanguage = async (language: LanguageCode) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      setCurrentLanguage(language);
    } catch (error) {
      console.log('Error saving language:', error);
    }
  };

  const t = (key: string): string => {
    return getTranslation(currentLanguage, key);
  };

  return {
    language: currentLanguage,
    currentLanguage,
    changeLanguage,
    t,
    isLoading
  };
});