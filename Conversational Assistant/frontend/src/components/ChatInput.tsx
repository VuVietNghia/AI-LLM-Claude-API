import React, { useState, useRef, useEffect } from 'react';
import { Send, Square } from 'lucide-react';

interface ChatInputProps {
  onSend: (text: string) => void;
  onStop: () => void;
  isStreaming: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, onStop, isStreaming }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [text]);

  const handleSend = () => {
    if (text.trim() && !isStreaming) {
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
      padding: '1.5rem',
      background: 'rgba(17, 24, 39, 0.8)',
      borderTop: '1px solid #374151',
      backdropFilter: 'blur(10px)',
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        display: 'flex',
        gap: '1rem',
        alignItems: 'flex-end',
        background: '#1f2937',
        padding: '0.75rem',
        borderRadius: '24px',
        border: '1px solid #374151',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      }}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Hỏi tôi bất cứ điều gì..."
          disabled={isStreaming}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: 'white',
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
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <Square size={18} fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            style={{
              background: text.trim() ? '#3b82f6' : '#374151',
              color: text.trim() ? 'white' : '#9ca3af',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: text.trim() ? 'pointer' : 'not-allowed',
              flexShrink: 0,
              transition: 'all 0.2s',
            }}
          >
            <Send size={18} />
          </button>
        )}
      </div>
    </div>
  );
};
