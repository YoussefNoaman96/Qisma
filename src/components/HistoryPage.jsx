import { useState } from 'react';
import { History } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '../lib/format';
import { Button, DirectionArrow, EmptyState, SectionTitle } from './ui';
import ConfirmDialog from './ConfirmDialog';
import HistoryCard from './HistoryCard';
import HistoryDetails from './HistoryDetails';
import HistoryToolbar from './HistoryToolbar';

export default function HistoryPage({ archive, splitId }) {
  const { t, i18n } = useTranslation();
  const [confirmation, setConfirmation] = useState(null);
  const selected = archive.selectedSplit ?? archive.records.find((split) => split.id === splitId);

  async function confirmDeletion() {
    const success =
      confirmation.type === 'all'
        ? await archive.clearHistory()
        : await archive.removeSplit(confirmation.split.id);
    setConfirmation(null);
    if (success && splitId) window.location.hash = '#/history';
  }

  let content;
  if (archive.loading || (splitId && archive.detailLoading)) {
    content = (
      <p role="status" className="py-8 text-center text-muted">
        {t('cloud.loading')}
      </p>
    );
  } else if (archive.readError) {
    content = (
      <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-4 text-danger">
        {t(archive.cloud ? 'cloud.loadFailed' : 'errorHistoryRead')}
        {archive.cloud && (
          <button onClick={archive.reload} className="ms-3 min-h-11 underline">
            {t('cloud.retry')}
          </button>
        )}
      </p>
    );
  } else if (splitId && !selected) {
    content = (
      <>
        <EmptyState icon={History}>{t('savedSplitNotFound')}</EmptyState>
        <a
          href="#/history"
          className="inline-flex min-h-11 items-center gap-2 font-semibold text-primary hover:underline"
        >
          <DirectionArrow back />
          {t('backToHistory')}
        </a>
      </>
    );
  } else if (selected) {
    content = (
      <HistoryDetails
        split={selected}
        onDelete={(split) => setConfirmation({ type: 'one', split })}
      />
    );
  } else if (archive.records.length === 0) {
    content = <EmptyState icon={History}>{t('noSavedSplits')}</EmptyState>;
  } else {
    content = (
      <ul className="space-y-4" aria-label={t('historyTitle')}>
        {archive.records.map((split, index) => (
          <HistoryCard
            key={split.id}
            split={split}
            latest={index === 0}
            onDelete={(record) => setConfirmation({ type: 'one', split: record })}
          />
        ))}
      </ul>
    );
  }

  return (
    <>
      <SectionTitle icon={History}>{t(splitId ? 'savedSplitTitle' : 'historyTitle')}</SectionTitle>
      {!splitId && (
        <p className="mb-5 text-sm text-muted">
          {t(archive.cloud ? 'cloud.historyDescription' : 'historyDescription')}
        </p>
      )}
      <HistoryToolbar archive={archive} onClear={() => setConfirmation({ type: 'all' })} />
      {content}
      {!splitId && archive.nextCursor && (
        <Button
          className="mt-5"
          variant="neutral"
          disabled={archive.loadingMore}
          onClick={archive.loadMore}
        >
          {t(archive.loadingMore ? 'cloud.loading' : 'cloud.loadMore')}
        </Button>
      )}
      {confirmation && (
        <ConfirmDialog
          title={t(confirmation.type === 'all' ? 'clearHistory' : 'deleteSplit')}
          description={
            confirmation.type === 'all'
              ? t('clearHistoryConfirm')
              : t('deleteSplitConfirm', {
                  date: formatDateTime(confirmation.split.savedAt, i18n.resolvedLanguage),
                })
          }
          confirmText={t(confirmation.type === 'all' ? 'clearHistory' : 'deleteSplit')}
          onCancel={() => setConfirmation(null)}
          onConfirm={confirmDeletion}
        />
      )}
    </>
  );
}
