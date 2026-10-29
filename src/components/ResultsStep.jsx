import { useState } from 'react';
import { ChartPie, CircleCheck, History, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { sameSplit } from '../lib/splitHistory';
import { Button, DirectionArrow, SectionTitle } from './ui';
import ConfirmDialog from './ConfirmDialog';
import ResultsDetails from './ResultsDetails';

export default function ResultsStep({ group, archive }) {
  const { t } = useTranslation();
  const [confirmReset, setConfirmReset] = useState(false);
  const saved = archive.records.find((split) => sameSplit(split, group));

  return (
    <>
      <SectionTitle icon={ChartPie}>{t('resultsTitle')}</SectionTitle>
      {saved && (
        <div className="mb-5 flex flex-col gap-3 rounded-lg border border-accent/50 bg-accent/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm">
            <CircleCheck size={20} className="shrink-0 text-success" aria-hidden="true" />
            {t('splitSavedHint')}
          </p>
          <a
            href={`#/history/${saved.id}`}
            className="inline-flex min-h-11 items-center gap-2 font-semibold text-primary underline-offset-4 hover:underline"
          >
            <History size={18} aria-hidden="true" />
            {t('viewSavedSplit')}
          </a>
        </div>
      )}
      {group.expenses.length === 0 && (
        <p className="mb-5 text-sm text-muted">{t('emptySplitNotSaved')}</p>
      )}
      {!saved && group.expenses.length > 0 && (
        <div className="mb-5 rounded-lg border border-line bg-subtle p-4">
          <p className={`text-sm ${archive.saveStatus === 'error' ? 'text-danger' : 'text-muted'}`}>
            {t(
              archive.saveStatus === 'saving'
                ? 'cloud.saving'
                : archive.saveStatus === 'error'
                  ? 'errorHistorySave'
                  : 'splitNotInHistory',
            )}
          </p>
          <Button
            className="mt-3"
            disabled={archive.saveStatus === 'saving'}
            onClick={() => archive.saveSplit(group)}
          >
            {t('saveToHistory')}
          </Button>
        </div>
      )}
      <ResultsDetails members={group.members} expenses={group.expenses} results={group.results} />
      <div className="action-row">
        <Button variant="warning" onClick={() => group.goToStep(2)}>
          <DirectionArrow back />
          {t('backToExpensesText')}
        </Button>
        <Button variant="danger" onClick={() => setConfirmReset(true)}>
          <RotateCcw size={18} aria-hidden="true" />
          {t('resetAppText')}
        </Button>
      </div>
      {confirmReset && (
        <ConfirmDialog
          title={t('resetAppText')}
          description={t('resetConfirm')}
          confirmText={t('resetAppText')}
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            group.resetGroup();
            setConfirmReset(false);
          }}
        />
      )}
    </>
  );
}
