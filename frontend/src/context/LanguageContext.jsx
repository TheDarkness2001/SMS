import React, { createContext, useState, useContext, useEffect } from 'react';
import en from '../locales/en.json';
import ru from '../locales/ru.json';
import uz from '../locales/uz.json';

const LanguageContext = createContext();

const translations = {
  en,
  ru,
  uz
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    // Get language from localStorage or default to 'en'
    return localStorage.getItem('language') || 'en';
  });

  useEffect(() => {
    // Save language to localStorage whenever it changes
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key, params = {}) => {
    // Navigate through nested keys (e.g., "login.title")
    const keys = key.split('.');
    let value = translations[language];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    if (!value) return key;

    // Handle interpolations like %{name}
    let result = value;
    Object.entries(params).forEach(([k, v]) => {
      result = result.replace(new RegExp(`%{${k}}`, 'g'), v);
    });
    
    return result;
  };

  const changeLanguage = (lang) => {
    if (translations[lang]) {
      setLanguage(lang);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
