import { useEffect, useState } from 'react';
import {
  HISTORY_KEY,
  clearSplitHistory,
  exportHistoryBackup,
  importHistoryBackup,
  readSplitHistory,
  removeSavedSplit,
  saveSplit as persistSplit,
} from '../lib/splitHistory';

function loadHistory() {
  try {
    return { records: readSplitHistory(), readError: false };
  } catch {
    return { records: [], readError: true };
  }
}

export default function useGuestHistory(notify) {
  const [history, setHistory] = useState(loadHistory);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [lastSavedId, setLastSavedId] = useState(null);

  useEffect(() => {
    function refreshHistory(event) {
      if (event.key === HISTORY_KEY || event.key === null) setHistory(loadHistory());
    }
    window.addEventListener('storage', refreshHistory);
    return () => window.removeEventListener('storage', refreshHistory);
  }, []);

  function saveSplit({ members, expenses }) {
    setLastSavedId(null);
    if (expenses.length === 0) {
      setSaveStatus('empty');
      return;
    }
    try {
      const result = persistSplit(members, expenses);
      setHistory({ records: result.records, readError: false });
      setLastSavedId(result.split.id);
      setSaveStatus('saved');
      if (result.created) notify('notificationSplitSaved');
    } catch {
      setSaveStatus('error');
      notify('errorHistorySave', {}, true);
    }
  }

  function removeSplit(id) {
    try {
      const records = removeSavedSplit(id);
      setHistory({ records, readError: false });
      if (lastSavedId === id) {
        setLastSavedId(null);
        setSaveStatus('deleted');
      }
      notify('notificationDeleteSplit');
      return true;
    } catch {
      notify('errorHistoryDelete', {}, true);
      return false;
    }
  }

  function clearHistory() {
    try {
      clearSplitHistory();
      setHistory({ records: [], readError: false });
      setLastSavedId(null);
      setSaveStatus('deleted');
      notify('notificationClearHistory');
      return true;
    } catch {
      notify('errorHistoryDelete', {}, true);
      return false;
    }
  }

  function exportBackup() {
    try {
      return exportHistoryBackup();
    } catch {
      notify('errorBackupExport', {}, true);
      return null;
    }
  }

  function importBackup(text) {
    try {
      const result = importHistoryBackup(text);
      setHistory({ records: result.records, readError: false });
      notify('notificationImportBackup', { count: result.imported });
      return true;
    } catch {
      notify('errorBackupImport', {}, true);
      return false;
    }
  }

  return {
    ...history,
    saveStatus,
    lastSavedId,
    saveSplit,
    removeSplit,
    clearHistory,
    exportBackup,
    importBackup,
  };
}
