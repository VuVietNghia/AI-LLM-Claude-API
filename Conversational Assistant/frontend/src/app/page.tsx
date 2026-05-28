"use client";

import { useChat } from '../hooks/useChat';
import { ChatWindow } from '../components/ChatWindow';
import { ChatInput } from '../components/ChatInput';

export default function Home() {
  const { messages, streamingContent, isStreaming, currentToolEvents, sendMessage, stopStreaming } = useChat();

  return (
    <main style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      backgroundColor: '#111827',
      color: 'white',
      fontFamily: 'sans-serif'
    }}>
      <header style={{
        padding: '1rem 2rem',
        borderBottom: '1px solid #374151',
        background: 'rgba(17, 24, 39, 0.8)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Conversational Assistant</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>LM Studio (Local)</span>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} title="Online"></div>
        </div>
      </header>

      <ChatWindow 
        messages={messages} 
        streamingContent={streamingContent}
        currentToolEvents={currentToolEvents}
      />
      
      <ChatInput 
        onSend={sendMessage}
        onStop={stopStreaming}
        isStreaming={isStreaming}
      />
    </main>
  );
}
