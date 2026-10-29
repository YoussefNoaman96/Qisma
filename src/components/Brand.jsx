import { useTranslation } from 'react-i18next';

export default function Brand({ small = false }) {
  const { t } = useTranslation();
  return (
    <a
      href={`${import.meta.env.BASE_URL}#/split`}
      className="inline-flex min-h-11 w-fit items-center gap-3 rounded-lg"
      aria-label={t('brand.home')}
    >
      <img
        src={`${import.meta.env.BASE_URL}brand/qisma-mark.svg`}
        width={small ? 36 : 44}
        height={small ? 36 : 44}
        alt=""
        aria-hidden="true"
      />
      <span className="min-w-0 text-start">
        <span className="block text-2xl font-bold leading-tight tracking-tight text-primary">
          {t('appTitle')}
        </span>
        {!small && (
          <span className="mt-0.5 block text-xs font-medium tracking-normal text-muted">
            {t('brand.tagline')}
          </span>
        )}
      </span>
    </a>
  );
}
