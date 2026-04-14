import { DropdownComponent, SearchComponent, debounce, setIcon } from 'obsidian';
import { DEFAULT_VARS } from '../../constants';
import { t } from '../../i18n/strings';
import type { ThemeEngineSettingTab } from '../settingsTab';

export type SearchState = {
  query: string;
  regex: boolean;
  caseSensitive: boolean;
  section: string;
};

export const clearSearchAndFilters = (tab: ThemeEngineSettingTab): void => {
  if (!tab.searchInput || !tab.sectionSelect) return;

  tab.searchInput.value = '';
  tab.sectionSelect.value = '';

  tab._searchState.query = '';
  tab._searchState.section = '';

  tab.plugin.settings.lastSearchQuery = '';
  tab.plugin.settings.lastSearchSection = '';
  void tab.plugin.saveData(tab.plugin.settings).catch((err) => {
    console.error('Failed to save search input state:', err);
  });

  const filterButton = tab.containerEl.querySelector('button[data-cm-action="filter"]');
  const filterOptionsContainer = tab.containerEl.querySelector('.cm-search-filter-options');

  if (filterButton) filterButton.classList.remove('is-active');
  if (filterOptionsContainer) filterOptionsContainer.classList.add('is-hidden');

  tab._applySearchFilter();
};

export const initSearchUI = (tab: ThemeEngineSettingTab, containerEl: HTMLElement): void => {
  tab._searchState = {
    query: tab.plugin.settings.lastSearchQuery || '',
    regex: false,
    caseSensitive: false,
    section: tab.plugin.settings.lastSearchSection || '',
  };

  const searchShell = containerEl.createDiv({
    cls: 'cm-search-shell',
  });
  tab.searchContainer = searchShell;

  const searchBarContainer = searchShell.createDiv({
    cls: 'cm-search-bar-container',
  });

  const searchInputContainer = searchBarContainer.createDiv({
    cls: 'cm-search-input-container',
  });

  const searchComponent = new SearchComponent(searchInputContainer)
    .setPlaceholder(t('settings.searchPlaceholder'))
    .setValue(tab._searchState.query)
    .onChange((value) => {
      if (tab._searchState.regex) return;
      tab._searchState.query = value;
      tab.plugin.settings.lastSearchQuery = value;
      void tab.plugin.saveData(tab.plugin.settings).catch((err) => {
        console.error('Failed to save search/filter reset state:', err);
      });
      debouncedFilter();
    });

  tab.searchInput = searchComponent.inputEl;

  tab.searchInput.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Enter' && tab._searchState.regex) {
      tab._searchState.query = (event.target as HTMLInputElement).value;
      debouncedFilter();
    }
  });

  const searchActions = searchBarContainer.createDiv({
    cls: 'cm-search-actions',
  });

  tab.caseToggle = searchActions.createEl('button', {
    cls: 'cm-search-action-btn',
  });
  tab.caseToggle.textContent = 'Aa';
  tab.caseToggle.setAttr('aria-label', t('settings.ariaCase'));

  tab.regexToggle = searchActions.createEl('button', {
    cls: 'cm-search-action-btn',
  });
  setIcon(tab.regexToggle, 'regex');
  tab.regexToggle.setAttr('aria-label', t('settings.ariaRegex'));

  const filterOptionsContainer = searchActions.createDiv({
    cls: 'cm-search-filter-options is-hidden',
  });

  const dropdown = new DropdownComponent(filterOptionsContainer)
    .addOption('', t('settings.allSections'))
    .onChange(async (value) => {
      tab._searchState.section = value;

      tab.plugin.settings.lastSearchSection = value;
      await tab.plugin.saveData(tab.plugin.settings);

      filterOptionsContainer.classList.toggle('is-filter-active', value !== '');
      debouncedFilter();
    });

  dropdown.setValue(tab._searchState.section);
  if (tab._searchState.section) {
    filterOptionsContainer.classList.remove('is-hidden');
  }

  try {
    Object.keys(DEFAULT_VARS || {}).forEach((category) => {
      let categoryKey: string;
      const lowerCategory = category.toLowerCase();

      if (lowerCategory === 'interactive elements') categoryKey = 'interactive';
      else if (lowerCategory === 'ui elements') categoryKey = 'ui';
      else if (lowerCategory === 'graph view') categoryKey = 'graph';
      else if (lowerCategory === 'plugin integrations') categoryKey = 'pluginintegrations';
      else categoryKey = lowerCategory.replace(/ /g, '');

      const translatedCategory = t(`categories.${categoryKey}`) || category;
      dropdown.addOption(category, translatedCategory);
    });
  } catch {
    // ignore invalid category translation
  }

  const activeProfile = tab.plugin.settings.profiles[tab.plugin.settings.activeProfile];
  if (activeProfile?.customVarMetadata && Object.keys(activeProfile.customVarMetadata).length > 0) {
    dropdown.addOption('Custom', t('categories.custom'));
  }

  dropdown.selectEl.classList.add('cm-search-small');
  tab.sectionSelect = dropdown.selectEl;

  const filterButton = searchActions.createEl('button', {
    cls: 'cm-search-action-btn',
  });
  setIcon(filterButton, 'sliders-horizontal');
  filterButton.dataset.cmAction = 'filter';

  if (tab._searchState.section) filterButton.classList.add('is-active');

  const debouncedFilter = debounce(() => tab._applySearchFilter(), 180);

  tab.caseToggle.addEventListener('click', () => {
    tab._searchState.caseSensitive = !tab._searchState.caseSensitive;
    tab.caseToggle.toggleClass('is-active', tab._searchState.caseSensitive);
    debouncedFilter();
  });

  tab.regexToggle.addEventListener('click', () => {
    tab._searchState.regex = !tab._searchState.regex;
    tab.regexToggle.toggleClass('is-active', tab._searchState.regex);
    if (tab._searchState.regex) {
      searchComponent.setPlaceholder(t('settings.regexPlaceholder'));
    } else {
      searchComponent.setPlaceholder(t('settings.searchPlaceholder'));
    }
    tab._searchState.query = tab.searchInput.value;
    debouncedFilter();
  });

  filterButton.addEventListener('click', () => {
    if (filterButton.classList.contains('is-active')) {
      tab._clearSearchAndFilters();
    } else {
      filterOptionsContainer.classList.remove('is-hidden');
      filterButton.classList.add('is-active');
    }
  });

  tab.sectionSelect.addEventListener('change', (event: Event) => {
    tab._searchState.section = (event.target as HTMLSelectElement).value;
    debouncedFilter();
  });
};

export const applySearchFilter = (tab: ThemeEngineSettingTab): void => {
  const state = tab._searchState;
  const activeProfile = tab.plugin.settings.profiles[tab.plugin.settings.activeProfile];
  const isSearching = state.query.trim().length > 0 || state.section !== '';
  const rows = Array.from(
    tab.containerEl.querySelectorAll<HTMLElement>('.cm-var-row, .cm-searchable-row'),
  );

  let queryRegex: RegExp | null = null;

  if (state.query && state.query.trim()) {
    if (state.regex) {
      try {
        queryRegex = new RegExp(state.query, state.caseSensitive ? '' : 'i');
      } catch {
        queryRegex = null;
      }
    }
  }

  rows.forEach((row) => {
    const varName = row.dataset.var || '';
    const snippetName = row.dataset.name || '';
    const textInput = row.querySelector<HTMLInputElement>("input[type='text']");
    const varValue = textInput ? textInput.value.trim() : '';

    let displayName = '';
    let description = '';
    const customMeta = activeProfile?.customVarMetadata?.[varName];

    if (customMeta) {
      displayName = customMeta.name;
      description = customMeta.desc;
    } else {
      displayName = t(`colors.names.${varName}`) || snippetName;
      description = t(`colors.descriptions.${varName}`) || '';
    }

    if (state.section && state.section !== row.dataset.category) {
      row.classList.add('cm-hidden');
      return;
    }

    if (state.query && state.query.trim()) {
      const query = state.query.trim();
      let isMatch = false;

      if (state.regex && queryRegex) {
        isMatch =
          queryRegex.test(varName) ||
          queryRegex.test(varValue) ||
          queryRegex.test(displayName) ||
          queryRegex.test(description);
      } else {
        const queryLower = state.caseSensitive ? query : query.toLowerCase();
        const nameLower = state.caseSensitive ? varName : varName.toLowerCase();
        const valueLower = state.caseSensitive ? varValue : varValue.toLowerCase();
        const displayNameLower = state.caseSensitive ? displayName : displayName.toLowerCase();
        const descriptionLower = state.caseSensitive ? description : description.toLowerCase();

        isMatch =
          nameLower.includes(queryLower) ||
          valueLower.includes(queryLower) ||
          displayNameLower.includes(queryLower) ||
          descriptionLower.includes(queryLower);
      }

      if (!isMatch) {
        row.classList.add('cm-hidden');
        return;
      }
    }

    row.classList.remove('cm-hidden');
    tab._highlightRowMatches(row, state);
  });

  const headings = tab.containerEl.querySelectorAll<HTMLElement>('.cm-category-container');
  headings.forEach((heading) => {
    const category = heading.dataset.category;
    const hasVisibleRows = tab.containerEl.querySelector(
      `.cm-var-row[data-category="${category}"]:not(.cm-hidden)`,
    );

    if (hasVisibleRows) {
      heading.classList.remove('cm-hidden');
    } else {
      heading.classList.add('cm-hidden');
    }
  });

  const hasVisibleSearchResults = rows.some((row) => !row.classList.contains('cm-hidden'));
  const showNoResults = isSearching && !hasVisibleSearchResults;

  if (tab.noSearchResultsEl) {
    tab.noSearchResultsEl.classList.toggle('is-hidden', !showNoResults);
  }
  if (tab.likeCardEl) {
    tab.likeCardEl.classList.toggle('is-hidden', showNoResults);
  }
};

export const highlightRowMatches = (row: HTMLElement, state: SearchState): void => {
  const query = state.query.trim();

  const highlightElement = (element: HTMLElement | null) => {
    if (!element) return;

    if (!element.dataset.originalText) {
      element.dataset.originalText = element.textContent || '';
    }
    const originalText = element.dataset.originalText;

    element.empty();

    if (!query) {
      element.setText(originalText);
      return;
    }

    const flags = state.caseSensitive ? 'g' : 'gi';
    let regex: RegExp;

    try {
      regex = state.regex
        ? new RegExp(query, flags)
        : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);

      let lastIndex = 0;
      let match;

      while ((match = regex.exec(originalText)) !== null) {
        if (match.index > lastIndex) {
          element.appendText(originalText.substring(lastIndex, match.index));
        }
        element.createSpan({ cls: 'cm-search-match', text: match[0] });
        lastIndex = regex.lastIndex;
      }

      if (lastIndex < originalText.length) {
        element.appendText(originalText.substring(lastIndex));
      }
    } catch {
      element.setText(originalText);
    }
  };

  const nameEl = row.querySelector<HTMLElement>('.cm-var-name');
  const descEl = row.querySelector<HTMLElement>('.setting-item-description');

  highlightElement(nameEl);
  highlightElement(descEl);
};
