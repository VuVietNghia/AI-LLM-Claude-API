import React, { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { ToolExecutionCard } from './ToolExecutionCard';
import { ChatMessage, OrchestratorEvent } from '../types';

interface ChatWindowProps {
  messages: ChatMessage[];
  streamingContent: string;
  currentToolEvents: OrchestratorEvent[];
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ messages, streamingContent, currentToolEvents }) => {
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
      <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#9ca3af', marginTop: '4rem' }}>
            <h2>👋 Xin chào!</h2>
            <p>Tôi là trợ lý AI. Tôi có thể tính toán, đọc/ghi file và tải trang web.</p>
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

        <div ref={endRef} />
      </div>
    </div>
  );
};
