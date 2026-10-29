import { useEffect, useState } from 'react';
import { calculateResults, parseAmount } from '../lib/expenses';
import { discardDraft, emptyDraft, emptyExpenseForm, readDraft, writeDraft } from '../lib/draft';

function loadDraft(storage) {
  try {
    return { draft: readDraft(storage), issue: null };
  } catch (error) {
    return {
      draft: emptyDraft(),
      issue: error.name === 'SecurityError' ? 'unavailable' : 'invalid',
    };
  }
}

export default function useExpenseGroup(notify, onComplete, storage = localStorage) {
  const [initial] = useState(() => loadDraft(storage));
  const [draft, setDraft] = useState(initial.draft);
  const [restoreIssue, setRestoreIssue] = useState(initial.issue);
  const [draftSaveError, setDraftSaveError] = useState(false);
  const [errors, setErrors] = useState({});
  const { members, expenses, step, expenseForm, memberName } = draft;
  const results = calculateResults(members, expenses);

  useEffect(() => {
    // Preserve unreadable data until the user explicitly discards it.
    if (restoreIssue === 'invalid') return;
    try {
      writeDraft(draft, storage);
      setDraftSaveError(false);
    } catch {
      setDraftSaveError(true);
    }
  }, [draft, restoreIssue, storage]);

  function changeMemberName(value) {
    setDraft((current) => ({ ...current, memberName: value }));
    setErrors((current) => ({ ...current, memberName: null }));
  }

  function updateExpenseForm(field, value) {
    setDraft((current) => ({
      ...current,
      expenseForm: { ...current.expenseForm, [field]: value },
    }));
    setErrors((current) => ({ ...current, [field]: null }));
  }

  function fail(field, key) {
    setErrors((current) => ({ ...current, [field]: key }));
    notify(key, {}, true);
    return false;
  }

  function addMember(value) {
    const name = value.trim().normalize('NFC');
    if (!name || name.length > 100) return fail('memberName', 'errorNoName');
    if (members.some((member) => member.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      return fail('memberName', 'errorDuplicateName');
    }
    const member = { id: crypto.randomUUID(), name };
    setDraft((current) => ({
      ...current,
      members: [...current.members, member],
      memberName: '',
      expenseForm: { ...current.expenseForm, payerId: current.expenseForm.payerId || member.id },
    }));
    setErrors({});
    notify('notificationAddMember', { name });
    return true;
  }

  function removeMember(id) {
    if (expenses.some((expense) => expense.payerId === id))
      return notify('errorMemberHasExpenses', {}, true);
    if (expenses.length > 0 && members.length <= 2) return notify('errorMinMembers', {}, true);
    const member = members.find((item) => item.id === id);
    if (!member) return;
    setDraft((current) => {
      const nextMembers = current.members.filter((item) => item.id !== id);
      return {
        ...current,
        members: nextMembers,
        expenseForm: {
          ...current.expenseForm,
          payerId:
            current.expenseForm.payerId === id
              ? (nextMembers[0]?.id ?? '')
              : current.expenseForm.payerId,
        },
      };
    });
    notify('notificationRemoveMember', { name: member.name });
  }

  function saveExpense() {
    if (members.length < 2) return notify('errorMinMembers', {}, true);
    const amount = parseAmount(expenseForm.amount);
    if (amount === null) return fail('amount', 'errorInvalidAmount');
    const payer = members.find((member) => member.id === expenseForm.payerId);
    if (!payer) return fail('payerId', 'errorNoPayer');
    const existing = expenses.find((expense) => expense.id === expenseForm.editingId);
    const expense = {
      id: existing?.id ?? crypto.randomUUID(),
      amount,
      payerId: payer.id,
      description: expenseForm.description.trim(),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    setDraft((current) => ({
      ...current,
      expenses: existing
        ? current.expenses.map((item) => (item.id === existing.id ? expense : item))
        : [...current.expenses, expense],
      expenseForm: { ...emptyExpenseForm(), payerId: payer.id },
    }));
    setErrors({});
    notify(existing ? 'notificationUpdateExpense' : 'notificationAddExpense', {
      amount: (amount / 100).toFixed(2),
      payer: payer.name,
    });
    return true;
  }

  function editExpense(id) {
    const expense = expenses.find((item) => item.id === id);
    if (!expense) return;
    setDraft((current) => ({
      ...current,
      step: 2,
      expenseForm: {
        amount: (expense.amount / 100).toFixed(2),
        payerId: expense.payerId,
        description: expense.description,
        editingId: expense.id,
      },
    }));
    setErrors({});
  }

  function cancelEditing() {
    setDraft((current) => ({
      ...current,
      expenseForm: { ...emptyExpenseForm(), payerId: current.expenseForm.payerId },
    }));
    setErrors({});
  }

  function removeExpense(id) {
    setDraft((current) => ({
      ...current,
      expenses: current.expenses.filter((expense) => expense.id !== id),
      expenseForm:
        current.expenseForm.editingId === id
          ? { ...emptyExpenseForm(), payerId: current.expenseForm.payerId }
          : current.expenseForm,
    }));
    notify('notificationRemoveExpense');
  }

  function goToStep(nextStep) {
    if (nextStep > 1 && members.length < 2) return notify('errorMinMembers', {}, true);
    if (expenseForm.editingId && nextStep !== 2) return notify('finishEditingFirst', {}, true);
    if (nextStep === 3) onComplete({ members, expenses });
    setDraft((current) => ({ ...current, step: nextStep }));
  }

  function resetGroup() {
    try {
      discardDraft(storage);
      setDraft(emptyDraft());
      setRestoreIssue(null);
      setErrors({});
      notify('notificationReset');
      return true;
    } catch {
      notify('errorDraftSave', {}, true);
      return false;
    }
  }

  return {
    members,
    expenses,
    step,
    results,
    memberName,
    expenseForm,
    errors,
    restoreIssue,
    draftSaveError,
    changeMemberName,
    updateExpenseForm,
    addMember,
    removeMember,
    saveExpense,
    editExpense,
    cancelEditing,
    removeExpense,
    goToStep,
    resetGroup,
  };
}
