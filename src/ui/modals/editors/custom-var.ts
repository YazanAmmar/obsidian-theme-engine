import { App, DropdownComponent, Notice, Setting } from 'obsidian';
import { DEFAULT_VARS } from '../../../constants';
import { t } from '../../../i18n/strings';
import type ThemeEngine from '../../../main';
import type { CustomVarType } from '../../../types';
import { flattenVars, setCssPropsSafe } from '../../../utils';
import type { ThemeEngineSettingTab } from '../../settingsTab';
import { ThemeEngineBaseModal } from '../base';

export class CustomVariableMetaModal extends ThemeEngineBaseModal {
  plugin: ThemeEngine;
  settingTab: ThemeEngineSettingTab;
  onSubmit: (details: {
    varName: string;
    varValue: string;
    displayName: string;
    description: string;
    varType: CustomVarType;
  }) => void;

  // Instance variables
  varName: string = '';
  varValue: string = '';
  displayName: string = '';
  description: string = '';
  varType: CustomVarType = 'color';
  sizeUnit: string = 'px';
  valueInputContainer: HTMLElement;

  constructor(
    app: App,
    plugin: ThemeEngine,
    settingTab: ThemeEngineSettingTab,
    onSubmit: (details: {
      varName: string;
      varValue: string;
      displayName: string;
      description: string;
      varType: CustomVarType;
    }) => void,
  ) {
    super(app, plugin);
    this.settingTab = settingTab;
    this.onSubmit = onSubmit;
  }

  // A function to plot the input field based on the type
  renderValueInput(container: HTMLElement) {
    container.empty();
    const valueSetting = new Setting(container)
      .setName(t('modals.customVar.varValue'))
      .setDesc(t('modals.customVar.varValueDesc'));

    switch (this.varType) {
      case 'color': {
        if (this.varValue !== '' && !this.varValue.match(/^(#|rgb|hsl|transparent|var\(--)/i)) {
          this.varValue = '';
        }

        const colorPicker = valueSetting.controlEl.createEl('input', {
          type: 'color',
        });
        const textInput = valueSetting.controlEl.createEl('input', {
          type: 'text',
          cls: 'theme-engine-text-input',
        });

        colorPicker.value = this.varValue;
        textInput.value = this.varValue;

        colorPicker.addEventListener('input', (e) => {
          const newColor = (e.target as HTMLInputElement).value;
          textInput.value = newColor;
          this.varValue = newColor;
        });

        textInput.addEventListener('change', (e) => {
          const newColor = (e.target as HTMLInputElement).value;
          colorPicker.value = newColor;
          this.varValue = newColor;
        });

        break;
      }

      case 'size': {
        // If the current value is not a size, return it to the default
        if (!this.varValue.match(/^(-?\d+)(\.\d+)?(px|em|rem|%)$/)) {
          this.varValue = '10px';
        }

        // Extract the number and unit
        const sizeMatch = this.varValue.match(/(-?\d+)(\.\d+)?(\D+)/);

        let num = sizeMatch ? (sizeMatch[1] || '') + (sizeMatch[2] || '') : '10';

        let unit = sizeMatch ? sizeMatch[3] || '' : 'px';
        if (!['px', 'em', 'rem', '%'].includes(unit)) unit = 'px';

        this.sizeUnit = unit;

        const sizeInput = valueSetting.controlEl.createEl('input', {
          type: 'number',
          cls: 'theme-engine-text-input',
        });
        setCssPropsSafe(sizeInput, { width: '80px' });
        sizeInput.value = num;

        const unitDropdown = new DropdownComponent(valueSetting.controlEl);

        const unitOptions: Array<[string, string]> = [
          ['px', 'px'],
          ['em', 'em'],
          ['rem', 'rem'],
          ['%', '%'],
        ];
        unitOptions.forEach(([value, label]) => {
          unitDropdown.addOption(value, label);
        });

        unitDropdown.setValue(this.sizeUnit);

        const updateSizeValue = () => {
          this.varValue = (sizeInput.value || '0') + this.sizeUnit;
        };

        sizeInput.addEventListener('change', updateSizeValue);

        unitDropdown.onChange((newUnit) => {
          this.sizeUnit = newUnit;
          updateSizeValue();
        });

        break;
      }

      case 'text': {
        // Dump the value if the type is different
        if (this.varType !== 'text') this.varValue = '';

        valueSetting.addTextArea((text) => {
          text
            .setValue(this.varValue)
            .setPlaceholder(t('modals.customVar.textValuePlaceholder'))
            .onChange((value) => {
              this.varValue = value;
            });

          setCssPropsSafe(text.inputEl, { width: '100%' });
          text.inputEl.classList.add('cm-textarea-size');
        });

        break;
      }

      case 'number': {
        // If the value is NaN, return it to 0
        if (isNaN(parseFloat(this.varValue))) this.varValue = '0';

        valueSetting.addText((text) => {
          text.inputEl.type = 'number';
          text.setValue(this.varValue).onChange((value) => {
            this.varValue = value;
          });
        });

        break;
      }
    }
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    this.modalEl.classList.add('theme-engine-modal');

    super.onOpen();

    contentEl.createEl('h3', { text: t('modals.customVar.title') });
    contentEl.createEl('p', { text: t('modals.customVar.desc') });

    new Setting(contentEl)
      .setName(t('modals.customVar.displayName'))
      .setDesc(t('modals.customVar.displayNameDesc'))
      .addText((text) =>
        text
          .setPlaceholder(t('modals.customVar.displayNamePlaceholder'))
          .setValue(this.displayName)
          .onChange((value) => {
            this.displayName = value;
          }),
      );

    new Setting(contentEl)
      .setName(t('modals.customVar.varName'))
      .setDesc(t('modals.customVar.varNameDesc'))
      .addText((text) =>
        text
          .setPlaceholder(t('modals.customVar.varNamePlaceholder'))
          .setValue(this.varName)
          .onChange((value) => {
            if (value.length > 0 && !value.startsWith('--')) {
              if (value.startsWith('-')) {
                this.varName = '-' + value;
              } else {
                this.varName = '--' + value;
              }
            } else {
              this.varName = value;
            }
          }),
      );

    new Setting(contentEl)
      .setName(t('modals.customVar.varType'))
      .setDesc(t('modals.customVar.varTypeDesc'))
      .addDropdown((dropdown) => {
        dropdown
          .addOption('color', t('modals.customVar.types.color'))
          .addOption('size', t('modals.customVar.types.size'))
          .addOption('text', t('modals.customVar.types.text'))
          .addOption('number', t('modals.customVar.types.number'))
          .setValue(this.varType)
          .onChange((value: CustomVarType) => {
            this.varType = value;

            switch (value) {
              case 'color':
                this.varValue = '';
                break;
              case 'size':
                this.varValue = '10px';
                break;
              case 'number':
                this.varValue = '0';
                break;
              case 'text':
                this.varValue = '';
                break;
            }
            this.renderValueInput(this.valueInputContainer);
          });
      });

    this.valueInputContainer = contentEl.createDiv('cm-value-input-container');
    this.renderValueInput(this.valueInputContainer);

    // Description
    new Setting(contentEl)
      .setName(t('modals.customVar.description'))
      .setDesc(t('modals.customVar.descriptionDesc'))
      .addTextArea((text) =>
        text
          .setPlaceholder(t('modals.customVar.descriptionPlaceholder'))
          .setValue(this.description)
          .onChange((value) => {
            this.description = value;
          }),
      );

    // Buttons
    new Setting(contentEl)
      .setClass('modal-button-container')
      .addButton((button) => button.setButtonText(t('buttons.cancel')).onClick(() => this.close()))
      .addButton((button) =>
        button
          .setButtonText(t('modals.customVar.addVarButton'))
          .setCta()
          .onClick(() => {
            const trimmedVarName = this.varName.trim();

            if (!trimmedVarName.startsWith('--')) {
              new Notice(t('notices.varNameFormat'));
              return;
            }
            if (!this.displayName.trim()) {
              new Notice(t('notices.varNameEmpty'));
              return;
            }

            const allDefaultVars = Object.keys(flattenVars(DEFAULT_VARS));
            const activeProfile = this.plugin.settings.profiles[this.plugin.settings.activeProfile];
            const allProfileVars = Object.keys(activeProfile.vars || {});
            const allVarNames = new Set([...allDefaultVars, ...allProfileVars]);

            if (allVarNames.has(trimmedVarName)) {
              new Notice(t('notices.varExists', trimmedVarName));
              return;
            }

            this.onSubmit({
              displayName: this.displayName.trim(),
              varName: trimmedVarName,
              varValue: this.varValue.trim(),
              description: this.description.trim(),
              varType: this.varType,
            });
            this.close();
          }),
      );
  }

  onClose() {
    this.contentEl.empty();
  }
}
