import { CalendarDays, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { calculateResults } from '../lib/expenses';
import { formatDateTime } from '../lib/format';
import { Button, DirectionArrow } from './ui';
import ExpenseList from './ExpenseList';
import ResultsDetails from './ResultsDetails';
import ReportActions from './ReportActions';

export default function HistoryDetails({ split, onDelete }) {
  const { t, i18n } = useTranslation();
  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <CalendarDays size={18} aria-hidden="true" />
          {t('savedAt')}{' '}
          <time dateTime={split.savedAt}>
            {formatDateTime(split.savedAt, i18n.resolvedLanguage)}
          </time>
        </p>
        <a
          href="#/history"
          className="inline-flex min-h-11 items-center gap-2 font-semibold text-primary hover:underline"
        >
          <DirectionArrow back />
          {t('backToHistory')}
        </a>
      </div>
      <ResultsDetails
        members={split.members}
        expenses={split.expenses}
        results={calculateResults(split.members, split.expenses)}
      />
      <ReportActions split={split} />
      <h3 className="mt-6 text-lg font-bold text-primary">{t('expensesListLabel')}</h3>
      <ExpenseList members={split.members} expenses={split.expenses} />
      <Button variant="danger" className="mt-4 w-full sm:w-auto" onClick={() => onDelete(split)}>
        <Trash2 size={18} aria-hidden="true" />
        {t('deleteSplit')}
      </Button>
    </>
  );
}
