import {
  App,
  Notice,
  SearchComponent,
  debounce,
  setIcon,
  Setting,
  TextAreaComponent,
  TextComponent,
} from 'obsidian';
import {
  CORE_LOCALES,
  flattenStrings,
  getFallbackStrings,
  loadLanguage,
  t,
} from '../../../i18n/strings';
import { CORE_LANGUAGES, type LocaleCode, type LocalizedValue } from '../../../i18n/types';
import type ThemeEngine from '../../../main';
import type { CustomTranslation } from '../../../types';
import { unflattenStrings } from '../../../utils';
import type { ThemeEngineSettingTab } from '../../settingsTab';
import { ThemeEngineBaseModal } from '../base';

/**
 * Advanced Language Translator supporting recursive tree-view rendering and delta-saving.
 * Designed to handle nested i18n structures efficiently.
 */
export class LanguageTranslatorModal extends ThemeEngineBaseModal {
  settingTab: ThemeEngineSettingTab;
  langCode: string;
  langName: string;
  translations: CustomTranslation;
  fallbackStrings: Record<string, LocalizedValue>;
  nestedFallback: Record<string, LocalizedValue | Record<string, unknown>>;
  listContainer: HTMLElement;
  isCoreLanguage: boolean;
  isRtl: boolean = false;
  searchQuery: string = '';
  caseSensitive: boolean = false;
  filterMissing: boolean = false;
  searchInput: HTMLInputElement;
  debouncedRender: () => void;

  constructor(app: App, plugin: ThemeEngine, settingTab: ThemeEngineSettingTab, langCode: string) {
    super(app, plugin);
    this.settingTab = settingTab;
    this.langCode = langCode;
    this.fallbackStrings = getFallbackStrings();

    // Cache nested structure once to avoid overhead during render loops
    this.nestedFallback = unflattenStrings(this.fallbackStrings as CustomTranslation) as Record<
      string,
      LocalizedValue | Record<string, unknown>
    >;

    const customLangData = this.plugin.settings.customLanguages?.[langCode];
    const coreLangNameString = CORE_LANGUAGES[langCode as LocaleCode];

    // Handle Core Languages smarter (Base + Overrides)
    if (coreLangNameString) {
      this.isCoreLanguage = true;
      this.langName = coreLangNameString;

      const flatCoreLang = flattenStrings(
        CORE_LOCALES[langCode as LocaleCode] as unknown as Record<string, unknown>,
      );
      const baseStrings: CustomTranslation = {};
      for (const key in flatCoreLang) {
        if (typeof flatCoreLang[key] === 'string') baseStrings[key] = flatCoreLang[key];
      }

      if (customLangData && customLangData.translations) {
        this.translations = { ...baseStrings, ...customLangData.translations };
        this.isRtl = customLangData.isRtl ?? (langCode === 'ar' || langCode === 'fa');
      } else {
        this.translations = baseStrings;
        this.isRtl = langCode === 'ar' || langCode === 'fa';
      }
    } else if (customLangData) {
      this.langName = customLangData.languageName;
      this.translations = JSON.parse(JSON.stringify(customLangData.translations || {}));
      this.isCoreLanguage = false;
      this.isRtl = customLangData.isRtl || false;
    } else {
      this.langName = langCode;
      this.translations = {};
      this.isCoreLanguage = false;
    }
  }

  onOpen() {
    super.onOpen();
    const { contentEl } = this;
    contentEl.empty();
    this.modalEl.classList.add(
      'theme-engine-modal',
      'cm-translator-modal',
      'cm-translator-tree-modal',
    );

    contentEl.createEl('h3', {
      text: t('modals.translator.title', this.langName),
    });

    this.debouncedRender = debounce(() => {
      this.renderTranslationTree();
    }, 250);

    this.renderControls(contentEl);
    this.listContainer = contentEl.createDiv('cm-translator-list');
    this.renderTranslationTree();

    const mainControls = new Setting(contentEl)
      .addButton((button) => {
        button
          .setButtonText(t('buttons.apply'))
          .setCta()
          .onClick(() => this.handleSave());
      })
      .addButton((button) => {
        button.setButtonText(t('buttons.cancel')).onClick(() => this.close());
      });
    mainControls.settingEl.classList.add('cm-translator-main-controls', 'modal-button-container');
  }

  /**
   * Renders the top bar: Search input, filter toggles, and JSON IO actions.
   */
  renderControls(containerEl: HTMLElement) {
    const controlsEl = containerEl.createDiv('cm-translator-controls');

    const searchBarContainer = controlsEl.createDiv({
      cls: 'cm-search-bar-container',
    });

    const searchComponent = new SearchComponent(searchBarContainer)
      .setPlaceholder(t('modals.translator.searchPlaceholder'))
      .setValue(this.searchQuery)
      .onChange((value) => {
        this.searchQuery = value;
        this.debouncedRender();
      });

    this.searchInput = searchComponent.inputEl;

    searchBarContainer.addClass('cm-search-input-container');

    const searchActions = searchBarContainer.createDiv({
      cls: 'cm-search-actions',
    });

    const caseToggle = searchActions.createEl('button', {
      cls: 'cm-search-action-btn',
      text: 'Aa',
    });
    caseToggle.setAttr('aria-label', t('settings.ariaCase'));
    caseToggle.classList.toggle('is-active', this.caseSensitive);
    caseToggle.addEventListener('click', () => {
      this.caseSensitive = !this.caseSensitive;
      caseToggle.classList.toggle('is-active', this.caseSensitive);
      this.debouncedRender();
    });

    const missingToggle = searchActions.createEl('button', {
      cls: 'cm-search-action-btn',
    });
    setIcon(missingToggle, 'filter');
    missingToggle.setAttr('aria-label', t('modals.translator.showMissing'));
    missingToggle.classList.toggle('is-active', this.filterMissing);
    missingToggle.addEventListener('click', () => {
      this.filterMissing = !this.filterMissing;
      missingToggle.classList.toggle('is-active', this.filterMissing);
      this.debouncedRender();
    });

    const ioControls = controlsEl.createDiv('cm-translator-io-controls');

    new Setting(ioControls)
      .addButton((btn) =>
        btn
          .setIcon('copy')
          .setTooltip(t('modals.translator.copyJson'))
          .onClick(() => this._copyJson()),
      )
      .addButton((btn) =>
        btn
          .setIcon('paste')
          .setTooltip(t('modals.translator.pasteJson'))
          .onClick(() => this._pasteJson()),
      )
      .addButton((btn) =>
        btn
          .setIcon('download')
          .setTooltip(t('modals.translator.importFile'))
          .onClick(() => this._importLanguageFile()),
      )
      .addButton((btn) =>
        btn
          .setIcon('upload')
          .setTooltip(t('modals.translator.exportFile'))
          .onClick(() => this._exportLanguageFile()),
      );
  }

  renderTranslationTree() {
    this.listContainer.empty();

    const counter = { index: 1 };
    const query = this.caseSensitive ? this.searchQuery : this.searchQuery.toLowerCase();

    const totalRendered = this.renderGroup(
      this.listContainer,
      this.nestedFallback,
      '',
      counter,
      query,
    );

    if (totalRendered === 0 && (this.searchQuery || this.filterMissing)) {
      this.listContainer.createEl('p', {
        cls: 'cm-translator-empty',
        text: t('modals.translator.noMatches'),
      });
    }
  }

  /**
   * Core Recursive Renderer: Recursively iterates through the nested fallback structure
   * to build the UI hierarchy (Groups as <details>, Items as inputs).
   */
  renderGroup(
    container: HTMLElement,
    fallbackGroup: Record<string, unknown>,
    path: string,
    counter: { index: number },
    query: string,
  ): number {
    let itemsRenderedInThisGroup = 0;

    const keys = Object.keys(fallbackGroup).sort((a, b) => {
      const aVal = fallbackGroup[a];
      const bVal = fallbackGroup[b];
      const aIsObj = typeof aVal === 'object' && aVal !== null;
      const bIsObj = typeof bVal === 'object' && bVal !== null;

      if (aIsObj && !bIsObj) return -1;
      if (!aIsObj && bIsObj) return 1;
      return a.localeCompare(b);
    });

    for (const key of keys) {
      const newPath = path ? `${path}.${key}` : key;
      const fallbackValue = fallbackGroup[key];
      const currentValue = this.translations[newPath];

      const keyStr = this.caseSensitive ? key : key.toLowerCase();

      let displayFallback = '';
      if (typeof fallbackValue === 'string') {
        displayFallback = fallbackValue;
      } else if (typeof fallbackValue === 'function') {
        displayFallback = t('modals.translator.dynamicValue');
      }

      const fallbackStr = this.caseSensitive ? displayFallback : displayFallback.toLowerCase();

      const valStr =
        typeof currentValue === 'string'
          ? this.caseSensitive
            ? currentValue
            : currentValue.toLowerCase()
          : '';

      const isMatch =
        !query || keyStr.includes(query) || fallbackStr.includes(query) || valStr.includes(query);

      if (typeof fallbackValue === 'object' && fallbackValue !== null) {
        const details = container.createEl('details', {
          cls: 'cm-translator-group',
        });
        const summary = details.createEl('summary', {
          cls: 'cm-translator-group-title',
        });
        summary.createSpan({ text: key });

        const groupContainer = details.createDiv('cm-translator-group-content');

        const childrenCount = this.renderGroup(
          groupContainer,
          fallbackValue as Record<string, unknown>,
          newPath,
          counter,
          query,
        );

        if (childrenCount > 0) {
          itemsRenderedInThisGroup += childrenCount;
          if (query || this.filterMissing) {
            details.open = true;
          }
        } else {
          details.remove();
        }
      } else if (typeof fallbackValue === 'string' || typeof fallbackValue === 'function') {
        const isMissing = !currentValue;
        const matchesFilter = !this.filterMissing || isMissing;

        if (matchesFilter && isMatch) {
          itemsRenderedInThisGroup++;

          const itemEl = container.createDiv({
            cls: 'cm-translator-item setting-item',
          });
          itemEl.createSpan({
            cls: 'cm-translator-index',
            text: `${counter.index++}.`,
          });

          const infoEl = itemEl.createDiv('setting-item-info');
          const nameEl = infoEl.createDiv('setting-item-name cm-translator-key');

          const keySpan = nameEl.createSpan();
          this.highlightMatch(keySpan, key, query);

          const descEl = infoEl.createDiv({
            cls: 'setting-item-description',
          });

          const isLongText = displayFallback.length > 100;
          const isDesc =
            newPath.endsWith('.desc') || newPath.endsWith('Desc') || newPath.includes('langInfo');

          if (isDesc && isLongText) {
            const truncatedText = displayFallback.substring(0, 100) + '...';

            this.highlightMatch(descEl, truncatedText, query);

            const toggleBtn = infoEl.createEl('a', {
              cls: 'cm-translator-toggle',
              text: t('modals.translator.showMore'),
            });

            let isExpanded = false;
            toggleBtn.onclick = () => {
              isExpanded = !isExpanded;
              const textToShow = isExpanded ? displayFallback : truncatedText;

              this.highlightMatch(descEl, textToShow, query);

              toggleBtn.setText(
                isExpanded ? t('modals.translator.showLess') : t('modals.translator.showMore'),
              );
            };
          } else {
            this.highlightMatch(descEl, displayFallback, query);
          }

          const controlEl = itemEl.createDiv('setting-item-control');

          const isMultiLine = this.isLongString(displayFallback);
          const component = isMultiLine
            ? new TextAreaComponent(controlEl)
            : new TextComponent(controlEl);

          component
            .setValue(currentValue || '')
            .setPlaceholder(displayFallback)
            .onChange((value) => {
              if (value) {
                this.translations[newPath] = value;
              } else {
                delete this.translations[newPath];
              }
            });
        }
      }
    }
    return itemsRenderedInThisGroup;
  }

  /**
   * Utility for visual highlighting of search matches using regex and span wrapping.
   */
  highlightMatch(element: HTMLElement, text: string, query: string) {
    element.empty();

    if (!query) {
      element.setText(text);
      return;
    }

    try {
      const flags = this.caseSensitive ? 'g' : 'gi';
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedQuery, flags);

      let lastIndex = 0;
      let match;

      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          element.appendText(text.substring(lastIndex, match.index));
        }
        element.createSpan({ cls: 'cm-theme-engine-search-match', text: match[0] });

        lastIndex = regex.lastIndex;
      }

      if (lastIndex < text.length) {
        element.appendText(text.substring(lastIndex));
      }
    } catch {
      element.setText(text);
    }
  }

  isLongString(str: string): boolean {
    return str.length > 50 || str.includes('\n');
  }

  async handleSave() {
    if (!this.plugin.settings.customLanguages) {
      this.plugin.settings.customLanguages = {};
    }

    let finalTranslations = this.translations;

    if (this.isCoreLanguage) {
      const flatCoreLang = flattenStrings(
        CORE_LOCALES[this.langCode as LocaleCode] as unknown as Record<string, unknown>,
      );
      const diffs: CustomTranslation = {};

      for (const key in this.translations) {
        const currentValue = this.translations[key];
        const originalValue = flatCoreLang[key];

        if (currentValue !== originalValue && currentValue !== undefined) {
          diffs[key] = currentValue;
        }
      }

      finalTranslations = diffs;
    }

    const finalLangName = this.langName;

    this.plugin.settings.customLanguages[this.langCode] = {
      languageName: finalLangName,
      translations: finalTranslations,
      isRtl: this.isRtl,
    };
    await this.plugin.saveSettings();

    if (this.plugin.settings.language === this.langCode) {
      loadLanguage(this.plugin.settings);
    }

    new Notice(t('notices.langSaved', this.langName));
    this.settingTab.display();
    this.close();
  }

  _exportLanguageFile() {
    const nestedData = unflattenStrings(this.translations);
    const data = JSON.stringify(nestedData, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.langCode}.json`;
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
    new Notice(t('notices.langExported', this.langCode));
  }

  _importLanguageFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = () => {
      void (async () => {
        if (!input.files || input.files.length === 0) return;
        const file = input.files[0];

        try {
          const content = await file.text();
          const nestedJson = JSON.parse(content);
          const importedTranslations = flattenStrings(nestedJson) as CustomTranslation;

          this.translations = {
            ...this.translations,
            ...importedTranslations,
          };

          new Notice(t('notices.langImported', file.name));
          this.renderTranslationTree();
        } catch (e) {
          new Notice(t('notices.invalidJson'));
          console.error('Failed to import language file:', e);
        }
      })().catch((err) => {
        console.error('Unhandled file import error:', err);
      });
    };

    input.click();
  }

  _copyJson() {
    const nestedData = unflattenStrings(this.translations);
    const jsonText = JSON.stringify(nestedData, null, 2);

    void navigator.clipboard.writeText(jsonText).catch((err) => {
      console.error('Failed to copy JSON to clipboard:', err);
    });

    new Notice(t('notices.langCopiedJson'));
  }

  /**
   * Pastes JSON from clipboard and selectively updates keys that exist in the fallback schema.
   */
  _pasteJson(): void {
    void (async () => {
      try {
        const pastedText = await navigator.clipboard.readText();
        if (!pastedText) return;

        const nestedJson = JSON.parse(pastedText);
        const parsedJson = flattenStrings(nestedJson) as CustomTranslation;

        let updateCount = 0;
        for (const key in parsedJson) {
          if (Object.prototype.hasOwnProperty.call(parsedJson, key)) {
            if (this.fallbackStrings[key] !== undefined) {
              this.translations[key] = parsedJson[key];
              updateCount++;
            }
          }
        }

        new Notice(t('notices.langPastedJson', updateCount));
        this.renderTranslationTree();
      } catch (e) {
        new Notice(t('notices.invalidJson'));
        console.error('Failed to paste JSON from clipboard:', e);
      }
    })().catch((err) => {
      console.error('Unhandled paste JSON error:', err);
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}
