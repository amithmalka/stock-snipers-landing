import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import * as SecureStore from 'expo-secure-store'
import { Lang, Translations, getT } from '../i18n/translations'

const LANG_KEY = 'siel-lang'

interface LanguageContextValue {
  lang: Lang
  t: Translations
  setLang: (lang: Lang) => void
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'he',
  t: getT('he'),
  setLang: () => {},
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('he')

  useEffect(() => {
    SecureStore.getItemAsync(LANG_KEY).then((saved) => {
      if (saved === 'he' || saved === 'en') setLangState(saved)
    }).catch(() => {})
  }, [])

  function setLang(newLang: Lang) {
    setLangState(newLang)
    SecureStore.setItemAsync(LANG_KEY, newLang).catch(() => {})
  }

  return (
    <LanguageContext.Provider value={{ lang, t: getT(lang), setLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
