import React, { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import type { ChatMessage, ToolCallInfo } from '../services/api';
import { ToolCallIndicator } from './ToolCallIndicator';

interface ChatWindowProps {
  messages: ChatMessage[];
  streamingMessage: string;
  currentToolCall: ToolCallInfo | null;
  lastMessageCached: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ messages, streamingMessage, currentToolCall, lastMessageCached }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage, currentToolCall]);

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
      {messages.length === 0 && !streamingMessage && !currentToolCall && (
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

      {messages.filter(m => m.role === 'user' || m.role === 'assistant' || m.role === 'tool').map((msg, idx, arr) => {
        // Xác định message assistant cuối cùng để hiện badge Cached
        const isLastAssistant = msg.role === 'assistant' && idx === arr.length - 1;
        return (
          <MessageBubble
            key={idx}
            role={msg.role as any}
            content={msg.content}
            isCached={isLastAssistant && lastMessageCached}
          />
        );
      })}
      
      {currentToolCall && (
        <ToolCallIndicator toolCall={currentToolCall} />
      )}

      {streamingMessage && (
        <MessageBubble role="assistant" content={streamingMessage} />
      )}

      <div ref={bottomRef} />
    </div>
  );
};
