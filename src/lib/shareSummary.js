import { calculateResults, formatMoney } from './expenses.js';

export function createShareSummary(split, { t, language }) {
  const results = calculateResults(split.members, split.expenses);
  const names = new Map(split.members.map((member) => [member.id, member.name]));
  const money = (amount) => `${formatMoney(amount, language)} ${t('currency')}`;
  return [
    t('share.title'),
    t('share.total', { amount: money(results.total) }),
    '',
    ...results.transactions.map((transfer) =>
      t('share.transfer', {
        from: names.get(transfer.fromId) ?? t('unknownMember'),
        to: names.get(transfer.toId) ?? t('unknownMember'),
        amount: money(transfer.amount),
      }),
    ),
    ...(results.transactions.length ? [] : [t('share.settled')]),
    '',
    t('share.footer'),
  ].join('\n');
}
