import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TicketPortal } from './TicketPortal';
import { supabase } from '../../services/supabase';

// Mock the Supabase client
vi.mock('../../services/supabase', () => {
  return {
    supabase: {
      from: vi.fn(),
      channel: vi.fn(),
      removeChannel: vi.fn(),
      functions: {
        invoke: vi.fn(),
      },
    }
  };
});

const mockTickets = [
  {
    id: '123',
    ticket_reference: 'TICK-123',
    guest_name: 'John Doe',
    guest_email: 'john@example.com',
    subject: 'Issue',
    message: 'Need help with booking',
    status: 'OPEN',
    created_at: new Date().toISOString(),
  },
  {
    id: '456',
    ticket_reference: 'TICK-456',
    guest_name: 'Jane Doe',
    guest_email: 'jane@example.com',
    subject: 'Issue',
    message: 'Resolved issue',
    status: 'RESOLVED',
    admin_reply: 'All good now',
    created_at: new Date().toISOString(),
  }
];

describe('TicketPortal component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock the realtime channel subscription
    (supabase.channel as any).mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({}),
    });

    // Mock the initial fetch of tickets
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: mockTickets,
        error: null,
      }),
    });
  });

  it('renders tickets and hides reply button for RESOLVED tickets', async () => {
    render(<TicketPortal />);

    // Wait for tickets to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    // Should see exactly one "Send Email Reply" button (for the OPEN ticket)
    const replyButtons = screen.getAllByRole('button', { name: /send email reply/i });
    expect(replyButtons).toHaveLength(1);

    // The resolved ticket should display the admin reply text
    expect(screen.getByText('All good now')).toBeInTheDocument();
  });

  it('shows reply button for IN_PROGRESS tickets', async () => {
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          { ...mockTickets[0], id: '789', ticket_reference: 'TICK-789', status: 'IN_PROGRESS' },
        ],
        error: null,
      }),
    });

    render(<TicketPortal />);

    await waitFor(() => {
      expect(screen.getByText('IN PROGRESS')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /send email reply/i })).toBeInTheDocument();
  });

  it('sends new_status IN_PROGRESS by default when dispatching a reply', async () => {
    render(<TicketPortal />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Click the reply button to open modal
    const replyButton = screen.getByRole('button', { name: /send email reply/i });
    fireEvent.click(replyButton);

    // Verify modal is open
    expect(screen.getByText('Reply to Ticket #TICK-123')).toBeInTheDocument();

    // Type a reply
    const textarea = screen.getByPlaceholderText(/Type your response to the player.../i);
    fireEvent.change(textarea, { target: { value: 'This is my admin reply' } });

    // Mock the edge function success response
    (supabase.functions.invoke as any).mockResolvedValue({
      data: { success: true, new_status: 'IN_PROGRESS' },
      error: null
    });

    // Submit the form
    const dispatchButton = screen.getByRole('button', { name: /dispatch email reply/i });
    fireEvent.click(dispatchButton);

    // Edge function receives the staff-chosen status (default IN_PROGRESS)
    await waitFor(() => {
      expect(supabase.functions.invoke).toHaveBeenCalledWith('send-email', {
        body: {
          action: 'ticket_reply',
          ticket_id: '123',
          admin_reply_message: 'This is my admin reply',
          new_status: 'IN_PROGRESS'
        }
      });
    });

    // Modal closes and banner reflects the applied status, not "resolved"
    await waitFor(() => {
      expect(screen.queryByText('Reply to Ticket #TICK-123')).not.toBeInTheDocument();
      expect(screen.getByText(/ticket marked IN PROGRESS!/i)).toBeInTheDocument();
    });
  });

  it('sends new_status RESOLVED when staff deliberately resolves', async () => {
    render(<TicketPortal />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /send email reply/i }));

    const textarea = screen.getByPlaceholderText(/Type your response to the player.../i);
    fireEvent.change(textarea, { target: { value: 'Fixed, all good' } });

    // Staff picks Resolved in the dropdown
    const statusSelect = screen.getByLabelText(/ticket status after sending/i);
    fireEvent.change(statusSelect, { target: { value: 'RESOLVED' } });

    (supabase.functions.invoke as any).mockResolvedValue({
      data: { success: true, new_status: 'RESOLVED' },
      error: null
    });

    fireEvent.click(screen.getByRole('button', { name: /dispatch email reply/i }));

    await waitFor(() => {
      expect(supabase.functions.invoke).toHaveBeenCalledWith('send-email', {
        body: {
          action: 'ticket_reply',
          ticket_id: '123',
          admin_reply_message: 'Fixed, all good',
          new_status: 'RESOLVED'
        }
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/ticket marked RESOLVED!/i)).toBeInTheDocument();
    });
  });
});
