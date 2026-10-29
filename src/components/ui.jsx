import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const variants = {
  primary: 'bg-action-primary text-on-primary hover:bg-action-primary-hover',
  success: 'bg-action-success text-on-success hover:bg-action-success-hover',
  warning: 'bg-warning text-[#343a40] hover:bg-[#e08b3a]',
  danger: 'bg-action-danger text-on-danger hover:bg-action-danger-hover',
  neutral: 'border border-line bg-subtle text-ink hover:bg-primary/10',
};

export function Button({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-lg px-[25px] py-3 text-center text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 motion-safe:enabled:hover:-translate-y-0.5 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function FieldError({ id, errorKey }) {
  const { t } = useTranslation();
  return errorKey ? (
    <p id={id} role="alert" className="mt-2 text-sm font-medium text-danger">
      {t(errorKey)}
    </p>
  ) : null;
}

export function DirectionArrow({ back = false }) {
  const { i18n } = useTranslation();
  const Icon = (i18n.dir() === 'rtl') !== back ? ArrowLeft : ArrowRight;
  return <Icon size={18} aria-hidden="true" className="shrink-0" />;
}

export function SectionTitle({ icon: Icon, children }) {
  return (
    <div className="mb-5 flex items-center gap-2.5 border-b-2 border-accent pb-2.5 text-primary">
      <Icon size={24} aria-hidden="true" className="shrink-0" />
      <h2 id="section-heading" className="text-xl font-bold sm:text-2xl">
        {children}
      </h2>
    </div>
  );
}

export function EmptyState({ icon: Icon, children }) {
  return (
    <div className="w-full px-5 py-10 text-center text-muted">
      {Icon && <Icon size={48} aria-hidden="true" className="mx-auto mb-[15px] text-[#adb5bd]" />}
      <p>{children}</p>
    </div>
  );
}
