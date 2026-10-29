import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Header from './components/Header';
import StepIndicator from './components/StepIndicator';
import MembersStep from './components/MembersStep';
import ExpensesStep from './components/ExpensesStep';
import ResultsStep from './components/ResultsStep';
import Notification from './components/Notification';
import PageNavigation from './components/PageNavigation';
import HistoryPage from './components/HistoryPage';
import DraftNotice from './components/DraftNotice';
import useExpenseGroup from './hooks/useExpenseGroup';
import useSplitHistory from './hooks/useSplitHistory';
import usePageRoute from './hooks/usePageRoute';
import { readPreference, savePreference } from './lib/preferences';
import { useAuth } from './auth/AuthContext';
import { accountDraftStorage } from './auth/draftStorage';
import AccountBar from './auth/AccountBar';
import AuthLayout from './pages/auth/AuthLayout';
import NotFound from './pages/NotFound';

export default function App() {
  const { t, i18n } = useTranslation();
  const [theme, setTheme] = useState(() =>
    readPreference('expenseSplitterDarkMode', 'false') === 'true' ? 'dark' : 'light',
  );
  const [notification, setNotification] = useState(null);
  const route = usePageRoute();
  const { user, loading } = useAuth();
  const authPage = ['login', 'register'].includes(route.page);
  const notify = useCallback((key, values = {}, isError = false) => {
    setNotification({ key, values, isError });
  }, []);

  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage;
    document.documentElement.dir = i18n.dir();
    document.title = `${t(route.page === 'not-found' ? 'notFound.pageTitle' : route.page === 'history' ? 'historyTitle' : 'headerTitle')} | ${t('appTitle')}`;
    savePreference('expenseSplitterLanguage', i18n.resolvedLanguage);
  }, [i18n, i18n.resolvedLanguage, t, route.page]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    // Switch each foreground/background pair together, without low-contrast intermediate colours.
    root.classList.add('theme-switching');
    root.dataset.theme = theme;
    savePreference('expenseSplitterDarkMode', String(theme === 'dark'));
    let secondFrame;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => root.classList.remove('theme-switching'));
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      root.classList.remove('theme-switching');
    };
  }, [theme]);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 5000);
    return () => clearTimeout(timer);
  }, [notification]);

  return (
    <div className="mx-auto max-w-[1240px] p-3 sm:p-5">
      <Header theme={theme} setTheme={setTheme} compact={authPage || route.page === 'not-found'} />
      {route.page === 'not-found' ? (
        <NotFound />
      ) : loading ? (
        <main className="card">
          <p role="status">{t('auth.restoring')}</p>
        </main>
      ) : authPage ? (
        <main className="page-reveal">
          <AuthLayout mode={route.page} notify={notify} />
        </main>
      ) : (
        <Workspace key={user?.id || 'guest'} user={user} route={route} notify={notify} />
      )}
      <footer className="mt-10 border-t border-line pt-5 text-center text-sm text-muted">
        <p>{t('footerText')}</p>
      </footer>
      <Notification notification={notification} onClose={() => setNotification(null)} />
    </div>
  );
}

function Workspace({ user, route, notify }) {
  const archive = useSplitHistory(notify, user, route.splitId);
  const storage = useMemo(() => accountDraftStorage(user?.id), [user?.id]);
  const group = useExpenseGroup(notify, archive.saveSplit, storage);
  const sectionRef = useRef(null);
  const currentView = `${route.page}/${route.splitId ?? ''}/${route.page === 'split' ? group.step : ''}`;
  const previousView = useRef(currentView);
  useEffect(() => {
    if (previousView.current !== currentView) {
      sectionRef.current?.focus({ preventScroll: true });
      sectionRef.current?.scrollIntoView({ block: 'nearest' });
      previousView.current = currentView;
    }
  }, [currentView]);
  return (
    <>
      <AccountBar notify={notify} />
      <PageNavigation page={route.page} historyCount={archive.total} />
      {route.page === 'split' && <StepIndicator step={group.step} />}
      <main
        ref={sectionRef}
        tabIndex={-1}
        aria-labelledby="section-heading"
        className="card page-reveal outline-none"
      >
        {route.page === 'split' && <DraftNotice group={group} />}
        {route.page === 'history' ? (
          <HistoryPage archive={archive} splitId={route.splitId} />
        ) : (
          <>
            {group.step === 1 && <MembersStep group={group} />}
            {group.step === 2 && <ExpensesStep group={group} />}
            {group.step === 3 && <ResultsStep group={group} archive={archive} />}
          </>
        )}
      </main>
    </>
  );
}
