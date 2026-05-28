import React, { useEffect, useState } from 'react';
import { fetchProviders } from '../services/api';
import type { Provider } from '../types';
import { Zap, Server, ChevronDown } from 'lucide-react';

interface ModelSelectorProps {
  onSelect: (providerId: string) => void;
  selectedId: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ onSelect, selectedId }) => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchProviders()
      .then(data => {
        setProviders(data);
        if (!selectedId && data.length > 0) {
          const defaultProvider = data.find((p: Provider) => p.id === 'lm-studio') || data[0];
          onSelect(defaultProvider.id);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load providers', err);
        setLoading(false);
      });
  }, [selectedId, onSelect]);

  const selectedProvider = providers.find(p => p.id === selectedId);

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading models...</div>;
  }

  return (
    <div style={{ position: 'relative' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid var(--border-color)',
          padding: '0.5rem 1rem',
          borderRadius: '24px',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          transition: 'all 0.2s',
          fontFamily: 'inherit',
        }}
      >
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: selectedProvider?.available ? 'var(--success-color)' : 'var(--error-color)',
          boxShadow: selectedProvider?.available ? '0 0 8px var(--success-color)' : 'none',
        }} />
        <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>
          {selectedProvider ? selectedProvider.name : 'Select Model'}
        </span>
        <ChevronDown size={16} color="var(--text-secondary)" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '0.5rem',
          minWidth: '220px',
          zIndex: 10,
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(10px)',
          animation: 'fadeIn 0.2s ease',
        }}>
          {providers.map(p => (
            <div 
              key={p.id}
              onClick={() => { onSelect(p.id); setIsOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                borderRadius: '8px',
                cursor: 'pointer',
                background: selectedId === p.id ? 'rgba(255,255,255,0.08)' : 'transparent',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.background = selectedId === p.id ? 'rgba(255,255,255,0.08)' : 'transparent'}
            >
              {p.id.includes('lm-studio') ? <Server size={16} color="#9ca3af" /> : <Zap size={16} color="var(--accent-color)" />}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{p.name}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.modelId}</span>
              </div>
              <div style={{
                marginLeft: 'auto',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: p.available ? 'var(--success-color)' : 'var(--error-color)',
              }} title={p.available ? 'Online' : 'Offline'} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
