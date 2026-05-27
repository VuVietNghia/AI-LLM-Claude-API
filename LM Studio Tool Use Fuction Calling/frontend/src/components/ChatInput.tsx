import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, Paperclip, X } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string, images?: string[]) => void;
  isStreaming: boolean;
  onStop: () => void;
  canUseVision: boolean;
}

/** Đọc và nén File ảnh → base64 data URL (max 1280px, quality 0.8) */
const encodeImage = (file: File, maxPx = 1280, quality = 0.8): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    const reader = new FileReader();
    
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxPx || height > maxPx) {
        if (width > height) {
          height = Math.round((height * maxPx) / width);
          width = maxPx;
        } else {
          width = Math.round((width * maxPx) / height);
          height = maxPx;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(img.src);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };

    img.onerror = reject;
    reader.readAsDataURL(file);
  });

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isStreaming, onStop, canUseVision }) => {
  const [input, setInput] = useState('');
  const [pendingImages, setPendingImages] = useState<string[]>([]); // base64 data URLs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((input.trim() || pendingImages.length > 0) && !isStreaming) {
      onSendMessage(input.trim(), pendingImages.length > 0 ? pendingImages : undefined);
      setInput('');
      setPendingImages([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const encoded = await Promise.all(files.map(f => encodeImage(f)));
    setPendingImages(prev => [...prev, ...encoded]);
    // Reset input để có thể chọn cùng file lần sau
    e.target.value = '';
  };

  const handleRemoveImage = (index: number) => {
    setPendingImages(prev => prev.filter((_, i) => i !== index));
  };

  // Clipboard paste (Ctrl+V với ảnh)
  const handlePaste = async (e: React.ClipboardEvent) => {
    if (!canUseVision) return;
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith('image/'));
    if (imageItems.length > 0) {
      e.preventDefault();
      const files = imageItems.map(item => item.getAsFile()).filter(Boolean) as File[];
      const encoded = await Promise.all(files.map(f => encodeImage(f)));
      setPendingImages(prev => [...prev, ...encoded]);
    }
  };

  const hasContent = input.trim() || pendingImages.length > 0;

  return (
    <div style={{
      position: 'relative',
      maxWidth: '800px',
      margin: '0 auto',
      width: '100%',
      padding: '0 1rem 2rem 1rem'
    }}>
      {/* Image preview strip */}
      {pendingImages.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0.5rem',
          marginBottom: '0.5rem',
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(10px)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          flexWrap: 'wrap',
        }}>
          {pendingImages.map((src, i) => (
            <div key={i} style={{ position: 'relative', display: 'inline-flex' }}>
              <img
                src={src}
                alt={`preview-${i}`}
                style={{
                  width: '64px',
                  height: '64px',
                  objectFit: 'cover',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                }}
              />
              <button
                onClick={() => handleRemoveImage(i)}
                style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-6px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '0.75rem',
        boxShadow: 'var(--shadow-lg)',
        transition: 'var(--transition)'
      }}>
        {/* Nút upload ảnh (chỉ hiện khi model hỗ trợ vision) */}
        {canUseVision && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isStreaming}
              title="Đính kèm ảnh (hỗ trợ paste Ctrl+V)"
              style={{
                background: pendingImages.length > 0 ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: pendingImages.length > 0 ? 'var(--accent-primary)' : 'var(--text-secondary)',
                border: `1px solid ${pendingImages.length > 0 ? 'var(--accent-primary)' : 'transparent'}`,
                borderRadius: 'var(--radius-sm)',
                padding: '0.5rem',
                cursor: isStreaming ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'var(--transition)',
                marginRight: '0.25rem',
                flexShrink: 0,
              }}
            >
              <Paperclip size={18} />
            </button>
          </>
        )}

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={canUseVision
            ? "Hỏi Local AI... (Enter gửi, Ctrl+V dán ảnh)"
            : "Hỏi Local AI bất kỳ điều gì (Enter để gửi)..."}
          rows={1}
          disabled={isStreaming}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            fontSize: '1rem',
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            maxHeight: '200px',
            padding: '0.5rem',
          }}
        />
        
        {isStreaming ? (
          <button
            onClick={onStop}
            style={{
              background: 'rgba(239, 68, 68, 0.2)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'var(--transition)',
              marginLeft: '0.5rem'
            }}
          >
            <Square size={20} fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!hasContent}
            style={{
              background: hasContent ? 'var(--accent-primary)' : 'var(--bg-secondary)',
              color: hasContent ? 'white' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem',
              cursor: hasContent ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'var(--transition)',
              marginLeft: '0.5rem',
              boxShadow: hasContent ? '0 4px 12px var(--accent-glow)' : 'none',
            }}
          >
            <Send size={20} />
          </button>
        )}
      </div>
      
      <p style={{
        textAlign: 'center',
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
        marginTop: '0.75rem'
      }}>
        {canUseVision
          ? 'Model hỗ trợ Vision · Đính kèm ảnh bằng 📎 hoặc Ctrl+V'
          : 'Hệ thống DI cho phép bạn dễ dàng chuyển đổi giữa Mock Client và LM Studio.'}
      </p>
    </div>
  );
};
