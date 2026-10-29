import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api, hasSessionCookie } from './api';
import { readSplitHistory } from '../lib/splitHistory';
import { DRAFT_KEY, readDraft, writeDraft } from '../lib/draft';
import { accountDraftStorage } from './draftStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(hasSessionCookie);
  const [sessionError, setSessionError] = useState(false);
  const channelRef = useRef(null);

  useEffect(() => {
    const channel =
      typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('expense-auth');
    channelRef.current = channel;
    let active = true;
    if (hasSessionCookie()) {
      api('/auth/session')
        .then((result) => {
          if (active) setUser(result.user);
        })
        .catch((error) => {
          if (active && error.status !== 401) setSessionError(true);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }
    const expire = () => {
      setUser(null);
      setLoading(false);
      setSessionError(false);
    };
    async function synchronize() {
      setLoading(true);
      try {
        setUser(hasSessionCookie() ? (await api('/auth/session')).user : null);
        setSessionError(false);
      } catch (error) {
        setUser(null);
        setSessionError(error.status !== 401);
      } finally {
        setLoading(false);
      }
    }
    window.addEventListener('auth:expired', expire);
    channel?.addEventListener('message', synchronize);
    return () => {
      active = false;
      window.removeEventListener('auth:expired', expire);
      channel?.removeEventListener('message', synchronize);
      channel?.close();
      channelRef.current = null;
    };
  }, []);

  async function authenticate(mode, values, importGuest) {
    const result = await api(`/auth/${mode}`, { method: 'POST', body: values, retryAuth: false });
    let migrationFailed = false;
    if (importGuest) {
      try {
        const splits = readSplitHistory();
        if (splits.length)
          await api('/splits/import', { method: 'POST', body: { version: 1, splits } });
        const storage = accountDraftStorage(result.user.id);
        if (storage.getItem(DRAFT_KEY) === null) writeDraft(readDraft(), storage);
      } catch {
        migrationFailed = true;
      }
    }
    setUser(result.user);
    setSessionError(false);
    channelRef.current?.postMessage('changed');
    return { migrationFailed };
  }

  async function logout(allDevices = false) {
    await api(`/auth/${allDevices ? 'logout-all' : 'logout'}`, {
      method: 'POST',
      body: {},
      retryAuth: allDevices,
    });
    setUser(null);
    setSessionError(false);
    channelRef.current?.postMessage('changed');
    window.location.hash = '#/split';
  }

  return (
    <AuthContext.Provider value={{ user, loading, sessionError, authenticate, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider is required.');
  return context;
}
