import { App, ButtonComponent, Notice, Setting } from 'obsidian';
import { loadLanguage, t } from '../../../i18n/strings';
import { CORE_LANGUAGES } from '../../../i18n/types';
import type ThemeEngine from '../../../main';
import type { ThemeEngineSettingTab } from '../../settingsTab';
import { ThemeEngineBaseModal } from '../base';
import { LanguageTranslatorModal } from './translator';

/**
 * Modal for toggling global layout direction (RTL/LTR).
 */
export class LanguageSettingsModal extends ThemeEngineBaseModal {
  plugin: ThemeEngine;

  constructor(app: App, plugin: ThemeEngine) {
    super(app, plugin);
  }

  onOpen() {
    super.onOpen();
    this.modalEl.classList.add('theme-engine-modal');
    const { contentEl } = this;

    contentEl.empty();
    contentEl.createEl('h3', {
      text: t('settings.languageSettingsModalTitle'),
    });

    new Setting(contentEl)
      .setName(t('settings.rtlLayoutName'))
      .setDesc(t('settings.rtlLayoutDesc'))
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.useRtlLayout).onChange(async (value) => {
          this.plugin.settings.useRtlLayout = value;
          await this.plugin.saveSettings();
          this.plugin.settingTabInstance?.display();
        });
      });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

/**
 * Modal for creating a new custom language definition.
 */
export class AddNewLanguageModal extends ThemeEngineBaseModal {
  settingTab: ThemeEngineSettingTab;
  langName: string = '';
  langCode: string = '';
  isRtl: boolean = false;

  constructor(app: App, plugin: ThemeEngine, settingTab: ThemeEngineSettingTab) {
    super(app, plugin);
    this.settingTab = settingTab;
  }

  onOpen() {
    super.onOpen();
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h3', { text: t('modals.addLang.title') });
    contentEl.createEl('p', { text: t('modals.addLang.desc') });

    new Setting(contentEl)
      .setName(t('modals.addLang.nameLabel'))
      .setDesc(t('modals.addLang.nameDesc'))
      .addText((text) => {
        text.setPlaceholder(t('modals.addLang.namePlaceholder')).onChange((value) => {
          this.langName = value.trim();
        });
      });

    new Setting(contentEl)
      .setName(t('modals.addLang.codeLabel'))
      .setDesc(t('modals.addLang.codeDesc'))
      .addText((text) => {
        text.setPlaceholder(t('modals.addLang.codePlaceholder')).onChange((value) => {
          // Enforce lowercase alphanumeric format for safe keys
          this.langCode = value
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_-]/g, '');
          if (text.inputEl.value !== this.langCode) {
            text.setValue(this.langCode);
          }
        });
      });

    new Setting(contentEl)
      .setName(t('modals.addLang.rtlLabel'))
      .setDesc(t('modals.addLang.rtlDesc'))
      .addToggle((toggle) => {
        toggle.setValue(this.isRtl).onChange((value) => {
          this.isRtl = value;
        });
      });

    const buttonContainer = contentEl.createDiv({
      cls: 'modal-button-container',
    });

    new ButtonComponent(buttonContainer)
      .setButtonText(t('buttons.cancel'))
      .onClick(() => this.close());

    new ButtonComponent(buttonContainer)
      .setButtonText(t('buttons.create'))
      .setCta()
      .onClick(() => this.handleCreate());
  }

  async handleCreate() {
    // Basic integrity checks
    if (!this.langName) {
      new Notice(t('notices.langNameEmpty'));
      return;
    }
    if (!this.langCode) {
      new Notice(t('notices.langCodeEmpty'));
      return;
    }

    // Prevent collision with bundled core locales
    const coreCodes = ['en', 'ar', 'fa', 'fr'];
    if (coreCodes.includes(this.langCode)) {
      new Notice(t('notices.langCodeCore', this.langCode));
      return;
    }

    if (!this.plugin.settings.customLanguages) {
      this.plugin.settings.customLanguages = {};
    }

    // Persist new locale and auto-switch
    if (this.plugin.settings.customLanguages[this.langCode]) {
      new Notice(t('notices.langCodeExists', this.langCode));
      return;
    }

    // Check for duplicate names (Custom)
    const existingLangs = Object.values(this.plugin.settings.customLanguages);
    const nameExists = existingLangs.some(
      (lang) => lang.languageName.toLowerCase() === this.langName.toLowerCase(),
    );
    if (nameExists) {
      new Notice(t('notices.langNameExists', this.langName));
      return;
    }

    // Check for duplicate names (Core)
    const coreLangNames = Object.values(CORE_LANGUAGES).map((name) => name.toLowerCase());
    if (coreLangNames.includes(this.langName.toLowerCase())) {
      new Notice(t('notices.langNameCore', this.langName));
      return;
    }

    this.plugin.settings.customLanguages[this.langCode] = {
      languageName: this.langName,
      translations: {},
      isRtl: this.isRtl,
    };

    await this.plugin.saveSettings();
    loadLanguage(this.plugin.settings); // Re-initialize i18n engine
    new Notice(t('notices.langCreated', this.langName));
    this.settingTab.display();
    this.close();

    new LanguageTranslatorModal(this.app, this.plugin, this.settingTab, this.langCode).open();
  }

  onClose() {
    this.contentEl.empty();
  }
}
