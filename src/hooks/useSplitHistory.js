import useGuestHistory from './useGuestHistory';
import useCloudHistory from './useCloudHistory';

export default function useSplitHistory(notify, user, splitId) {
  const guest = useGuestHistory(notify);
  const cloud = useCloudHistory(!!user, splitId, notify);
  return user ? cloud : { ...guest, total: guest.records.length };
}
