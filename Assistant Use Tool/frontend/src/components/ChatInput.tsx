import React, { useState, useRef, useEffect } from 'react';
import { Send, Square } from 'lucide-react';

interface ChatInputProps {
  onSend: (text: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, onStop, isStreaming, disabled }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [text]);

  const handleSend = () => {
    if (text.trim() && !isStreaming && !disabled) {
      onSend(text.trim());
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{
      padding: '1.5rem 2rem',
      background: 'rgba(10, 10, 15, 0.8)',
      backdropFilter: 'blur(20px)',
      borderTop: '1px solid var(--border-color)',
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        display: 'flex',
        gap: '1rem',
        alignItems: 'flex-end',
        background: 'var(--bg-secondary)',
        padding: '0.75rem 1rem',
        borderRadius: '24px',
        border: '1px solid var(--border-color)',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
        transition: 'all 0.3s ease',
      }}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Vui lòng chọn model trước..." : "Message AI Assistant..."}
          disabled={isStreaming || disabled}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            outline: 'none',
            resize: 'none',
            maxHeight: '200px',
            padding: '0.5rem',
            fontFamily: 'inherit',
            fontSize: '1rem',
          }}
          rows={1}
        />
        
        {isStreaming ? (
          <button
            onClick={onStop}
            style={{
              background: 'var(--error-color)',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
              transition: 'transform 0.2s',
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Square size={20} fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!text.trim() || disabled}
            style={{
              background: text.trim() && !disabled ? 'var(--accent-gradient)' : 'var(--bg-card)',
              color: text.trim() && !disabled ? 'white' : 'var(--text-secondary)',
              border: text.trim() && !disabled ? 'none' : '1px solid var(--border-color)',
              borderRadius: '50%',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: text.trim() && !disabled ? 'pointer' : 'not-allowed',
              flexShrink: 0,
              transition: 'all 0.2s',
              boxShadow: text.trim() && !disabled ? '0 4px 15px rgba(102, 126, 234, 0.4)' : 'none',
            }}
            onMouseDown={(e) => { if(text.trim() && !disabled) e.currentTarget.style.transform = 'scale(0.95)' }}
            onMouseUp={(e) => { if(text.trim() && !disabled) e.currentTarget.style.transform = 'scale(1)' }}
          >
            <Send size={20} style={{ transform: text.trim() && !disabled ? 'translateX(2px)' : 'none' }} />
          </button>
        )}
      </div>
    </div>
  );
};
