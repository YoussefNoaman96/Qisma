import { Calculator } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '../lib/expenses';
import { DirectionArrow, EmptyState } from './ui';

// Current results and archived splits share exactly the same presentation.
export default function ResultsDetails({ members, expenses, results }) {
  const { t, i18n } = useTranslation();
  const { total, balances, transactions } = results;
  const membersById = new Map(members.map((member) => [member.id, member]));
  const money = (cents) => formatMoney(cents, i18n.resolvedLanguage) + ' ' + t('currency');
  return (
    <>
      <div className="mb-5 flex flex-col items-start gap-5 rounded-[10px] bg-subtle p-5 min-[480px]:flex-row min-[480px]:items-center">
        <div className="flex size-[70px] shrink-0 items-center justify-center rounded-full bg-accent text-[#163e32]">
          <Calculator size={32} aria-hidden="true" />
        </div>
        <div className="min-w-0 break-words">
          <h3 className="mb-2.5 text-lg font-bold text-primary">{t('summaryTitle')}</h3>
          <p>
            {t('membersCountText')} {members.length}
          </p>
          <p>
            {t('expensesCountText')} {expenses.length}
          </p>
          <p>
            {t('totalExpensesText')} <span data-testid="total-expenses">{money(total)}</span>
          </p>
        </div>
      </div>

      <div className="mb-5 rounded-lg bg-subtle p-5">
        <h3 className="text-lg font-bold">{t('balancesTitle')}</h3>
        <ul>
          {balances.map((member) => (
            <li
              key={member.id}
              className="flex flex-col justify-between gap-2 border-b border-line py-2.5 last:border-b-0 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 break-words">
                <strong>
                  <bdi>{member.name}</bdi>
                </strong>
                <p className="text-sm text-muted">
                  {t('paid')} {money(member.paid)}
                </p>
                <p className="text-sm text-muted">
                  {t('exactShare', { amount: money(member.share) })}
                </p>
              </div>
              <div
                className={`shrink-0 font-semibold ${member.balance < 0 ? 'text-danger' : 'text-success'}`}
              >
                {member.balance === 0
                  ? t('settled')
                  : `${t(member.balance > 0 ? 'receives' : 'pays')} ${money(Math.abs(member.balance))}`}
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">{t('roundingNote')}</p>
      </div>

      <div className="mt-5">
        <h3 className="mb-2.5 text-lg font-bold">{t('transactionsTitle')}</h3>
        <ul>
          {transactions.length === 0 ? (
            <li>
              <EmptyState>{t('noTransactions')}</EmptyState>
            </li>
          ) : (
            transactions.map((transaction) => (
              <li
                key={`${transaction.fromId}-${transaction.toId}`}
                className="mb-2.5 flex flex-col justify-between gap-3 rounded-lg border border-line bg-surface p-[15px] min-[480px]:flex-row min-[480px]:items-center"
              >
                <div className="flex min-w-0 items-center gap-2 text-primary">
                  <DirectionArrow />
                  <strong className="min-w-0 break-words text-ink">
                    <bdi>{membersById.get(transaction.fromId)?.name ?? t('unknownMember')}</bdi>
                  </strong>
                </div>
                <div className="min-w-0 break-words">
                  <span>
                    {t('paysTo')}{' '}
                    <strong>
                      <bdi>{membersById.get(transaction.toId)?.name ?? t('unknownMember')}</bdi>
                    </strong>
                  </span>
                  <p className="font-semibold text-secondary">{money(transaction.amount)}</p>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </>
  );
}
