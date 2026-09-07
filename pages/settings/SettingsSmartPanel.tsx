import React from 'react';
import type { SettingsSmartPanelProps } from './settingsPanelTypes';
import AiFeatureControlPanel from '../../components/AiFeatureControlPanel';


const SettingsSmartPanel: React.FC<SettingsSmartPanelProps> = ({
  tab,
  isFeatureSettingEnabled,
  setNotification,
}) => {
  if (tab !== 'smart') return null;

  return (
    <div className="settings-panel-root settings-smart-panel space-y-6" data-ui-settings-panel="smart">
      {isFeatureSettingEnabled({ settingKey: 'feature_settings_ai_control_panel_enabled', defaultEnabled: true }) ? <AiFeatureControlPanel onNotice={setNotification} /> : null}
    </div>
  );
};

export default SettingsSmartPanel;
