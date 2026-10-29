import { CircleCheck, CircleAlert, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Notification({ notification, onClose }) {
  const { t } = useTranslation();
  const Icon = notification?.isError ? CircleAlert : CircleCheck;
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-3 top-3 z-50 sm:inset-x-auto sm:end-5 sm:top-5 sm:max-w-md"
    >
      {notification && (
        <div
          className={`pointer-events-auto flex items-center gap-2.5 rounded-lg px-4 py-3 shadow-card ${notification.isError ? 'bg-action-danger text-on-danger' : 'bg-action-success text-on-success'}`}
        >
          <Icon size={22} aria-hidden="true" className="shrink-0" />
          <p className="min-w-0 break-words [overflow-wrap:anywhere]">
            {t(notification.key, notification.values)}
          </p>
          <button
            onClick={onClose}
            className="ms-auto flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-black/10"
            aria-label={t('closeNotification')}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
