import { ButtonComponent, Notice } from 'obsidian';
import { DEFAULT_SETTINGS, DEFAULT_VARS } from '../constants';
import { getBackgroundsPathsForCleanup } from './background-media';
import { t } from '../i18n/strings';
import type ThemeEngine from '../main';
import type { PluginSettings } from '../types';
import { convertColorToHex, flattenVars } from '../utils';

type AppWithCommands = {
  commands: {
    executeCommandById: (commandId: string) => void;
  };
};

type LegacySnippetData = {
  css?: string;
  enabled?: boolean;
};

export const loadSettings = async (plugin: ThemeEngine): Promise<void> => {
  plugin.settings = Object.assign({}, DEFAULT_SETTINGS, await plugin.loadData());

  let migrationNeeded = false;
  if (plugin.settings.noticeRules && Object.keys(plugin.settings.profiles || {}).length > 0) {
    console.debug('Theme Engine: Detected old global notice rules. Starting migration...');
    for (const profileName in plugin.settings.profiles) {
      const profile = plugin.settings.profiles[profileName];
      if (!profile.noticeRules) {
        profile.noticeRules = JSON.parse(JSON.stringify(plugin.settings.noticeRules));
      }
    }
    delete plugin.settings.noticeRules;
    migrationNeeded = true;
  }

  for (const profileName in plugin.settings.profiles) {
    const profile = plugin.settings.profiles[profileName];
    if (!profile.noticeRules) {
      profile.noticeRules = { text: [], background: [] };
      migrationNeeded = true;
    }
  }

  if (migrationNeeded) {
    console.debug('Theme Engine: Notice rules migration complete. Saving new settings structure.');
    await plugin.saveData(plugin.settings);
  }

  if (!plugin.settings.installDate) {
    plugin.settings.installDate = new Date().toISOString();

    const isDarkMode = document.body.classList.contains('theme-dark');
    if (isDarkMode) {
      plugin.settings.activeProfile = 'Default';
    } else {
      plugin.settings.activeProfile = 'Citrus Zest';
    }

    await plugin.saveData(plugin.settings);
  }
  if (!plugin.settings.pinnedSnapshots) {
    plugin.settings.pinnedSnapshots = {};
  }

  let snippetsMigrationNeeded = false;
  for (const profileName in plugin.settings.profiles) {
    const profile = plugin.settings.profiles[profileName];
    if (
      profile &&
      profile.snippets &&
      !Array.isArray(profile.snippets) &&
      typeof profile.snippets === 'object'
    ) {
      snippetsMigrationNeeded = true;
      const legacySnippets = profile.snippets as unknown as Record<string, LegacySnippetData>;
      const snippetsArray = Object.entries(legacySnippets).map(([name, data]) => ({
        id: `snippet-${Date.now()}-${Math.random()}`,
        name,
        css: data.css || '',
        enabled: data.enabled !== false,
      }));
      profile.snippets = snippetsArray;
    }
  }

  if (snippetsMigrationNeeded) {
    console.debug(
      'Theme Engine: The clipping data structure is being migrated to the new format (array).',
    );
    await plugin.saveData(plugin.settings);
  }

  let profileMigrationNeeded = false;
  for (const profileName in plugin.settings.profiles) {
    const profile = plugin.settings.profiles[profileName];
    if (profile && profile.backgroundPath && typeof profile.backgroundEnabled === 'undefined') {
      profile.backgroundEnabled = true;
      profileMigrationNeeded = true;
    } else if (profile && !profile.backgroundPath && profile.backgroundEnabled === true) {
      profile.backgroundEnabled = false;
      profileMigrationNeeded = true;
    }
  }
  if (profileMigrationNeeded) {
    console.debug('Theme Engine: Setting default backgroundEnabled status for profiles.');
    await plugin.saveData(plugin.settings);
  }
};

export const saveSettings = async (plugin: ThemeEngine): Promise<void> => {
  await plugin.saveData(plugin.settings);
  await plugin.applyStyles();
  await plugin.refreshOpenGraphViews();
  plugin.app.workspace.trigger('css-change');
};

export const resetPluginData = async (
  plugin: ThemeEngine,
  options: {
    deleteProfiles: boolean;
    deleteSnippets: boolean;
    deleteSettings: boolean;
    deleteBackgrounds: boolean;
    deleteLanguages?: boolean;
  },
): Promise<void> => {
  const oldInstallDate = plugin.settings.installDate;

  const newSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as PluginSettings;

  if (!options.deleteSettings) {
    newSettings.language = plugin.settings.language;
    newSettings.useRtlLayout = plugin.settings.useRtlLayout;
    newSettings.overrideIconizeColors = plugin.settings.overrideIconizeColors;
    newSettings.cleanupInterval = plugin.settings.cleanupInterval;
    newSettings.colorUpdateFPS = plugin.settings.colorUpdateFPS;
    newSettings.lastSearchQuery = plugin.settings.lastSearchQuery;
    newSettings.lastScrollPosition = plugin.settings.lastScrollPosition;
    newSettings.advancedResetOptions = plugin.settings.advancedResetOptions;
  }

  if (!options.deleteProfiles) {
    newSettings.profiles = plugin.settings.profiles;
    newSettings.activeProfile = plugin.settings.activeProfile;
    newSettings.pinnedSnapshots = plugin.settings.pinnedSnapshots;
  }

  if (!options.deleteSnippets) {
    newSettings.globalSnippets = plugin.settings.globalSnippets;
  }

  if (!options.deleteLanguages) {
    newSettings.customLanguages = plugin.settings.customLanguages;
  }

  if (options.deleteSnippets && !options.deleteProfiles) {
    for (const profileName in newSettings.profiles) {
      if (newSettings.profiles[profileName]) {
        newSettings.profiles[profileName].snippets = [];
      }
    }
  }

  newSettings.installDate = oldInstallDate;

  if (options.deleteSettings) {
    newSettings.advancedResetOptions = plugin.settings.advancedResetOptions;
    newSettings.language = 'auto';
  }

  plugin.settings = newSettings;
  await plugin.saveData(plugin.settings);

  console.debug('Theme Engine: Selective data reset complete.', options);

  if (options.deleteBackgrounds) {
    try {
      for (const backgroundsPath of getBackgroundsPathsForCleanup(plugin)) {
        if (await plugin.app.vault.adapter.exists(backgroundsPath)) {
          console.debug(`Theme Engine: Deleting backgrounds folder at ${backgroundsPath}...`);
          await plugin.app.vault.adapter.rmdir(backgroundsPath, true);
        }
      }

      if (!options.deleteProfiles) {
        for (const profileName in plugin.settings.profiles) {
          const profile = plugin.settings.profiles[profileName];
          if (profile) {
            profile.backgroundPath = undefined;
            profile.backgroundType = undefined;
          }
        }
        await plugin.saveData(plugin.settings);
      }
    } catch (folderError) {
      const errorMessage = folderError instanceof Error ? folderError.message : String(folderError);
      console.error(`Theme Engine: Error deleting backgrounds: ${errorMessage}`);
      new Notice(t('notices.deleteBackgroundsError', errorMessage));
    }
  }

  const notice = new Notice(t('notices.resetSuccess'), 15000);
  const buttonContainer = notice.messageEl.createDiv({
    cls: 'modal-button-container',
  });
  new ButtonComponent(buttonContainer)
    .setButtonText(t('buttons.reload'))
    .setCta()
    .onClick(() => {
      const appWithCommands = plugin.app as typeof plugin.app & AppWithCommands;
      appWithCommands.commands.executeCommandById('app:reload');
    });
};

export const captureCurrentComputedVars = async (
  plugin: ThemeEngine,
): Promise<Record<string, string>> => {
  console.debug('Theme Engine: Capturing current computed styles...');

  plugin.clearStyles();
  await new Promise((resolve) => requestAnimationFrame(resolve));

  const capturedVars: Record<string, string> = {};
  const flatDefaultVars = flattenVars(DEFAULT_VARS);
  const allVarKeys = Object.keys(flatDefaultVars);
  const bodyStyles = getComputedStyle(document.body);

  const isColorRegex =
    /^(#|rgb|hsl|transparent|var\(--)|(white|black|red|blue|green|yellow|orange|purple|cyan|magenta)$/i;

  for (const varName of allVarKeys) {
    const computedValue = bodyStyles.getPropertyValue(varName).trim();
    const defaultValue = flatDefaultVars[varName] || '';

    if (computedValue) {
      if (isColorRegex.test(defaultValue)) {
        try {
          capturedVars[varName] = convertColorToHex(computedValue);
        } catch (error) {
          console.warn(`Failed to convert color ${varName}: ${computedValue}`, error);
          capturedVars[varName] = computedValue;
        }
      } else {
        capturedVars[varName] = computedValue;
      }
    }
  }

  console.debug(`Theme Engine: Captured ${Object.keys(capturedVars).length} variables.`);

  void plugin.applyStyles();
  await new Promise((resolve) => requestAnimationFrame(resolve));

  return capturedVars;
};

export const getThemeDefaults = async (plugin: ThemeEngine): Promise<Record<string, string>> => {
  const currentThemeMode = document.body.classList.contains('theme-dark') ? 'dark' : 'light';

  if (plugin.cachedThemeDefaults && plugin.lastCachedThemeMode === currentThemeMode) {
    return plugin.cachedThemeDefaults;
  }

  console.debug('Theme Engine: Cache miss or theme change. Refreshing defaults...');

  const newDefaults = await captureCurrentComputedVars(plugin);

  plugin.cachedThemeDefaults = newDefaults;
  plugin.lastCachedThemeMode = currentThemeMode;

  return newDefaults;
};
