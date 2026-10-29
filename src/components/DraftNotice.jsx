import { useState } from 'react';
import { Check, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ConfirmDialog from './ConfirmDialog';
import { Button } from './ui';

export default function DraftNotice({ group }) {
  const { t } = useTranslation();
  const [confirmReset, setConfirmReset] = useState(false);
  const invalid = group.restoreIssue === 'invalid';
  const failed = invalid || group.draftSaveError;
  const Icon = failed ? TriangleAlert : Check;
  return (
    <>
      <div
        role={failed ? 'alert' : undefined}
        className={`mb-5 rounded-lg border p-3 text-sm ${failed ? 'border-danger/40 bg-danger/10 text-danger' : 'border-line bg-subtle text-muted'}`}
      >
        <p className="flex items-start gap-2">
          <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          {t(invalid ? 'errorDraftRead' : failed ? 'errorDraftSave' : 'draftSavedHint')}
        </p>
        {invalid && (
          <Button variant="danger" className="mt-3" onClick={() => setConfirmReset(true)}>
            {t('discardDraft')}
          </Button>
        )}
      </div>
      {confirmReset && (
        <ConfirmDialog
          title={t('discardDraft')}
          description={t('discardDraftConfirm')}
          confirmText={t('discardDraft')}
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
