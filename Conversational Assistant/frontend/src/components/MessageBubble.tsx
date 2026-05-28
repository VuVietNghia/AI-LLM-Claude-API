import React from 'react';
import { User, Bot } from 'lucide-react';
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
      gap: '1rem',
      padding: '1.5rem',
      flexDirection: isUser ? 'row-reverse' : 'row',
      animation: 'fadeIn 0.3s ease-out',
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: isUser ? '#3b82f6' : '#374151',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: isUser ? '0 4px 12px rgba(59, 130, 246, 0.4)' : 'none',
      }}>
        {isUser ? <User size={20} color="white" /> : <Bot size={20} color="#60a5fa" />}
      </div>

      <div style={{
        maxWidth: '75%',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.35rem',
        alignItems: isUser ? 'flex-end' : 'flex-start',
      }}>
        <div 
          className="markdown-body"
          style={{
            background: isUser ? '#3b82f6' : 'rgba(31, 41, 55, 0.6)',
            padding: '1rem 1.25rem',
            borderRadius: '16px',
            borderTopRightRadius: isUser ? '0' : '16px',
            borderTopLeftRadius: !isUser ? '0' : '16px',
            border: isUser ? 'none' : '1px solid #374151',
            color: 'white',
            backdropFilter: 'blur(10px)',
          }}
          dangerouslySetInnerHTML={{ __html: htmlContent }} 
        />
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .markdown-body {
          font-family: inherit;
          line-height: 1.6;
        }
        .markdown-body p { margin-bottom: 0.5em; margin-top: 0; }
        .markdown-body p:last-child { margin-bottom: 0; }
        .markdown-body code { background: rgba(0,0,0,0.3); padding: 0.2em 0.4em; border-radius: 4px; font-family: monospace; }
        .markdown-body pre { background: rgba(0,0,0,0.5); padding: 1em; border-radius: 8px; overflow-x: auto; }
        .markdown-body pre code { background: none; padding: 0; }
      `}</style>
    </div>
  );
};
