import { DEFAULT_VARS } from '../constants';
import type ThemeEngine from '../main';
import { flattenVars, isIconizeEnabled } from '../utils';

type StylableElement = Element & {
  setCssProps: (props: Record<string, string | null>) => void;
};

type VaultWithConfigGetter = {
  getConfig: (key: string) => string;
};

type ReloadableView = {
  reload?: () => void;
};

export const applyCustomCssForProfile = (plugin: ThemeEngine, profileName: string): void => {
  try {
    const targetProfileName = profileName || plugin.settings.activeProfile;
    const profile = plugin.settings.profiles?.[targetProfileName];
    removeInjectedCustomCss(plugin);

    if (!profile || !profile.isCssProfile || !profile.customCss) {
      return;
    }

    plugin.setRuntimeStyle('cm-custom-css-for-profile', profile.customCss);
  } catch (error) {
    console.warn('applyCustomCssForProfile failed', error);
  }
};

export const removeInjectedCustomCss = (plugin: ThemeEngine): void => {
  try {
    plugin.clearRuntimeStyle('cm-custom-css-for-profile');
    const oldStyle = document.getElementById('cm-custom-css-for-profile');
    if (oldStyle) oldStyle.remove();
  } catch (error) {
    console.warn(error);
  }
};

export const applyCssSnippets = (plugin: ThemeEngine): void => {
  removeCssSnippets(plugin);
  const activeProfile = plugin.settings.profiles[plugin.settings.activeProfile];
  if (!activeProfile) return;

  const globalSnippets = plugin.settings.globalSnippets || [];
  const profileSnippets = Array.isArray(activeProfile.snippets) ? activeProfile.snippets : [];

  const allSnippets = [...globalSnippets, ...profileSnippets].filter(Boolean);

  const enabledCss = allSnippets
    .filter((snippet) => snippet.enabled && snippet.css)
    .map((snippet) => {
      const upgradedCss = snippet.css.replace(
        /\bbody\s*(?=\{)/g,
        'body.theme-dark, body.theme-light',
      );
      return `/* Snippet: ${snippet.name} ${snippet.isGlobal ? '(Global)' : ''} */\n${upgradedCss}`;
    })
    .join('\n\n');

  if (enabledCss) {
    plugin.setRuntimeStyle('cm-css-snippets', enabledCss);
  }
};

export const removeCssSnippets = (plugin: ThemeEngine): void => {
  plugin.clearRuntimeStyle('cm-css-snippets');
  const el = document.getElementById('cm-css-snippets');
  if (el) el.remove();
};

export const applyPendingNow = (plugin: ThemeEngine): void => {
  try {
    const pending = plugin.pendingVarUpdates || {};
    const keys = Object.keys(pending);
    if (keys.length === 0) {
      plugin.app.workspace.trigger('css-change');
      window.dispatchEvent(new Event('resize'));
      return;
    }

    for (const key of keys) {
      const value = pending[key] ?? null;
      document.body.setCssProps({ [key]: value });
    }

    plugin.pendingVarUpdates = {};

    plugin.app.workspace.trigger('css-change');
    forceIconizeColors(plugin);

    window.dispatchEvent(new Event('resize'));
  } catch (error) {
    console.error('Theme Engine: applyPendingNow failed', error);
  }
};

export const refreshOpenGraphViews = async (plugin: ThemeEngine): Promise<void> => {
  const graphLeaves = plugin.app.workspace.getLeavesOfType('graph');
  if (graphLeaves.length === 0) {
    return;
  }

  console.debug(
    `Theme Engine: Found ${graphLeaves.length} graph(s). Applying Plan C (programmatic rebuild).`,
  );

  for (const leaf of graphLeaves) {
    const currentState = leaf.getViewState();

    await leaf.setViewState({
      ...currentState,
      type: 'graph',
      state: { ...currentState.state },
    });
  }
};

export const forceIconizeColors = (plugin: ThemeEngine): void => {
  let computedIconizeColor = null;
  try {
    const cssVal = getComputedStyle(document.body).getPropertyValue('--iconize-icon-color');
    if (cssVal) computedIconizeColor = cssVal.trim();
  } catch (error) {
    console.warn('Theme Engine: failed to read computed --iconize-icon-color', error);
    computedIconizeColor = null;
  }

  const storedIconizeColor =
    plugin.settings.profiles?.[plugin.settings.activeProfile]?.vars?.['--iconize-icon-color'];

  const iconizeColor = plugin.settings.overrideIconizeColors
    ? computedIconizeColor || storedIconizeColor || null
    : null;

  document.querySelectorAll('.iconize-icon').forEach((iconNode) => {
    const svg = iconNode.querySelector('svg');
    if (!svg) return;

    ([svg, ...svg.querySelectorAll('*')] as StylableElement[]).forEach((el) => {
      if (typeof el.setCssProps !== 'function') return;

      if (!iconizeColor) {
        el.setCssProps({
          fill: null,
          stroke: null,
        });
        return;
      }

      const originalFill = el.getAttribute('fill');
      const originalStroke = el.getAttribute('stroke');

      if (originalFill && originalFill !== 'none' && !originalFill.startsWith('url(')) {
        el.setCssProps({ fill: iconizeColor });
      }

      if (originalStroke && originalStroke !== 'none') {
        el.setCssProps({ stroke: iconizeColor });
      }
    });
  });
};

export const removeOrphanedIconizeElements = (plugin: ThemeEngine): void => {
  const iconizeInstalled = isIconizeEnabled(plugin.app);

  if (iconizeInstalled) {
    return;
  }

  let settingsChanged = false;
  if (plugin.settings.overrideIconizeColors === true) {
    console.debug('Theme Engine: Iconize plugin not found. Disabling override setting.');
    plugin.settings.overrideIconizeColors = false;
    settingsChanged = true;
  }

  const orphanedIcons = document.querySelectorAll('.iconize-icon');

  if (orphanedIcons.length > 0) {
    console.debug(
      `Theme Engine: Found ${orphanedIcons.length} orphaned Iconize elements. Cleaning up...`,
    );
    orphanedIcons.forEach((icon) => icon.remove());
  }

  if (settingsChanged) {
    void plugin.saveSettings().catch((err) => {
      console.error('Failed to save settings after removing Iconize leftovers:', err);
    });
  }
};

export const applyStyles = async (plugin: ThemeEngine): Promise<void> => {
  removeOrphanedIconizeElements(plugin);
  clearStyles(plugin);
  if (!plugin.settings.pluginEnabled) {
    removeInjectedCustomCss(plugin);
    return;
  }

  const profile = plugin.settings.profiles[plugin.settings.activeProfile];
  if (!profile) {
    console.error('Theme Engine: Active profile not found!');
    return;
  }

  const profileVars = Object.entries(profile.vars);
  if (profileVars.length > 0) {
    const cssString = `body.theme-dark, body.theme-light {
    ${profileVars
      .map(([key, value]) => (value ? `${key}: ${value};` : ''))
      .filter(Boolean)
      .join('\n            ')}
    }`;

    plugin.setRuntimeStyle('cm-profile-variables', cssString);
  }

  forceIconizeColors(plugin);
  setTimeout(() => forceIconizeColors(plugin), 100);

  const themeType = profile.themeType || 'auto';

  if (themeType === 'dark') {
    document.body.classList.remove('theme-light');
    document.body.classList.add('theme-dark');
  } else if (themeType === 'light') {
    document.body.classList.remove('theme-dark');
    document.body.classList.add('theme-light');
  } else {
    const vaultWithConfig = plugin.app.vault as typeof plugin.app.vault & VaultWithConfigGetter;
    const currentConfig = vaultWithConfig.getConfig('theme');
    const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (currentConfig === 'obsidian' || (currentConfig === 'system' && isSystemDark)) {
      document.body.classList.remove('theme-light');
      document.body.classList.add('theme-dark');
    } else {
      document.body.classList.remove('theme-dark');
      document.body.classList.add('theme-light');
    }
  }
  applyCustomCssForProfile(plugin, plugin.settings.activeProfile);
  applyCssSnippets(plugin);

  const langCode = plugin.settings.language;
  const customLang = plugin.settings.customLanguages?.[langCode];
  const isCoreRtlLang = langCode === 'ar' || langCode === 'fa';
  const isCustomRtlLang = customLang?.isRtl === true;
  const isRtlEnabled = plugin.settings.useRtlLayout;
  const isRTL = (isCoreRtlLang || isCustomRtlLang) && isRtlEnabled;

  if (isRTL) {
    document.body.classList.add('theme-engine-rtl');
  } else {
    document.body.classList.remove('theme-engine-rtl');
  }
  await plugin.applyBackgroundMedia();
  plugin.app.workspace.trigger('css-change');
  window.dispatchEvent(new Event('resize'));

  setTimeout(() => {
    plugin.app.workspace.trigger('css-change');
    const graphLeaves = plugin.app.workspace.getLeavesOfType('graph');
    graphLeaves.forEach((leaf) => {
      const view = leaf.view as ReloadableView | null;
      if (view?.reload) {
        view.reload();
      }
    });
  }, 300);
};

export const clearStyles = (plugin: ThemeEngine): void => {
  plugin.clearRuntimeStyle('cm-profile-variables');
  plugin.clearRuntimeStyle('cm-dynamic-notice-styles');

  const profileStyleEl = document.getElementById('cm-profile-variables');
  if (profileStyleEl) {
    profileStyleEl.remove();
  }

  removeCssSnippets(plugin);

  const allVars = new Set();
  Object.keys(flattenVars(DEFAULT_VARS)).forEach((key) => allVars.add(key));
  for (const profileName in plugin.settings.profiles) {
    const profile = plugin.settings.profiles[profileName];
    if (profile && profile.vars) {
      Object.keys(profile.vars).forEach((key) => allVars.add(key));
    }
  }
  allVars.forEach((key: string) => {
    document.body.setCssProps({ [key]: null });
  });

  document.querySelectorAll('.iconize-icon').forEach((iconNode) => {
    const svg = iconNode.querySelector('svg');
    if (!svg) return;

    ([svg, ...svg.querySelectorAll('*')] as StylableElement[]).forEach((el) => {
      if (typeof el.setCssProps !== 'function') return;

      el.setCssProps({
        fill: null,
        stroke: null,
      });
    });
  });

  const styleId = 'theme-engine-overrides';
  const overrideStyleEl = document.getElementById(styleId);
  if (overrideStyleEl) {
    overrideStyleEl.remove();
  }
  plugin.app.workspace.trigger('css-change');
  document.body.classList.remove('theme-engine-rtl');
  plugin._clearBackgroundMedia();
};
