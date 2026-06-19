import React from 'react';
import type { SettingsRemindersPanelProps } from './settingsPanelTypes';
import ReminderRulesBuilder from '../../components/ReminderRulesBuilder';


const SettingsRemindersPanel: React.FC<SettingsRemindersPanelProps> = ({ tab }) => {
  if (tab !== 'reminders') return null;

  return (
    <div className="settings-panel-root settings-reminders-panel settings-reminders-foundation space-y-6" data-ui-settings-panel="reminders" data-ui-reminders-panel="settings">
      <div className="flex items-start justify-between gap-4 flex-wrap" data-ui-reminders-header="true">
        <div>
          <div className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-200 border border-amber-200/60 dark:border-amber-900/30">
              <i className="fa-solid fa-bell" />
            </span>
            قوانین اعلان (Rule Builder)
          </div>
          <div className="app-subtle mt-1">قوانین یادآوری اقساط مثل CRM: قبل از سررسید، روز سررسید، و معوق.</div>
        </div>
      </div>

      <ReminderRulesBuilder />
    </div>
  );
};

export default SettingsRemindersPanel;
