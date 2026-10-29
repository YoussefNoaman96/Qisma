import { DRAFT_KEY } from '../lib/draft';

// Drafts stay local, with separate namespaces for the guest and each account.
export function accountDraftStorage(userId) {
  const scopedKey = userId ? `${DRAFT_KEY}:account:${userId}` : DRAFT_KEY;
  return {
    getItem: () => localStorage.getItem(scopedKey),
    setItem: (_key, value) => localStorage.setItem(scopedKey, value),
    removeItem: () => localStorage.removeItem(scopedKey),
  };
}
