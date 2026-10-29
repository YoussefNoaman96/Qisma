import { useState } from 'react';
import { Banknote, Languages, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Dropdown from './Dropdown';

export default function Header({ theme, setTheme, compact = false }) {
  const { t, i18n } = useTranslation();
  const [openMenu, setOpenMenu] = useState(null);
  return (
    <>
      <div className="mb-[30px] flex flex-col gap-4 rounded-[10px] bg-surface px-4 py-[15px] shadow-card sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0 text-[1.5rem] font-bold text-primary sm:text-[1.8rem]">
          {t('appTitle')}
        </div>
        <div className="grid w-full shrink-0 grid-cols-2 items-center gap-3 sm:flex sm:w-auto">
          <Dropdown
            label={t('themeLabel')}
            icon={theme === 'dark' ? Moon : Sun}
            value={theme}
            triggerText={t(theme === 'dark' ? 'themeDark' : 'themeLight')}
            options={[
              { value: 'light', label: t('themeLight') },
              { value: 'dark', label: t('themeDark') },
            ]}
            isOpen={openMenu === 'theme'}
            onOpenChange={(open) => setOpenMenu(open ? 'theme' : null)}
            onChange={setTheme}
          />
          <Dropdown
            label={t('languageLabel')}
            icon={Languages}
            align="end"
            value={i18n.resolvedLanguage}
            triggerText={i18n.resolvedLanguage.toUpperCase()}
            options={[
              { value: 'ar', label: 'AR – عربي' },
              { value: 'en', label: 'EN – English' },
            ]}
            isOpen={openMenu === 'language'}
            onOpenChange={(open) => setOpenMenu(open ? 'language' : null)}
            onChange={(language) => i18n.changeLanguage(language)}
          />
        </div>
      </div>
      {!compact && (
        <header className="mb-[30px] rounded-[10px] bg-[linear-gradient(135deg,var(--app-hero-from),var(--app-hero-to))] p-5 text-center text-white shadow-card">
          <h1 className="mb-2.5 text-[1.65rem] font-bold leading-relaxed sm:text-[2.5rem]">
            <Banknote className="me-2 inline-block align-middle" size={36} aria-hidden="true" />
            <span>{t('headerTitle')}</span>
          </h1>
          <p className="text-base opacity-90 sm:text-[1.2rem]">{t('headerSubtitle')}</p>
        </header>
      )}
    </>
  );
}
