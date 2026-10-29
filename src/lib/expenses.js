// All accounting uses integer piastres, never floating-point EGP values.
export function parseAmount(value) {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;
  const [pounds, fraction = ''] = value.split('.');
  const cents = Number(pounds) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(cents) && cents > 0 && cents <= 99999999999 ? cents : null;
}

export function formatMoney(cents, language) {
  return new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function calculateResults(members, expenses) {
  if (expenses.length > 0 && members.length < 2) {
    throw new Error('Splitting expenses requires at least two members.');
  }
  const balances = members.map((member) => ({ ...member, paid: 0, share: 0, balance: 0 }));
  const byId = new Map(balances.map((member) => [member.id, member]));
  let total = 0;

  for (const expense of expenses) {
    const payer = byId.get(expense.payerId);
    if (!payer || !Number.isSafeInteger(expense.amount) || expense.amount <= 0) {
      throw new Error('Expense must have a current payer and a positive integer amount.');
    }
    total += expense.amount;
    if (!Number.isSafeInteger(total)) throw new Error('Total exceeds safe integer range.');
    payer.paid += expense.amount;

    const equalShare = Math.floor(expense.amount / members.length);
    const remainder = expense.amount % members.length;
    balances.forEach((member, index) => {
      // Assign the leftover piastres explicitly so no money disappears.
      member.share += equalShare + (index < remainder ? 1 : 0);
    });
  }

  balances.forEach((member) => {
    member.balance = member.paid - member.share;
  });
  return { total, balances, transactions: settleBalances(balances) };
}

// Match net debtors with creditors, avoiding circular and duplicate payments.
function settleBalances(balances) {
  const creditors = balances
    .filter((member) => member.balance > 0)
    .map((member) => ({ id: member.id, remaining: member.balance }));
  const debtors = balances
    .filter((member) => member.balance < 0)
    .map((member) => ({ id: member.id, remaining: -member.balance }));
  const transactions = [];
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
    const amount = Math.min(creditor.remaining, debtor.remaining);
    transactions.push({ fromId: debtor.id, toId: creditor.id, amount });
    creditor.remaining -= amount;
    debtor.remaining -= amount;
    if (creditor.remaining === 0) creditorIndex++;
    if (debtor.remaining === 0) debtorIndex++;
  }
  return transactions;
}
