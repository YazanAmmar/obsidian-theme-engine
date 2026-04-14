/*
 * Theme Engine - Obsidian Plugin
 * Version: 2.0.0
 * Author: Yazan Ammar (GitHub : https://github.com/YazanAmmar )
 * Description: Provides a comprehensive UI to control all Obsidian CSS variables directly,
 * removing the need for Force Mode and expanding customization options.
 */
import { moment, Notice, Plugin } from 'obsidian';
import { registerCommands } from './commands';
import {
  applyBackgroundMedia as applyBackgroundMediaCore,
  applyTransparencyToVars as applyTransparencyToVarsCore,
  clearBackgroundMedia,
  ensureBackgroundsFolderExists,
  removeBackgroundMediaByPath as removeBackgroundMediaByPathCore,
  renameBackgroundMedia as renameBackgroundMediaCore,
  restoreDefaultBackgroundVars,
  selectBackgroundMedia as selectBackgroundMediaCore,
  setBackgroundMedia as setBackgroundMediaCore,
  setBackgroundMediaFromUrl as setBackgroundMediaFromUrlCore,
} from './core/background-media';
import {
  CURRENT_PLUGIN_ID,
  LEGACY_PLUGIN_IDS,
  migrateCommunityPluginListIfNeeded,
  migrateLegacyHotkeysIfNeeded,
  migrateLegacyPluginDataIfNeeded,
} from './core/migrations';
import {
  pinProfileSnapshot as pinProfileSnapshotCore,
  pushCssHistory as pushCssHistoryCore,
  redoCssHistory as redoCssHistoryCore,
  resetProfileToPinned as resetProfileToPinnedCore,
  undoCssHistory as undoCssHistoryCore,
} from './core/profile-state';
import {
  captureCurrentComputedVars as captureCurrentComputedVarsCore,
  getThemeDefaults as getThemeDefaultsCore,
  loadSettings as loadSettingsCore,
  resetPluginData as resetPluginDataCore,
  saveSettings as saveSettingsCore,
} from './core/settings-store';
import {
  applyCssSnippets as applyCssSnippetsCore,
  applyCustomCssForProfile as applyCustomCssForProfileCore,
  applyPendingNow as applyPendingNowCore,
  applyStyles as applyStylesCore,
  clearStyles as clearStylesCore,
  forceIconizeColors as forceIconizeColorsCore,
  refreshOpenGraphViews as refreshOpenGraphViewsCore,
  removeCssSnippets as removeCssSnippetsCore,
  removeInjectedCustomCss as removeInjectedCustomCssCore,
  removeOrphanedIconizeElements as removeOrphanedIconizeElementsCore,
} from './core/style-engine';
import {
  processNotice as processNoticeCore,
  updateNoticeStyles as updateNoticeStylesCore,
} from './core/notice-engine';
import { initializeT, t } from './i18n/strings';
import { NoticeRule, PluginSettings } from './types';
import { ThemeEngineSettingTab } from './ui/settingsTab';
import { isIconizeEnabled, setCssPropsSafe } from './utils';

type AppWithSettingsManager = {
  setting: {
    open: () => void;
    openTabById: (id: string) => void;
  };
};

export default class ThemeEngine extends Plugin {
  settings: PluginSettings;
  iconizeWatcherInterval: number | null = null;
  colorUpdateInterval: number | null = null;
  pendingVarUpdates: Record<string, string> = {};
  runtimeStyleSheets: Record<string, CSSStyleSheet> = {};
  runtimeStyleSheetSupportWarned = false;
  settingTabInstance: ThemeEngineSettingTab | null = null;
  liveNoticeRules: NoticeRule[] | null = null;
  liveNoticeRuleType: 'text' | 'background' | null = null;
  iconizeObserver: MutationObserver;
  noticeObserver: MutationObserver;
  cssHistory: Record<string, { undoStack: string[]; redoStack: string[] }> = {};
  cachedThemeDefaults: Record<string, string> | null = null;
  lastCachedThemeMode: 'dark' | 'light' | null = null;

  startColorUpdateLoop() {
    this.stopColorUpdateLoop();

    const fps = this.settings.colorUpdateFPS;
    if (!this.settings.pluginEnabled || !fps || fps <= 0) return;

    const intervalMs = 1000 / fps;

    this.colorUpdateInterval = window.setInterval(() => {
      const pendingKeys = Object.keys(this.pendingVarUpdates);
      if (pendingKeys.length === 0) return;

      // Check specifically for Iconize var to avoid expensive DOM updates later
      const iconizeUpdateNeeded = pendingKeys.includes('--iconize-icon-color');

      for (const varName of pendingKeys) {
        const value = this.pendingVarUpdates[varName];
        setCssPropsSafe(document.body, { [varName]: value });
      }

      this.pendingVarUpdates = {};

      // Notify Obsidian components (e.g., Graph View) to repaint
      this.app.workspace.trigger('css-change');

      if (iconizeUpdateNeeded) {
        try {
          this.forceIconizeColors();
        } catch (e) {
          console.warn('forceIconizeColors failed in update loop', e);
        }
      }
    }, intervalMs);

    this.registerInterval(this.colorUpdateInterval);
  }

  // Stop the update loop
  stopColorUpdateLoop() {
    if (this.colorUpdateInterval) {
      window.clearInterval(this.colorUpdateInterval);
      this.colorUpdateInterval = null;
    }
  }

  // Restart the loop when settings change
  restartColorUpdateLoop() {
    this.stopColorUpdateLoop();
    this.startColorUpdateLoop();
  }

  private async migrateLegacyPluginDataIfNeeded(): Promise<{
    migrated: boolean;
    sourcePath?: string;
  }> {
    return migrateLegacyPluginDataIfNeeded(this);
  }

  private async migrateLegacyHotkeysIfNeeded(): Promise<boolean> {
    return migrateLegacyHotkeysIfNeeded(this);
  }

  private async migrateCommunityPluginListIfNeeded(): Promise<boolean> {
    return migrateCommunityPluginListIfNeeded(this);
  }

  private supportsRuntimeStyleSheets(): boolean {
    return typeof CSSStyleSheet !== 'undefined' && Array.isArray(document.adoptedStyleSheets);
  }

  private getOrCreateRuntimeStyleSheet(styleId: string): CSSStyleSheet | null {
    if (!this.supportsRuntimeStyleSheets()) {
      if (!this.runtimeStyleSheetSupportWarned) {
        this.runtimeStyleSheetSupportWarned = true;
        console.warn(
          'Theme Engine: Constructable stylesheets are not supported in this environment.',
        );
      }
      return null;
    }

    let styleSheet = this.runtimeStyleSheets[styleId];
    if (!styleSheet) {
      styleSheet = new CSSStyleSheet();
      this.runtimeStyleSheets[styleId] = styleSheet;
    }

    if (!document.adoptedStyleSheets.includes(styleSheet)) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, styleSheet];
    }

    return styleSheet;
  }

  setRuntimeStyle(styleId: string, cssText: string): void {
    const styleSheet = this.getOrCreateRuntimeStyleSheet(styleId);
    if (!styleSheet) return;

    try {
      styleSheet.replaceSync(cssText);
    } catch (e) {
      console.error(`Theme Engine: Failed to apply runtime stylesheet "${styleId}"`, e);
    }
  }

  clearRuntimeStyle(styleId: string): void {
    const styleSheet = this.runtimeStyleSheets[styleId];
    if (!styleSheet) return;

    delete this.runtimeStyleSheets[styleId];

    if (document.adoptedStyleSheets.includes(styleSheet)) {
      document.adoptedStyleSheets = document.adoptedStyleSheets.filter(
        (sheet) => sheet !== styleSheet,
      );
    }
  }

  // Removes background image CSS variable and body classes.
  _clearBackgroundMedia() {
    clearBackgroundMedia();
  }

  async applyTransparencyToVars(): Promise<boolean> {
    return applyTransparencyToVarsCore(this);
  }

  // Applies the current profile's background image and transparency settings.
  async applyBackgroundMedia() {
    await applyBackgroundMediaCore(this);
  }

  /**
   * Restores specific UI CSS variables from 'transparent' back to default values.
   * @returns True if settings were changed and saved, false otherwise.
   */
  async _restoreDefaultBackgroundVars(): Promise<boolean> {
    return restoreDefaultBackgroundVars(this);
  }

  /**
   * Ensures the plugin backgrounds folder exists on startup.
   */
  async _ensureBackgroundsFolderExists(): Promise<void> {
    await ensureBackgroundsFolderExists(this);
  }

  // This function now deletes the file AND clears the path from ALL profiles using it.
  async removeBackgroundMediaByPath(pathToDelete: string) {
    await removeBackgroundMediaByPathCore(this, pathToDelete);
  }

  // Adds or replaces a background image file in the plugin backgrounds folder.
  async setBackgroundMedia(
    arrayBuffer: ArrayBuffer,
    fileName: string,
    conflictChoice: 'replace' | 'keep' | 'prompt' = 'prompt',
  ) {
    await setBackgroundMediaCore(this, arrayBuffer, fileName, conflictChoice);
  }

  applyCustomCssForProfile(profileName: string) {
    applyCustomCssForProfileCore(this, profileName);
  }

  removeInjectedCustomCss() {
    removeInjectedCustomCssCore(this);
  }

  applyCssSnippets() {
    applyCssSnippetsCore(this);
  }

  removeCssSnippets() {
    removeCssSnippetsCore(this);
  }

  // Apply pending changes instantly
  applyPendingNow() {
    applyPendingNowCore(this);
  }

  pinProfileSnapshot(profileName: string) {
    return pinProfileSnapshotCore(this, profileName);
  }

  async resetProfileToPinned(profileName: string): Promise<void> {
    await resetProfileToPinnedCore(this, profileName);
  }

  resetIconizeWatcher() {
    if (this.iconizeWatcherInterval) {
      window.clearInterval(this.iconizeWatcherInterval);
    }

    const intervalMilliseconds = this.settings.cleanupInterval * 1000;

    this.iconizeWatcherInterval = window.setInterval(() => {
      const isIconizeInstalled = isIconizeEnabled(this.app);

      if (!isIconizeInstalled) {
        this.removeOrphanedIconizeElements();
      }
    }, intervalMilliseconds);

    this.registerInterval(this.iconizeWatcherInterval);
  }

  async onload() {
    const dataMigration = await this.migrateLegacyPluginDataIfNeeded();
    const hotkeysMigrated = await this.migrateLegacyHotkeysIfNeeded();
    const communityPluginsMigrated = await this.migrateCommunityPluginListIfNeeded();

    await this.loadSettings();

    const migrationHappened = dataMigration.migrated || hotkeysMigrated || communityPluginsMigrated;

    if (migrationHappened) {
      const sourcePath =
        dataMigration.sourcePath ||
        this.settings.idMigration?.sourcePath ||
        `${this.app.vault.configDir}/plugins/${LEGACY_PLUGIN_IDS[0]}/data.json`;

      this.settings.idMigration = {
        from: this.settings.idMigration?.from || LEGACY_PLUGIN_IDS[0],
        to: CURRENT_PLUGIN_ID,
        at: new Date().toISOString(),
        sourcePath,
        hotkeysMigrated,
        communityPluginsMigrated,
      };

      await this.saveData(this.settings);
    }

    initializeT(this);

    if (migrationHappened) {
      const migratedParts: string[] = [];
      if (dataMigration.migrated) migratedParts.push('settings data');
      if (hotkeysMigrated) migratedParts.push('hotkeys');
      if (communityPluginsMigrated) migratedParts.push('enabled plugin list');

      new Notice(`Theme Engine migration completed: ${migratedParts.join(', ')}.`);
    }

    await this._ensureBackgroundsFolderExists();
    this.liveNoticeRules = null;
    this.liveNoticeRuleType = null;
    if (this.settings.language === 'auto') {
      const obsidianLang = moment.locale();

      // Determine the language based on Obsidian's current locale
      if (obsidianLang === 'ar') {
        this.settings.language = 'ar';
      } else if (obsidianLang === 'fa') {
        this.settings.language = 'fa';
      } else if (obsidianLang === 'fr') {
        this.settings.language = 'fr';
      } else {
        this.settings.language = 'en'; // The default
      }
      await this.saveSettings();
    }

    registerCommands(this);

    // Add a ribbon icon to the left gutter
    this.addRibbonIcon('paint-bucket', t('plugin.ribbonTooltip'), (_evt: MouseEvent) => {
      // Open the settings tab when the icon is clicked
      const appWithSettings = this.app as typeof this.app & AppWithSettingsManager;
      appWithSettings.setting.open();
      appWithSettings.setting.openTabById(this.manifest.id);
    });

    // Store a reference to the settings tab and add it
    this.settingTabInstance = new ThemeEngineSettingTab(this.app, this);
    this.addSettingTab(this.settingTabInstance);

    this.app.workspace.onLayoutReady(() => {
      void this.applyStyles();
      setTimeout(() => this.app.workspace.trigger('css-change'), 100);

      // Start the update engine
      this.startColorUpdateLoop();
      this.iconizeObserver = new MutationObserver(() => {
        if (this.settings.pluginEnabled && this.settings.overrideIconizeColors) {
          this.forceIconizeColors();
        }
      });

      this.noticeObserver = new MutationObserver((mutations) => {
        if (!this.settings.pluginEnabled) return;
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType !== 1) return;

            if ((node as Element).matches('.notice, .toast')) {
              this.processNotice(node as HTMLElement);
            }
            (node as Element)
              .querySelectorAll('.notice, .toast')
              .forEach(this.processNotice.bind(this));
          });
        });
      });

      if (this.settings.pluginEnabled) {
        this.enableObservers();
      }

      this.register(() => this.disableObservers());
    });
    this.resetIconizeWatcher();
  }

  onunload(): void {
    if (this.noticeObserver) this.noticeObserver.disconnect();
    if (this.iconizeObserver) this.iconizeObserver.disconnect();

    if (this.settings) {
      this.settings.lastSearchQuery = '';
      this.settings.lastScrollPosition = 0;
      this.saveData(this.settings).catch((err) => {
        console.error('Theme Engine: Failed to save settings on unload.', err);
      });
    }

    this.clearStyles();
    this.removeInjectedCustomCss();
    this.stopColorUpdateLoop();
    this._clearBackgroundMedia();
    console.debug('Theme Engine unloaded.');
  }

  public enableObservers(): void {
    try {
      this.iconizeObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
      this.noticeObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
      console.debug('Theme Engine Observers: Enabled');
    } catch (e) {
      console.error('Theme Engine: Failed to enable observers', e);
    }
  }

  public disableObservers(): void {
    try {
      this.iconizeObserver.disconnect();
      this.noticeObserver.disconnect();
      console.debug('Theme Engine Observers: Disabled');
    } catch (e) {
      console.error('Theme Engine: Failed to disable observers', e);
    }
  }

  async refreshOpenGraphViews() {
    await refreshOpenGraphViewsCore(this);
  }

  forceIconizeColors() {
    forceIconizeColorsCore(this);
  }

  removeOrphanedIconizeElements() {
    removeOrphanedIconizeElementsCore(this);
  }

  async applyStyles() {
    await applyStylesCore(this);
  }

  clearStyles() {
    clearStylesCore(this);
  }

  async loadSettings() {
    await loadSettingsCore(this);
  }

  async saveSettings() {
    await saveSettingsCore(this);
  }

  async resetPluginData(options: {
    deleteProfiles: boolean;
    deleteSnippets: boolean;
    deleteSettings: boolean;
    deleteBackgrounds: boolean;
    deleteLanguages?: boolean;
  }) {
    await resetPluginDataCore(this, options);
  }

  processNotice(el: HTMLElement) {
    processNoticeCore(this, el);
  }

  updateNoticeStyles() {
    updateNoticeStylesCore(this);
  }

  /**
   * Pushes a new state to the history for a given CSS snippet/profile.
   * @param id - A unique identifier for the snippet or profile.
   * @param content - The new CSS content to save.
   */
  pushCssHistory(id: string, content: string) {
    pushCssHistoryCore(this, id, content);
  }

  /**
   * Undoes the last change for a given ID and returns the previous state.
   * @param id - The unique identifier.
   * @returns The previous content, or null if no history.
   */
  undoCssHistory(id: string): string | null {
    return undoCssHistoryCore(this, id);
  }

  /**
   * Redoes the last undone change for a given ID.
   * @param id - The unique identifier.
   * @returns The next content, or null if no redo history.
   */
  redoCssHistory(id: string): string | null {
    return redoCssHistoryCore(this, id);
  }

  // Downloads an image from a URL and sets it as the background.
  async setBackgroundMediaFromUrl(url: string) {
    await setBackgroundMediaFromUrlCore(this, url);
  }

  // Sets an existing media file as the active background.
  async selectBackgroundMedia(newPath: string, mediaType: 'image' | 'video') {
    await selectBackgroundMediaCore(this, newPath, mediaType);
  }

  // Renames a background file and updates ALL profiles using it.
  async renameBackgroundMedia(oldPath: string, newFullName: string): Promise<string | false> {
    return renameBackgroundMediaCore(this, oldPath, newFullName);
  }

  /**
   * Temporarily strips plugin styles to snapshot the underlying theme's CSS variables.
   * Essential for determining base theme defaults.
   */
  async captureCurrentComputedVars(): Promise<Record<string, string>> {
    return captureCurrentComputedVarsCore(this);
  }

  /**
   * Memoized wrapper for captureCurrentComputedVars.
   * Prevents UI flickering by caching defaults until theme mode (dark/light) changes.
   */
  async getThemeDefaults(): Promise<Record<string, string>> {
    return getThemeDefaultsCore(this);
  }
}
