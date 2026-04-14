import { Notice, App } from 'obsidian';
import { t } from '../i18n/strings';
import type ThemeEngine from '../main';

interface AppWithSetting extends App {
  setting: {
    open: () => void;
    openTabById: (id: string) => void;
  };
}

export const PLUGIN_COMMAND_SUFFIXES = [
  'toggle',
  'profile-next',
  'profile-prev',
  'open-settings',
  'toggle-theme',
] as const;

/**
 * Registers all commands for the Theme Engine plugin.
 * @param plugin - The instance of the Theme Engine plugin.
 */
export function registerCommands(plugin: ThemeEngine) {
  // Toggle plugin on/off
  plugin.addCommand({
    id: PLUGIN_COMMAND_SUFFIXES[0],
    name: t('commands.enableDisable'),
    callback: async () => {
      plugin.settings.pluginEnabled = !plugin.settings.pluginEnabled;
      await plugin.saveSettings();
      new Notice(
        plugin.settings.pluginEnabled ? t('notices.pluginEnabled') : t('notices.pluginDisabled'),
      );
    },
  });

  // Select next profile
  plugin.addCommand({
    id: PLUGIN_COMMAND_SUFFIXES[1],
    name: t('commands.cycleNext'),
    checkCallback: (checking: boolean) => {
      const names = Object.keys(plugin.settings.profiles || {});
      if (names.length === 0) return false;

      if (checking) return true;

      const idx = names.indexOf(plugin.settings.activeProfile);
      const next = names[((idx >= 0 ? idx : -1) + 1) % names.length];
      plugin.settings.activeProfile = next;
      void plugin
        .saveSettings()
        .then(() => {
          new Notice(t('notices.activeProfileSwitched', next));
        })
        .catch((error) => {
          console.error('Failed to switch to the next profile.', error);
        });
      return true;
    },
  });

  // Select previous profile
  plugin.addCommand({
    id: PLUGIN_COMMAND_SUFFIXES[2],
    name: t('commands.cyclePrevious'),
    checkCallback: (checking: boolean) => {
      const names = Object.keys(plugin.settings.profiles || {});
      if (names.length === 0) return false;

      if (checking) return true;

      const currentIndex = names.indexOf(plugin.settings.activeProfile);
      const previousIndex =
        currentIndex >= 0 ? (currentIndex - 1 + names.length) % names.length : names.length - 1;
      const previousProfile = names[previousIndex];

      plugin.settings.activeProfile = previousProfile;
      void plugin
        .saveSettings()
        .then(() => {
          new Notice(t('notices.activeProfileSwitched', previousProfile));
        })
        .catch((error) => {
          console.error('Failed to switch to the previous profile.', error);
        });
      return true;
    },
  });

  // Open plugin settings
  plugin.addCommand({
    id: PLUGIN_COMMAND_SUFFIXES[3],
    name: t('commands.openSettings'),
    callback: () => {
      const app = plugin.app as AppWithSetting;
      app.setting.open();
      app.setting.openTabById(plugin.manifest.id);
    },
  });

  // Toggle active profile theme
  plugin.addCommand({
    id: PLUGIN_COMMAND_SUFFIXES[4],
    name: t('commands.toggleTheme'),
    checkCallback: (checking: boolean) => {
      const activeProfileName = plugin.settings.activeProfile;
      const activeProfile = plugin.settings.profiles[activeProfileName];

      if (!activeProfile) return false;

      if (checking) return true;

      const currentTheme = activeProfile.themeType || 'auto';
      let nextTheme: 'auto' | 'dark' | 'light';
      let noticeMessage: string;

      if (currentTheme === 'light') {
        nextTheme = 'dark';
        noticeMessage = t('notices.themeSwitchedDark');
      } else if (currentTheme === 'dark') {
        nextTheme = 'auto';
        noticeMessage = t('notices.themeSwitchedAuto');
      } else {
        nextTheme = 'light';
        noticeMessage = t('notices.themeSwitchedLight');
      }

      activeProfile.themeType = nextTheme;
      void plugin
        .saveSettings()
        .then(() => {
          new Notice(noticeMessage);
        })
        .catch((error) => {
          console.error('Failed to toggle the active profile theme.', error);
        });
      return true;
    },
  });
}
