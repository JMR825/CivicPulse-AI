"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { NextIntlClientProvider } from "next-intl";
import type { Locale } from "@/i18n/routing";

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextType>({
  locale: "en",
  setLocale: () => {},
});

export function useLocaleContext() {
  return useContext(LocaleContext);
}

const messagesCache: Record<string, any> = {};

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [messages, setMessages] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem("civicpulse_lang") as Locale | null;
    if (stored && ["en", "es", "fr", "hi"].includes(stored)) {
      setLocaleState(stored);
    }
  }, []);

  useEffect(() => {
    if (messagesCache[locale]) {
      setMessages(messagesCache[locale]);
      return;
    }
    import(`../../messages/${locale}.json`).then((mod) => {
      messagesCache[locale] = mod.default;
      setMessages(mod.default);
    });
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("civicpulse_lang", newLocale);
  }, []);

  if (!messages) return null;

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
