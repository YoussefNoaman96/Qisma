import { FileText, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '../lib/expenses';
import { EmptyState } from './ui';

// Archived expenses use the same presentation without delete controls.
export default function ExpenseList({ members, expenses, onRemove, onEdit }) {
  const { t, i18n } = useTranslation();
  const money = (cents) => `${formatMoney(cents, i18n.resolvedLanguage)} ${t('currency')}`;
  const membersById = new Map(members.map((member) => [member.id, member]));
  return (
    <ul className="mt-5" aria-label={t('expensesListLabel')}>
      {expenses.length === 0 ? (
        <li>
          <EmptyState icon={FileText}>{t('noExpensesText')}</EmptyState>
        </li>
      ) : (
        expenses.map((expense) => (
          <li
            key={expense.id}
            className="mb-[15px] rounded-lg border-s-[5px] border-accent bg-subtle p-[15px]"
          >
            <div className="mb-2.5 flex flex-wrap items-start justify-between gap-2 font-semibold">
              <bdi className="min-w-0 break-words [overflow-wrap:anywhere]">
                {expense.description || t('unnamedExpense')}
              </bdi>
              <span className="shrink-0">{money(expense.amount)}</span>
            </div>
            <div className="flex flex-col gap-2 text-sm text-muted sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <span className="min-w-0 break-words">
                {t('paidBy')}: <bdi>{membersById.get(expense.payerId).name}</bdi>
              </span>
              <span>
                {t('sharePerPerson')}: {money(expense.amount / members.length)}
              </span>
              <time dateTime={expense.createdAt}>
                {new Date(expense.createdAt).toLocaleDateString(
                  i18n.resolvedLanguage === 'ar' ? 'ar-EG' : 'en-US',
                )}
              </time>
              <div className="flex flex-wrap gap-2">
                {onEdit && (
                  <button
                    type="button"
                    className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-primary hover:bg-primary/10"
                    onClick={() => onEdit(expense.id)}
                    aria-label={`${t('editExpense')}: ${expense.description || t('unnamedExpense')}`}
                  >
                    <Pencil size={18} aria-hidden="true" />
                    <span>{t('editExpense')}</span>
                  </button>
                )}
                {onRemove && (
                  <button
                    className="flex min-h-11 items-center gap-2 self-start rounded-lg px-2 text-danger hover:bg-danger/10"
                    onClick={() => onRemove(expense.id)}
                    aria-label={`${t('removeExpense')}: ${expense.description || t('unnamedExpense')}`}
                  >
                    <Trash2 size={18} aria-hidden="true" />
                    <span>{t('removeExpense')}</span>
                  </button>
                )}
              </div>
            </div>
          </li>
        ))
      )}
    </ul>
  );
}
