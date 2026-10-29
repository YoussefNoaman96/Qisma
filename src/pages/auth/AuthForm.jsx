import { useState } from 'react';
import { LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fieldErrors, loginSchema, registerSchema } from '../../../shared/authSchemas';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../components/ui';
import AuthField from './AuthField';

export default function AuthForm({ mode, notify }) {
  const { t } = useTranslation();
  const { authenticate } = useAuth();
  const register = mode === 'register';
  const [values, setValues] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [importGuest, setImportGuest] = useState(false);
  function change(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: null, _form: null }));
  }

  async function submit(event) {
    event.preventDefault();
    const payload = register ? values : { email: values.email, password: values.password };
    const parsed = (register ? registerSchema : loginSchema).safeParse(payload);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const result = await authenticate(mode, parsed.data, importGuest);
      notify(
        result.migrationFailed ? 'auth.migrationFailed' : 'auth.signedIn',
        {},
        result.migrationFailed,
      );
      window.location.hash = '#/history';
    } catch (error) {
      setErrors({
        ...error.fields,
        _form:
          error.code === 'VALIDATION_ERROR' ? null : `apiErrors.${error.code || 'SERVER_ERROR'}`,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="w-full" aria-busy={busy}>
      <h1 id="section-heading" className="mb-3 text-3xl font-bold text-primary">
        {t(register ? 'auth.register' : 'auth.login')}
      </h1>
      <p className="mb-6 text-sm text-muted">
        {t(register ? 'auth.registerSubtitle' : 'auth.loginSubtitle')}
      </p>
      {register && (
        <AuthField
          name="name"
          label={t('auth.name')}
          icon={UserRound}
          value={values.name}
          onChange={(event) => change('name', event.target.value)}
          error={errors.name}
          autoComplete="name"
        />
      )}
      <AuthField
        name="email"
        type="email"
        label={t('auth.email')}
        icon={Mail}
        value={values.email}
        onChange={(event) => change('email', event.target.value)}
        error={errors.email}
        autoComplete="email"
      />
      <AuthField
        name="password"
        type="password"
        label={t('auth.password')}
        icon={LockKeyhole}
        value={values.password}
        onChange={(event) => change('password', event.target.value)}
        error={errors.password}
        autoComplete={register ? 'new-password' : 'current-password'}
        hint={register ? t('auth.passwordHint') : undefined}
      />
      {register && (
        <AuthField
          name="confirmPassword"
          type="password"
          label={t('auth.confirmPassword')}
          icon={LockKeyhole}
          value={values.confirmPassword}
          onChange={(event) => change('confirmPassword', event.target.value)}
          error={errors.confirmPassword}
          autoComplete="new-password"
        />
      )}
      <label className="mb-5 flex cursor-pointer items-start gap-3 text-start text-sm text-muted">
        <input
          type="checkbox"
          checked={importGuest}
          onChange={(event) => setImportGuest(event.target.checked)}
          className="mt-1 size-4 shrink-0 accent-primary"
        />
        <span>{t('auth.importGuest')}</span>
      </label>
      {errors._form && (
        <p role="alert" className="mb-4 rounded-lg bg-danger/10 p-3 text-sm text-danger">
          {t(errors._form)}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={busy}>
        {t(busy ? 'auth.submitting' : register ? 'auth.createAccount' : 'auth.login')}
      </Button>
      <a
        href="#/split"
        className="mt-4 inline-flex min-h-11 items-center justify-center text-sm font-semibold text-primary hover:underline"
      >
        {t('auth.continueGuest')}
      </a>
    </form>
  );
}
