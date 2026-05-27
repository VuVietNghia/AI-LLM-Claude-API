import { useState, useRef, useEffect } from 'react'
import { Header } from './components/Header'
import { ChatWindow } from './components/ChatWindow'
import { ChatInput } from './components/ChatInput'
import { getModels, sendChatMessage } from './services/api'
import type { ChatMessage, ModelInfo, ToolCallInfo } from './services/api'

function App() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [currentModelId, setCurrentModelId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [currentToolCall, setCurrentToolCall] = useState<ToolCallInfo | null>(null);
  const [features, setFeatures] = useState({ webSearch: false, fileReadWrite: false });
  
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Load models
    getModels().then(data => {
      setModels(data);
      if (data.length > 0) setCurrentModelId(data[0].id);
    }).catch(err => console.error("Failed to load models:", err));
  }, []);

  const handleSendMessage = async (text: string) => {
    const userMessage: ChatMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    
    setIsStreaming(true);
    setStreamingContent('');
    setCurrentToolCall(null);
    
    abortControllerRef.current = new AbortController();

    try {
      await sendChatMessage({
        modelId: currentModelId,
        messages: updatedMessages,
        features,
        signal: abortControllerRef.current.signal,
        onToolCallStart: (tc) => {
          setCurrentToolCall(tc);
          // Ghi đè vào tin nhắn khi tool trả về (mặc dù backend xử lý ngầm, nhưng ta hiển thị UI đang load)
        },
        onChunk: (chunk) => {
          setCurrentToolCall(null);
          setStreamingContent(prev => prev + chunk);
        }
      });

      // Stream xong
      setMessages(prev => {
        // Ta cần state streamingContent mới nhất nên không dùng scope hiện tại được
        // React batching sẽ xử lý nhưng cẩn thận race condition nếu stream nhanh
        return [...prev, { role: 'assistant', content: streamingContent }];
      });
      // setTimeout để fix issue closure
      setTimeout(() => {
        setMessages(m => {
           if (m[m.length-1].role === 'user') {
             // Cập nhật content
           }
           return m;
        })
      }, 0);

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error(error);
        setMessages(prev => [...prev, { role: 'assistant', content: '**Lỗi:** ' + error.message }]);
      }
    } finally {
      setIsStreaming(false);
      // setStreamingContent(''); => handled below
    }
  };
  
  // Sửa lỗi closure by using an effect to commit streamed message
  useEffect(() => {
    if (!isStreaming && streamingContent) {
      setMessages(prev => [...prev, { role: 'assistant', content: streamingContent }]);
      setStreamingContent('');
      setCurrentToolCall(null);
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
        onModelChange={(id) => setCurrentModelId(id)} 
        features={features}
        onFeaturesChange={setFeatures}
      />
      
      <ChatWindow 
        messages={messages} 
        streamingMessage={streamingContent} 
        currentToolCall={currentToolCall}
      />
      
      <ChatInput 
        onSendMessage={handleSendMessage} 
        isStreaming={isStreaming}
        onStop={handleStopStreaming}
      />
    </div>
  )
}

export default App

