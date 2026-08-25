import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TicketPortal } from './TicketPortal';
import { supabase } from '../../services/supabase';

// Mock the Supabase client
vi.mock('../../services/supabase', () => {
  return {
    supabase: {
      from: vi.fn(),
      functions: {
        invoke: vi.fn(),
      },
    }
  };
});

describe('TicketPortal component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the initial fetch of tickets
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: '123',
            ticket_reference: 'TICK-123',
            guest_name: 'John Doe',
            guest_email: 'john@example.com',
            message: 'Need help with booking',
            status: 'OPEN',
            created_at: new Date().toISOString(),
          },
          {
            id: '456',
            ticket_reference: 'TICK-456',
            guest_name: 'Jane Doe',
            guest_email: 'jane@example.com',
            message: 'Resolved issue',
            status: 'RESOLVED',
            admin_reply: 'All good now',
            created_at: new Date().toISOString(),
          }
        ],
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

  it('invokes the send-email edge function when dispatching a reply', async () => {
    render(<TicketPortal />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    
    // Click the reply button to open modal
    const replyButton = screen.getByRole('button', { name: /send email reply/i });
    fireEvent.click(replyButton);
    
    // Verify modal is open
    expect(screen.getByText('Reply to John Doe (TICK-123)')).toBeInTheDocument();
    
    // Type a reply
    const textarea = screen.getByPlaceholderText(/Type your reply here.../i);
    fireEvent.change(textarea, { target: { value: 'This is my admin reply' } });
    
    // Mock the edge function success response
    (supabase.functions.invoke as any).mockResolvedValue({
      data: { success: true },
      error: null
    });
    
    // Submit the form
    const dispatchButton = screen.getByRole('button', { name: /dispatch email reply/i });
    fireEvent.click(dispatchButton);
    
    // Wait for the edge function to be called
    await waitFor(() => {
      expect(supabase.functions.invoke).toHaveBeenCalledWith('send-email', {
        body: {
          action: 'ticket_reply',
          ticket_id: '123',
          admin_reply_message: 'This is my admin reply'
        }
      });
    });
    
    // Ensure the ticket was updated locally (moved to resolved, modal closed)
    await waitFor(() => {
      expect(screen.queryByText('Reply to John Doe (TICK-123)')).not.toBeInTheDocument();
    });
  });
});
