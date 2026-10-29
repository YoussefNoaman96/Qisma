import { CalendarDays, Trash2, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '../lib/expenses';
import { formatDateTime } from '../lib/format';
import { DirectionArrow } from './ui';

export default function HistoryCard({ split, latest, onDelete }) {
  const { t, i18n } = useTranslation();
  const total = split.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  return (
    <li className="rounded-[10px] border border-line bg-subtle p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex flex-wrap items-center gap-2 font-bold text-primary">
          <CalendarDays size={20} aria-hidden="true" />
          <time dateTime={split.savedAt}>
            {formatDateTime(split.savedAt, i18n.resolvedLanguage)}
          </time>
        </h3>
        {latest && (
          <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-secondary">
            {t('latestSplit')}
          </span>
        )}
      </div>
      <p className="mb-3 text-lg font-bold">
        {t('totalExpensesText')} {formatMoney(total, i18n.resolvedLanguage)} {t('currency')}
      </p>
      <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
        <span>
          {t('membersCountText')} {split.members.length}
        </span>
        <span>
          {t('expensesCountText')} {split.expenses.length}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {split.members.map((member) => (
          <span
            key={member.id}
            className="flex min-w-0 max-w-full items-center gap-2 rounded-full bg-tag px-3 py-1 text-sm"
          >
            <Users size={14} className="shrink-0 text-primary" aria-hidden="true" />
            <bdi className="min-w-0 break-words [overflow-wrap:anywhere]">{member.name}</bdi>
          </span>
        ))}
      </div>
      <div className="mt-5 flex flex-col gap-3 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between">
        <a
          href={`#/history/${split.id}`}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-action-primary px-5 py-3 font-semibold text-on-primary transition-colors hover:bg-action-primary-hover"
        >
          {t('viewSplitDetails')}
          <DirectionArrow />
        </a>
        <button
          type="button"
          onClick={() => onDelete(split)}
          aria-label={t('deleteSplitLabel', {
            date: formatDateTime(split.savedAt, i18n.resolvedLanguage),
          })}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2 font-semibold text-danger hover:bg-danger/10"
        >
          <Trash2 size={18} aria-hidden="true" />
          {t('deleteSplit')}
        </button>
      </div>
    </li>
  );
}
