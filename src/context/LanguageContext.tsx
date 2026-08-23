"use client";

import React, { createContext, useContext, useState } from 'react';

type Language = 'en-IN' | 'hi-IN';

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en-IN',
  toggleLanguage: () => {},
});

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguage] = useState<Language>('en-IN');

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en-IN' ? 'hi-IN' : 'en-IN');
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
