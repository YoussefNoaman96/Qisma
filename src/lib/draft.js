import { isValidGroup } from './validation.js';

export const DRAFT_KEY = 'expenseSplitterDraft';

export function emptyExpenseForm() {
  return { amount: '', payerId: '', description: '', editingId: null };
}

export function emptyDraft() {
  return { members: [], expenses: [], step: 1, memberName: '', expenseForm: emptyExpenseForm() };
}

function isValidDraft(draft) {
  if (!draft || !isValidGroup(draft.members, draft.expenses)) return false;
  if (![1, 2, 3].includes(draft.step) || (draft.step > 1 && draft.members.length < 2)) return false;
  if (typeof draft.memberName !== 'string' || draft.memberName.length > 100) return false;
  const form = draft.expenseForm;
  if (!form || typeof form.amount !== 'string' || form.amount.length > 64) return false;
  if (typeof form.description !== 'string' || form.description.length > 300) return false;
  if (form.payerId !== '' && !draft.members.some((member) => member.id === form.payerId))
    return false;
  return form.editingId === null || draft.expenses.some((expense) => expense.id === form.editingId);
}

export function readDraft(storage = localStorage) {
  const raw = storage.getItem(DRAFT_KEY);
  if (raw === null) return emptyDraft();
  const data = JSON.parse(raw);
  if (data?.version !== 1 || !isValidDraft(data.draft)) throw new Error('Invalid draft.');
  return data.draft;
}

export function writeDraft(draft, storage = localStorage) {
  if (!isValidDraft(draft)) throw new Error('Invalid draft.');
  storage.setItem(DRAFT_KEY, JSON.stringify({ version: 1, draft }));
}

export function discardDraft(storage = localStorage) {
  storage.removeItem(DRAFT_KEY);
}
