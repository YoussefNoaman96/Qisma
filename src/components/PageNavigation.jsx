import { Calculator, History } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function PageNavigation({ page, historyCount }) {
  const { t } = useTranslation();
  const links = [
    { page: 'split', label: t('splitPage'), icon: Calculator },
    { page: 'history', label: t('historyTitle'), icon: History },
  ];
  return (
    <nav
      aria-label={t('mainNavigation')}
      className="mb-[30px] grid grid-cols-2 gap-2 sm:mx-auto sm:flex sm:w-fit sm:justify-center"
    >
      {links.map(({ page: target, label, icon: Icon }) => (
        <a
          key={target}
          href={`#/${target}`}
          aria-current={page === target ? 'page' : undefined}
          className={`flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-center text-sm font-semibold transition-colors sm:px-5 sm:text-base ${page === target ? 'border-primary bg-action-primary text-on-primary shadow-card' : 'border-line bg-surface text-primary hover:border-primary hover:bg-primary/10'}`}
        >
          <Icon size={18} className="shrink-0" aria-hidden="true" />
          <span>{label}</span>
          {target === 'history' && historyCount > 0 && (
            <span className="rounded-full bg-ink/10 px-2 py-0.5 text-xs">{historyCount}</span>
          )}
        </a>
      ))}
    </nav>
  );
}
