import { useCallback, useEffect, useState } from 'react';
import { api } from '../auth/api';
import { parseHistoryBackup } from '../lib/splitHistory';

const emptyPage = { records: [], total: 0, nextCursor: null };

export default function useCloudHistory(enabled, splitId, notify) {
  const [page, setPage] = useState(emptyPage);
  const [loading, setLoading] = useState(enabled);
  const [loadingMore, setLoadingMore] = useState(false);
  const [readError, setReadError] = useState(false);
  const [selectedSplit, setSelectedSplit] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [lastSavedId, setLastSavedId] = useState(null);

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      setPage(await api('/splits'));
      setReadError(false);
    } catch {
      setReadError(true);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!enabled || !splitId) {
      setSelectedSplit(null);
      return;
    }
    const controller = new AbortController();
    setSelectedSplit(null);
    setDetailLoading(true);
    api(`/splits/${encodeURIComponent(splitId)}`, { signal: controller.signal })
      .then((result) => {
        setSelectedSplit(result.split);
        setReadError(false);
      })
      .catch((error) => {
        if (error.name !== 'AbortError' && error.status !== 404) setReadError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailLoading(false);
      });
    return () => controller.abort();
  }, [enabled, splitId]);

  async function loadMore() {
    if (!page.nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = await api(`/splits?cursor=${encodeURIComponent(page.nextCursor)}`);
      setPage((current) => ({
        ...next,
        records: [
          ...current.records,
          ...next.records.filter(
            (record) => !current.records.some((item) => item.id === record.id),
          ),
        ],
      }));
    } catch {
      notify('cloud.loadFailed', {}, true);
    } finally {
      setLoadingMore(false);
    }
  }

  async function saveSplit({ members, expenses }) {
    if (!expenses.length) {
      setSaveStatus('empty');
      return;
    }
    setSaveStatus('saving');
    try {
      const result = await api('/splits', { method: 'POST', body: { members, expenses } });
      setLastSavedId(result.split.id);
      setSaveStatus('saved');
      setPage((current) => ({
        ...current,
        total: current.total + (result.created ? 1 : 0),
        records: [
          result.split,
          ...current.records.filter((record) => record.id !== result.split.id),
        ],
      }));
      await reload();
      if (result.created) notify('notificationSplitSaved');
    } catch {
      setSaveStatus('error');
      notify('errorHistorySave', {}, true);
    }
  }

  async function removeSplit(id) {
    try {
      await api(`/splits/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (lastSavedId === id) {
        setLastSavedId(null);
        setSaveStatus('deleted');
      }
      if (selectedSplit?.id === id) setSelectedSplit(null);
      await reload();
      notify('notificationDeleteSplit');
      return true;
    } catch {
      notify('errorHistoryDelete', {}, true);
      return false;
    }
  }

  async function clearHistory() {
    try {
      await api('/splits', { method: 'DELETE' });
      setPage(emptyPage);
      setSelectedSplit(null);
      setReadError(false);
      setLastSavedId(null);
      setSaveStatus('deleted');
      notify('notificationClearHistory');
      return true;
    } catch {
      notify('errorHistoryDelete', {}, true);
      return false;
    }
  }

  async function exportBackup() {
    try {
      return JSON.stringify(await api('/splits/export'), null, 2);
    } catch (error) {
      notify(
        error.code === 'EXPORT_TOO_LARGE' ? 'apiErrors.EXPORT_TOO_LARGE' : 'errorBackupExport',
        {},
        true,
      );
      return null;
    }
  }

  async function importBackup(text) {
    try {
      const splits = parseHistoryBackup(text);
      const result = await api('/splits/import', { method: 'POST', body: { version: 1, splits } });
      await reload();
      notify('notificationImportBackup', { count: result.imported });
      return true;
    } catch {
      notify('errorBackupImport', {}, true);
      return false;
    }
  }

  return {
    ...page,
    cloud: true,
    loading,
    loadingMore,
    readError,
    selectedSplit,
    detailLoading,
    saveStatus,
    lastSavedId,
    reload,
    loadMore,
    saveSplit,
    removeSplit,
    clearHistory,
    exportBackup,
    importBackup,
  };
}
