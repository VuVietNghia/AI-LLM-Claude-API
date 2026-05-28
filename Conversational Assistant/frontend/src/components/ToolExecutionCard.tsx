import React from 'react';
import { Play, CheckCircle, XCircle } from 'lucide-react';
import { OrchestratorEvent } from '../types';

interface ToolExecutionCardProps {
  events: OrchestratorEvent[];
}

export const ToolExecutionCard: React.FC<ToolExecutionCardProps> = ({ events }) => {
  if (events.length === 0) return null;

  // Group events by tool name/call roughly (simplification for UI)
  const starts = events.filter(e => e.type === 'tool_start') as any[];
  const results = events.filter(e => e.type === 'tool_result' || e.type === 'tool_error') as any[];

  return (
    <div style={{
      margin: '0.5rem 1.5rem',
      padding: '1rem',
      background: 'rgba(17, 24, 39, 0.6)',
      border: '1px solid #374151',
      borderRadius: '12px',
      color: '#e5e7eb',
      fontFamily: 'monospace',
      fontSize: '0.85rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#9ca3af' }}>
        <Play size={16} /> <span>Executing Tools...</span>
      </div>
      
      {starts.map((start, i) => {
        const result = results.find(r => r.tool.name === start.tool.name);
        let statusIcon = <span style={{display: 'inline-block', width: '12px', height: '12px', border: '2px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite'}} />;
        let statusColor = '#3b82f6';

        if (result) {
          if (result.type === 'tool_result') {
            statusIcon = <CheckCircle size={14} color="#10b981" />;
            statusColor = '#10b981';
          } else {
            statusIcon = <XCircle size={14} color="#ef4444" />;
            statusColor = '#ef4444';
          }
        }

        return (
          <div key={i} style={{ marginBottom: '8px', paddingLeft: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: statusColor }}>
              {statusIcon}
              <strong>{start.tool.name}</strong>
              <span style={{ color: '#6b7280' }}>({JSON.stringify(start.tool.arguments)})</span>
            </div>
            
            {result && result.type === 'tool_error' && (
              <div style={{ marginTop: '4px', color: '#ef4444', paddingLeft: '22px' }}>
                Error: {result.tool.userFriendly}
              </div>
            )}
            {result && result.type === 'tool_result' && (
              <div style={{ marginTop: '4px', color: '#9ca3af', paddingLeft: '22px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Result: {result.tool.data}
              </div>
            )}
          </div>
        );
      })}

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
