import { describe, test, expect } from 'vitest';
import {
  countActiveOwners,
  canDeactivate,
  canDeleteUser,
  canDemoteOwner,
  type GuardProfile,
} from './staffGuards';

const owner = (overrides: Partial<GuardProfile> = {}): GuardProfile => ({
  id: 'o1',
  email: 'owner@dinkresponsibly.com',
  full_name: 'Owner',
  role: 'OWNER',
  is_active: true,
  ...overrides,
});

const staff = (overrides: Partial<GuardProfile> = {}): GuardProfile => ({
  id: 's1',
  email: 'staff@dink.com',
  full_name: 'Staff',
  role: 'STAFF',
  is_active: true,
  ...overrides,
});

describe('staff safety guards (small-team, owner-only edits)', () => {
  test('counts only active owners', () => {
    const list = [
      owner({ id: 'o1', is_active: true }),
      owner({ id: 'o2', is_active: false }),
      staff({ id: 's1', is_active: true }),
    ];
    expect(countActiveOwners(list)).toBe(1);
  });

  test('blocks deactivating the last active owner', () => {
    const list = [owner({ id: 'o1', is_active: true }), staff()];
    expect(canDeactivate(list, 'o1')).toEqual({
      allowed: false,
      reason: 'Cannot deactivate the last active owner.',
    });
  });

  test('allows deactivating an owner when another active owner exists', () => {
    const list = [owner({ id: 'o1' }), owner({ id: 'o2' })];
    expect(canDeactivate(list, 'o1').allowed).toBe(true);
  });

  test('allows deactivating staff even if only one owner exists', () => {
    const list = [owner({ id: 'o1' }), staff({ id: 's1' })];
    expect(canDeactivate(list, 's1').allowed).toBe(true);
  });

  test('blocks deleting the last active owner', () => {
    const list = [owner({ id: 'o1' }), staff()];
    expect(canDeleteUser(list, 'o1').allowed).toBe(false);
  });

  test('blocks demoting the last active owner to staff', () => {
    const list = [owner({ id: 'o1' })];
    expect(canDemoteOwner(list, 'o1').allowed).toBe(false);
  });

  test('allows demoting when another active owner exists', () => {
    const list = [owner({ id: 'o1' }), owner({ id: 'o2' })];
    expect(canDemoteOwner(list, 'o1').allowed).toBe(true);
  });
});
