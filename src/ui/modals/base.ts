import { App, Modal, getLanguage } from 'obsidian';
import type ThemeEngine from '../../main';

/**
 * A new Base Modal that all Theme Engine modals should extend from.
 * It automatically handles applying the correct RTL/LTR direction.
 */
export class ThemeEngineBaseModal extends Modal {
  plugin: ThemeEngine;

  constructor(app: App, plugin: ThemeEngine) {
    super(app);
    this.plugin = plugin;
    this.modalEl.classList.add('theme-engine-modal', 'color-master-modal');
  }

  /**
   * Overridden onOpen to apply RTL settings automatically.
   * Child classes MUST call super.onOpen() if they override this.
   */
  onOpen() {
    const langCode = getLanguage();
    const customLang = this.plugin.settings.customLanguages?.[langCode];
    const isCoreRtlLang = langCode === 'ar' || langCode === 'fa';
    const isCustomRtlLang = customLang?.isRtl === true;
    const isRtlEnabled = this.plugin.settings.useRtlLayout;
    const isRTL = (isCoreRtlLang || isCustomRtlLang) && isRtlEnabled;

    this.modalEl.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
  }
}
