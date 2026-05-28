import React, { useState } from 'react';
import { CheckCircle, XCircle, Terminal, ChevronRight } from 'lucide-react';
import type { OrchestratorEvent } from '../types';

interface ToolExecutionCardProps {
  events: OrchestratorEvent[];
}

export const ToolExecutionCard: React.FC<ToolExecutionCardProps> = ({ events }) => {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  if (events.length === 0) return null;

  const starts = events.filter(e => e.type === 'tool_start') as any[];
  const results = events.filter(e => e.type === 'tool_result' || e.type === 'tool_error') as any[];

  const toggleExpand = (index: number) => {
    setExpanded(prev => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div style={{
      margin: '0.5rem 1.5rem',
      padding: '1.25rem',
      background: 'rgba(10, 10, 15, 0.6)',
      border: '1px solid var(--border-color)',
      borderRadius: '16px',
      color: '#e5e7eb',
      fontFamily: 'monospace',
      fontSize: '0.85rem',
      boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
      animation: 'fadeIn 0.3s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--text-secondary)' }}>
        <Terminal size={16} /> <span style={{ letterSpacing: '1px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>Tool Execution</span>
      </div>
      
      {starts.map((start, i) => {
        const result = results.find(r => r.tool.name === start.tool.name);
        const isExp = expanded[i];
        
        let statusIcon = <span style={{display: 'inline-block', width: '12px', height: '12px', border: '2px solid var(--accent-color)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite'}} />;
        let statusColor = 'var(--accent-color)';

        if (result) {
          if (result.type === 'tool_result') {
            statusIcon = <CheckCircle size={14} color="var(--success-color)" />;
            statusColor = 'var(--success-color)';
          } else {
            statusIcon = <XCircle size={14} color="var(--error-color)" />;
            statusColor = 'var(--error-color)';
          }
        }

        return (
          <div key={i} style={{ marginBottom: '12px', paddingLeft: '24px', position: 'relative' }}>
            <div style={{
              position: 'absolute',
              left: '6px',
              top: '8px',
              bottom: '-12px',
              width: '1px',
              background: i === starts.length - 1 ? 'transparent' : 'var(--border-color)'
            }} />
            
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '8px', color: statusColor, cursor: 'pointer', padding: '4px 0' }}
              onClick={() => toggleExpand(i)}
            >
              <ChevronRight size={14} style={{ transform: isExp ? 'rotate(90deg)' : 'none', transition: '0.2s' }} color="var(--text-secondary)" />
              {statusIcon}
              <strong style={{ color: 'var(--text-primary)' }}>{start.tool.name}</strong>
              <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                {JSON.stringify(start.tool.arguments)}
              </span>
            </div>
            
            {isExp && (
              <div style={{ marginTop: '8px', marginLeft: '22px', padding: '12px', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '4px' }}>Arguments:</div>
                  <pre style={{ margin: 0, padding: 0, background: 'none', border: 'none', color: '#a78bfa' }}>
                    {JSON.stringify(start.tool.arguments, null, 2)}
                  </pre>
                </div>

                {result && (
                  <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '4px' }}>Result:</div>
                    {result.type === 'tool_error' ? (
                      <div style={{ color: 'var(--error-color)' }}>{result.tool.userFriendly}</div>
                    ) : (
                      <pre style={{ margin: 0, padding: 0, background: 'none', border: 'none', color: 'var(--success-color)', maxHeight: '150px', overflowY: 'auto' }}>
                        {result.tool.data}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
