import { useState } from 'react';
import { useChat } from './hooks/useChat';
import { ChatWindow } from './components/ChatWindow';
import { ChatInput } from './components/ChatInput';
import { ModelSelector } from './components/ModelSelector';
import { Bot } from 'lucide-react';

function App() {
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const { messages, streamingContent, isStreaming, currentToolEvents, sendMessage, stopStreaming } = useChat(selectedProvider);

  return (
    <main style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
    }}>
      <header style={{
        padding: '1rem 2rem',
        borderBottom: '1px solid var(--border-color)',
        background: 'rgba(10, 10, 15, 0.8)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 100,
        position: 'sticky',
        top: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'var(--accent-gradient)', padding: '6px', borderRadius: '8px', display: 'flex' }}>
            <Bot size={20} color="white" />
          </div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, letterSpacing: '-0.02em' }}>Nexus Assistant</h1>
        </div>
        
        <ModelSelector 
          selectedId={selectedProvider} 
          onSelect={setSelectedProvider} 
        />
      </header>

      <ChatWindow 
        messages={messages} 
        streamingContent={streamingContent}
        currentToolEvents={currentToolEvents}
        isStreaming={isStreaming}
      />
      
      <ChatInput 
        onSend={sendMessage}
        onStop={stopStreaming}
        isStreaming={isStreaming}
        disabled={!selectedProvider}
      />
    </main>
  );
}

export default App;
