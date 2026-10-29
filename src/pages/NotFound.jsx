import { ArrowUpRight, History, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function NotFound() {
  const { t } = useTranslation();
  const home = `${import.meta.env.BASE_URL}#/split`;
  return (
    <main
      tabIndex={-1}
      aria-labelledby="section-heading"
      className="page-reveal relative isolate overflow-hidden rounded-[28px] border border-line bg-surface px-6 py-12 shadow-card sm:px-12 sm:py-16"
    >
      <div className="grid items-center gap-12 md:grid-cols-[1fr_0.9fr]">
        <div className="relative z-10 max-w-lg">
          <p className="mb-5 inline-flex items-center gap-2 text-xs font-bold tracking-[0.18em] text-muted">
            <span className="size-2 rounded-full bg-accent" />
            {t('notFound.eyebrow')}
          </p>
          <h1
            id="section-heading"
            className="text-4xl font-bold leading-[1.2] tracking-tight text-ink sm:text-5xl"
          >
            {t('notFound.title')}
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted">
            {t('notFound.description')}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={home}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-action-primary px-5 py-3 font-semibold text-on-primary hover:bg-action-primary-hover"
            >
              <Home size={18} aria-hidden="true" />
              {t('notFound.home')}
            </a>
            <a
              href={`${import.meta.env.BASE_URL}#/history`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line px-5 py-3 font-semibold text-primary hover:bg-subtle"
            >
              <History size={18} aria-hidden="true" />
              {t('notFound.history')}
              <ArrowUpRight size={16} aria-hidden="true" className="rtl:-scale-x-100" />
            </a>
          </div>
          <p className="mt-10 border-t border-line pt-5 text-sm text-muted">{t('notFound.note')}</p>
        </div>
        <div
          aria-hidden="true"
          className="relative mx-auto flex aspect-square w-full max-w-[370px] items-center justify-center"
        >
          <div className="absolute inset-3 rounded-full border border-line" />
          <div className="absolute inset-10 rounded-full border border-dashed border-control/50" />
          <div className="absolute inset-16 rounded-full bg-primary/5" />
          <div className="relative -rotate-6 rounded-2xl border border-line bg-surface px-8 pb-6 pt-5 text-center shadow-[0_20px_45px_-16px_rgba(22,96,136,0.3)] sm:px-10">
            <span className="mb-2 block text-[10px] font-bold tracking-[0.3em] text-muted">
              QISMA / LOST &amp; FOUND
            </span>
            <span
              dir="ltr"
              className="block text-[92px] font-black leading-none tracking-[-0.07em] text-primary sm:text-[112px]"
            >
              404<span className="text-accent">.</span>
            </span>
            <span className="mt-4 block border-t border-dashed border-control/50 pt-3 text-xs text-muted">
              {t('notFound.receipt')}
            </span>
          </div>
          <span className="absolute end-0 top-10 rotate-12 rounded-full border border-accent/50 bg-surface px-4 py-2 text-xs font-bold text-success">
            {t('notFound.stamp')}
          </span>
        </div>
      </div>
    </main>
  );
}
