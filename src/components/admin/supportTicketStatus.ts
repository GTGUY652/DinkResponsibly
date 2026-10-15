export type SupportTicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

export const SUPPORT_TICKET_STATUSES: SupportTicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED'];

export const supportTicketStatusLabel = (status: string): string =>
  status === 'IN_PROGRESS' ? 'IN PROGRESS' : status;
