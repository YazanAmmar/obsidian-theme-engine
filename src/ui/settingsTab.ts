import { App, ButtonComponent, Notice, PluginSettingTab } from 'obsidian';
import Sortable from 'sortablejs';
import { DEFAULT_VARS, TEXT_TO_BG_MAP } from '../constants';
import { t } from '../i18n/strings';
import type ThemeEngine from '../main';
import { flattenVars, getAccessibilityRating, getContrastRatio } from '../utils';
import { renderSettingsTab } from './settings/render';
import {
  applySearchFilter as applySearchFilterCore,
  clearSearchAndFilters,
  highlightRowMatches as highlightRowMatchesCore,
  initSearchUI as initSearchUICore,
  type SearchState,
} from './settings/search';

export class ThemeEngineSettingTab extends PluginSettingTab {
  plugin: ThemeEngine;
  searchContainer: HTMLElement;
  searchInput: HTMLInputElement;
  caseToggle: HTMLButtonElement;
  regexToggle: HTMLButtonElement;
  sectionSelect: HTMLSelectElement;
  _searchState: SearchState;
  staticContentContainer: HTMLDivElement;
  resetPinBtn: ButtonComponent | null = null;
  pinBtn: ButtonComponent | null = null;
  snippetSortable: Sortable | null;
  likeCardEl: HTMLElement | null = null;
  noSearchResultsEl: HTMLElement | null = null;

  constructor(app: App, plugin: ThemeEngine) {
    super(app, plugin);
    this.plugin = plugin;
    this.snippetSortable = null;
  }

  updateColorPickerAppearance(textInput: HTMLInputElement, colorPicker: HTMLInputElement) {
    const value = textInput.value.toLowerCase().trim();

    if (value === 'transparent' || value === '') {
      colorPicker.classList.add('is-transparent');
      colorPicker.value = '#ffffff';
    } else if (/^\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}$/.test(value)) {
      colorPicker.classList.remove('is-transparent');

      const [rRaw, gRaw, bRaw] = value.split(',').map((v) => Number.parseInt(v.trim(), 10));
      const r = Math.min(255, Math.max(0, Number.isNaN(rRaw) ? 0 : rRaw));
      const g = Math.min(255, Math.max(0, Number.isNaN(gRaw) ? 0 : gRaw));
      const b = Math.min(255, Math.max(0, Number.isNaN(bRaw) ? 0 : bRaw));
      const rgbHex = `#${[r, g, b]
        .map((channel) => channel.toString(16).padStart(2, '0'))
        .join('')}`;

      try {
        colorPicker.value = rgbHex;
      } catch {
        colorPicker.value = '#ffffff';
      }
    } else if (value.startsWith('#') && (value.length === 9 || value.length === 5)) {
      colorPicker.classList.remove('is-transparent');

      let rgbHex = '#ffffff';
      if (value.length === 9) {
        rgbHex = value.substring(0, 7);
      } else if (value.length === 5) {
        const r = value[1];
        const g = value[2];
        const b = value[3];
        rgbHex = `#${r}${r}${g}${g}${b}${b}`;
      }

      try {
        colorPicker.value = rgbHex;
      } catch {
        console.warn(`Theme Engine: Invalid HEX for color picker: ${rgbHex}`);
        colorPicker.value = '#ffffff';
      }
    } else {
      colorPicker.classList.remove('is-transparent');
      try {
        colorPicker.value = value;
      } catch {
        colorPicker.value = '#ffffff';
      }
    }
  }

  _clearSearchAndFilters() {
    clearSearchAndFilters(this);
  }

  initSearchUI(containerEl: HTMLElement) {
    initSearchUICore(this, containerEl);
  }

  _applySearchFilter() {
    applySearchFilterCore(this);
  }

  _highlightRowMatches(row: HTMLElement, state: SearchState) {
    highlightRowMatchesCore(row, state);
  }

  _updatePinButtons() {
    const name = this.plugin.settings.activeProfile;
    const snapshot = this.plugin.settings.pinnedSnapshots?.[name];

    if (this.resetPinBtn) {
      this.resetPinBtn.setTooltip(t('tooltips.resetToPinned')).setDisabled(!snapshot);
    }

    if (this.pinBtn) {
      if (snapshot && snapshot.pinnedAt) {
        const dateObj = new Date(snapshot.pinnedAt);
        const year = dateObj.getFullYear();
        const month = dateObj.getMonth() + 1;
        const day = dateObj.getDate();
        const formattedDate = `${year}-${month}-${day}`;

        this.pinBtn.setTooltip(t('tooltips.pinSnapshotDate', formattedDate));
      } else {
        this.pinBtn.setTooltip(t('tooltips.pinSnapshot'));
      }
    }
  }

  _getCurrentProfileJson() {
    const profile = this.plugin.settings.profiles?.[this.plugin.settings.activeProfile];
    if (!profile) return null;
    return {
      name: this.plugin.settings.activeProfile,
      exportedAt: new Date().toISOString(),
      profile,
    };
  }

  async _copyProfileToClipboard() {
    const payload = this._getCurrentProfileJson();
    if (!payload) {
      new Notice(t('notices.noActiveProfileToCopy'));
      return;
    }
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    new Notice(t('notices.jsonCopied'));
  }

  _exportProfileToFile() {
    const payload = this._getCurrentProfileJson();
    if (!payload) {
      new Notice(t('notices.noActiveProfileToExport'));
      return;
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.download = `${this.plugin.settings.activeProfile}.profile.json`;
    anchor.href = url;
    anchor.click();
    URL.revokeObjectURL(url);
    anchor.remove();
    new Notice(t('notices.exportSuccess'));
  }

  updateAccessibilityCheckers() {
    const activeProfileVars =
      this.plugin.settings.profiles[this.plugin.settings.activeProfile].vars;
    const allDefaultVars = flattenVars(DEFAULT_VARS);

    const checkerElements = this.containerEl.querySelectorAll('.cm-accessibility-checker');

    checkerElements.forEach((checkerEl) => {
      const varName = (checkerEl as HTMLElement).dataset.varName;
      if (!varName) return;

      const bgVarForTextColor = TEXT_TO_BG_MAP[varName as keyof typeof TEXT_TO_BG_MAP];
      if (!bgVarForTextColor) return;

      let textColor = activeProfileVars[varName] || allDefaultVars[varName];
      let bgColor = activeProfileVars[bgVarForTextColor] || allDefaultVars[bgVarForTextColor];

      if (varName === '--text-highlight-bg') {
        [textColor, bgColor] = [bgColor, textColor];
      }

      const ratio = getContrastRatio(bgColor, textColor);
      const rating = getAccessibilityRating(ratio);

      checkerEl.className = `cm-accessibility-checker ${rating.cls}`;
      checkerEl.setText(`${rating.text} (${rating.score})`);
    });
  }

  display(): void {
    void this.renderDisplay().catch((err) => {
      console.error('Error in SettingsTab.renderDisplay:', err);
    });
  }

  private async renderDisplay(): Promise<void> {
    await renderSettingsTab(this);
  }
}
