import React, { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { ToolExecutionCard } from './ToolExecutionCard';
import type { ChatMessage, OrchestratorEvent } from '../types';
import { Bot } from 'lucide-react';

interface ChatWindowProps {
  messages: ChatMessage[];
  streamingContent: string;
  currentToolEvents: OrchestratorEvent[];
  isStreaming: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ messages, streamingContent, currentToolEvents, isStreaming }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent, currentToolEvents]);

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: '2rem 0',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ maxWidth: '900px', width: '100%', margin: '0 auto', padding: '0 1rem' }}>
        {messages.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            color: 'var(--text-secondary)', 
            marginTop: '10vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            animation: 'fadeIn 0.5s ease',
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            }}>
              <Bot size={40} color="var(--accent-color)" />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>AI Assistant</h2>
            <p style={{ maxWidth: '400px', lineHeight: 1.6 }}>
              Tôi là trợ lý AI được trang bị công cụ: máy tính, thao tác file an toàn, và duyệt web.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '1rem' }}>
              <span style={{ padding: '0.4rem 0.8rem', background: 'var(--bg-secondary)', borderRadius: '16px', fontSize: '0.85rem', border: '1px solid var(--border-color)' }}>🧮 Calculator</span>
              <span style={{ padding: '0.4rem 0.8rem', background: 'var(--bg-secondary)', borderRadius: '16px', fontSize: '0.85rem', border: '1px solid var(--border-color)' }}>📁 File System</span>
              <span style={{ padding: '0.4rem 0.8rem', background: 'var(--bg-secondary)', borderRadius: '16px', fontSize: '0.85rem', border: '1px solid var(--border-color)' }}>🌐 Web Fetcher</span>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => {
          if (msg.role === 'tool' && msg.tool_events) {
            return <ToolExecutionCard key={idx} events={msg.tool_events} />;
          }
          return <MessageBubble key={idx} role={msg.role} content={msg.content} />;
        })}

        {currentToolEvents.length > 0 && (
          <ToolExecutionCard events={currentToolEvents} />
        )}

        {streamingContent && (
          <MessageBubble role="assistant" content={streamingContent} />
        )}
        
        {isStreaming && !streamingContent && currentToolEvents.length === 0 && (
          <div style={{ padding: '1.5rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-color)', animation: 'fadeIn 0.5s infinite alternate' }} />
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-color)', animation: 'fadeIn 0.5s infinite alternate 0.2s' }} />
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-color)', animation: 'fadeIn 0.5s infinite alternate 0.4s' }} />
          </div>
        )}

        <div ref={endRef} />
      </div>
    </div>
  );
};
