import { useEffect } from 'react';
import { Banknote, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/AuthContext';
import AuthForm from './AuthForm';

export default function AuthLayout({ mode, notify }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const register = mode === 'register';
  useEffect(() => {
    if (user) window.location.hash = '#/history';
  }, [user]);
  return (
    <div
      className={`relative isolate mx-auto flex w-full max-w-[920px] flex-col overflow-hidden rounded-[30px] border border-line bg-surface shadow-[0_20px_60px_-15px_rgb(22_96_136/0.25)] md:block ${register ? 'md:min-h-[790px]' : 'md:min-h-[620px]'}`}
    >
      <div
        className={`z-10 flex w-full items-center justify-center px-6 py-8 text-center transition-[inset-inline-start] duration-700 ease-in-out sm:px-10 md:absolute md:inset-y-0 md:w-1/2 ${register ? 'md:start-0' : 'md:start-1/2'}`}
      >
        <AuthForm key={mode} mode={mode} notify={notify} />
      </div>
      <aside
        className={`relative z-20 flex w-full flex-col items-center justify-center bg-[linear-gradient(135deg,var(--app-hero-from),var(--app-hero-to))] px-6 py-9 text-center text-white transition-[inset-inline-start,border-radius] duration-700 ease-in-out md:absolute md:inset-y-0 md:w-1/2 md:px-10 ${register ? 'order-last rounded-t-[50px] md:start-1/2 md:rounded-s-[100px] md:rounded-e-none' : 'order-first rounded-b-[50px] md:start-0 md:rounded-s-none md:rounded-e-[100px]'}`}
      >
        <div className="mb-5 flex size-16 items-center justify-center rounded-2xl border border-white/30 bg-white/10">
          <Banknote size={34} aria-hidden="true" />
        </div>
        <h2 className="mb-3 text-3xl font-bold">
          {t(register ? 'auth.welcomeAgain' : 'auth.welcomeBack')}
        </h2>
        <p className="mb-6 leading-relaxed">
          {t(register ? 'auth.alreadyAccount' : 'auth.noAccount')}
        </p>
        <a
          href={register ? '#/login' : '#/register'}
          className="inline-flex min-h-12 min-w-40 items-center justify-center rounded-xl border-2 border-white px-6 py-3 font-semibold text-white transition-colors hover:bg-white hover:text-[#166088]"
        >
          {t(register ? 'auth.login' : 'auth.register')}
        </a>
        <p className="mt-8 flex items-center justify-center gap-2 text-sm">
          <ShieldCheck size={18} aria-hidden="true" />
          {t('auth.privateHistory')}
        </p>
      </aside>
    </div>
  );
}
