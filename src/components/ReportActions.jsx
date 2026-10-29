import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { createShareSummary } from '../lib/shareSummary';
import { Button } from './ui';
import PdfExportButton from './PdfExportButton';

export default function ReportActions({ split }) {
  const { t, i18n } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [fallback, setFallback] = useState('');
  async function copy() {
    const summary = createShareSummary(split, { t, language: i18n.resolvedLanguage });
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setFallback('');
    } catch {
      setFallback(summary);
    }
  }
  return (
    <div className="mb-6 rounded-xl border border-line bg-subtle/50 p-4">
      <div className="flex flex-col flex-wrap gap-3 sm:flex-row">
        <PdfExportButton getSplits={() => [split]} disabled={!split.expenses.length} />
        <Button variant="neutral" onClick={copy} disabled={!split.expenses.length}>
          {copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
          {t(copied ? 'share.copied' : 'share.copy')}
        </Button>
      </div>
      {fallback && (
        <div className="mt-4">
          <p role="status" className="mb-2 text-sm text-muted">
            {t('share.error')}
          </p>
          <textarea
            aria-label={t('share.preview')}
            value={fallback}
            readOnly
            rows={8}
            className="field"
            onFocus={(event) => event.target.select()}
          />
        </div>
      )}
    </div>
  );
}
