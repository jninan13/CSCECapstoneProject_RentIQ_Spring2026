import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { chatAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const WELCOME_MESSAGE = {
  role: 'assistant',
  content: "Hi! I'm RentIQ Assistant. I can help you with real estate investment questions, explain property scores, or discuss any listing you're viewing. What can I help you with?",
};

const DEFAULT_WIDTH = 384;
const DEFAULT_HEIGHT = 512;
const MIN_WIDTH = 320;
const MIN_HEIGHT = 360;
const MAX_WIDTH = 700;
const MAX_HEIGHT = 800;

function ChatBot() {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [size, setSize] = useState({ w: DEFAULT_WIDTH, h: DEFAULT_HEIGHT });
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const location = useLocation();
  const resizeRef = useRef(null);

  const propertyId = (() => {
    const match = location.pathname.match(/^\/properties\/(\d+)$/);
    return match ? parseInt(match[1], 10) : null;
  })();

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (isOpen) inputRef.current?.focus(); }, [isOpen]);

  const handleResizeStart = useCallback((edge, e) => {
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY, startW = size.w, startH = size.h;
    const navbar = document.querySelector('nav');
    const navH = navbar ? navbar.getBoundingClientRect().height : 0;
    const onMove = (me) => {
      let nw = startW, nh = startH;
      if (edge === 'left' || edge === 'top-left') nw = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW - (me.clientX - startX)));
      if (edge === 'top' || edge === 'top-left') nh = Math.min(MAX_HEIGHT, window.innerHeight - navH - 32, Math.max(MIN_HEIGHT, startH - (me.clientY - startY)));
      setSize({ w: nw, h: nh });
    };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); document.body.style.userSelect = ''; document.body.style.cursor = ''; };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = edge === 'top-left' ? 'nwse-resize' : edge === 'top' ? 'ns-resize' : 'ew-resize';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [size]);

  if (!isAuthenticated) return null;

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;
    const userMsg = { role: 'user', content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next); setInputValue(''); setIsLoading(true);
    const history = next.filter(m => m.role === 'user' || m.role === 'assistant').slice(-10).map(({ role, content }) => ({ role, content }));
    try {
      const { data } = await chatAPI.send(trimmed, history, propertyId);
      setMessages(p => [...p, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages(p => [...p, { role: 'assistant', content: "Sorry, I wasn't able to get a response right now. Please try again." }]);
    } finally { setIsLoading(false); }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
        aria-label="Open chat">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>
    );
  }

  return (
    <div ref={resizeRef} className="fixed bottom-6 right-6 z-40 flex flex-col rounded-lg shadow-xl border border-gray-200 bg-white overflow-hidden"
      style={{ width: size.w, height: size.h }}>
      {/* Resize handles */}
      <div onMouseDown={(e) => handleResizeStart('top', e)} className="absolute top-0 left-3 right-3 h-1.5 cursor-ns-resize z-10" />
      <div onMouseDown={(e) => handleResizeStart('left', e)} className="absolute top-3 left-0 bottom-3 w-1.5 cursor-ew-resize z-10" />
      <div onMouseDown={(e) => handleResizeStart('top-left', e)} className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize z-20" />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="font-semibold text-sm">RentIQ Assistant</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="p-1 rounded hover:bg-white/10 transition-colors" aria-label="Close chat">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-lg rounded-br-sm'
                : 'bg-gray-100 text-gray-700 rounded-lg rounded-bl-sm'
            }`}>{msg.content}</div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-4 py-3 rounded-lg rounded-bl-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <input ref={inputRef} type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Ask about properties, scores, investing..."
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 transition-colors"
          />
          <button onClick={handleSend} disabled={!inputValue.trim() || isLoading}
            className="p-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatBot;
