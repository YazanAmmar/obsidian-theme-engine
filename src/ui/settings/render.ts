import { ButtonComponent, Notice, Setting, SettingGroup, debounce, setIcon } from 'obsidian';
import { CORE_LANGUAGES, LocaleCode } from '../../i18n/types';
import { loadLanguage, t } from '../../i18n/strings';
import type { ThemeEngineSettingTab } from '../settingsTab';
import { drawColorPickers } from '../components/color-pickers';
import { drawCssSnippetsUI } from '../components/snippets-ui';
import { drawImportExport } from '../components/import-export';
import { drawLikePluginCard } from '../components/like-plugin-card';
import { drawOptionsSection } from '../components/options-section';
import { drawProfileManager } from '../components/profile-manager';
import {
  AddNewLanguageModal,
  ConfirmationModal,
  LanguageInfoModal,
  LanguageSettingsModal,
  LanguageTranslatorModal,
} from '../modals';

export const renderSettingsTab = async (tab: ThemeEngineSettingTab): Promise<void> => {
  const themeDefaults = await tab.plugin.getThemeDefaults();

  const { containerEl } = tab;
  containerEl.classList.add('theme-engine-settings-tab');
  containerEl.empty();
  containerEl.classList.add('theme-engine-hidden');

  const langCode = tab.plugin.settings.language;
  const customLang = tab.plugin.settings.customLanguages?.[langCode];
  const isCoreRtlLang = langCode === 'ar' || langCode === 'fa';
  const isCustomRtlLang = customLang?.isRtl === true;
  const isRtlCapable = isCoreRtlLang || isCustomRtlLang;
  const isRtlEnabled = tab.plugin.settings.useRtlLayout;
  const isRTL = isRtlCapable && isRtlEnabled;
  const isCustom = !!customLang;
  const isCore = !!CORE_LANGUAGES[langCode as LocaleCode];

  tab.containerEl.setAttribute('dir', isRTL ? 'rtl' : 'ltr');

  const topSettingsContainer = containerEl.createDiv({
    cls: 'cm-top-settings-group',
  });

  let createTopSetting: () => Setting;

  if (typeof SettingGroup === 'function') {
    const topGroup = new SettingGroup(topSettingsContainer);
    topGroup.addClass('cm-native-setting-group');

    createTopSetting = () => {
      let createdSetting: Setting | null = null;
      topGroup.addSetting((setting) => {
        createdSetting = setting;
      });

      if (!createdSetting) {
        console.warn('Theme Engine: Failed to create top setting group item. Falling back.');
        return new Setting(topSettingsContainer);
      }

      return createdSetting;
    };
  } else {
    topSettingsContainer.classList.add('cm-fallback-setting-group');
    const topSettingsBody = topSettingsContainer.createDiv({
      cls: 'cm-setting-group-body',
    });
    createTopSetting = () => new Setting(topSettingsBody);
  }

  createTopSetting()
    .setName(t('settings.enablePlugin'))
    .setDesc(t('settings.enablePluginDesc'))
    .addToggle((toggle) => {
      toggle.setValue(tab.plugin.settings.pluginEnabled).onChange(async (value) => {
        tab.plugin.settings.pluginEnabled = value;

        if (value) {
          tab.plugin.enableObservers();
        } else {
          tab.plugin.disableObservers();
        }

        await tab.plugin.saveSettings();
        tab.plugin.restartColorUpdateLoop();
        new Notice(value ? t('notices.pluginEnabled') : t('notices.pluginDisabled'));
      });
    });

  const languageSetting = createTopSetting()
    .setName(t('settings.language'))
    .setDesc(t('settings.languageDesc'));

  const langIcon = languageSetting.nameEl.createSpan({
    cls: 'cm-setting-icon',
  });
  setIcon(langIcon, 'languages');
  languageSetting.nameEl.prepend(langIcon);

  const flyoutContainer = languageSetting.controlEl.createDiv({
    cls: 'cm-flyout-menu-container',
  });

  const buttonListEl = flyoutContainer.createDiv({
    cls: 'cm-flyout-menu-buttons',
  });

  const triggerBtn = new ButtonComponent(flyoutContainer)
    .setIcon('settings')
    .setTooltip(t('tooltips.langMenu'))
    .setClass('cm-flyout-trigger-btn')
    .onClick(() => {
      buttonListEl.toggleClass('is-open', !buttonListEl.classList.contains('is-open'));
    });
  triggerBtn.buttonEl.classList.add('cm-control-icon-button');

  new ButtonComponent(buttonListEl)
    .setIcon('info')
    .setTooltip(t('tooltips.langInfo'))
    .setClass('cm-control-icon-button')
    .onClick(() => {
      new LanguageInfoModal(tab.app, tab.plugin).open();
    });

  new ButtonComponent(buttonListEl)
    .setIcon('pencil')
    .setTooltip(t('tooltips.editLang'))
    .setClass('cm-control-icon-button')
    .onClick(() => {
      const selectedLangCode = tab.plugin.settings.language;
      new LanguageTranslatorModal(tab.app, tab.plugin, tab, selectedLangCode).open();
    });

  new ButtonComponent(buttonListEl)
    .setIcon('plus')
    .setTooltip(t('modals.addLang.title'))
    .setClass('cm-control-icon-button')
    .onClick(() => {
      new AddNewLanguageModal(tab.app, tab.plugin, tab).open();
    });

  if (isRtlCapable) {
    new ButtonComponent(buttonListEl)
      .setIcon('settings-2')
      .setTooltip(t('settings.languageSettingsModalTitle'))
      .setClass('cm-control-icon-button')
      .onClick(() => {
        new LanguageSettingsModal(tab.app, tab.plugin).open();
      });
  }

  if (isCore && isCustom) {
    const restoreBtn = new ButtonComponent(buttonListEl)
      .setIcon('history')
      .setTooltip(t('tooltips.restoreDefaultLang'))
      .setClass('mod-warning')
      .onClick(() => {
        new ConfirmationModal(
          tab.app,
          tab.plugin,
          t('modals.confirmation.restoreLangTitle'),
          t('modals.confirmation.restoreLangDesc', CORE_LANGUAGES[langCode as LocaleCode]),
          () => {
            void (async () => {
              if (tab.plugin.settings.customLanguages) {
                delete tab.plugin.settings.customLanguages[langCode];
                loadLanguage(tab.plugin.settings);
                await tab.plugin.saveSettings();
                tab.display();
                new Notice(t('notices.langRestored'));
              }
            })().catch((err) => {
              console.error('Failed to restore language:', err);
            });
          },
          { buttonText: t('buttons.restore'), buttonClass: 'mod-warning' },
        ).open();
      });
    restoreBtn.buttonEl.classList.add('cm-control-icon-button');
  }

  if (isCustom && !isCore) {
    const deleteBtn = new ButtonComponent(buttonListEl)
      .setIcon('trash')
      .setTooltip(t('buttons.delete') + ` (${customLang.languageName})`)
      .setClass('mod-warning')
      .onClick(() => {
        new ConfirmationModal(
          tab.app,
          tab.plugin,
          t('modals.confirmation.deleteLangTitle'),
          t('modals.confirmation.deleteLangDesc', customLang.languageName),
          () => {
            void (async () => {
              if (!tab.plugin.settings.customLanguages) return;
              delete tab.plugin.settings.customLanguages[langCode];
              tab.plugin.settings.language = 'en';
              loadLanguage(tab.plugin.settings);
              await tab.plugin.saveSettings();
              tab.display();
              new Notice(t('notices.langDeleted', customLang.languageName));
            })().catch((err) => {
              console.error('Failed to delete custom language:', err);
            });
          },
          { buttonText: t('buttons.delete'), buttonClass: 'mod-warning' },
        ).open();
      });
    deleteBtn.buttonEl.classList.add('cm-control-icon-button');
  }

  languageSetting.addDropdown((dropdown) => {
    const customLangs = tab.plugin.settings.customLanguages || {};

    for (const code in CORE_LANGUAGES) {
      let displayName = CORE_LANGUAGES[code as LocaleCode];
      if (customLangs[code]) {
        displayName = customLangs[code].languageName;
      }
      dropdown.addOption(code, displayName);
    }

    const customCodes = Object.keys(customLangs);
    for (const code of customCodes) {
      if (CORE_LANGUAGES[code as LocaleCode]) continue;

      const langName = customLangs[code].languageName;
      dropdown.addOption(code, langName);
    }

    dropdown.setValue(tab.plugin.settings.language);
    dropdown.onChange(async (value) => {
      tab.plugin.settings.language = value;
      loadLanguage(tab.plugin.settings);

      await tab.plugin.saveSettings();
      tab.display();
    });
  });

  tab.staticContentContainer = containerEl.createDiv({
    cls: 'cm-static-sections',
  });
  drawProfileManager(tab.staticContentContainer, tab);
  drawImportExport(tab.staticContentContainer, tab);
  drawOptionsSection(tab.staticContentContainer, tab);
  tab.staticContentContainer.createEl('hr');
  drawCssSnippetsUI(tab.staticContentContainer, tab);
  containerEl.createEl('hr', { cls: 'cm-search-divider' });
  tab.initSearchUI(containerEl);
  drawColorPickers(tab.containerEl, tab, themeDefaults);
  containerEl.createEl('hr');

  const noResultsBadge = containerEl.createDiv({
    cls: 'cm-search-empty-badge is-hidden',
  });
  const noResultsIcon = noResultsBadge.createDiv({
    cls: 'cm-search-empty-icon',
  });
  setIcon(noResultsIcon, 'search-x');
  noResultsBadge.createDiv({
    cls: 'cm-search-empty-title',
    text: t('settings.noResultsFound'),
  });
  noResultsBadge.createDiv({
    cls: 'cm-search-empty-subtitle',
    text: t('settings.noResultsHint'),
  });
  tab.noSearchResultsEl = noResultsBadge;

  tab.likeCardEl = drawLikePluginCard(containerEl, tab);

  tab._applySearchFilter();

  if (tab._searchState.query) {
    setTimeout(() => {
      const firstVisibleRow = tab.containerEl.querySelector<HTMLElement>(
        '.cm-var-row:not(.cm-hidden)',
      );

      if (firstVisibleRow) {
        firstVisibleRow.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }, 0);
  }
  const scrollContainer = tab.containerEl.closest<HTMLElement>('.vertical-tab-content');

  if (!scrollContainer) {
    console.warn('Theme Engine: Could not find scroll container.');
  } else {
    const debouncedScrollSave = debounce(() => {
      tab.plugin.settings.lastScrollPosition = scrollContainer.scrollTop;
      void tab.plugin.saveData(tab.plugin.settings).catch((err) => {
        console.error('Failed to save scroll position:', err);
      });
    }, 200);

    tab.plugin.registerDomEvent(scrollContainer, 'scroll', debouncedScrollSave);

    if (!tab._searchState.query && tab.plugin.settings.lastScrollPosition) {
      scrollContainer.scrollTo({
        top: tab.plugin.settings.lastScrollPosition,
        behavior: 'auto',
      });
    }
  }

  containerEl.classList.remove('theme-engine-hidden');
};
