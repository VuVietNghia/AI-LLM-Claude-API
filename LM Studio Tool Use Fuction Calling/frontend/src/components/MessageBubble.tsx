import React from 'react';
import { User, Bot } from 'lucide-react';
import { marked } from 'marked';

interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ role, content }) => {
  const isUser = role === 'user';

  // Parse markdown securely
  const htmlContent = React.useMemo(() => {
    return marked.parse(content || '...', { async: false }) as string;
  }, [content]);

  return (
    <div style={{
      display: 'flex',
      gap: '1rem',
      padding: '1.5rem',
      flexDirection: isUser ? 'row-reverse' : 'row',
      animation: 'fadeIn 0.3s ease-out',
    }}>
      {/* Avatar */}
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: 'var(--radius-full)',
        background: isUser ? 'var(--accent-primary)' : 'var(--bg-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        border: `1px solid ${isUser ? 'transparent' : 'var(--border-color)'}`,
        boxShadow: isUser ? '0 4px 12px var(--accent-glow)' : 'none',
      }}>
        {isUser ? <User size={20} color="white" /> : <Bot size={20} color="var(--accent-primary)" />}
      </div>

      {/* Message Content */}
      <div style={{
        maxWidth: '75%',
        background: isUser ? 'var(--accent-primary)' : 'var(--bg-glass)',
        padding: '1rem 1.25rem',
        borderRadius: 'var(--radius-lg)',
        borderTopRightRadius: isUser ? '0' : 'var(--radius-lg)',
        borderTopLeftRadius: !isUser ? '0' : 'var(--radius-lg)',
        border: isUser ? 'none' : '1px solid var(--border-color)',
        color: 'white',
        boxShadow: 'var(--shadow-sm)',
        backdropFilter: 'blur(10px)',
      }}>
        <div 
          className="markdown-body"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
