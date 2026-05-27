import React from 'react';
import { User, Bot } from 'lucide-react';
import { marked } from 'marked';
import type { ContentPart } from '../services/api';

interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system';
  content: string | ContentPart[];
  isCached?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ role, content, isCached }) => {
  const isUser = role === 'user';

  // Lấy text string để parse markdown (chỉ dùng cho assistant hoặc content thuần text)
  const textContent = typeof content === 'string'
    ? content
    : content.filter(p => p.type === 'text').map(p => (p as any).text).join('\n');

  const htmlContent = React.useMemo(() => {
    return marked.parse(textContent || '...', { async: false }) as string;
  }, [textContent]);

  const renderContent = () => {
    if (typeof content === 'string') {
      return <div className="markdown-body" dangerouslySetInnerHTML={{ __html: htmlContent }} />;
    }

    // ContentPart[] — render từng part: text → markdown, image_url → <img>
    return (
      <div>
        {content.map((part, i) => {
          if (part.type === 'text') {
            const html = marked.parse(part.text || '', { async: false }) as string;
            return <div key={i} className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />;
          }
          if (part.type === 'image_url') {
            return (
              <img
                key={i}
                src={part.image_url.url}
                alt={`Ảnh đính kèm ${i + 1}`}
                style={{
                  maxWidth: '100%',
                  maxHeight: '300px',
                  objectFit: 'contain',
                  borderRadius: 'var(--radius-sm)',
                  marginTop: '0.5rem',
                  border: '1px solid var(--border-color)',
                  display: 'block',
                }}
              />
            );
          }
          return null;
        })}
      </div>
    );
  };

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
        display: 'flex',
        flexDirection: 'column',
        gap: '0.35rem',
        alignItems: isUser ? 'flex-end' : 'flex-start',
      }}>
        {/* Cache badge */}
        {isCached && !isUser && (
          <span style={{
            fontSize: '0.7rem',
            color: '#22c55e',
            background: 'rgba(34,197,94,0.1)',
            padding: '2px 10px',
            borderRadius: '99px',
            border: '1px solid rgba(34,197,94,0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontWeight: 500,
          }}>
            ⚡ Cached
          </span>
        )}

        <div style={{
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
          {renderContent()}
        </div>
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

