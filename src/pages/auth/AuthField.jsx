import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function AuthField({
  name,
  label,
  type = 'text',
  icon: Icon,
  value,
  onChange,
  error,
  autoComplete,
  hint,
}) {
  const { t } = useTranslation();
  const id = useId();
  const [visible, setVisible] = useState(false);
  const password = type === 'password';
  return (
    <div className="mb-5 text-start">
      <label htmlFor={id} className="field-label text-sm">
        {label}
      </label>
      <div className="relative">
        <Icon
          size={18}
          aria-hidden="true"
          className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-primary"
        />
        <input
          id={id}
          name={name}
          type={password && visible ? 'text' : type}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          maxLength={password ? 256 : name === 'name' ? 100 : 254}
          className={`field bg-subtle ps-11 ${password ? 'pe-12' : ''}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        />
        {password && (
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={t(visible ? 'auth.hidePassword' : 'auth.showPassword')}
            className="absolute end-1 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:text-primary"
          >
            {visible ? (
              <EyeOff size={18} aria-hidden="true" />
            ) : (
              <Eye size={18} aria-hidden="true" />
            )}
          </button>
        )}
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-2 text-xs leading-relaxed text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-danger">
          {t(error)}
        </p>
      )}
    </div>
  );
}
