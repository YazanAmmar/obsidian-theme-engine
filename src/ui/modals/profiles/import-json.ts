import { App, Notice, Setting, TextComponent, debounce } from 'obsidian';
import { t } from '../../../i18n/strings';
import type ThemeEngine from '../../../main';
import type { Profile, Snippet } from '../../../types';
import type { ThemeEngineSettingTab } from '../../settingsTab';
import { ThemeEngineBaseModal } from '../base';

export class ProfileJsonImportModal extends ThemeEngineBaseModal {
  plugin: ThemeEngine;
  settingTab: ThemeEngineSettingTab;
  textarea: HTMLTextAreaElement;
  nameInput: TextComponent;
  profileName: string = '';

  constructor(app: App, plugin: ThemeEngine, settingTabInstance: ThemeEngineSettingTab) {
    super(app, plugin);
    this.settingTab = settingTabInstance;
  }

  onOpen() {
    super.onOpen();

    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h3', { text: t('modals.jsonImport.title') });
    new Setting(contentEl).setName(t('modals.newProfile.nameLabel')).addText((text) => {
      this.nameInput = text;
      text.setPlaceholder(t('modals.newProfile.namePlaceholder')).onChange((value) => {
        this.profileName = value.trim();
      });
    });
    contentEl.createEl('hr');

    contentEl.createEl('p', {
      text: t('modals.jsonImport.desc1'),
    });
    this.textarea = contentEl.createEl('textarea', {
      cls: 'cm-search-input cm-import-textarea',
      attr: { rows: '20', placeholder: t('modals.jsonImport.placeholder') },
    });

    // Add an 'input' event listener to parse JSON on-the-fly
    const debouncedParse = debounce(() => {
      const content = this.textarea.value;
      if (!content.trim()) return;

      try {
        const parsed = JSON.parse(content);

        if (parsed && typeof parsed.name === 'string' && parsed.name) {
          this.nameInput.setValue(parsed.name);
          this.profileName = parsed.name;
        }
      } catch {
        // ignore invalid JSON
      }
    }, 0);

    // Attach the debounced function to the textarea's input event
    this.textarea.addEventListener('input', debouncedParse);

    // File import button
    new Setting(contentEl)
      .setName(t('modals.jsonImport.settingName'))
      .setDesc(t('modals.jsonImport.settingDesc'))
      .addButton((button) => {
        button.setButtonText(t('buttons.chooseFile')).onClick(() => {
          this._handleFileImport();
        });
      });

    // Action buttons (Replace/Create New)
    const ctrl = contentEl.createDiv({ cls: 'modal-button-container' });
    const replaceBtn = ctrl.createEl('button', {
      text: t('modals.jsonImport.replaceActiveButton'),
    });
    const createBtn = ctrl.createEl('button', {
      text: t('modals.jsonImport.createNewButton'),
      cls: 'mod-cta',
    });

    replaceBtn.addEventListener('click', () => void this._applyImport('replace'));
    createBtn.addEventListener('click', () => void this._applyCreate());
  }

  _handleFileImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = () => {
      void (async () => {
        if (!input.files || input.files.length === 0) return;
        const file = input.files[0];
        const content = await file.text();
        this.textarea.value = content;

        try {
          const parsed = JSON.parse(content);
          const profileNameFromJson =
            parsed.name || file.name.replace('.profile.json', '').replace('.json', '');
          this.nameInput.setValue(profileNameFromJson);
          this.profileName = profileNameFromJson;
        } catch {
          // ignore json parsing errors
        }

        new Notice(t('notices.fileLoaded', file.name));
      })().catch((err) => {
        console.error('Failed to load profile JSON:', err);
      });
    };
    input.click();
  }

  onClose() {
    this.contentEl.empty();
  }

  async _applyCreate() {
    const name = this.profileName;
    if (!name) {
      new Notice(t('notices.varNameEmpty'));
      return;
    }

    if (this.plugin.settings.profiles[name]) {
      new Notice(t('notices.profileNameExists', name));
      return;
    }

    const raw = this.textarea.value.trim();
    if (!raw) {
      new Notice(t('notices.textboxEmpty'));
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      new Notice(t('notices.invalidJson'));
      return;
    }

    const profileObj: Profile = parsed.profile ? parsed.profile : parsed;
    profileObj.noticeRules = profileObj.noticeRules || {
      text: [],
      background: [],
    };

    this.plugin.settings.profiles[name] = profileObj;
    this.plugin.settings.activeProfile = name;

    await this.plugin.saveSettings();
    this.settingTab.display();
    this.close();
    new Notice(t('notices.profileCreatedSuccess', name));
  }
  async _applyImport(mode: 'replace') {
    const raw = this.textarea.value.trim();
    if (!raw) {
      new Notice(t('notices.textboxEmpty'));
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      new Notice(t('notices.invalidJson'));
      return;
    }

    const profileObj = parsed.profile ? parsed.profile : parsed;
    if (typeof profileObj !== 'object' || profileObj === null) {
      new Notice(t('notices.invalidProfileObject'));
      return;
    }

    const activeName = this.plugin.settings.activeProfile;
    const activeProfile = this.plugin.settings.profiles[activeName];
    if (!activeProfile) {
      new Notice(t('notices.profileNotFound'));
      return;
    }

    const importedVars = 'vars' in profileObj ? profileObj.vars : {};
    const importedSnippets = 'snippets' in profileObj ? profileObj.snippets : [];
    const themeType = 'themeType' in profileObj ? profileObj.themeType : 'auto';

    if (mode === 'replace') {
      activeProfile.vars = importedVars as { [key: string]: string };
      activeProfile.snippets = importedSnippets as Snippet[];
      activeProfile.themeType = themeType as 'auto' | 'dark' | 'light';
    }

    await this.plugin.saveSettings();
    if (activeProfile.vars) {
      Object.keys(activeProfile.vars).forEach((k) => {
        this.plugin.pendingVarUpdates[k] = activeProfile.vars[k];
      });
    }
    this.plugin.applyPendingNow();

    this.settingTab.display();
    this.close();
    new Notice(t('notices.profileImportedSuccess'));
  }
}
