import React from 'react';
import type { SettingsStylePanelProps } from './settingsPanelTypes';
import StyleSettings from './StyleSettings';


const SettingsStylePanel: React.FC<SettingsStylePanelProps> = ({ tab }) => {
  if (tab !== 'style') return null;

  return (
    <div className="settings-panel-root settings-style-panel space-y-6" data-ui-settings-panel="style">
      <StyleSettings />
    </div>
  );
};

export default SettingsStylePanel;
