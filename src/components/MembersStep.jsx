import { Plus, Users, UserRound, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, DirectionArrow, EmptyState, FieldError, SectionTitle } from './ui';

export default function MembersStep({ group }) {
  const { t } = useTranslation();
  const name = group.memberName;

  function handleSubmit(event) {
    event.preventDefault();
    group.addMember(name);
  }

  return (
    <>
      <SectionTitle icon={Users}>{t('membersTitle')}</SectionTitle>
      <form onSubmit={handleSubmit} className="mb-5" noValidate>
        <label htmlFor="member-name" className="field-label">
          {t('memberNameLabel')}
        </label>
        <input
          id="member-name"
          value={name}
          onChange={(event) => group.changeMemberName(event.target.value)}
          className="field"
          placeholder={t('memberNamePlaceholder')}
          maxLength={100}
          autoComplete="off"
          aria-invalid={!!group.errors.memberName}
          aria-describedby={group.errors.memberName ? 'member-name-error' : undefined}
        />
        <FieldError id="member-name-error" errorKey={group.errors.memberName} />
        <Button type="submit" variant="success" className="mt-2.5 w-full sm:w-auto">
          <Plus size={18} aria-hidden="true" />
          {t('addMemberText')}
        </Button>
      </form>
      <ul className="mb-5 flex flex-wrap gap-[15px]" aria-label={t('membersTitle')}>
        {group.members.length === 0 ? (
          <li className="w-full">
            <EmptyState icon={UserRound}>{t('noMembersText')}</EmptyState>
          </li>
        ) : (
          group.members.map((member) => (
            <li
              key={member.id}
              className="flex min-w-0 max-w-full items-center gap-2 rounded-full bg-tag py-1 ps-[15px] pe-1 font-medium"
            >
              <bdi className="min-w-0 break-words">{member.name}</bdi>
              <button
                onClick={() => group.removeMember(member.id)}
                aria-label={t('removeMember', { name: member.name })}
                className="flex size-11 shrink-0 items-center justify-center rounded-full text-primary hover:bg-primary/10"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </li>
          ))
        )}
      </ul>
      <p className="text-sm text-muted">{t('groupSharingNote')}</p>
      <div className="action-row min-[480px]:justify-end">
        <Button onClick={() => group.goToStep(2)}>
          {t('nextToExpensesText')}
          <DirectionArrow />
        </Button>
      </div>
    </>
  );
}
