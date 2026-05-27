import React, { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import type { ChatMessage } from '../services/ai/IAIClient';

interface ChatWindowProps {
  messages: ChatMessage[];
  streamingMessage: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ messages, streamingMessage }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: '2rem 1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
      maxWidth: '900px',
      margin: '0 auto',
      width: '100%',
    }}>
      {messages.length === 0 && (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)',
          textAlign: 'center',
          gap: '1rem',
          animation: 'fadeIn 0.5s ease-out'
        }}>
          <div style={{
            background: 'var(--bg-glass)',
            padding: '2rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            backdropFilter: 'blur(10px)',
            maxWidth: '500px'
          }}>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Chào mừng đến với Local AI!</h2>
            <p style={{ fontSize: '0.9rem' }}>
              Ứng dụng này sử dụng kiến trúc <strong>Dependency Injection</strong>.
              Bạn có thể dễ dàng chuyển đổi giữa các AI Client (Mock, LM Studio) ở góc trên bên phải.
            </p>
          </div>
        </div>
      )}

      {messages.map((msg, index) => (
        <MessageBubble key={index} role={msg.role} content={msg.content} />
      ))}

      {streamingMessage && (
        <MessageBubble role="assistant" content={streamingMessage} />
      )}

      <div ref={bottomRef} />
    </div>
  );
};
