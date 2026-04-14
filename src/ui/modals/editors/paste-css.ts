import { App, Notice, Setting, TextComponent, debounce } from 'obsidian';
import { DEFAULT_PROFILE } from '../../../constants';
import { t } from '../../../i18n/strings';
import type ThemeEngine from '../../../main';
import type { ThemeEngineSettingTab } from '../../settingsTab';
import { ThemeEngineBaseModal } from '../base';

/**
 * Accessor interface for Obsidian's internal CSS/Theme management.
 */
interface AppWithCustomCss extends App {
  customCss: {
    themes: Record<string, unknown>;
    theme: string;
    setTheme(theme: string): void;
  };
}

export class PasteCssModal extends ThemeEngineBaseModal {
  plugin: ThemeEngine;
  settingTab: ThemeEngineSettingTab;
  existingProfileData: {
    name: string;
    css: string;
    id?: string;
  } | null;
  isEditing: boolean;
  modalTitleEl: HTMLHeadingElement;
  nameSetting: Setting;
  nameInput: TextComponent;
  cssTextarea: HTMLTextAreaElement;
  profileName: string;
  isSaving: boolean = false;

  constructor(
    app: App,
    plugin: ThemeEngine,
    settingTab: ThemeEngineSettingTab,
    existingProfileData: {
      name: string;
      css: string;
      id?: string;
    } | null = null,
  ) {
    super(app, plugin);
    this.settingTab = settingTab;
    this.existingProfileData = existingProfileData;
    this.isEditing = !!existingProfileData;
    this.profileName = existingProfileData ? existingProfileData.name : '';
  }

  /**
   * Reads raw CSS content from a local file.
   */
  _handleFileImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.css';

    input.onchange = () => {
      void (async () => {
        if (!input.files || input.files.length === 0) return;
        const file = input.files[0];
        const content = await file.text();
        this.cssTextarea.value = content;
        new Notice(t('notices.fileLoaded', file.name));
      })().catch((err) => {
        console.error('Failed to load CSS file:', err);
      });
    };
    input.click();
  }

  onOpen() {
    super.onOpen();

    const { contentEl } = this;
    contentEl.empty();

    const titleContainer = contentEl.createDiv({ cls: 'cm-title-container' });
    const titleText = this.isEditing
      ? t('modals.cssImport.titleEdit')
      : t('modals.cssImport.title');

    this.modalTitleEl = titleContainer.createEl('h3', { text: titleText });

    // Fetch themes from internal API
    const installedThemes = (this.app as AppWithCustomCss).customCss.themes || {};
    const themeNames = Object.keys(installedThemes);
    let selectedTheme = themeNames.length > 0 ? themeNames[0] : '';

    const themeImporterEl = new Setting(contentEl)
      .setName(t('modals.cssImport.importFromTheme'))
      .setDesc(t('modals.cssImport.importFromThemeDesc'));
    themeImporterEl.settingEl.addClass('cm-theme-importer-setting');

    themeImporterEl.addDropdown((dropdown) => {
      if (themeNames.length > 0) {
        themeNames.forEach((themeName) => {
          dropdown.addOption(themeName, themeName);
        });
        dropdown.onChange((value) => {
          selectedTheme = value;
        });
      } else {
        dropdown.addOption('', t('modals.cssImport.noThemes'));
        dropdown.setDisabled(true);
      }
    });

    themeImporterEl.addButton((button) => {
      button
        .setButtonText(t('buttons.import'))
        .setCta()
        .setDisabled(themeNames.length === 0)
        .onClick(async () => {
          if (!selectedTheme) return;
          const themePath = `${this.app.vault.configDir}/themes/${selectedTheme}/theme.css`;
          try {
            const cssContent = await this.app.vault.adapter.read(themePath);
            this.cssTextarea.value = cssContent;
            this.nameInput.setValue(selectedTheme);
            this.profileName = selectedTheme;
            new Notice(t('notices.themeCssLoaded', selectedTheme));
          } catch (error) {
            new Notice(t('notices.themeReadFailed', selectedTheme));
            console.error(`Theme Engine: Failed to read theme CSS at ${themePath}`, error);
          }
        });
    });

    let nameLabelText = t('modals.newProfile.nameLabel');
    this.nameSetting = new Setting(contentEl).setName(nameLabelText).addText((text) => {
      this.nameInput = text;
      let placeholderText = t('modals.newProfile.namePlaceholder');

      text
        .setValue(this.isEditing && this.existingProfileData ? this.existingProfileData.name : '')
        .setPlaceholder(placeholderText)
        .onChange((value) => {
          this.profileName = value.trim();
        });
    });

    this.cssTextarea = contentEl.createEl('textarea', {
      cls: 'cm-search-input cm-large-textarea',
      attr: {
        rows: '18',
        placeholder: t('modals.snippetEditor.cssPlaceholder'),
      },
    });

    contentEl.createDiv({
      text: t('modals.cssImport.note'),
      cls: 'cm-modal-warning-note',
    });

    new Setting(contentEl)
      .setName(t('modals.cssImport.importFromFile'))
      .setDesc(t('modals.cssImport.importFromFileDesc'))
      .addButton((button) => {
        button.setButtonText(t('buttons.chooseFile')).onClick(() => {
          this._handleFileImport();
        });
      });

    // History & Undo/Redo logic
    const historyId =
      this.isEditing && this.existingProfileData
        ? `profile-${this.existingProfileData.name}`
        : null;

    const initialCss =
      this.isEditing && this.existingProfileData ? this.existingProfileData.css : '';

    if (historyId) {
      const lastState = this.plugin.cssHistory[historyId]?.undoStack.last();
      this.cssTextarea.value = lastState ?? initialCss;

      if (
        !this.plugin.cssHistory[historyId] ||
        this.plugin.cssHistory[historyId].undoStack.length === 0
      ) {
        this.plugin.pushCssHistory(historyId, initialCss);
      }
    } else {
      this.cssTextarea.value = initialCss;
    }

    const debouncedPushHistory = debounce((id: string, value: string) => {
      this.plugin.pushCssHistory(id, value);
    }, 500);

    this.cssTextarea.addEventListener('input', () => {
      if (historyId) {
        debouncedPushHistory(historyId, this.cssTextarea.value);
      }
    });

    this.cssTextarea.addEventListener('keydown', (e) => {
      if (historyId && e.ctrlKey) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          const prevState = this.plugin.undoCssHistory(historyId);
          if (prevState !== null) {
            this.cssTextarea.value = prevState;
          }
        } else if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          const nextState = this.plugin.redoCssHistory(historyId);
          if (nextState !== null) {
            this.cssTextarea.value = nextState;
          }
        }
      }
    });

    const buttonContainer = contentEl.createDiv({
      cls: 'modal-button-container',
    });

    buttonContainer
      .createEl('button', { text: t('buttons.cancel') })
      .addEventListener('click', () => this.close());

    buttonContainer
      .createEl('button', {
        text: this.isEditing ? t('buttons.update') : t('buttons.create'),
        cls: 'mod-cta',
      })
      .addEventListener('click', () => {
        void this.handleSave().catch((err) => {
          console.error('Failed to save CSS snippet:', err);
        });
      });

    setTimeout(() => this.nameInput.inputEl.focus(), 0);
  }

  /**
   * Captures computed CSS variables by temporarily injecting the custom CSS
   * into a "Clean Slate" environment (Ghost Profile).
   */
  async handleSave() {
    if (this.isEditing && !this.existingProfileData) {
      console.error('Attempted to save in editing mode without an existing snippet.');
      return;
    }

    const cssText = this.cssTextarea.value.trim();
    let name = (this.profileName || '').trim();

    if (!name) {
      new Notice(t('notices.varNameEmpty'));
      return;
    }

    const activeProfile = this.plugin.settings.profiles[this.plugin.settings.activeProfile];
    if (!activeProfile) return;

    const isNameTaken = Object.keys(this.plugin.settings.profiles || {}).some(
      (profileName) =>
        profileName.toLowerCase() === name.toLowerCase() &&
        (!this.isEditing ||
          (this.existingProfileData &&
            this.existingProfileData.name.toLowerCase() !== name.toLowerCase())),
    );
    if (isNameTaken) {
      new Notice(t('notices.profileNameExists', name));
      return;
    }

    if (typeof CSSStyleSheet === 'undefined' || !Array.isArray(document.adoptedStyleSheets)) {
      console.error(
        'Theme Engine: CSS import requires constructable stylesheet support in this runtime.',
      );
      return;
    }

    const tempStyleSheet = new CSSStyleSheet();
    try {
      tempStyleSheet.replaceSync(cssText);
    } catch (e) {
      console.error('Theme Engine: Failed to parse CSS for import.', e);
      return;
    }

    const saveBtn = this.contentEl.querySelector<HTMLButtonElement>('.mod-cta');
    if (saveBtn) {
      saveBtn.textContent = t('modals.addBackground.processing') + '...';
      saveBtn.disabled = true;
    }

    // Capture current environment state
    const customCss = (this.app as AppWithCustomCss).customCss;
    const originalObsidianTheme = customCss?.theme;

    // STEP: Switch to temporary Ghost Profile to ensure no variable contamination
    const tempProfileName = '__cm_temp_clean_slate__';
    this.plugin.settings.profiles[tempProfileName] = JSON.parse(JSON.stringify(DEFAULT_PROFILE));
    this.plugin.settings.activeProfile = tempProfileName;

    await this.plugin.applyStyles();

    if (originalObsidianTheme) {
      customCss.setTheme('');
    }

    // Force DOM reflow to clear old styles
    void document.body.offsetHeight;
    await new Promise((resolve) => setTimeout(resolve, 0));

    // STEP: Adopt the temporary stylesheet for computed variable capture
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, tempStyleSheet];

    // Sync with browser paint cycle
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Final variable capture
    const capturedVars = await this.plugin.captureCurrentComputedVars();

    // CLEANUP: Revert environment to original state
    document.adoptedStyleSheets = document.adoptedStyleSheets.filter(
      (sheet) => sheet !== tempStyleSheet,
    );
    if (originalObsidianTheme) {
      customCss.setTheme(originalObsidianTheme);
    }
    delete this.plugin.settings.profiles[tempProfileName];

    // Persist new/updated profile
    if (this.isEditing && this.existingProfileData) {
      const oldName = this.existingProfileData.name;
      const oldProfileData = this.plugin.settings.profiles[oldName] || {};

      if (oldName !== name) {
        if (this.plugin.settings.pinnedSnapshots[oldName]) {
          this.plugin.settings.pinnedSnapshots[name] =
            this.plugin.settings.pinnedSnapshots[oldName];
          delete this.plugin.settings.pinnedSnapshots[oldName];
        }
        delete this.plugin.settings.profiles[oldName];
      }

      this.plugin.settings.profiles[name] = {
        ...oldProfileData,
        isCssProfile: true,
        customCss: cssText,
        vars: capturedVars,
      };

      this.plugin.settings.activeProfile = name;
      new Notice(t('notices.profileUpdated', name));
    } else {
      this.plugin.settings.profiles[name] = {
        vars: capturedVars,
        themeType: 'auto',
        isCssProfile: true,
        customCss: cssText,
        snippets: [],
        noticeRules: { text: [], background: [] },
      };

      this.plugin.settings.activeProfile = name;
      new Notice(t('notices.profileCreatedFromCss', name));
    }

    this.isSaving = true;
    this.plugin.pendingVarUpdates = {};

    await this.plugin.saveSettings();
    this.plugin.applyCssSnippets();

    this.settingTab.display();
    this.close();
  }

  onClose() {
    if (!this.isSaving) {
      const historyId =
        this.isEditing && this.existingProfileData
          ? `profile-${this.existingProfileData.name}`
          : null;
      if (historyId && this.plugin.cssHistory[historyId]) {
        delete this.plugin.cssHistory[historyId];
      }
    }
    this.contentEl.empty();
  }
}
