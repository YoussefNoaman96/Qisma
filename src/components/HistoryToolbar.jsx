import { useRef, useState } from 'react';
import { Download, Trash2, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { downloadJson } from '../lib/download';
import { MAX_BACKUP_BYTES } from '../lib/splitHistory';
import { Button } from './ui';
import PdfExportButton from './PdfExportButton';

export default function HistoryToolbar({ archive, onClear, detail = false }) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function handleImport(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    setImporting(true);
    try {
      if (file.size > MAX_BACKUP_BYTES) await archive.importBackup('');
      else await archive.importBackup(await file.text());
    } catch {
      await archive.importBackup('');
    } finally {
      setImporting(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const text = await archive.exportBackup();
      if (text !== null) downloadJson(text);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="mb-5 flex flex-col flex-wrap gap-3 sm:flex-row">
      {!detail && (
        <PdfExportButton
          disabled={archive.loading || archive.readError || archive.records.length === 0}
          getSplits={async () => {
            const backup = await archive.exportBackup();
            return backup === null ? [] : JSON.parse(backup).splits;
          }}
        />
      )}
      <Button
        variant="neutral"
        onClick={handleExport}
        disabled={exporting || archive.loading || archive.readError || archive.records.length === 0}
      >
        <Download size={18} aria-hidden="true" />
        {t('exportBackup')}
      </Button>
      <Button
        variant="neutral"
        onClick={() => inputRef.current.click()}
        disabled={importing || archive.loading || archive.readError}
      >
        <Upload size={18} aria-hidden="true" />
        {t(importing ? 'importingBackup' : 'importBackup')}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        tabIndex={-1}
        aria-label={t('backupFileLabel')}
        onChange={handleImport}
      />
      {(archive.records.length > 0 || archive.readError) && (
        <Button variant="danger" onClick={onClear}>
          <Trash2 size={18} aria-hidden="true" />
          {t('clearHistory')}
        </Button>
      )}
    </div>
  );
}
