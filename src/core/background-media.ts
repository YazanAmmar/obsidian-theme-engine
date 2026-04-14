import { Notice, requestUrl } from 'obsidian';
import { BUILT_IN_PROFILES_VARS } from '../constants';
import { t } from '../i18n/strings';
import type ThemeEngine from '../main';
import { FileConflictModal } from '../ui/modals';
import { findNextAvailablePath, maybeConvertToJpg, setCssPropsSafe } from '../utils';

export type MediaType = 'image' | 'video';
export type ConflictChoice = 'replace' | 'keep' | 'prompt';

export const clearBackgroundMedia = (): void => {
  setCssPropsSafe(document.body, { '--cm-background-image': null });
  document.body.classList.remove('cm-workspace-background-active');
  document.body.classList.remove('cm-settings-background-active');

  const oldVideo = document.getElementById('cm-background-video');
  if (oldVideo) oldVideo.remove();
};

export const applyTransparencyToVars = async (plugin: ThemeEngine): Promise<boolean> => {
  const profile = plugin.settings.profiles?.[plugin.settings.activeProfile];
  if (!profile) return false;

  const activeProfileName = plugin.settings.activeProfile;
  const profileOriginalVars =
    BUILT_IN_PROFILES_VARS[activeProfileName as keyof typeof BUILT_IN_PROFILES_VARS];
  const baseVars = profileOriginalVars || BUILT_IN_PROFILES_VARS.Default;

  const varsToMakeTransparent = [
    '--background-primary',
    '--background-secondary',
    '--background-modifier-border',
    '--titlebar-background-focused',
    '--background-modifier-hover',
  ];

  let settingsChanged = false;
  for (const varName of varsToMakeTransparent) {
    if (profile.vars[varName] !== 'transparent') {
      const defaultValue = baseVars[varName as keyof typeof baseVars];
      if (!profile.vars[varName] || profile.vars[varName] === defaultValue) {
        profile.vars[varName] = 'transparent';
        settingsChanged = true;
        if (plugin.settings.colorUpdateFPS > 0) {
          plugin.pendingVarUpdates[varName] = 'transparent';
        }
      }
    }
  }

  if (settingsChanged) {
    await plugin.saveData(plugin.settings);
    if (plugin.settingTabInstance && plugin.settingTabInstance.containerEl.offsetHeight > 0) {
      plugin.settingTabInstance.display();
    }
  }

  return settingsChanged;
};

export const restoreDefaultBackgroundVars = async (plugin: ThemeEngine): Promise<boolean> => {
  const profile = plugin.settings.profiles?.[plugin.settings.activeProfile];
  if (!profile) return false;

  const activeProfileName = plugin.settings.activeProfile;
  const profileOriginalVars =
    BUILT_IN_PROFILES_VARS[activeProfileName as keyof typeof BUILT_IN_PROFILES_VARS];
  const baseVars = profileOriginalVars || BUILT_IN_PROFILES_VARS.Default;

  const varsToRestore = [
    '--background-primary',
    '--background-secondary',
    '--background-modifier-border',
    '--titlebar-background-focused',
    '--background-modifier-hover',
  ];

  let settingsRestored = false;
  for (const varName of varsToRestore) {
    if (profile.vars[varName] === 'transparent') {
      const defaultValue = baseVars[varName as keyof typeof baseVars];
      if (defaultValue) {
        profile.vars[varName] = defaultValue;
        settingsRestored = true;
        if (plugin.settings.colorUpdateFPS > 0) {
          plugin.pendingVarUpdates[varName] = defaultValue;
        }
      }
    }
  }

  if (settingsRestored) {
    await plugin.saveData(plugin.settings);
    if (plugin.settingTabInstance && plugin.settingTabInstance.containerEl.offsetHeight > 0) {
      plugin.settingTabInstance.display();
    }
    if (plugin.settings.colorUpdateFPS === 0) {
      plugin.applyPendingNow();
    }
    return true;
  }

  return false;
};

export const applyBackgroundMedia = async (plugin: ThemeEngine): Promise<void> => {
  const profile = plugin.settings.profiles?.[plugin.settings.activeProfile];

  clearBackgroundMedia();

  if (!profile || profile.backgroundEnabled === false || !profile.backgroundPath) {
    if (profile && profile.backgroundEnabled === false) {
      await restoreDefaultBackgroundVars(plugin);
    }
    return;
  }

  await applyTransparencyToVars(plugin);

  const path = profile.backgroundPath;
  const type = profile.backgroundType;
  if (type === 'image') {
    const imageUrl = plugin.app.vault.adapter.getResourcePath(path);
    setCssPropsSafe(document.body, {
      '--cm-background-image': `url("${imageUrl}")`,
    });

    document.body.classList.add('cm-workspace-background-active');
  } else if (type === 'video') {
    const videoUrl = plugin.app.vault.adapter.getResourcePath(path);

    let videoEl = document.querySelector<HTMLVideoElement>('#cm-background-video');
    if (!videoEl) {
      videoEl = document.createElement('video');
      videoEl.id = 'cm-background-video';
      document.body.appendChild(videoEl);
    }

    videoEl.src = videoUrl;
    videoEl.autoplay = true;
    videoEl.loop = true;
    videoEl.muted = profile.videoMuted !== false;
    videoEl.playsInline = true;
    setCssPropsSafe(videoEl, {
      opacity: (profile.videoOpacity || 0.5).toString(),
    });

    videoEl.load();
    document.body.classList.add('cm-workspace-background-active');
  }
};

export const ensureBackgroundsFolderExists = async (plugin: ThemeEngine): Promise<void> => {
  const backgroundsPath = `${plugin.app.vault.configDir}/backgrounds`;
  try {
    if (!(await plugin.app.vault.adapter.exists(backgroundsPath))) {
      await plugin.app.vault.adapter.mkdir(backgroundsPath);
      console.debug(`Theme Engine: Created global backgrounds folder at ${backgroundsPath}`);
    }
  } catch (error) {
    console.error('Theme Engine: Failed to create backgrounds folder on startup.', error);
  }
};

export const removeBackgroundMediaByPath = async (
  plugin: ThemeEngine,
  pathToDelete: string,
): Promise<void> => {
  if (!pathToDelete) return;

  const varsToRestore = [
    '--background-primary',
    '--background-secondary',
    '--background-modifier-border',
    '--titlebar-background-focused',
    '--background-modifier-hover',
  ];

  let settingsChanged = false;

  for (const profileName in plugin.settings.profiles) {
    const profile = plugin.settings.profiles[profileName];

    if (profile.backgroundPath === pathToDelete) {
      profile.backgroundPath = '';
      profile.backgroundType = undefined;
      profile.backgroundEnabled = false;

      const profileOriginalVars =
        BUILT_IN_PROFILES_VARS[profileName as keyof typeof BUILT_IN_PROFILES_VARS] ||
        BUILT_IN_PROFILES_VARS.Default;

      for (const varName of varsToRestore) {
        if (profile.vars[varName] === 'transparent') {
          const defaultValue = profileOriginalVars[varName as keyof typeof profileOriginalVars];

          if (defaultValue) {
            profile.vars[varName] = defaultValue;
          } else {
            delete profile.vars[varName];
          }
        }
      }

      settingsChanged = true;
    }
  }

  try {
    if (await plugin.app.vault.adapter.exists(pathToDelete)) {
      await plugin.app.vault.adapter.remove(pathToDelete);
    }
  } catch (error) {
    console.warn(`Theme Engine: Could not delete background file '${pathToDelete}'.`, error);
  }

  if (settingsChanged) {
    await plugin.saveSettings();

    const activeProfile = plugin.settings.profiles[plugin.settings.activeProfile];
    if (activeProfile.backgroundPath === '') {
      for (const varName of varsToRestore) {
        const value = activeProfile.vars[varName];
        if (value) plugin.pendingVarUpdates[varName] = value;
      }
      plugin.applyPendingNow();
    }
  }

  if (plugin.settingTabInstance) {
    plugin.settingTabInstance.display();
  }
};

export const setBackgroundMedia = async (
  plugin: ThemeEngine,
  arrayBuffer: ArrayBuffer,
  fileName: string,
  conflictChoice: ConflictChoice = 'prompt',
): Promise<void> => {
  const activeProfile = plugin.settings.profiles?.[plugin.settings.activeProfile];
  if (!activeProfile) return;

  const { arrayBuffer: finalArrayBuffer, fileName: finalFileName } = await maybeConvertToJpg(
    activeProfile,
    arrayBuffer,
    fileName,
  );

  const fileExt = finalFileName.split('.').pop()?.toLowerCase();
  const mediaType: MediaType = fileExt === 'mp4' || fileExt === 'webm' ? 'video' : 'image';

  const backgroundsPath = `${plugin.app.vault.configDir}/backgrounds`;
  let targetPath = `${backgroundsPath}/${finalFileName}`;

  try {
    if (!(await plugin.app.vault.adapter.exists(backgroundsPath))) {
      await plugin.app.vault.adapter.mkdir(backgroundsPath);
    }

    const fileExists = await plugin.app.vault.adapter.exists(targetPath);

    if (fileExists && conflictChoice === 'prompt') {
      new FileConflictModal(plugin.app, plugin, finalArrayBuffer, finalFileName, (choice) => {
        void setBackgroundMedia(plugin, finalArrayBuffer, finalFileName, choice).catch((error) => {
          console.error('Failed to set background media:', error);
        });
      }).open();
      return;
    }

    if (fileExists && conflictChoice === 'keep') {
      targetPath = await findNextAvailablePath(plugin.app.vault.adapter, targetPath);
    }
    if (fileExists && conflictChoice === 'replace') {
      await plugin.app.vault.adapter.remove(targetPath);
    }

    await plugin.app.vault.createBinary(targetPath, finalArrayBuffer);

    const oldImagePath = activeProfile.backgroundPath;

    activeProfile.backgroundPath = targetPath;
    activeProfile.backgroundType = mediaType;

    await plugin.saveSettings();
    new Notice(t('notices.bgSet'));

    if (oldImagePath && oldImagePath !== targetPath && conflictChoice === 'replace') {
      if (await plugin.app.vault.adapter.exists(oldImagePath)) {
        await plugin.app.vault.adapter.remove(oldImagePath);
      }
    }

    if (plugin.settingTabInstance) {
      plugin.settingTabInstance.display();
    }
  } catch (error) {
    new Notice(t('notices.backgroundLoadError'));
    console.error('Theme Engine: Error setting background media:', error);
  }
};

export const setBackgroundMediaFromUrl = async (
  plugin: ThemeEngine,
  url: string,
): Promise<void> => {
  if (!url) {
    new Notice(t('notices.backgroundUrlLoadError'));
    return;
  }

  try {
    const response = await requestUrl({ url });
    const arrayBuffer = response.arrayBuffer;

    let fileName = url.split('/').pop();
    if (fileName) {
      fileName = fileName.split('?')[0];
    }

    if (!fileName || fileName.indexOf('.') === -1 || fileName.length > 50) {
      const extension = response.headers['content-type']?.split('/')[1] || 'png';
      fileName = `image-${Date.now()}.${extension}`;
    }

    await setBackgroundMedia(plugin, arrayBuffer, fileName, 'prompt');
  } catch (error) {
    new Notice(t('notices.backgroundUrlLoadError'));
    console.error('Theme Engine: Error fetching image from URL:', error);
  }
};

export const selectBackgroundMedia = async (
  plugin: ThemeEngine,
  newPath: string,
  mediaType: MediaType,
): Promise<void> => {
  const activeProfile = plugin.settings.profiles?.[plugin.settings.activeProfile];
  if (!activeProfile) return;

  activeProfile.backgroundPath = newPath;
  activeProfile.backgroundType = mediaType;
  activeProfile.backgroundEnabled = true;

  await plugin.saveSettings();
  new Notice(t('notices.bgSet'));
};

export const renameBackgroundMedia = async (
  plugin: ThemeEngine,
  oldPath: string,
  newFullName: string,
): Promise<string | false> => {
  const adapter = plugin.app.vault.adapter;

  if (!newFullName || newFullName.includes('/') || newFullName.includes('\\')) {
    new Notice(t('notices.invalidFilename'));
    return false;
  }

  const pathParts = oldPath.split('/');
  const originalFileName = pathParts.pop() || '';
  const folderPath = pathParts.join('/');
  const newPath = `${folderPath}/${newFullName}`;
  const oldExtMatch = originalFileName.match(/\.([a-zA-Z0-9]+)$/);
  const oldExt = oldExtMatch ? oldExtMatch[0] : '';

  if (oldExt && !newFullName.toLowerCase().endsWith(oldExt.toLowerCase())) {
    console.warn(
      `Theme Engine: Rename blocked. Attempted to change extension from "${oldExt}" in "${newFullName}".`,
    );
    new Notice(t('notices.invalidFilename') + ' (Extension mismatch)');
    return false;
  }

  if (await adapter.exists(newPath)) {
    if (oldPath.toLowerCase() !== newPath.toLowerCase()) {
      new Notice(t('notices.filenameExists', newFullName));
      return false;
    }
  }

  try {
    await adapter.rename(oldPath, newPath);

    let settingsChanged = false;
    for (const profileName in plugin.settings.profiles) {
      const profile = plugin.settings.profiles[profileName];
      if (profile && profile.backgroundPath === oldPath) {
        profile.backgroundPath = newPath;
        settingsChanged = true;
      }
    }

    if (settingsChanged) {
      await plugin.saveSettings();
    }

    new Notice(t('notices.renameSuccess', newFullName));
    return newPath;
  } catch (error) {
    new Notice(t('notices.renameError'));
    console.error('Theme Engine: Error renaming background image:', error);
    return false;
  }
};
