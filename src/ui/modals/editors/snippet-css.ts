import { App, Notice, Setting, TextComponent, TextAreaComponent, debounce } from 'obsidian';
import { t } from '../../../i18n/strings';
import type ThemeEngine from '../../../main';
import type { Snippet } from '../../../types';
import type { ThemeEngineSettingTab } from '../../settingsTab';
import { ThemeEngineBaseModal } from '../base';

interface AppWithCustomCss extends App {
  customCss: {
    snippets: string[];
  };
}

export class SnippetCssModal extends ThemeEngineBaseModal {
  plugin: ThemeEngine;
  settingTab: ThemeEngineSettingTab;
  existingSnippet: Snippet | null;
  isEditing: boolean;
  modalTitleEl: HTMLHeadingElement;
  nameSetting: Setting;
  nameInput: TextComponent;
  cssTextarea: TextAreaComponent;
  snippetName: string;
  isGlobalSnippet: boolean;
  isSaving: boolean = false;

  constructor(
    app: App,
    plugin: ThemeEngine,
    settingTab: ThemeEngineSettingTab,
    existingSnippet: Snippet | null = null,
  ) {
    super(app, plugin);
    this.settingTab = settingTab;
    this.existingSnippet = existingSnippet;
    this.isEditing = !!existingSnippet;
    this.snippetName = existingSnippet ? existingSnippet.name : '';
    this.isGlobalSnippet = existingSnippet ? !!existingSnippet.isGlobal : false;
  }

  _handleFileImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.css';

    input.onchange = () => {
      void (async () => {
        if (!input.files || input.files.length === 0) return;
        const file = input.files[0];
        const content = await file.text();
        this.cssTextarea.inputEl.value = content;
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

    let titleText = this.isEditing
      ? t('modals.snippetEditor.titleEdit')
      : t('modals.snippetEditor.title');

    this.modalTitleEl = titleContainer.createEl('h3', { text: titleText });

    const installedSnippets = (this.app as AppWithCustomCss).customCss.snippets || [];
    let selectedSnippet = installedSnippets.length > 0 ? installedSnippets[0] : '';

    const snippetImporterEl = new Setting(contentEl)
      .setName(t('modals.snippetEditor.importFromSnippet'))
      .setDesc(t('modals.snippetEditor.importFromSnippetDesc'));
    snippetImporterEl.settingEl.addClass('cm-theme-importer-setting');

    snippetImporterEl.addDropdown((dropdown) => {
      if (installedSnippets.length > 0) {
        installedSnippets.forEach((snippetName: string) => {
          dropdown.addOption(snippetName, snippetName);
        });
        dropdown.onChange((value) => {
          selectedSnippet = value;
        });
      } else {
        dropdown.addOption('', t('modals.snippetEditor.noSnippets'));
        dropdown.setDisabled(true);
      }
    });

    snippetImporterEl.addButton((button) => {
      button
        .setButtonText(t('buttons.import'))
        .setCta()
        .setDisabled(installedSnippets.length === 0)
        .onClick(async () => {
          if (!selectedSnippet) return;
          const snippetPath = `${this.app.vault.configDir}/snippets/${selectedSnippet}.css`;
          try {
            const cssContent = await this.app.vault.adapter.read(snippetPath);
            this.cssTextarea.setValue(cssContent);
            this.nameInput.setValue(selectedSnippet);
            this.snippetName = selectedSnippet;
            new Notice(t('notices.snippetLoaded', selectedSnippet));
          } catch (error) {
            new Notice(t('notices.snippetReadFailed', selectedSnippet));
            console.error(`Theme Engine: Failed to read snippet CSS at ${snippetPath}`, error);
          }
        });
    });

    const nameLabelText = t('modals.snippetEditor.nameLabel');

    this.nameSetting = new Setting(contentEl).setName(nameLabelText).addText((text) => {
      this.nameInput = text;
      let placeholderText = t('modals.snippetEditor.namePlaceholder');

      text
        .setValue(this.isEditing && this.existingSnippet ? this.existingSnippet.name : '')
        .setPlaceholder(placeholderText)
        .onChange((value) => {
          this.snippetName = value.trim();
        });
    });

    new Setting(contentEl)
      .setName(t('snippets.globalName'))
      .setDesc(t('snippets.globalDesc'))
      .addToggle((toggle) => {
        toggle.setValue(this.isGlobalSnippet).onChange((value) => {
          this.isGlobalSnippet = value;
        });
      });

    this.cssTextarea = new TextAreaComponent(contentEl);
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

    this.cssTextarea.inputEl.classList.add('cm-search-input', 'cm-large-textarea');
    this.cssTextarea.inputEl.rows = 18;
    this.cssTextarea.setPlaceholder(t('modals.snippetEditor.cssPlaceholder'));

    const historyId = this.isEditing && this.existingSnippet ? this.existingSnippet.id : null;

    const initialCss = this.isEditing && this.existingSnippet ? this.existingSnippet.css : '';

    if (historyId) {
      const lastState = this.plugin.cssHistory[historyId]?.undoStack.last();
      this.cssTextarea.setValue(lastState ?? initialCss);

      if (
        !this.plugin.cssHistory[historyId] ||
        this.plugin.cssHistory[historyId].undoStack.length === 0
      ) {
        this.plugin.pushCssHistory(historyId, initialCss);
      }
    } else {
      this.cssTextarea.setValue(initialCss);
    }

    const debouncedPushHistory = debounce((id: string, value: string) => {
      this.plugin.pushCssHistory(id, value);
    }, 500);

    this.cssTextarea.onChange((value: string) => {
      if (historyId) {
        debouncedPushHistory(historyId, value);
      }
    });

    this.cssTextarea.inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
      if (historyId && e.ctrlKey) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          const prevState = this.plugin.undoCssHistory(historyId);
          if (prevState !== null) {
            this.cssTextarea.setValue(prevState);
          }
        } else if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          const nextState = this.plugin.redoCssHistory(historyId);
          if (nextState !== null) {
            this.cssTextarea.setValue(nextState);
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
      .addEventListener('click', () => this.handleSave());
    setTimeout(() => this.nameInput.inputEl.focus(), 0);
  }

  handleSave() {
    const cssText = this.cssTextarea.getValue().trim();
    const name = (this.snippetName || '').trim();

    if (!name) {
      new Notice(t('notices.varNameEmpty'));
      return;
    }
    if (!cssText) {
      new Notice(t('notices.cssContentEmpty'));
      return;
    }

    const activeProfile = this.plugin.settings.profiles[this.plugin.settings.activeProfile];
    if (!activeProfile) return;

    if (!Array.isArray(this.plugin.settings.globalSnippets)) {
      this.plugin.settings.globalSnippets = [];
    }

    const targetList = this.isGlobalSnippet
      ? this.plugin.settings.globalSnippets
      : activeProfile.snippets;

    const isNameTaken = targetList.some(
      (s) =>
        s.name.toLowerCase() === name.toLowerCase() &&
        (!this.isEditing || (this.existingSnippet && this.existingSnippet.id !== s.id)),
    );

    if (isNameTaken) {
      new Notice(t('notices.snippetNameExists', name));
      return;
    }

    if (this.isEditing && this.existingSnippet) {
      const originalIsGlobal = !!this.existingSnippet.isGlobal;
      const originalList = originalIsGlobal
        ? this.plugin.settings.globalSnippets
        : activeProfile.snippets;
      const targetList = this.isGlobalSnippet
        ? this.plugin.settings.globalSnippets
        : activeProfile.snippets;

      const snippetIndex = originalList.findIndex((s) => s.id === this.existingSnippet!.id);

      if (snippetIndex > -1) {
        if (originalIsGlobal === this.isGlobalSnippet) {
          // Update directly in the same place
          originalList[snippetIndex].name = name;
          originalList[snippetIndex].css = cssText;
        } else {
          // delete from the old list
          const [snippetToMove] = originalList.splice(snippetIndex, 1);

          snippetToMove.name = name;
          snippetToMove.css = cssText;
          snippetToMove.isGlobal = this.isGlobalSnippet;

          targetList.push(snippetToMove);
        }
        new Notice(t('notices.snippetUpdated', name));
      }
    } else {
      targetList.push({
        id: `snippet-${Date.now()}`,
        name: name,
        css: cssText,
        enabled: true,
        isGlobal: this.isGlobalSnippet,
      });
      new Notice(t('notices.snippetCreated', name));
    }

    this.isSaving = true;
    void this.plugin
      .saveSettings()
      .then(() => {
        this.plugin.applyCssSnippets();
        this.settingTab.display();
        this.close();
      })
      .catch((err) => {
        console.error('Failed to save settings:', err);
      });
  }

  onClose() {
    // If the save button is not pressed
    if (!this.isSaving) {
      const historyId = this.isEditing && this.existingSnippet ? this.existingSnippet.id : null;
      if (historyId && this.plugin.cssHistory[historyId]) {
        delete this.plugin.cssHistory[historyId];
      }
    }
    this.contentEl.empty();
  }
}
