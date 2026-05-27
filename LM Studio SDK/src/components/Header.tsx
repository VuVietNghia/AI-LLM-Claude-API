import React from 'react';
import { Bot, Settings2 } from 'lucide-react';
import { aiClientFactory } from '../services/ai/AIClientFactory';

interface HeaderProps {
  currentModelId: string;
  onModelChange: (id: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentModelId, onModelChange }) => {
  const models = aiClientFactory.getAvailableClients();

  return (
    <header className="glass-panel" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '1rem 2rem',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      borderBottom: '1px solid var(--border-color)',
      borderTop: 'none',
      borderLeft: 'none',
      borderRight: 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          background: 'var(--accent-glow)',
          padding: '0.5rem',
          borderRadius: 'var(--radius-md)',
          color: 'var(--accent-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Bot size={24} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Local AI Studio</h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
            Dependency Injection UI
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'rgba(0,0,0,0.2)',
          padding: '0.5rem 1rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)'
        }}>
          <Settings2 size={16} color="var(--text-secondary)" />
          <select 
            value={currentModelId}
            onChange={(e) => onModelChange(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              outline: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              appearance: 'none',
              paddingRight: '1rem'
            }}
          >
            {models.map(m => (
              <option key={m.id} value={m.id} style={{ background: 'var(--bg-secondary)' }}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
};
