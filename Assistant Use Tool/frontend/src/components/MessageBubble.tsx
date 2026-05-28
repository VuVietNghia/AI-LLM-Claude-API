import React from 'react';
import { User, Sparkles } from 'lucide-react';
import { marked } from 'marked';

interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ role, content }) => {
  if (role === 'system' || role === 'tool') return null;
  const isUser = role === 'user';

  const htmlContent = React.useMemo(() => {
    return marked.parse(content || '...', { async: false }) as string;
  }, [content]);

  return (
    <div style={{
      display: 'flex',
      gap: '1.25rem',
      padding: '1.5rem',
      flexDirection: isUser ? 'row-reverse' : 'row',
      animation: 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      <div style={{
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        background: isUser ? 'var(--accent-gradient)' : 'var(--bg-card)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: isUser ? '0 4px 15px rgba(102, 126, 234, 0.4)' : '0 2px 8px rgba(0,0,0,0.2)',
        border: isUser ? 'none' : '1px solid var(--border-color)',
      }}>
        {isUser ? <User size={20} color="white" /> : <Sparkles size={20} color="var(--accent-color)" />}
      </div>

      <div style={{
        maxWidth: '80%',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.35rem',
        alignItems: isUser ? 'flex-end' : 'flex-start',
      }}>
        <div 
          className="markdown-body"
          style={{
            background: isUser ? 'var(--accent-gradient)' : 'var(--bg-card)',
            padding: '1rem 1.5rem',
            borderRadius: '20px',
            borderTopRightRadius: isUser ? '4px' : '20px',
            borderTopLeftRadius: !isUser ? '4px' : '20px',
            border: isUser ? 'none' : '1px solid var(--border-color)',
            color: 'white',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
            backdropFilter: 'blur(10px)',
          }}
          dangerouslySetInnerHTML={{ __html: htmlContent }} 
        />
      </div>
    </div>
  );
};
