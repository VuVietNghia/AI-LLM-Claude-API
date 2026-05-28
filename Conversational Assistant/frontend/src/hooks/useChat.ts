import { useState, useRef, useCallback } from 'react';
import { ChatMessage, OrchestratorEvent } from '../types';
import { sendChatRequest } from '../services/api';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentToolEvents, setCurrentToolEvents] = useState<OrchestratorEvent[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (text: string) => {
    const userMessage: ChatMessage = { role: 'user', content: text };
    
    // We maintain local mutable variables during the stream to ensure perfect state sync
    let currentLog = [...messages, userMessage];
    let currentStream = '';
    let currentEvents: OrchestratorEvent[] = [];

    setMessages(currentLog);
    setIsStreaming(true);
    setStreamingContent('');
    setCurrentToolEvents([]);
    
    abortControllerRef.current = new AbortController();

    const updateState = () => {
      setMessages([...currentLog]);
      setStreamingContent(currentStream);
      setCurrentToolEvents([...currentEvents]);
    };

    const flushStream = () => {
      if (currentStream) {
        currentLog.push({ role: 'assistant', content: currentStream });
        currentStream = '';
      }
    };

    const flushEvents = () => {
      if (currentEvents.length > 0) {
        currentLog.push({ role: 'tool', content: '', tool_events: currentEvents });
        currentEvents = [];
      }
    };

    try {
      await sendChatRequest(
        currentLog,
        (event) => {
          if (event.type === 'content') {
            if (currentEvents.length > 0) {
              flushEvents(); // If LLM starts streaming text after tools, flush tool events to history
            }
            currentStream += event.content;
            updateState();
          } else if (event.type === 'tool_start') {
            if (currentStream) {
              flushStream(); // If tools start, flush any existing text to history
            }
            currentEvents.push(event as any);
            updateState();
          } else if (event.type === 'tool_result' || event.type === 'tool_error') {
            currentEvents.push(event as any);
            updateState();
          } else if (event.type === 'error') {
            currentLog.push({ role: 'assistant', content: `**Lỗi hệ thống:** ${event.message}` });
            updateState();
          } else if (event.type === 'done') {
            setIsStreaming(false);
          }
        },
        abortControllerRef.current.signal
      );
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Chat error:', error);
        currentLog.push({ role: 'assistant', content: `**Lỗi:** Không thể kết nối tới server.` });
        updateState();
      }
    } finally {
      setIsStreaming(false);
      flushStream();
      flushEvents();
      setMessages([...currentLog]);
      setStreamingContent('');
      setCurrentToolEvents([]);
    }
  }, [messages]);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  }, []);

  return {
    messages,
    streamingContent,
    isStreaming,
    currentToolEvents,
    sendMessage,
    stopStreaming,
  };
}
