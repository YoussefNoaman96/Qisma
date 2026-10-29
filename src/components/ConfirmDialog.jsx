import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui';

export default function ConfirmDialog({ title, description, confirmText, onConfirm, onCancel }) {
  const { t } = useTranslation();
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    dialog.showModal();
    cancelRef.current.focus();
    return () => {
      dialog.close();
      if (previousFocus?.isConnected) previousFocus.focus();
      else document.querySelector('main')?.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="fixed inset-0 m-auto w-[calc(100%-32px)] max-w-md rounded-xl border border-line bg-surface p-5 text-ink shadow-xl backdrop:bg-black/60 sm:p-6"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <h2 id={titleId} className="mb-3 text-xl font-bold text-primary">
        {title}
      </h2>
      <p id={descriptionId} className="leading-relaxed">
        {description}
      </p>
      <div className="mt-6 flex flex-col gap-3 min-[480px]:flex-row">
        <button
          ref={cancelRef}
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="min-h-12 flex-1 rounded-lg border border-line px-5 py-3 font-semibold hover:bg-subtle"
        >
          {t('cancel')}
        </button>
        <Button variant="danger" className="flex-1" disabled={busy} onClick={confirm}>
          {confirmText}
        </Button>
      </div>
    </dialog>
  );
}
