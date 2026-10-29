import { useState } from 'react';
import { FileDown, LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui';

export default function PdfExportButton({ getSplits, disabled = false }) {
  const { t, i18n } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  async function download() {
    const language = i18n.resolvedLanguage;
    const translate = i18n.getFixedT(language);
    setBusy(true);
    setFailed(false);
    try {
      const splits = await getSplits();
      if (!splits?.length) throw new Error('No report data.');
      const { downloadReport } = await import('../lib/pdfReport');
      await downloadReport(splits, { t: translate, language });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-col gap-2">
      <Button onClick={download} disabled={disabled || busy}>
        {busy ? (
          <LoaderCircle
            size={18}
            className="animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : (
          <FileDown size={18} aria-hidden="true" />
        )}
        {t(busy ? 'pdf.preparing' : 'pdf.download')}
      </Button>
      {failed && (
        <p role="alert" className="max-w-sm text-sm text-danger">
          {t('pdf.error')}
        </p>
      )}
    </div>
  );
}
