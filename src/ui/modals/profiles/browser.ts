import { App, ButtonComponent, Notice, setIcon } from 'obsidian';
import { getBackgroundsPath } from '../../../core/background-media';
import { t } from '../../../i18n/strings';
import type ThemeEngine from '../../../main';
import { setCssPropsSafe } from '../../../utils';
import type { ThemeEngineSettingTab } from '../../settingsTab';
import { ThemeEngineBaseModal } from '../base';
import { ConfirmationModal } from '../common/confirmation';

/**
 * Media browser for background management.
 * Supports: Image/Video previews, exclusive playback, in-place renaming, and dependency-aware deletion.
 */
export class ProfileImageBrowserModal extends ThemeEngineBaseModal {
  plugin: ThemeEngine;
  settingTab: ThemeEngineSettingTab;
  closeCallback: () => void;
  galleryEl: HTMLElement;
  private videoPlayers: HTMLVideoElement[] = [];

  constructor(
    app: App,
    plugin: ThemeEngine,
    settingTab: ThemeEngineSettingTab,
    closeCallback: () => void,
  ) {
    super(app, plugin);
    this.settingTab = settingTab;
    this.closeCallback = closeCallback;
  }

  onOpen(): void {
    super.onOpen();
    const { contentEl } = this;
    contentEl.empty();
    this.videoPlayers = [];
    contentEl.createEl('h3', { text: t('modals.backgroundBrowser.title') });

    this.galleryEl = contentEl.createDiv({ cls: 'cm-image-gallery' });

    void this._renderImages().catch((err) => {
      console.error('Failed to render images:', err);
    });
  }

  private async _renderImages(): Promise<void> {
    await this.displayImages();
  }

  /**
   * Scans the backgrounds folder and renders media cards.
   * Uses DocumentFragment to optimize DOM performance.
   */
  async displayImages() {
    this.galleryEl.empty();
    const backgroundsPath = getBackgroundsPath(this.plugin);
    const mediaExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.mp4', '.webm'];

    let files: string[] = [];
    try {
      if (await this.app.vault.adapter.exists(backgroundsPath)) {
        const list = await this.app.vault.adapter.list(backgroundsPath);
        files = list.files;
      }
    } catch (e) {
      console.warn('Theme Engine: Error listing background folder.', e);
    }

    const mediaFiles = files.filter((path) =>
      mediaExtensions.some((ext) => path.toLowerCase().endsWith(ext)),
    );

    if (mediaFiles.length === 0) {
      this.galleryEl.createDiv({
        cls: 'cm-image-browser-empty',
        text: t('modals.backgroundBrowser.noImages'),
      });
      return;
    }

    const activeProfile = this.plugin.settings.profiles[this.plugin.settings.activeProfile];
    const activeMediaPath = activeProfile?.backgroundPath;

    const splitName = (fullFileName: string) => {
      const decoded = decodeURIComponent(fullFileName || '');
      const lastDot = decoded.lastIndexOf('.');
      if (lastDot > 0 && lastDot < decoded.length - 1) {
        return {
          basename: decoded.substring(0, lastDot),
          ext: decoded.substring(lastDot),
        };
      }
      return { basename: decoded, ext: '' };
    };

    const fragment = document.createDocumentFragment();

    for (const mediaPath of mediaFiles) {
      const cardEl = document.createElement('div');
      cardEl.className = 'cm-image-card';
      if (mediaPath === activeMediaPath) cardEl.classList.add('is-active');

      const mediaUrl = this.app.vault.adapter.getResourcePath(mediaPath);
      const fileName = mediaPath.split('/').pop();
      const isVideo =
        mediaPath.toLowerCase().endsWith('.mp4') || mediaPath.toLowerCase().endsWith('.webm');

      // Rendering Preview (Image or Video)
      const previewContainer = cardEl.createDiv({
        cls: 'cm-media-preview-container',
      });

      if (isVideo) {
        const videoEl = previewContainer.createEl('video', {
          cls: 'cm-image-card-preview',
          attr: {
            src: mediaUrl,
            muted: true,
            loop: true,
            playsinline: true,
            'data-path': mediaPath,
          },
        });

        this.videoPlayers.push(videoEl);

        const playOverlay = previewContainer.createDiv({
          cls: 'cm-media-play-overlay',
        });
        setIcon(playOverlay, 'play');

        const muteButton = previewContainer.createDiv({
          cls: 'cm-media-mute-toggle',
        });

        const updateMuteIcon = () => {
          setIcon(muteButton, videoEl.muted ? 'volume-x' : 'volume-2');
          setCssPropsSafe(muteButton, { opacity: '0' });
        };
        updateMuteIcon();

        muteButton.addEventListener('click', (e) => {
          e.stopPropagation();
          videoEl.muted = !videoEl.muted;
          updateMuteIcon();
          setCssPropsSafe(muteButton, {
            opacity: videoEl.muted ? '0.8' : '1',
          });
        });

        // Video Play/Pause & Exclusive Play Logic
        previewContainer.addEventListener('click', () => {
          // Pause other playing videos
          for (const player of this.videoPlayers) {
            if (player !== videoEl && !player.paused) {
              player.pause();
              const container = player.closest<HTMLElement>('.cm-media-preview-container');
              if (container) {
                const playOverlay = container.querySelector<HTMLElement>('.cm-media-play-overlay');
                const muteToggle = container.querySelector<HTMLElement>('.cm-media-mute-toggle');

                if (playOverlay) setCssPropsSafe(playOverlay, { opacity: '1' });
                if (muteToggle) setCssPropsSafe(muteToggle, { opacity: '0' });
              }
            }
          }

          if (videoEl.paused) {
            void videoEl.play().catch((err) => {
              console.error('Failed to play video:', err);
            });
            setCssPropsSafe(playOverlay, { opacity: '0' });
            setCssPropsSafe(muteButton, {
              opacity: videoEl.muted ? '0.8' : '1',
            });
          } else {
            setCssPropsSafe(muteButton, { opacity: '0' });
            videoEl.pause();
            setCssPropsSafe(playOverlay, { opacity: '1' });
          }
        });
      } else {
        previewContainer.createEl('img', {
          cls: 'cm-image-card-preview',
          attr: { src: mediaUrl, 'data-path': mediaPath },
        });
      }

      // Rename Input Section
      const nameSettingEl = cardEl.createDiv({
        cls: 'setting-item cm-image-card-name-input',
      });
      const nameControlEl = nameSettingEl.createDiv({
        cls: 'setting-item-control',
      });
      const nameInputContainer = nameControlEl.createDiv({
        cls: 'cm-name-input-container',
      });

      const nameInput = nameInputContainer.createEl('input', {
        type: 'text',
        cls: 'cm-name-input-basename',
      });
      const extensionSpan = nameInputContainer.createSpan({
        cls: 'cm-name-input-extension',
      });

      let currentImagePath = mediaPath;
      let currentFileName = fileName || '';
      let { basename, ext } = splitName(currentFileName);

      nameInput.value = basename;
      extensionSpan.setText(ext);

      nameInput.addEventListener('focus', (e) => (e.target as HTMLInputElement).select());

      const saveName = async () => {
        const newBasename = nameInput.value.trim();
        const currentBase = splitName(currentFileName).basename;

        if (newBasename && newBasename !== currentBase) {
          const newFullName = newBasename + ext;
          const renameResult = await this.plugin.renameBackgroundMedia(
            currentImagePath,
            newFullName,
          );

          if (renameResult && typeof renameResult === 'string') {
            currentImagePath = renameResult;
            currentFileName = renameResult.split('/').pop() || '';
            const updatedSplit = splitName(currentFileName);
            basename = updatedSplit.basename;

            const imgEl = cardEl.querySelector<HTMLImageElement>('.cm-image-card-preview');
            const selectBtn = cardEl.querySelector<HTMLButtonElement>('.cm-image-card-select-btn');
            const deleteBtn = cardEl.querySelector<HTMLButtonElement>('.cm-image-card-delete-btn');

            if (imgEl) imgEl.src = this.app.vault.adapter.getResourcePath(renameResult);
            if (selectBtn) selectBtn.onclick = () => this.selectMedia(renameResult);
            if (deleteBtn) deleteBtn.onclick = () => this.deleteMedia(renameResult, cardEl);
          } else {
            nameInput.value = currentBase;
          }
        } else {
          nameInput.value = currentBase;
        }
      };

      nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          nameInput.blur();
        }
      });
      nameInput.addEventListener('focusout', () => {
        void saveName().catch((err) => {
          console.error('Failed to save snippet name:', err);
        });
      });

      // Action Buttons
      const controlsEl = cardEl.createDiv({ cls: 'cm-image-card-controls' });

      const selectButton = new ButtonComponent(controlsEl)
        .setButtonText(t('buttons.select'))
        .setCta()
        .onClick(() => this.selectMedia(currentImagePath));
      selectButton.buttonEl.classList.add('cm-image-card-select-btn');

      const deleteButton = new ButtonComponent(controlsEl)
        .setIcon('trash')
        .setClass('mod-warning')
        .onClick(() => this.deleteMedia(currentImagePath, cardEl));
      deleteButton.buttonEl.classList.add('cm-image-card-delete-btn');

      fragment.appendChild(cardEl);
    }

    // Single DOM injection
    this.galleryEl.appendChild(fragment);
  }

  async selectMedia(path: string) {
    const fileExt = path.split('.').pop()?.toLowerCase();
    const mediaType: 'image' | 'video' =
      fileExt === 'mp4' || fileExt === 'webm' ? 'video' : 'image';

    await this.plugin.selectBackgroundMedia(path, mediaType);

    this.settingTab.display();
    this.closeCallback();
    this.close();
  }

  /**
   * Deletes media after checking for profile dependencies and warning the user.
   */
  deleteMedia(path: string, cardEl: HTMLElement) {
    const profiles = this.plugin.settings.profiles;
    const affectedProfiles = Object.keys(profiles).filter(
      (name) => profiles[name].backgroundPath === path,
    );

    const messageFragment = new DocumentFragment();
    messageFragment.append(t('modals.confirmation.deleteGlobalBgDesc'));

    if (affectedProfiles.length > 0) {
      const listEl = messageFragment.createEl('ul', {
        cls: 'cm-profile-list-modal',
      });
      affectedProfiles.forEach((name) => {
        listEl.createEl('li').createEl('strong', { text: name });
      });
    }

    new ConfirmationModal(
      this.app,
      this.plugin,
      t('modals.confirmation.deleteBackgroundTitle'),
      messageFragment,
      () => {
        void (async () => {
          await this.plugin.removeBackgroundMediaByPath(path);
          new Notice(t('notices.bgDeleted'));

          cardEl.remove();

          if (this.galleryEl.childElementCount === 0) {
            this.galleryEl.createDiv({
              cls: 'cm-image-browser-empty',
              text: t('modals.backgroundBrowser.noImages'),
            });
          }

          this.settingTab.display();
        })().catch((err) => {
          console.error('Failed to delete background:', err);
        });
      },
      { buttonText: t('buttons.deleteAnyway'), buttonClass: 'mod-warning' },
    ).open();
  }

  onClose() {
    for (const player of this.videoPlayers) {
      player.pause();
    }
    this.videoPlayers = [];
    this.contentEl.empty();
  }
}
