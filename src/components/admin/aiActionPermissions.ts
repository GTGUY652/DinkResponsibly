/**
 * Single source of truth for who may confirm Dink-Ai action intents.
 * STAFF is read-only: revenue answers (text) plus the heatmap visual.
 * Everything that mutates (rates, court status, blocks, staff) is OWNER-only.
 * RLS remains the final backstop at the database layer.
 */

export const READ_ONLY_AI_ACTIONS = ['show_heatmap'] as const;

export function canConfirmAiAction(
  role: string | undefined,
  actionType: string | undefined
): boolean {
  if (!actionType) return false;
  if ((READ_ONLY_AI_ACTIONS as readonly string[]).includes(actionType)) return true;
  return role === 'OWNER';
}
