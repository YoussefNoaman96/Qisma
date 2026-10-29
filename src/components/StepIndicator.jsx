import { useTranslation } from 'react-i18next';

export default function StepIndicator({ step }) {
  const { t } = useTranslation();
  const titles = ['membersTitle', 'expensesTitle', 'resultsTitle'];
  return (
    <ol aria-label={t('progressLabel')} className="mb-[30px] flex justify-center gap-2.5">
      {titles.map((title, index) => {
        const number = index + 1;
        return (
          <li
            key={title}
            aria-current={step === number ? 'step' : undefined}
            aria-label={t('stepLabel', { number, title: t(title) })}
            className={`flex size-[30px] items-center justify-center rounded-full font-bold ${number === step ? 'bg-action-primary text-on-primary' : number < step ? 'bg-action-success text-on-success' : 'bg-line text-ink'}`}
          >
            <span aria-hidden="true">{number}</span>
          </li>
        );
      })}
    </ol>
  );
}
