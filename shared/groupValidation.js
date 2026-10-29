export const MAX_AMOUNT = 99999999999;

export function isValidDate(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

// Validate persisted/imported data at the boundary before rendering or calculating.
export function isValidGroup(members, expenses) {
  if (!Array.isArray(members) || !Array.isArray(expenses)) return false;
  if (expenses.length > 0 && members.length < 2) return false;
  const memberIds = new Set();
  const memberNames = new Set();
  for (const member of members) {
    if (!member || typeof member.id !== 'string' || !member.id || memberIds.has(member.id))
      return false;
    if (typeof member.name !== 'string' || !member.name.trim() || member.name.length > 100)
      return false;
    const normalizedName = member.name.trim().normalize('NFC').toLocaleLowerCase();
    if (memberNames.has(normalizedName)) return false;
    memberNames.add(normalizedName);
    memberIds.add(member.id);
  }
  const expenseIds = new Set();
  let total = 0;
  for (const expense of expenses) {
    if (!expense || typeof expense.id !== 'string' || !expense.id || expenseIds.has(expense.id))
      return false;
    if (
      !memberIds.has(expense.payerId) ||
      !Number.isSafeInteger(expense.amount) ||
      expense.amount <= 0 ||
      expense.amount > MAX_AMOUNT
    )
      return false;
    if (
      typeof expense.description !== 'string' ||
      expense.description.length > 300 ||
      !isValidDate(expense.createdAt)
    )
      return false;
    total += expense.amount;
    if (!Number.isSafeInteger(total)) return false;
    expenseIds.add(expense.id);
  }
  return true;
}
