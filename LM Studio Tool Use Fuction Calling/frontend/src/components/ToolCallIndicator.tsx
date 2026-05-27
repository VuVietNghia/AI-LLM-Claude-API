import React from 'react';
import { Settings } from 'lucide-react';
import type { ToolCallInfo } from '../services/api';

export const ToolCallIndicator: React.FC<{ toolCall: ToolCallInfo }> = ({ toolCall }) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.75rem 1rem',
      background: 'rgba(0,0,0,0.2)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-color)',
      marginBottom: '1rem',
      maxWidth: '85%',
      color: 'var(--text-secondary)',
      fontSize: '0.9rem'
    }}>
      <Settings size={18} className="spin-animation" style={{ color: 'var(--accent-primary)' }} />
      <div>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
          Thực thi công cụ: <span style={{ color: 'var(--accent-primary)' }}>{toolCall.name}</span>
        </div>
        <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '0.25rem', fontFamily: 'monospace' }}>
          {typeof toolCall.arguments === 'string' 
            ? toolCall.arguments 
            : JSON.stringify(toolCall.arguments)}
        </div>
      </div>
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin-animation { animation: spin 2s linear infinite; }
      `}</style>
    </div>
  );
};
