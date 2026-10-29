import { useState } from 'react';
import { Cloud, LogIn, LogOut, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';

export default function AccountBar({ notify }) {
  const { t } = useTranslation();
  const { user, logout, sessionError } = useAuth();
  const [busy, setBusy] = useState(false);

  async function handleLogout(allDevices) {
    setBusy(true);
    try {
      await logout(allDevices);
      notify('auth.loggedOut');
    } catch (error) {
      notify(`apiErrors.${error.code}`, {}, true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-5 flex flex-col gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="flex min-w-0 items-center gap-2 text-sm text-muted">
        {user ? (
          <Cloud size={18} className="shrink-0 text-primary" aria-hidden="true" />
        ) : (
          <UserRound size={18} className="shrink-0" aria-hidden="true" />
        )}
        {user ? (
          <span className="min-w-0 break-words">
            {t('auth.accountHistory', { name: user.name })}
          </span>
        ) : (
          t(sessionError ? 'auth.sessionUnavailable' : 'auth.guestHint')
        )}
      </p>
      <div className="flex shrink-0 flex-wrap gap-2">
        {user ? (
          <>
            <button
              disabled={busy}
              onClick={() => handleLogout(false)}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-primary hover:bg-primary/10"
            >
              <LogOut size={16} aria-hidden="true" />
              {t('auth.logout')}
            </button>
            <button
              disabled={busy}
              onClick={() => handleLogout(true)}
              className="min-h-11 rounded-lg px-3 text-sm text-danger hover:bg-danger/10"
            >
              {t('auth.logoutAll')}
            </button>
          </>
        ) : (
          <a
            href="#/login"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-action-primary px-4 text-sm font-semibold text-on-primary hover:bg-action-primary-hover"
          >
            <LogIn size={16} aria-hidden="true" />
            {t('auth.login')}
          </a>
        )}
      </div>
    </div>
  );
}
