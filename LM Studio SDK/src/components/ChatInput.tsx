import React, { useState, useRef, useEffect } from 'react';
import { Send, Square } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isStreaming: boolean;
  onStop: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isStreaming, onStop }) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim() && !isStreaming) {
      onSendMessage(input.trim());
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div style={{
      position: 'relative',
      maxWidth: '800px',
      margin: '0 auto',
      width: '100%',
      padding: '0 1rem 2rem 1rem'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '0.75rem',
        boxShadow: 'var(--shadow-lg)',
        transition: 'var(--transition)'
      }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Hỏi Local AI bất kỳ điều gì (Enter để gửi)..."
          rows={1}
          disabled={isStreaming}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            fontSize: '1rem',
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            maxHeight: '200px',
            padding: '0.5rem',
          }}
        />
        
        {isStreaming ? (
          <button
            onClick={onStop}
            style={{
              background: 'rgba(239, 68, 68, 0.2)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'var(--transition)',
              marginLeft: '0.5rem'
            }}
          >
            <Square size={20} fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!input.trim()}
            style={{
              background: input.trim() ? 'var(--accent-primary)' : 'var(--bg-secondary)',
              color: input.trim() ? 'white' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem',
              cursor: input.trim() ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'var(--transition)',
              marginLeft: '0.5rem',
              boxShadow: input.trim() ? '0 4px 12px var(--accent-glow)' : 'none',
            }}
          >
            <Send size={20} />
          </button>
        )}
      </div>
      
      <p style={{
        textAlign: 'center',
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
        marginTop: '0.75rem'
      }}>
        Hệ thống DI cho phép bạn dễ dàng chuyển đổi giữa Mock Client và LM Studio.
      </p>
    </div>
  );
};
