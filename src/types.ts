export type CustomVarType = 'color' | 'size' | 'text' | 'number';

export interface Snippet {
  id: string;
  name: string;
  css: string;
  enabled: boolean;
  isGlobal?: boolean;
}

export interface NoticeRule {
  id: string;
  keywords: string;
  color: string;
  isRegex: boolean;
  highlightOnly: boolean;
}

export interface Profile {
  vars: { [key: string]: string };
  themeType: 'auto' | 'dark' | 'light';
  snippets: Snippet[];
  isCssProfile?: boolean;
  customCss?: string;
  noticeRules?: {
    text: NoticeRule[];
    background: NoticeRule[];
  };
  history?: { [key: string]: string[] };
  customVarMetadata?: {
    [key: string]: {
      name: string;
      desc: string;
      type: CustomVarType;
    };
  };
  backgroundPath?: string;
  backgroundType?: 'image' | 'video';
  videoOpacity?: number;
  videoMuted?: boolean;
  backgroundEnabled?: boolean;
  convertImagesToJpg?: boolean;
  jpgQuality?: number;
}
/**
 * Simple translation dictionary.
 * e.g., { "buttons.new": "", "buttons.delete": "" }
 */
export type CustomTranslation = Record<string, string>;

/**
 * The object that represents the complete custom language.
 */
export interface CustomLanguage {
  languageName: string;
  translations: CustomTranslation;
  isRtl?: boolean;
}

export interface PinnedSnapshot {
  pinnedAt: string;
  profile: Profile;
}
export interface PluginSettings {
  advancedResetOptions?: {
    deleteProfiles: boolean;
    deleteSnippets: boolean;
    deleteSettings: boolean;
    deleteBackgrounds: boolean;
    deleteLanguages?: boolean;
  };
  lastSearchQuery?: string;
  lastSearchSection?: string;
  lastScrollPosition?: number;
  noticeRules?: unknown;
  pluginEnabled: boolean;
  language: string;
  overrideIconizeColors: boolean;
  cleanupInterval: number;
  colorUpdateFPS: number;
  activeProfile: string;
  profiles: { [key: string]: Profile };
  globalSnippets: Snippet[];
  pinnedSnapshots: Record<string, PinnedSnapshot>;
  useRtlLayout: boolean;
  installDate?: string;
  customLanguages?: Record<string, CustomLanguage>;
  snippetsLocked?: boolean;
}
