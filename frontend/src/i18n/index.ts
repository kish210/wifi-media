import { create } from "zustand";
import { persist } from "zustand/middleware";
import en from "./en.json";
import fa from "./fa.json";
import ar from "./ar.json";

export type Lang = "en" | "fa" | "ar";

const STRINGS: Record<Lang, Record<string, string>> = { en, fa, ar };

interface I18nState {
  lang: Lang;
  dir: "ltr" | "rtl";
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

export const useI18n = create<I18nState>()(
  persist(
    (set, get) => ({
      lang: "en",
      dir: "ltr",
      setLang: (l: Lang) => {
        const dir = l === "fa" || l === "ar" ? "rtl" : "ltr";
        document.documentElement.dir = dir;
        document.documentElement.lang = l;
        document.body.dataset.lang = l;
        set({ lang: l, dir });
      },
      t: (key: string) => {
        const { lang } = get();
        return STRINGS[lang]?.[key] ?? STRINGS.en?.[key] ?? key;
      },
    }),
    { name: "wm-lang", partialize: (s) => ({ lang: s.lang, dir: s.dir }) }
  )
);

/** Apply persisted language on app boot */
export function initI18n() {
  const saved = localStorage.getItem("wm-lang");
  if (saved) {
    try {
      const { state } = JSON.parse(saved);
      if (state?.lang) useI18n.getState().setLang(state.lang as Lang);
    } catch { /* ignore */ }
  }
}
