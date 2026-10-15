export interface GuardProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'OWNER' | 'STAFF';
  is_active?: boolean;
}

export interface GuardResult {
  allowed: boolean;
  reason?: string;
}

const LAST_OWNER_MSG = 'Cannot deactivate the last active owner.';
const LAST_OWNER_DELETE_MSG = 'Cannot remove the last active owner.';
const LAST_OWNER_DEMOTE_MSG = 'Cannot demote the last active owner to staff.';

export function countActiveOwners(list: GuardProfile[]): number {
  return list.filter((u) => u.role === 'OWNER' && u.is_active !== false).length;
}

function findTarget(list: GuardProfile[], id: string): GuardProfile | undefined {
  return list.find((u) => u.id === id);
}

function isLastActiveOwner(list: GuardProfile[], id: string): boolean {
  const target = findTarget(list, id);
  if (!target) return false;
  if (target.role !== 'OWNER') return false;
  if (target.is_active === false) return false;
  return countActiveOwners(list) <= 1;
}

export function canDeactivate(list: GuardProfile[], id: string): GuardResult {
  if (isLastActiveOwner(list, id)) {
    return { allowed: false, reason: LAST_OWNER_MSG };
  }
  return { allowed: true };
}

export function canDeleteUser(list: GuardProfile[], id: string): GuardResult {
  if (isLastActiveOwner(list, id)) {
    return { allowed: false, reason: LAST_OWNER_DELETE_MSG };
  }
  return { allowed: true };
}

export function canDemoteOwner(list: GuardProfile[], id: string): GuardResult {
  if (isLastActiveOwner(list, id)) {
    return { allowed: false, reason: LAST_OWNER_DEMOTE_MSG };
  }
  return { allowed: true };
}
