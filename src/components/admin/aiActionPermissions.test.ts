import { describe, it, expect } from 'vitest';
import { canConfirmAiAction } from './aiActionPermissions';

describe('canConfirmAiAction', () => {
  it('allows OWNER to confirm every action type', () => {
    for (const type of ['update_rate', 'disable_staff', 'activate_staff', 'block_schedule', 'prepare_block', 'set_court_status', 'show_heatmap']) {
      expect(canConfirmAiAction('OWNER', type)).toBe(true);
    }
  });

  it('restricts STAFF to the read-only heatmap visual', () => {
    expect(canConfirmAiAction('STAFF', 'show_heatmap')).toBe(true);
    for (const type of ['update_rate', 'disable_staff', 'activate_staff', 'block_schedule', 'prepare_block', 'set_court_status']) {
      expect(canConfirmAiAction('STAFF', type)).toBe(false);
    }
  });

  it('denies unknown or missing roles and missing action types', () => {
    expect(canConfirmAiAction(undefined, 'update_rate')).toBe(false);
    expect(canConfirmAiAction('CUSTOMER', 'update_rate')).toBe(false);
    expect(canConfirmAiAction('OWNER', undefined)).toBe(false);
    expect(canConfirmAiAction('STAFF', 'some_future_action')).toBe(false);
  });
});
