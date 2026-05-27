import { useState, useRef } from 'react'
import { Header } from './components/Header'
import { ChatWindow } from './components/ChatWindow'
import { ChatInput } from './components/ChatInput'
import { aiClientFactory } from './services/ai/AIClientFactory'
import type { ChatMessage } from './services/ai/IAIClient'

function App() {
  const [currentModelId, setCurrentModelId] = useState<string>('lm-studio-qwen');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  
  // Ref for cancellation (mock implementation of cancellation)
  const isCancelledRef = useRef<boolean>(false);

  const handleSendMessage = async (text: string) => {
    // 1. Add User message
    const userMessage: ChatMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    
    // 2. Prepare for Assistant streaming
    setIsStreaming(true);
    setStreamingContent('');
    isCancelledRef.current = false;

    // 3. Dependency Injection: Lấy Client đang được chọn
    const aiClient = aiClientFactory.getClient(currentModelId);

    try {
      // 4. Gửi request và nhận stream chunk qua callback
      const finalResponse = await aiClient.sendMessageStream(
        updatedMessages,
        (chunk) => {
          if (!isCancelledRef.current) {
             setStreamingContent(prev => prev + chunk);
          }
        }
      );

      // 5. Stream kết thúc -> Đưa vào danh sách messages chính thức
      if (!isCancelledRef.current) {
        setMessages(prev => [...prev, { role: 'assistant', content: finalResponse }]);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '**Lỗi:** Không thể kết nối tới model. Kiểm tra console log.' 
      }]);
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
    }
  };

  const handleStopStreaming = () => {
    isCancelledRef.current = true;
    setIsStreaming(false);
    if (streamingContent) {
      setMessages(prev => [...prev, { role: 'assistant', content: streamingContent + ' *(Đã dừng)*' }]);
      setStreamingContent('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Header 
        currentModelId={currentModelId} 
        onModelChange={(id) => setCurrentModelId(id)} 
      />
      
      <ChatWindow 
        messages={messages} 
        streamingMessage={streamingContent} 
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
