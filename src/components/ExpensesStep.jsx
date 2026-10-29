import { useEffect, useRef, useState } from 'react';
import { Plus, Receipt, Save, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, DirectionArrow, FieldError, SectionTitle } from './ui';
import Dropdown from './Dropdown';
import ExpenseList from './ExpenseList';

export default function ExpensesStep({ group }) {
  const { t } = useTranslation();
  const [isPayerOpen, setIsPayerOpen] = useState(false);
  const amountRef = useRef(null);
  const { amount, payerId, description, editingId } = group.expenseForm;
  const membersById = new Map(group.members.map((member) => [member.id, member]));

  useEffect(() => {
    if (editingId) {
      amountRef.current.focus();
      amountRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [editingId]);

  function handleSubmit(event) {
    event.preventDefault();
    group.saveExpense();
  }

  return (
    <>
      <SectionTitle icon={Receipt}>{t('expensesTitle')}</SectionTitle>
      {editingId && (
        <p className="mb-5 rounded-lg border border-accent bg-accent/10 p-3 font-semibold text-primary">
          {t('editingExpense')}
        </p>
      )}
      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-5">
          <label htmlFor="expense-amount" className="field-label">
            {t('expenseAmountLabel')}
          </label>
          <input
            ref={amountRef}
            id="expense-amount"
            type="text"
            inputMode="decimal"
            maxLength={64}
            value={amount}
            onChange={(event) => group.updateExpenseForm('amount', event.target.value)}
            className="field"
            placeholder={t('expenseAmountPlaceholder')}
            aria-invalid={!!group.errors.amount}
            aria-describedby={group.errors.amount ? 'expense-amount-error' : undefined}
          />
          <FieldError id="expense-amount-error" errorKey={group.errors.amount} />
        </div>
        <div className="mb-5">
          <label htmlFor="expense-payer" className="field-label">
            {t('expensePayerLabel')}
          </label>
          <Dropdown
            id="expense-payer"
            label={t('expensePayerLabel')}
            icon={UserRound}
            variant="field"
            value={payerId}
            triggerText={membersById.get(payerId)?.name ?? ''}
            options={group.members.map((member) => ({ value: member.id, label: member.name }))}
            isOpen={isPayerOpen}
            onOpenChange={setIsPayerOpen}
            onChange={(value) => group.updateExpenseForm('payerId', value)}
            invalid={!!group.errors.payerId}
            describedBy={group.errors.payerId ? 'expense-payer-error' : undefined}
          />
          <FieldError id="expense-payer-error" errorKey={group.errors.payerId} />
        </div>
        <div className="mb-5">
          <label htmlFor="expense-description" className="field-label">
            {t('expenseDescriptionLabel')}
          </label>
          <input
            id="expense-description"
            value={description}
            onChange={(event) => group.updateExpenseForm('description', event.target.value)}
            className="field"
            placeholder={t('expenseDescriptionPlaceholder')}
            maxLength={300}
          />
        </div>
        <div className="mt-2.5 flex flex-col gap-3 sm:flex-row">
          <Button type="submit" variant="success" className="flex-1">
            {editingId ? (
              <Save size={18} aria-hidden="true" />
            ) : (
              <Plus size={18} aria-hidden="true" />
            )}
            {t(editingId ? 'saveExpenseChanges' : 'addExpenseText')}
          </Button>
          {editingId && (
            <Button variant="neutral" onClick={group.cancelEditing}>
              {t('cancelEditing')}
            </Button>
          )}
        </div>
      </form>
      <ExpenseList
        members={group.members}
        expenses={group.expenses}
        onRemove={group.removeExpense}
        onEdit={group.editExpense}
      />
      <div className="action-row">
        <Button variant="warning" onClick={() => group.goToStep(1)}>
          <DirectionArrow back />
          {t('backToMembersText')}
        </Button>
        <Button onClick={() => group.goToStep(3)}>
          {t('nextToResultsText')}
          <DirectionArrow />
        </Button>
      </div>
    </>
  );
}
