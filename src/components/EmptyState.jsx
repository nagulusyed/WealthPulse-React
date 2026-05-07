import React from 'react';

export function EmptyState({ icon = '📭', title = 'Nothing here', text = 'No data available at the moment.' }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-text">{text}</p>
    </div>
  );
}
