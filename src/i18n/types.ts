export type LocaleCode = 'en' | 'ar' | 'fa' | 'fr';
export type LocaleFunc = (...args: (string | number)[]) => string;
export type LocalizedValue = string | ((...args: (string | number)[]) => string);

/**
 * A dictionary of core language names to display in the list.
 */
export const CORE_LANGUAGES: Record<LocaleCode, string> = {
  en: 'English',
  ar: 'العَرَبيَّةُ',
  fa: 'فارسی',
  fr: 'Français',
};

export const DEFAULT_LOCALE: LocaleCode = 'en';

export interface LocaleStrings {
  plugin: {
    name: string;
    ribbonTooltip: string;
  };

  // Common buttons used everywhere
  buttons: {
    new: string;
    delete: string;
    selectOption: string;
    create: string;
    reset: string;
    update: string;
    apply: string;
    cancel: string;
    reload: string;
    exportFile: string;
    copyJson: string;
    importCss: string;
    importJson: string;
    chooseFile: string;
    import: string;
    select: string;
    browse: string;
    deleteAnyway: string;
    restore: string;
  };

  // Strings for the main settings tab (settingsTab.ts)
  settings: {
    enablePlugin: string;
    enablePluginDesc: string;
    language: string;
    languageDesc: string;
    languageSettingsModalTitle: string;
    rtlLayoutName: string;
    rtlLayoutDesc: string;
    searchPlaceholder: string;
    regexPlaceholder: string;
    noResultsFound: string;
    noResultsHint: string;
    allSections: string;
    clear: string;
    ariaCase: string;
    ariaRegex: string;
    themeWarningTooltip: (theme: string) => string;
  };

  // Strings for profile-manager.ts
  profileManager: {
    heading: string;
    activeProfile: string;
    activeProfileDesc: string;
    themeType: string;
    themeTypeDesc: string;
    themeAuto: string;
    themeDark: string;
    themeLight: string;
    tooltipThemeAuto: string;
    tooltipThemeDark: string;
    tooltipThemeLight: string;
    tooltipExport: string;
    tooltipCopyJson: string;
  };

  // Strings for options-section.ts
  options: {
    heading: string;
    liveUpdateName: string;
    liveUpdateDesc: string;
    iconizeModalTitle: string;
    overrideIconizeName: string;
    overrideIconizeDesc: string;
    cleanupIntervalName: string;
    cleanupIntervalDesc: string;
    addCustomVarName: string;
    addCustomVarDesc: string;
    addNewVarButton: string;
    resetPluginName: string;
    resetPluginDesc: string;
    resetPluginButton: string;
    backgroundName: string;
    backgroundDesc: string;
    videoOpacityName: string;
    videoOpacityDesc: string;
    videoMuteName: string;
    videoMuteDesc: string;
    settingType: string;
    settingTypeImage: string;
    settingTypeVideo: string;
    backgroundModalSettingsTitle: string;
    backgroundEnableName: string;
    backgroundEnableDesc: string;
    convertImagesName: string;
    convertImagesDesc: string;
    jpgQualityName: string;
    jpgQualityDesc: string;
    badgeNotInstalled: string;
  };

  // Strings for snippets-ui.ts
  snippets: {
    heading: string;
    createButton: string;
    noSnippetsDesc: string;
    global: string;
    globalName: string;
    globalDesc: string;
  };

  // Strings for color-pickers.ts
  categories: {
    pluginintegrations: string;
    backgrounds: string;
    text: string;
    navigation: string;
    links: string;
    editor: string;
    interactive: string;
    ui: string;
    misc: string;
    graph: string;
    markdown: string;
    notices: string;
    canvas: string;
    custom: string;
    customDesc: string;
    helpTextPre: string;
    helpTextLink: string;
  };

  // Strings for all modals in modals.ts
  modals: {
    newProfile: {
      title: string;
      nameLabel: string;
      namePlaceholder: string;
    };
    deleteProfile: {
      title: string;
      confirmation: (name: string) => string;
    };
    jsonImport: {
      title: string;
      desc1: string;
      placeholder: string;
      settingName: string;
      settingDesc: string;
      replaceActiveButton: string;
      createNewButton: string;
    };
    cssImport: {
      title: string;
      titleEdit: string;
      note: string;
      importFromFile: string;
      importFromFileDesc: string;
      importFromTheme: string;
      importFromThemeDesc: string;
      noThemes: string;
    };
    snippetEditor: {
      title: string;
      titleEdit: string;
      nameLabel: string;
      namePlaceholder: string;
      importFromSnippet: string;
      importFromSnippetDesc: string;
      noSnippets: string;
      cssPlaceholder: string;
    };
    confirmation: {
      resetProfileTitle: string;
      resetProfileDesc: string;
      deleteSnippetTitle: (name: string) => string;
      deleteSnippetDesc: string;
      resetPluginTitle: string;
      resetPluginDesc: string;
      deleteGlobalBgTitle: string;
      deleteGlobalBgDesc: string;
      deleteBackgroundTitle: string;
      deleteBackgroundDesc: (name: string) => string;
      deleteLangTitle: string;
      deleteLangDesc: (name: string) => string;
      restoreLangTitle: string;
      restoreLangDesc: (name: string) => string;
    };
    noticeRules: {
      titleText: string;
      titleBg: string;
      desc: string;
      addNewRule: string;
      keywordPlaceholder: string;
      useRegex: string;
      highlightOnly: string;
    };
    duplicateProfile: {
      title: string;
      descParts: string[];
      placeholder: string;
    };
    customVar: {
      title: string;
      desc: string;
      displayName: string;
      displayNameDesc: string;
      displayNamePlaceholder: string;
      varName: string;
      varNameDesc: string;
      varNamePlaceholder: string;
      varType: string;
      varTypeDesc: string;
      types: {
        color: string;
        size: string;
        text: string;
        number: string;
      };
      varValue: string;
      varValueDesc: string;
      varValuePlaceholder: string;
      description: string;
      descriptionDesc: string;
      descriptionPlaceholder: string;
      addVarButton: string;
      textValuePlaceholder: string;
    };
    addBackground: {
      title: string;
      importFromFile: string;
      importFromFileDesc: string;
      pasteBoxPlaceholder: string;
      dropToAdd: string;
      processing: string;
    };
    fileConflict: {
      title: string;
      desc: (name: string) => string;
      replaceButton: string;
      keepButton: string;
    };
    backgroundBrowser: {
      title: string;
      noImages: string;
    };
    advancedReset: {
      title: string;
      desc: string;
      profilesLabel: string;
      profilesDesc: string;
      snippetsLabel: string;
      snippetsDesc: string;
      backgroundsLabel: string;
      backgroundsDesc: string;
      settingsLabel: string;
      settingsDesc: string;
      languagesLabel: string;
      languagesDesc: string;
    };
    addLang: {
      title: string;
      desc: string;
      nameLabel: string;
      nameDesc: string;
      namePlaceholder: string;
      codeLabel: string;
      codeDesc: string;
      codePlaceholder: string;
      rtlLabel: string;
      rtlDesc: string;
    };
    translator: {
      title: (langName: string) => string;
      searchPlaceholder: string;
      copyJson: string;
      pasteJson: string;
      exportFile: string;
      importFile: string;
      showMissing: string;
      showAll: string;
      showMore: string;
      showLess: string;
      noMatches: string;
      dynamicValue: string;
    };
    langInfo: {
      title: string;
      desc: string;
    };
  };

  // All floating Notice() messages
  notices: {
    pluginEnabled: string;
    pluginDisabled: string;
    profilePinned: string;
    profileReset: string;
    noPinnedSnapshot: string;
    profileNotFound: string;
    noProfilesFound: string;
    activeProfileSwitched: (name: string) => string;
    graphColorsApplied: string;
    invalidJson: string;
    jsonMustHaveName: string;
    profileCreatedSuccess: (name: string) => string;
    profileImportedSuccess: string;
    noActiveProfileToCopy: string;
    noActiveProfileToExport: string;
    snippetCssCopied: string;
    snippetEmpty: string;
    cssContentEmpty: string;
    snippetNameExists: (name: string) => string;
    profileNameExists: (name: string) => string;
    profileUpdated: (name: string) => string;
    snippetUpdated: (name: string) => string;
    snippetCreated: (name: string) => string;
    snippetDeleted: string;
    snippetScopeMove: string;
    profileCreatedFromCss: (name: string) => string;
    noColorHistory: string;
    colorRestored: (color: string) => string;
    textboxEmpty: string;
    fileLoaded: (fileName: string) => string;
    exportSuccess: string;
    jsonCopied: string;
    resetSuccess: string;
    fpsUpdated: (value: number) => string;
    invalidProfileObject: string;
    profileCreated: (name: string) => string;
    settingsSaved: string;
    testSentence: (word: string) => string;
    varNameEmpty: string;
    varNameFormat: string;
    varExists: (name: string) => string;
    varAdded: (name: string) => string;
    iconizeNotFound: string;
    themeCssLoaded: (theme: string) => string;
    themeReadFailed: (theme: string) => string;
    snippetLoaded: (snippet: string) => string;
    snippetReadFailed: (snippet: string) => string;
    themeSwitchedLight: string;
    themeSwitchedDark: string;
    themeSwitchedAuto: string;
    bgSet: string;
    bgRemoved: string;
    backgroundLoadError: string;
    noBgToRemove: string;
    bgDeleted: string;
    backgroundUrlLoadError: string;
    backgroundPasteError: string;
    downloadingFromUrl: (url: string) => string;
    pastedBase64Image: string;
    pastedImage: (name: string) => string;
    invalidFilename: string;
    filenameExists: (name: string) => string;
    renameSuccess: (name: string) => string;
    renameError: string;
    profileDeleted: string;
    jpgQualitySet: (value: number) => string;
    cannotDeleteLastProfile: string;
    noKeywordsToTest: string;
    langNameEmpty: string;
    langCodeEmpty: string;
    langCodeCore: (code: string) => string;
    langCodeExists: (code: string) => string;
    langNameExists: (name: string) => string;
    langNameCore: (name: string) => string;
    langCreated: (name: string) => string;
    langSaved: (name: string) => string;
    langExported: (code: string) => string;
    langImported: (name: string) => string;
    langCopiedJson: string;
    langPastedJson: (count: number) => string;
    langDeleted: (name: string) => string;
    langRestored: string;
    deleteBackgroundsError: (message: string) => string;
    snippetsLocked: string;
    snippetsUnlocked: string;
  };

  // All tooltips
  tooltips: {
    editCssProfile: string;
    pinSnapshot: string;
    pinSnapshotDate: (date: string) => string;
    resetToPinned: string;
    editSnippet: string;
    copySnippetCss: string;
    deleteSnippet: string;
    setTransparent: string;
    undoChange: string;
    dragReorder: string;
    testRule: string;
    deleteCustomVar: string;
    iconizeSettings: string;
    themeLight: string;
    themeDark: string;
    themeAuto: string;
    addBg: string;
    removeBg: string;
    bgSettings: string;
    browseBg: string;
    iconizeNotInstalled: string;
    editLang: string;
    langInfo: string;
    restoreDefaultLang: string;
    lockSnippets: string;
    unlockSnippets: string;
  };

  // All commands
  commands: {
    toggleTheme: string;
    enableDisable: string;
    cycleNext: string;
    cyclePrevious: string;
    openSettings: string;
  };

  // Like Plugin Card strings
  likeCard: {
    tagline: string;
    description: string;
    profilesAndSnippets: string;
    customizableColors: string;
    daysOfUse: string;
    githubButton: string;
    reportIssueButton: string;
    syncVaultButton: string;
    telegramButton: string;
  };

  // Color Variable Names and Descriptions
  colors: {
    names: {
      [key: string]: string;
    };
    descriptions: {
      [key: string]: string;
    };
  };
}
