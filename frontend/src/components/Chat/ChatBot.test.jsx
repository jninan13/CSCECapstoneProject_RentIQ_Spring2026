import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ChatBot from './ChatBot';

// ---------------------------------------------------------------------------
// Mocks – isolate the component from real auth and network calls
// ---------------------------------------------------------------------------

let mockIsAuthenticated = true;

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: mockIsAuthenticated }),
}));

const mockSend = vi.fn();

vi.mock('../../services/api', () => ({
  chatAPI: { send: (...args) => mockSend(...args) },
}));

/** Render helper that wraps ChatBot in a MemoryRouter at the given route. */
function renderChatBot(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ChatBot />
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Reset state before every test
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockIsAuthenticated = true;
  mockSend.mockResolvedValue({ data: { reply: 'Mock AI response.' } });
});

// ---------------------------------------------------------------------------
// 1. Authentication gating
//    The chatbot should be completely hidden for logged-out users.
// ---------------------------------------------------------------------------

describe('authentication gating', () => {
  it('does not render anything when the user is NOT logged in', () => {
    mockIsAuthenticated = false;
    const { container } = renderChatBot();
    expect(container.innerHTML).toBe('');
  });

  it('renders the floating chat button when the user IS logged in', () => {
    renderChatBot();
    expect(screen.getByRole('button', { name: /open chat/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 2. Opening and closing the chat window
//    Clicking the bubble opens the window; the close button collapses it.
// ---------------------------------------------------------------------------

describe('opening and closing the chat window', () => {
  it('opens the chat window when the floating button is clicked', async () => {
    const user = userEvent.setup();
    renderChatBot();

    await user.click(screen.getByRole('button', { name: /open chat/i }));

    expect(screen.getByText('RentIQ Assistant')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/ask about/i)).toBeInTheDocument();
  });

  it('displays the welcome message immediately when opened', async () => {
    const user = userEvent.setup();
    renderChatBot();

    await user.click(screen.getByRole('button', { name: /open chat/i }));

    expect(screen.getByText(/I'm RentIQ Assistant/)).toBeInTheDocument();
  });

  it('collapses back to the floating button when the close button is clicked', async () => {
    const user = userEvent.setup();
    renderChatBot();

    await user.click(screen.getByRole('button', { name: /open chat/i }));
    expect(screen.getByText('RentIQ Assistant')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /close chat/i }));

    expect(screen.queryByText('RentIQ Assistant')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open chat/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 3. Sending a message and receiving a response
//    The core user flow: type a question, send it, see the AI reply.
// ---------------------------------------------------------------------------

describe('sending a message and receiving a response', () => {
  it('sends the typed message to the API and shows the reply', async () => {
    const user = userEvent.setup();
    renderChatBot();

    await user.click(screen.getByRole('button', { name: /open chat/i }));
    await user.type(screen.getByPlaceholderText(/ask about/i), 'What is a cap rate?');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    // Verify the API was called with the user's message
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      'What is a cap rate?',
      expect.any(Array),
      null,
    );

    // Verify both the user message and AI reply appear in the chat
    await waitFor(() => {
      expect(screen.getByText('Mock AI response.')).toBeInTheDocument();
    });
    expect(screen.getByText('What is a cap rate?')).toBeInTheDocument();
  });

  it('also sends the message when the user presses Enter', async () => {
    const user = userEvent.setup();
    renderChatBot();

    await user.click(screen.getByRole('button', { name: /open chat/i }));
    await user.type(screen.getByPlaceholderText(/ask about/i), 'Hello{Enter}');

    expect(mockSend).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getByText('Mock AI response.')).toBeInTheDocument();
    });
  });

  it('clears the input field after a message is sent', async () => {
    const user = userEvent.setup();
    renderChatBot();

    await user.click(screen.getByRole('button', { name: /open chat/i }));
    const input = screen.getByPlaceholderText(/ask about/i);
    await user.type(input, 'Test message');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(input).toHaveValue('');
  });
});

// ---------------------------------------------------------------------------
// 4. Edge cases
//    Empty messages, loading state, API errors, multi-turn conversations.
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('prevents sending an empty or whitespace-only message', async () => {
    const user = userEvent.setup();
    renderChatBot();

    await user.click(screen.getByRole('button', { name: /open chat/i }));

    // Send button should be disabled when the input is empty
    const sendBtn = screen.getByRole('button', { name: /send message/i });
    expect(sendBtn).toBeDisabled();

    // Typing only spaces should still keep the button disabled
    await user.type(screen.getByPlaceholderText(/ask about/i), '   ');
    expect(sendBtn).toBeDisabled();

    expect(mockSend).not.toHaveBeenCalled();
  });

  it('disables the input and send button while waiting for a response', async () => {
    // Make the API hang until we manually resolve it
    let resolveResponse;
    mockSend.mockImplementation(
      () => new Promise((resolve) => { resolveResponse = resolve; }),
    );

    const user = userEvent.setup();
    renderChatBot();

    await user.click(screen.getByRole('button', { name: /open chat/i }));
    await user.type(screen.getByPlaceholderText(/ask about/i), 'Test');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    // While loading, both should be disabled
    expect(screen.getByPlaceholderText(/ask about/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled();

    // Resolve the pending request
    resolveResponse({ data: { reply: 'Done.' } });

    // After the response arrives, the input should be re-enabled
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/ask about/i)).not.toBeDisabled();
    });
  });

  it('shows a friendly error message when the API call fails', async () => {
    mockSend.mockRejectedValue(new Error('Network error'));

    const user = userEvent.setup();
    renderChatBot();

    await user.click(screen.getByRole('button', { name: /open chat/i }));
    await user.type(screen.getByPlaceholderText(/ask about/i), 'Will this fail?');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByText(/wasn't able to get a response/i)).toBeInTheDocument();
    });
  });

  it('supports a multi-turn conversation (multiple messages in sequence)', async () => {
    mockSend
      .mockResolvedValueOnce({ data: { reply: 'First reply.' } })
      .mockResolvedValueOnce({ data: { reply: 'Second reply.' } });

    const user = userEvent.setup();
    renderChatBot();

    await user.click(screen.getByRole('button', { name: /open chat/i }));

    // First message
    await user.type(screen.getByPlaceholderText(/ask about/i), 'First question');
    await user.click(screen.getByRole('button', { name: /send message/i }));
    await waitFor(() => expect(screen.getByText('First reply.')).toBeInTheDocument());

    // Second message
    await user.type(screen.getByPlaceholderText(/ask about/i), 'Second question');
    await user.click(screen.getByRole('button', { name: /send message/i }));
    await waitFor(() => expect(screen.getByText('Second reply.')).toBeInTheDocument());

    // All four messages (2 user + 2 assistant) should be visible
    expect(screen.getByText('First question')).toBeInTheDocument();
    expect(screen.getByText('Second question')).toBeInTheDocument();
    expect(mockSend).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// 5. Property page context awareness
//    The chatbot automatically passes the current property ID when the user
//    is viewing a /properties/:id page so the backend can include that
//    property's data in the AI prompt.
// ---------------------------------------------------------------------------

describe('property page context awareness', () => {
  it('passes the property ID to the API when on a property detail page', async () => {
    const user = userEvent.setup();
    renderChatBot('/properties/42');

    await user.click(screen.getByRole('button', { name: /open chat/i }));
    await user.type(screen.getByPlaceholderText(/ask about/i), 'Tell me about this property');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(mockSend).toHaveBeenCalledWith(
      'Tell me about this property',
      expect.any(Array),
      42, // property ID extracted from the URL
    );
  });

  it('passes null as property ID when on a non-property page', async () => {
    const user = userEvent.setup();
    renderChatBot('/favorites');

    await user.click(screen.getByRole('button', { name: /open chat/i }));
    await user.type(screen.getByPlaceholderText(/ask about/i), 'General question');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(mockSend).toHaveBeenCalledWith(
      'General question',
      expect.any(Array),
      null,
    );
  });
});

// ---------------------------------------------------------------------------
// 6. Conversation history
//    Each request should include prior messages so the AI has context.
// ---------------------------------------------------------------------------

describe('conversation history', () => {
  it('includes previous messages as history in subsequent API calls', async () => {
    mockSend
      .mockResolvedValueOnce({ data: { reply: 'Reply 1.' } })
      .mockResolvedValueOnce({ data: { reply: 'Reply 2.' } });

    const user = userEvent.setup();
    renderChatBot();

    await user.click(screen.getByRole('button', { name: /open chat/i }));

    // Send first message
    await user.type(screen.getByPlaceholderText(/ask about/i), 'Msg 1');
    await user.click(screen.getByRole('button', { name: /send message/i }));
    await waitFor(() => expect(screen.getByText('Reply 1.')).toBeInTheDocument());

    // Send second message
    await user.type(screen.getByPlaceholderText(/ask about/i), 'Msg 2');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    // The second call's history array should contain earlier messages
    const secondCallHistory = mockSend.mock.calls[1][1];
    expect(secondCallHistory.length).toBeGreaterThan(0);
    expect(secondCallHistory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'assistant', content: expect.stringContaining('RentIQ Assistant') }),
      ]),
    );
  });
});
