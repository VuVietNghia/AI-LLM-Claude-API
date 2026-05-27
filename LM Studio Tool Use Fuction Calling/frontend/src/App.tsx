import { useState, useRef, useEffect } from 'react'
import { Header } from './components/Header'
import { ChatWindow } from './components/ChatWindow'
import { ChatInput } from './components/ChatInput'
import { getModels, sendChatMessage } from './services/api'
import type { ChatMessage, ModelInfo, ToolCallInfo, ContentPart } from './services/api'

function App() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [currentModelId, setCurrentModelId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [currentToolCall, setCurrentToolCall] = useState<ToolCallInfo | null>(null);
  const [features, setFeatures] = useState({ webSearch: false, fileReadWrite: false });
  const [lastMessageCached, setLastMessageCached] = useState<boolean>(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    getModels().then(data => {
      setModels(data);
      if (data.length > 0) setCurrentModelId(data[0].id);
    }).catch(err => console.error("Failed to load models:", err));
  }, []);

  // Model hiện tại — dùng để xác định canUseVision
  const currentModel = models.find(m => m.id === currentModelId);

  const handleSendMessage = async (text: string, images?: string[]) => {
    // Build content: string hoặc ContentPart[] nếu có ảnh
    let content: string | ContentPart[];
    if (images && images.length > 0) {
      content = [
        { type: 'text' as const, text },
        ...images.map(url => ({ type: 'image_url' as const, image_url: { url } }))
      ];
    } else {
      content = text;
    }

    const userMessage: ChatMessage = { role: 'user', content };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    
    setIsStreaming(true);
    setStreamingContent('');
    setCurrentToolCall(null);
    setLastMessageCached(false);
    
    abortControllerRef.current = new AbortController();

    try {
      await sendChatMessage({
        modelId: currentModelId,
        messages: updatedMessages,
        features,
        signal: abortControllerRef.current.signal,
        onToolCallStart: (tc) => {
          setCurrentToolCall(tc);
        },
        onChunk: (chunk) => {
          setCurrentToolCall(null);
          setStreamingContent(prev => prev + chunk);
        },
        onCacheHit: () => {
          setLastMessageCached(true);
        }
      });
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error(error);
        setMessages(prev => [...prev, { role: 'assistant', content: '**Lỗi:** ' + error.message }]);
      }
    } finally {
      setIsStreaming(false);
    }
  };
  
  // Commit streamed message khi stream kết thúc
  useEffect(() => {
    if (!isStreaming && streamingContent) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: streamingContent,
      }]);
      setStreamingContent('');
      setCurrentToolCall(null);
      // lastMessageCached giữ nguyên để MessageBubble render badge
    }
  }, [isStreaming, streamingContent]);

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsStreaming(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Header 
        models={models}
        currentModelId={currentModelId} 
        onModelChange={(id) => { setCurrentModelId(id); setLastMessageCached(false); }} 
        features={features}
        onFeaturesChange={setFeatures}
        currentModel={currentModel}
      />
      
      <ChatWindow 
        messages={messages} 
        streamingMessage={streamingContent} 
        currentToolCall={currentToolCall}
        lastMessageCached={lastMessageCached}
      />
      
      <ChatInput 
        onSendMessage={handleSendMessage} 
        isStreaming={isStreaming}
        onStop={handleStopStreaming}
        canUseVision={currentModel?.supportsVision ?? false}
      />
    </div>
  )
}

export default App
