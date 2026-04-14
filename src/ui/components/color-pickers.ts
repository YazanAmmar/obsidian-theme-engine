import { Notice, Setting, SettingGroup } from 'obsidian';
import { DEFAULT_VARS, RGB_TRIPLET_VARS, TEXT_TO_BG_MAP } from '../../constants';
import { t } from '../../i18n/strings';
import {
  flattenVars,
  getAccessibilityRating,
  getContrastRatio,
  isIconizeEnabled,
  setCssPropsSafe,
} from '../../utils';
import { IconizeSettingsModal, NoticeRulesModal } from '../modals';
import type { ThemeEngineSettingTab } from '../settingsTab';

const hexToRgbTriplet = (hex: string): string => {
  const normalized = hex.trim().replace('#', '');
  if (normalized.length !== 6) return hex;

  const value = Number.parseInt(normalized, 16);
  if (Number.isNaN(value)) return hex;

  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `${r}, ${g}, ${b}`;
};

function normalizeHexColor(value: string): string {
  const trimmed = value.trim();

  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) {
    return `#${trimmed.toLowerCase()}`;
  }

  if (/^[0-9a-fA-F]{3}$/.test(trimmed)) {
    return `#${trimmed.toLowerCase()}`;
  }

  return value;
}

export function drawColorPickers(
  containerEl: HTMLElement,
  settingTab: ThemeEngineSettingTab,
  themeDefaults: Record<string, string>,
) {
  const plugin = settingTab.plugin;
  const activeProfile = plugin.settings.profiles[plugin.settings.activeProfile];
  const activeProfileVars = activeProfile.vars;
  const canUseSettingGroup = typeof SettingGroup === 'function';

  const createCategorySection = (parentEl: HTMLElement, headingText: string, category: string) => {
    const categoryContainer = parentEl.createDiv({
      cls: 'cm-category-container',
    });
    categoryContainer.dataset.category = category;

    if (canUseSettingGroup) {
      const group = new SettingGroup(categoryContainer);
      group.setHeading(headingText);
      group.addClass('cm-native-setting-group');

      return {
        createSetting: () => {
          let createdSetting: Setting | null = null;
          group.addSetting((setting) => {
            createdSetting = setting;
          });

          if (!createdSetting) {
            console.warn('Theme Engine: Failed to create grouped setting. Falling back.');
            return new Setting(categoryContainer);
          }

          return createdSetting;
        },
      };
    }

    categoryContainer.classList.add('cm-fallback-setting-group');
    categoryContainer.createEl('h3', { text: headingText, cls: 'cm-setting-group-heading' });

    const sectionBody = categoryContainer.createDiv({
      cls: 'cm-setting-group-body',
    });

    return {
      createSetting: () => new Setting(sectionBody),
    };
  };

  for (const [category, vars] of Object.entries(DEFAULT_VARS)) {
    let categoryKey: string;
    const lowerCategory = category.toLowerCase();

    if (lowerCategory === 'interactive elements') {
      categoryKey = 'interactive';
    } else if (lowerCategory === 'ui elements') {
      categoryKey = 'ui';
    } else if (lowerCategory === 'graph view') {
      categoryKey = 'graph';
    } else if (lowerCategory === 'plugin integrations') {
      categoryKey = 'pluginintegrations';
    } else {
      categoryKey = lowerCategory.replace(/ /g, '');
    }

    const headingText = t(`categories.${categoryKey}`) || category;
    const categorySection = createCategorySection(containerEl, headingText, category);

    for (const [varName, originalDefaultValue] of Object.entries(vars)) {
      const defaultValue = themeDefaults[varName] || '';

      const description = t(`colors.descriptions.${varName}`) || '';

      const setting = categorySection
        .createSetting()
        .setName(t(`colors.names.${varName}`) || varName)
        .setDesc(description);

      if (categoryKey === 'pluginintegrations' && varName === '--iconize-icon-color') {
        if (!isIconizeEnabled(plugin.app)) {
          const badgeEl = setting.nameEl.createSpan({
            text: t('options.badgeNotInstalled'),
            cls: 'cm-not-installed-badge',
          });
          badgeEl.setAttr('aria-label', t('tooltips.iconizeNotInstalled'));
        }
      }

      if (varName === '--iconize-icon-color') {
        setting.addExtraButton((button) => {
          button
            .setIcon('settings')
            .setTooltip(t('tooltips.iconizeSettings'))
            .onClick(() => {
              new IconizeSettingsModal(settingTab.app, plugin).open();
            });
        });
      }

      if (category === 'Notices') {
        setting.addExtraButton((button) => {
          button.setIcon('settings').onClick(() => {
            const ruleType = varName.includes('-text-') ? 'text' : 'background';
            new NoticeRulesModal(settingTab.app, plugin, settingTab, ruleType).open();
          });
        });
      }

      setting.settingEl.classList.add('cm-var-row');
      setting.settingEl.dataset.var = varName;
      setting.settingEl.dataset.category = category;
      setting.nameEl.classList.add('cm-var-name');

      const bgVarForTextColor = TEXT_TO_BG_MAP[varName as keyof typeof TEXT_TO_BG_MAP];

      if (bgVarForTextColor) {
        let textColor = activeProfileVars[varName] || defaultValue;
        let bgColor =
          activeProfileVars[bgVarForTextColor] || themeDefaults[bgVarForTextColor] || '#ffffff';

        if (varName === '--text-highlight-bg') {
          [textColor, bgColor] = [bgColor, textColor];
        }

        const ratio = getContrastRatio(bgColor, textColor);
        const rating = getAccessibilityRating(ratio);

        const checkerEl = setting.controlEl.createDiv({
          cls: `cm-accessibility-checker ${rating.cls}`,
        });
        checkerEl.dataset.varName = varName;
        checkerEl.setText(`${rating.text} (${rating.score})`);
      }

      const colorPicker = setting.controlEl.createEl('input', {
        type: 'color',
      });
      const textInput = setting.controlEl.createEl('input', {
        type: 'text',
        cls: 'theme-engine-text-input',
      });

      const isModified = Object.prototype.hasOwnProperty.call(activeProfileVars, varName);

      const initialValue = isModified ? activeProfileVars[varName] : defaultValue;

      setting.settingEl.classList.add(isModified ? 'is-modified' : 'is-pristine');

      textInput.value = initialValue;
      settingTab.updateColorPickerAppearance(textInput, colorPicker);

      colorPicker.addEventListener('input', (e) => {
        const pickedColor = (e.target as HTMLInputElement).value;
        const newColor = RGB_TRIPLET_VARS.has(varName) ? hexToRgbTriplet(pickedColor) : pickedColor;
        textInput.value = newColor;
        if (plugin.settings.colorUpdateFPS > 0) {
          plugin.pendingVarUpdates[varName] = newColor;
        }
      });

      const handleFinalChange = (newColor: string) => {
        if (!RGB_TRIPLET_VARS.has(varName)) {
          newColor = normalizeHexColor(newColor);
        }

        const normalizedColor =
          RGB_TRIPLET_VARS.has(varName) && newColor.trim().startsWith('#')
            ? hexToRgbTriplet(newColor)
            : newColor;

        // 1. Update visual state of inputs
        textInput.value = normalizedColor;
        settingTab.updateColorPickerAppearance(textInput, colorPicker);

        // 2. Get profile and old color (for history)
        const profile = plugin.settings.profiles[plugin.settings.activeProfile];
        const oldColor = Object.prototype.hasOwnProperty.call(activeProfileVars, varName)
          ? activeProfileVars[varName]
          : defaultValue;

        // 3. Update history if change is meaningful
        if (oldColor.toLowerCase() !== normalizedColor.toLowerCase()) {
          profile.history = profile.history || {};
          profile.history[varName] = profile.history[varName] || [];
          profile.history[varName].unshift(oldColor);
          profile.history[varName] = profile.history[varName].slice(0, 5);
        }

        // 4. Decide UI state (Pristine/Modified) and update data
        if (
          normalizedColor.trim() === '' ||
          normalizedColor.toLowerCase() === defaultValue.toLowerCase()
        ) {
          setting.settingEl.classList.remove('is-modified');
          setting.settingEl.classList.add('is-pristine');
          delete activeProfileVars[varName];
        } else {
          // If it's a new and custom color
          setting.settingEl.classList.remove('is-pristine');
          setting.settingEl.classList.add('is-modified');
          activeProfileVars[varName] = normalizedColor;
        }
        // 5. Apply changes and save
        const valueToApply =
          normalizedColor.trim() === '' ||
          normalizedColor.toLowerCase() === defaultValue.toLowerCase()
            ? ''
            : normalizedColor;

        if (plugin.settings.colorUpdateFPS === 0) {
          plugin.pendingVarUpdates[varName] = valueToApply;
          plugin.applyPendingNow();
          void plugin.saveSettings();
          return;
        }

        plugin.pendingVarUpdates[varName] = valueToApply;
        void plugin.saveSettings();
        settingTab.updateAccessibilityCheckers();
        setTimeout(() => settingTab.app.workspace.trigger('css-change'), 50);
      };

      textInput.addEventListener('input', (e) => {
        let newColor = (e.target as HTMLInputElement).value;

        if (!RGB_TRIPLET_VARS.has(varName)) {
          newColor = normalizeHexColor(newColor);
        }

        if (plugin.settings.colorUpdateFPS > 0) {
          plugin.pendingVarUpdates[varName] = newColor;
        }
      });

      colorPicker.addEventListener('change', (e) => {
        handleFinalChange((e.target as HTMLInputElement).value);
      });

      textInput.addEventListener('change', (e) => {
        handleFinalChange((e.target as HTMLInputElement).value);
      });

      setting.addExtraButton((button) => {
        button
          .setIcon('eraser')
          .setTooltip(t('tooltips.setTransparent'))
          .onClick(() => {
            const newColor = 'transparent';
            textInput.value = newColor;
            handleFinalChange(newColor);
            settingTab.updateColorPickerAppearance(textInput, colorPicker);
          });
      });

      setting.addExtraButton((button) => {
        button
          .setIcon('reset')
          .setTooltip(t('tooltips.undoChange'))
          .onClick(async () => {
            const profile = plugin.settings.profiles[plugin.settings.activeProfile];
            const history = profile.history?.[varName];

            const themeDefaultValue = themeDefaults[varName] || originalDefaultValue || '#ffffff';

            if (history && history.length > 0) {
              const restoredColor = history.shift();
              const safeRestoredColor = restoredColor ?? themeDefaultValue;

              activeProfileVars[varName] = safeRestoredColor;
              textInput.value = safeRestoredColor;
              settingTab.updateColorPickerAppearance(textInput, colorPicker);

              if (safeRestoredColor.trim() === '') {
                setting.settingEl.classList.remove('is-modified');
                setting.settingEl.classList.add('is-pristine');
                delete activeProfileVars[varName];
              } else {
                setting.settingEl.classList.remove('is-pristine');
                setting.settingEl.classList.add('is-modified');
              }

              await plugin.saveSettings();
              settingTab.updateAccessibilityCheckers();
              new Notice(t('notices.colorRestored', safeRestoredColor));
            } else {
              new Notice(t('notices.noColorHistory'));
            }
          });
      });
    }
  }

  const allDefaultVarNames = new Set(Object.keys(flattenVars(DEFAULT_VARS)));
  const customVars: Record<string, string> = {};

  for (const varName in activeProfileVars) {
    if (!allDefaultVarNames.has(varName)) {
      customVars[varName] = activeProfileVars[varName];
    }
  }

  if (Object.keys(customVars).length > 0) {
    const customSection = createCategorySection(containerEl, t('categories.custom'), 'Custom');

    const activeProfile = plugin.settings.profiles[plugin.settings.activeProfile];

    for (const [varName, varValue] of Object.entries(customVars)) {
      // Get metadata, falling back to defaults if not set
      const meta = activeProfile.customVarMetadata?.[varName];
      const varType = meta?.type || 'color';
      const displayName = meta?.name || varName;
      const displayDesc = meta?.desc || t('categories.customDesc');

      const isModified = varValue !== '';

      const setting = customSection.createSetting().setName(displayName).setDesc(displayDesc);

      setting.settingEl.classList.add('cm-var-row', isModified ? 'is-modified' : 'is-pristine');

      setting.settingEl.dataset.var = varName;
      setting.settingEl.dataset.category = 'Custom';
      setting.nameEl.classList.add('cm-var-name');

      const handleCustomVarChange = (newValue: string) => {
        activeProfile.vars[varName] = newValue;

        if (newValue === '') {
          setting.settingEl.classList.remove('is-modified');
          setting.settingEl.classList.add('is-pristine');
        } else {
          setting.settingEl.classList.remove('is-pristine');
          setting.settingEl.classList.add('is-modified');
        }

        if (plugin.settings.colorUpdateFPS > 0) {
          plugin.pendingVarUpdates[varName] = newValue;
        } else {
          setCssPropsSafe(document.body, {
            [varName]: newValue || null,
          });

          void plugin.saveSettings();
        }

        if (plugin.settings.colorUpdateFPS > 0) {
          void plugin.saveSettings();
        }
      };

      switch (varType) {
        case 'color': {
          const colorPicker = setting.controlEl.createEl('input', {
            type: 'color',
          });
          const textInput = setting.controlEl.createEl('input', {
            type: 'text',
            cls: 'theme-engine-text-input',
          });

          textInput.value = varValue;
          settingTab.updateColorPickerAppearance(textInput, colorPicker);

          colorPicker.addEventListener('input', (e) => {
            const newColor = (e.target as HTMLInputElement).value;
            textInput.value = newColor;
            if (plugin.settings.colorUpdateFPS > 0) {
              plugin.pendingVarUpdates[varName] = newColor;
            }
          });

          colorPicker.addEventListener('change', (e) => {
            handleCustomVarChange((e.target as HTMLInputElement).value);
            settingTab.updateColorPickerAppearance(textInput, colorPicker);
          });

          textInput.addEventListener('change', (e) => {
            const newColor = (e.target as HTMLInputElement).value;
            handleCustomVarChange(newColor);
            settingTab.updateColorPickerAppearance(textInput, colorPicker);
          });

          setting.addExtraButton((button) => {
            button
              .setIcon('eraser')
              .setTooltip(t('tooltips.setTransparent'))
              .onClick(() => {
                const newColor = 'transparent';
                textInput.value = newColor;
                handleCustomVarChange(newColor);
                settingTab.updateColorPickerAppearance(textInput, colorPicker);
              });
          });
          break;
        }

        case 'size': {
          const sizeMatch = varValue.match(/(-?\d*\.?\d+)\s*(px|em|rem|%|vw|vh|auto)?/);

          let numValue = sizeMatch?.[1] || '10';
          let unitValue = sizeMatch?.[2] || 'px';

          if (varValue === 'auto') {
            numValue = '';
            unitValue = 'auto';
          }

          const sizeInput = setting.controlEl.createEl('input', {
            type: 'number',
            cls: 'theme-engine-text-input',
          });
          sizeInput.value = numValue;
          setCssPropsSafe(sizeInput, { width: '80px' });

          const unitDropdown = setting.controlEl.createEl('select', {
            cls: 'dropdown cm-search-small',
          });

          const units = ['px', 'em', 'rem', '%', 'vw', 'vh', 'auto'];
          if (!units.includes(unitValue)) unitValue = 'px';

          units.forEach((unit) => {
            unitDropdown.createEl('option', { text: unit, value: unit });
          });

          unitDropdown.value = unitValue;

          const updateSize = () => {
            const newNum = sizeInput.value || '0';
            const newUnit = unitDropdown.value;

            const newValue = newUnit === 'auto' ? 'auto' : `${newNum}${newUnit}`;
            sizeInput.disabled = newUnit === 'auto';

            handleCustomVarChange(newValue);
          };

          sizeInput.addEventListener('change', updateSize);
          unitDropdown.addEventListener('change', updateSize);

          sizeInput.disabled = unitValue === 'auto';
          break;
        }

        case 'text': {
          setting.controlEl.classList.add('cm-full-width-control');

          const textInputArea = setting.controlEl.createEl('input', {
            type: 'text',
            cls: 'cm-wide-text-input',
          });
          textInputArea.value = varValue;
          textInputArea.placeholder = 'Enter text value...';

          textInputArea.addEventListener('change', (e) => {
            handleCustomVarChange((e.target as HTMLInputElement).value);
          });

          break;
        }

        case 'number': {
          const numInput = setting.controlEl.createEl('input', {
            type: 'number',
            cls: 'theme-engine-text-input',
          });
          numInput.value = varValue;
          setCssPropsSafe(numInput, { width: '100px' });

          numInput.addEventListener('change', (e) => {
            handleCustomVarChange((e.target as HTMLInputElement).value);
          });

          break;
        }

        default: {
          setting.controlEl.classList.add('cm-full-width-control');

          const defaultInput = setting.controlEl.createEl('input', {
            type: 'text',
            cls: 'cm-wide-text-input',
          });
          defaultInput.value = varValue;

          defaultInput.addEventListener('change', (e) => {
            handleCustomVarChange((e.target as HTMLInputElement).value);
          });

          break;
        }
      }

      setting.addExtraButton((button) => {
        button
          .setIcon('trash')
          .setTooltip(t('tooltips.deleteCustomVar'))
          .onClick(async () => {
            delete activeProfile.vars[varName];
            // Remove the property from the DOM
            setCssPropsSafe(document.body, {
              [varName]: null,
            });

            if (activeProfile.customVarMetadata?.[varName]) {
              delete activeProfile.customVarMetadata[varName];
            }
            await plugin.saveSettings();

            // Force redraw of settings tab
            settingTab.display();
          });
      });
    }
  }
}
