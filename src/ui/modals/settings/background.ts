import { App, ButtonComponent, Notice, debounce, requestUrl, Setting } from 'obsidian';
import { t } from '../../../i18n/strings';
import type ThemeEngine from '../../../main';
import type { ThemeEngineSettingTab } from '../../settingsTab';
import { ThemeEngineBaseModal } from '../base';

/**
 * Modal for managing global background settings.
 * Handles switching between image/video modes and configuring processing options like JPG conversion.
 */
export class BackgroundImageSettingsModal extends ThemeEngineBaseModal {
  plugin: ThemeEngine;

  constructor(app: App, plugin: ThemeEngine) {
    super(app, plugin);
  }

  onOpen() {
    super.onOpen();
    this.modalEl.classList.add('theme-engine-modal');
    const { contentEl } = this;
    const activeProfile = this.plugin.settings.profiles[this.plugin.settings.activeProfile];

    contentEl.empty();
    contentEl.createEl('h3', {
      text: t('options.backgroundModalSettingsTitle'),
    });

    // --- Enable/Disable Toggle ---
    new Setting(contentEl)
      .setName(t('options.backgroundEnableName'))
      .setDesc(t('options.backgroundEnableDesc'))
      .addToggle((toggle) => {
        const isCurrentlyEnabled = activeProfile?.backgroundEnabled !== false;
        toggle.setValue(isCurrentlyEnabled).onChange(async (value) => {
          const profile = this.plugin.settings.profiles[this.plugin.settings.activeProfile];
          if (profile) {
            profile.backgroundEnabled = value;
            await this.plugin.saveSettings();
          }
          this.onOpen();
        });
      });

    const settingTypeSetting = new Setting(contentEl).setName(t('options.settingType'));

    let imageButton: ButtonComponent;
    let videoButton: ButtonComponent;

    const imageSettingsEl = contentEl.createDiv('cm-settings-group');
    imageSettingsEl.setCssProps({ display: 'none' });

    const videoSettingsEl = contentEl.createDiv('cm-settings-group');
    videoSettingsEl.setCssProps({ display: 'none' });

    // --- Fill the Image Settings container ---
    new Setting(imageSettingsEl)
      .setName(t('options.convertImagesName'))
      .setDesc(t('options.convertImagesDesc'))
      .addToggle((toggle) => {
        toggle.setValue(activeProfile?.convertImagesToJpg || false).onChange(async (value) => {
          activeProfile.convertImagesToJpg = value;
          if (value && !activeProfile.jpgQuality) {
            activeProfile.jpgQuality = 85;
          }
          await this.plugin.saveSettings();
          this.onOpen();
        });
      });

    if (activeProfile?.convertImagesToJpg === true) {
      new Setting(imageSettingsEl)
        .setName(t('options.jpgQualityName'))
        .setDesc(t('options.jpgQualityDesc'))
        .addSlider((slider) => {
          slider
            .setLimits(1, 100, 1)
            .setValue(activeProfile?.jpgQuality || 85)
            .setDynamicTooltip()
            .onChange((value) => {
              this.debouncedSaveSettings(value);
            });
        });
    }

    // --- Fill the video settings container ---
    new Setting(videoSettingsEl)
      .setName(t('options.videoOpacityName'))
      .setDesc(t('options.videoOpacityDesc'))
      .addSlider((slider) => {
        slider
          .setLimits(0.1, 1, 0.1)
          .setValue(activeProfile.videoOpacity || 0.5)
          .setDynamicTooltip()
          .onChange(async (value) => {
            activeProfile.videoOpacity = value;
            await this.plugin.saveSettings();
          });

        slider.sliderEl.oninput = (e) => {
          const value = parseFloat((e.target as HTMLInputElement).value);
          const videoEl = document.querySelector<HTMLVideoElement>('#cm-background-video');
          if (videoEl) {
            videoEl.setCssProps({ opacity: value.toString() });
          }
        };
      });

    new Setting(videoSettingsEl)
      .setName(t('options.videoMuteName'))
      .setDesc(t('options.videoMuteDesc'))
      .addToggle((toggle) =>
        toggle.setValue(activeProfile.videoMuted !== false).onChange(async (value) => {
          activeProfile.videoMuted = value;
          await this.plugin.saveSettings();

          const videoEl = document.querySelector<HTMLVideoElement>('#cm-background-video');
          if (videoEl) {
            videoEl.muted = value;
          }
        }),
      );

    // --- Attaching buttons to containers ---
    const setActiveButton = (active: 'image' | 'video') => {
      if (active === 'image') {
        imageButton.setCta();
        videoButton.buttonEl.classList.remove('mod-cta');
        imageSettingsEl.setCssProps({ display: 'block' });
        videoSettingsEl.setCssProps({ display: 'none' });
      } else {
        imageButton.buttonEl.classList.remove('mod-cta');
        videoButton.setCta();
        imageSettingsEl.setCssProps({ display: 'none' });
        videoSettingsEl.setCssProps({ display: 'block' });
      }
    };

    settingTypeSetting.addButton((button) => {
      imageButton = button;
      button.setButtonText(t('options.settingTypeImage')).onClick(() => setActiveButton('image'));
    });

    settingTypeSetting.addButton((button) => {
      videoButton = button;
      button.setButtonText(t('options.settingTypeVideo')).onClick(() => setActiveButton('video'));
    });

    const currentType = activeProfile?.backgroundType || 'image';
    setActiveButton(currentType);
  }

  /**
   * Persists JPG quality settings with a debounce to prevent excessive disk I/O.
   */
  debouncedSaveSettings = debounce((value: number) => {
    void (async () => {
      const profile = this.plugin.settings.profiles[this.plugin.settings.activeProfile];

      if (profile) {
        profile.jpgQuality = value;
        await this.plugin.saveSettings();
        new Notice(t('notices.jpgQualitySet', value));
      }
    })().catch((err) => {
      console.error('Failed to save JPG quality:', err);
    });
  }, 0);

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

/**
 * Modal for importing background media via local files, clipboard paste, or drag-and-drop.
 * Handles diverse inputs including Base64 data URLs and remote HTTP links.
 */
export class AddBackgroundModal extends ThemeEngineBaseModal {
  plugin: ThemeEngine;
  settingTab: ThemeEngineSettingTab;

  constructor(app: App, plugin: ThemeEngine, settingTab: ThemeEngineSettingTab) {
    super(app, plugin);
    this.settingTab = settingTab;
  }

  async handlePastedFile(file: File) {
    new Notice(t('notices.pastedImage', file.name));
    await this.processFileWithProgress(file);
  }

  /**
   * Resolves pasted URLs. Supports standard HTTP links and raw Data URLs (Base64).
   */
  async handlePastedUrl(url: string) {
    const pasteBox = this.contentEl.querySelector<HTMLElement>('.cm-paste-box');

    // Handle data URLs directly
    if (url.startsWith('data:image')) {
      try {
        if (pasteBox) {
          pasteBox.textContent = t('modals.addBackground.processing') + '...';
        }
        const response = await requestUrl({ url });
        const arrayBuffer = response.arrayBuffer;
        const contentType = response.headers['content-type'] || 'image/png';
        const fileName = `pasted-image-${Date.now()}.${contentType.split('/')[1]}`;
        new Notice(t('notices.pastedBase64Image'));

        await this.plugin.setBackgroundMedia(arrayBuffer, fileName, 'prompt');
        this.close();
        return;
      } catch (error) {
        new Notice(t('notices.backgroundLoadError'));
        console.error('Theme Engine: Error handling pasted data URL:', error);
        this.close();
        return;
      }
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
      new Notice(t('notices.downloadingFromUrl', url));
      if (pasteBox) {
        pasteBox.textContent = t('modals.addBackground.processing') + '...';
      }
      await this.plugin.setBackgroundMediaFromUrl(url);
      this.close();
      return;
    }
    new Notice(t('notices.pasteError'));
  }

  /**
   * Reads a local file as ArrayBuffer while reporting progress to the UI.
   */
  async processFileWithProgress(file: File) {
    await Promise.resolve();
    const reader = new FileReader();
    const pasteBox = this.contentEl.querySelector<HTMLElement>('.cm-paste-box');

    // Update progress text in paste box
    reader.onprogress = (event) => {
      if (event.lengthComputable && pasteBox) {
        const percent = Math.round((event.loaded / event.total) * 100);
        pasteBox.textContent = t('modals.addBackground.processing') + `${percent}%`;
      }
    };

    // On successful load, pass data to main plugin function
    reader.onload = async () => {
      if (pasteBox) {
        pasteBox.textContent = t('modals.addBackground.processing') + ' 100%';
      }
      const arrayBuffer = reader.result as ArrayBuffer;
      await this.plugin.setBackgroundMedia(arrayBuffer, file.name, 'prompt');
      this.close();
    };

    // Handle read errors
    reader.onerror = () => {
      new Notice(t('notices.backgroundLoadError'));
      this.close();
    };

    // Start reading the file
    if (pasteBox) {
      pasteBox.textContent = t('modals.addBackground.processing') + '0%';
    }
    reader.readAsArrayBuffer(file);
  }

  onOpen() {
    super.onOpen();
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h3', { text: t('modals.addBackground.title') });

    // --- File Import Button ---
    new Setting(contentEl)
      .setName(t('modals.addBackground.importFromFile'))
      .setDesc(t('modals.addBackground.importFromFileDesc'))
      .addButton((button) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*, video/mp4, video/webm';

        button
          .setCta()
          .setButtonText(t('buttons.chooseFile'))
          .onClick(() => {
            input.click();
          });

        input.onchange = async () => {
          if (!input.files || input.files.length === 0) return;
          const file = input.files[0];

          await this.processFileWithProgress(file);
        };
      });

    contentEl.createEl('hr');

    // --- Paste Box (URL or Image via Paste/DragDrop) ---
    const pasteBox = contentEl.createDiv({
      cls: 'cm-paste-box',
      text: t('modals.addBackground.pasteBoxPlaceholder'),
    });
    pasteBox.setAttribute('contenteditable', 'true');

    pasteBox.addEventListener('paste', (event: ClipboardEvent) => {
      event.preventDefault();

      const clipboardData = event.clipboardData;
      if (!clipboardData) return;

      // Check for pasted files first
      if (clipboardData.files && clipboardData.files.length > 0) {
        const file = clipboardData.files[0];
        if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
          void this.handlePastedFile(file).catch((err) => {
            console.error('Failed to handle pasted file:', err);
          });
          return;
        }
      }

      // Check for pasted text (URLs)
      const pastedText = clipboardData.getData('text/plain');
      if (
        pastedText &&
        (pastedText.startsWith('http://') ||
          pastedText.startsWith('https://') ||
          pastedText.startsWith('data:image'))
      ) {
        void this.handlePastedUrl(pastedText).catch((err) => {
          console.error('Failed to handle pasted URL:', err);
        });
        return;
      }
      new Notice(t('notices.backgroundPasteError'));
    });

    // --- Drag and Drop Listeners ---
    pasteBox.addEventListener('dragover', (event: DragEvent) => {
      event.preventDefault(); // Required to allow drop
      pasteBox.classList.add('is-over');
      pasteBox.textContent = t('modals.addBackground.dropToAdd');
    });

    pasteBox.addEventListener('dragleave', () => {
      pasteBox.classList.remove('is-over');
      pasteBox.textContent = t('modals.addBackground.pasteBoxPlaceholder');
    });

    pasteBox.addEventListener('drop', (event: DragEvent) => {
      event.preventDefault();
      pasteBox.classList.remove('is-over');
      pasteBox.textContent = t('modals.addBackground.pasteBoxPlaceholder');

      if (!event.dataTransfer) return;

      // Check for dropped files first
      if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
        const file = event.dataTransfer.files[0];
        if (file.type.startsWith('image/')) {
          void this.handlePastedFile(file);
          return;
        }
      }

      // Check for dropped URLs
      const url =
        event.dataTransfer.getData('text/uri-list') || event.dataTransfer.getData('text/plain');
      if (url && (url.startsWith('http') || url.startsWith('data:image'))) {
        void this.handlePastedUrl(url);
        return;
      }
      new Notice(t('notices.backgroundPasteError'));
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}
