import { createContext, useContext, useMemo, useState } from 'react';
import en from './en.js';
import sr from './sr.js';

const DICTS = { en, sr };
const Ctx = createContext({ lang: 'sr', t: (k) => k, setLang: () => {} });
export const useLang = () => useContext(Ctx);

function get(dict, path) {
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), dict);
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('lang') || 'sr');
  const setLang = (l) => { localStorage.setItem('lang', l); setLangState(l); };
  const t = useMemo(() => {
    const dict = DICTS[lang] || DICTS.sr;
    return (key) => get(dict, key) ?? get(DICTS.en, key) ?? key;
  }, [lang]);
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

/** Small SR/EN toggle, used in the header. */
export function LanguageSwitcher() {
  const { lang, setLang } = useLang();
  return (
    <span className="lang-switch">
      <button type="button" className={lang === 'sr' ? 'on' : ''} onClick={() => setLang('sr')}>SR</button>
      <button type="button" className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>EN</button>
    </span>
  );
}
