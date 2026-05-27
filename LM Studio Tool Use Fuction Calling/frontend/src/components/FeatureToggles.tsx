import React from 'react';
import { Search, FolderSync } from 'lucide-react';

interface FeatureTogglesProps {
  features: { webSearch: boolean; fileReadWrite: boolean };
  onChange: (features: { webSearch: boolean; fileReadWrite: boolean }) => void;
}

export const FeatureToggles: React.FC<FeatureTogglesProps> = ({ features, onChange }) => {
  return (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <label style={toggleContainerStyle(features.webSearch)}>
        <Search size={16} />
        <span>Web Search</span>
        <input 
          type="checkbox" 
          checked={features.webSearch} 
          onChange={(e) => onChange({ ...features, webSearch: e.target.checked })}
          style={{ display: 'none' }}
        />
      </label>

      <label style={toggleContainerStyle(features.fileReadWrite)}>
        <FolderSync size={16} />
        <span>Filesystem</span>
        <input 
          type="checkbox" 
          checked={features.fileReadWrite} 
          onChange={(e) => onChange({ ...features, fileReadWrite: e.target.checked })}
          style={{ display: 'none' }}
        />
      </label>
    </div>
  );
};

const toggleContainerStyle = (isActive: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.4rem 0.8rem',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  fontSize: '0.85rem',
  fontWeight: 500,
  transition: 'all 0.2s',
  border: `1px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-color)'}`,
  background: isActive ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-secondary)',
  color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
});
