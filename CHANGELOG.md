# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v2.1.0](https://github.com/YazanAmmar/obsidian-theme-engine/releases/tag/2.1.0) - 2026-05-14

### Added

- Expanded color variable coverage across navigation, links, editor, tables, canvas, tabs, and scrollbar states.
- Full official callout color support with automatic RGB handling.

### Changed

- Localization now automatically follows Obsidian's active language using native APIs.
- Background media storage moved into the plugin's local directory.
- Build system migrated to a dedicated `esbuild.config.mjs` pipeline.
- Profile navigation and theme toggle commands now use `checkCallback` for improved command palette integration.
- Updated `minAppVersion` to `1.11.0` for compatibility with required Obsidian APIs.
- Replaced custom debounce implementations with Obsidian's native API.
- Simplified CSS scoping and removed unnecessary core UI overrides.

### Fixed

- Resolved an interval-related memory leak affecting plugin performance.
- Fixed global CSS leakage that could unintentionally affect the core Obsidian interface.
- Improved Arabic and Persian callout translations.

### Removed

- Removed unsafe `HTMLElement.prototype.setCssProps` monkey-patch.
- Removed legacy plugin ID migration logic and related system file modification behavior.
- Removed manual language state management in favor of host application settings.

### Maintenance

- Enabled stricter TypeScript validation and modernized compiler configuration.
- Separated linting and type-checking into dedicated build steps.
- Improved local development workflow with automatic build and asset synchronization.
- Added trademark and visual identity protection documentation.

## [v2.0.0](https://github.com/YazanAmmar/obsidian-theme-engine/releases/tag/2.0.0) - 2026-02-14

### Breaking Changes

- Plugin manifest ID changed from `color-master` to `theme-engine`.
- Command namespace updated to `theme-engine:*`.

### Added

- First-run migration system for users upgrading from legacy plugin IDs (`obsidian-theme-engine`, `color-master`, `obsidian-color-master`).
- Automatic migration of existing `data.json` settings to the new plugin identity.
- Safe remapping of command hotkeys to the new namespace.
- Migration of enabled plugin entries to the new ID.
- Empty-results search badge in settings.

### Changed

- Public plugin identity updated to **Theme Engine**.
- CSS snippet interaction refined to eliminate reorder flicker.
- Related settings grouped using native `SettingGroup` with fallback handling.
- Search behavior alignment and profile manager layout improvements.
- Improved light-mode action button visibility.
- Support / Like card redesigned to align with Obsidian settings aesthetics.

### Refactored

- UI modals reorganized into a modular directory structure.
- Styling architecture migrated to structured SCSS modules.
- Type definitions strengthened across settings.
- Removed unsafe and unknown type casts.
- Prevented pinned profile variable reset regressions.
- ESLint configuration aligned with Obsidian validation standards.
- Replaced `HTMLElement.prototype.setCssProps` monkey-patch with `setCssPropsSafe`.

### Removed

- Tracking of generated build artifacts (`main.js`, `styles.css`).
- Unused empty-state file.

### Maintenance

- Updated dependencies to latest compatible versions.
- Manifest handling updated for new plugin identity.

## [v1.2.0](https://github.com/YazanAmmar/obsidian-theme-engine/releases/tag/1.2.0) - 2025-11-29

### Added

- Dynamic theme capture system that reads active theme CSS values when creating or using the Default profile.
- Transparent Default profile behavior acting as a pass-through layer over the active Obsidian theme.
- Custom language creation support via settings.
- Tree-based translation editor with nested key browsing and deep search.
- Translation import/export, copy, and paste via JSON.
- Explicit RTL direction configuration for custom languages.
- Fallback-to-English mechanism for missing translation keys.
- "Highlight Only" notice styling mode for keyword-specific coloring.
- Granular Reset Plugin options allowing selective deletion of Profiles, Snippets, Backgrounds, Settings, or Languages.
- Lock button for CSS Snippets to prevent reordering.

### Changed

- UI state feedback system distinguishing pristine vs modified values.
- Graph View color updates applied instantly without requiring tab reload.
- Render loop optimized by separating lightweight CSS updates from heavier DOM operations.
- Custom variable modal default value initialized as empty instead of white.
- Snapshot pin behavior refined to treat the current state as a new baseline.

### Refactored

- Core color engine rewritten to dynamically align with active theme values.
- Translation system architecture rebuilt for stronger typing and extensibility.
- Internal color processing unified to standardized HEX/HEXA format.
- Styling system fully migrated to SCSS.
- ESLint integrated with stricter validation rules.

### Fixed

- 8-digit HEX (alpha transparency) rendering issue in the color picker.

### Removed

- Legacy "Cyberpunk" and "Solarized Nebula" built-in profiles.

### Maintenance

- Refactored internal engine and translation modules to support the new architecture.

## [v1.1.1](https://github.com/YazanAmmar/obsidian-theme-engine/releases/tag/1.1.1) - 2025-11-01

### Added

- Video background support (`.mp4`, `.webm`) alongside image backgrounds.
- Dedicated video settings including opacity control and mute toggle.
- Interactive video previews in the background browser.
- Active background visual indicator in the browser modal.
- Custom variable system supporting multiple data types (Color, Size, Text, Number).
- Context-aware input controls for each custom variable type.
- Duplicate variable name prevention across default and custom variables.
- Search and highlighting support for custom variable names and descriptions.
- "Convert to JPG" option for image uploads (excluding GIF).
- Persistent settings state (search query and scroll position).

### Changed

- Background settings modal redesigned with separate Image and Video configuration tabs.
- Background-related UI terminology updated from "Image" to "Background" where applicable.
- Reset Plugin behavior updated to preserve installation date, language preference, and RTL/LTR layout settings.
- Background system unified internally using `backgroundPath` and `backgroundType`.

### Fixed

- Background switching flicker during image or video transitions.

### Maintenance

- Refactored background media handling to support unified image and video system.

## [v1.1.0](https://github.com/YazanAmmar/obsidian-theme-engine/releases/tag/1.1.0) - 2025-10-25

### Added

- Custom background image support per profile.
- Global background storage in `.obsidian/backgrounds`.
- Multiple background input methods (file upload, URL, paste, drag-and-drop).
- Background browser with preview, rename (locked extension), and delete support.
- Per-profile background enable/disable toggle.
- Automatic transparency handling for core UI variables when a background is active.

### Fixed

- Resolved `EBUSY` error occurring during plugin reset when background files were locked.

### Removed

- Default "OLED Green Glow" and "OLED Active Line Highlight" snippets from the OLED Matrix profile.

## [v1.0.9](https://github.com/YazanAmmar/obsidian-theme-engine/releases/tag/1.0.9) - 2025-10-17

### Added

- Import from installed community themes to create editable CSS-based profiles.
- Import from local CSS snippets to generate new profiles.
- Quick theme toggle button in the Profile Manager (Force Light / Force Dark / Automatic).
- Command to cycle the active profile theme.
- Reset Plugin Settings option to restore factory state by removing `data.json`.

### Changed

- Advanced Settings section redesigned with a card-based layout.
- JSON import modal enhanced with automatic profile name detection.
- Search system refined for improved filtering accuracy and UI clarity.
- Built-in profiles no longer include pre-created snapshots by default.

### Refactored

- Removed inline `.style` usage to improve themability.
- Replaced `.innerHTML` usage with safe DOM methods (`createEl`, `setText`) to reduce XSS risk.
- Cleaned up command naming by removing redundant plugin name prefixes.

### Fixed

- Multi-word tag rendering issue (e.g., `#tag_with_words`) in Live Preview.

## [v1.0.8](https://github.com/YazanAmmar/obsidian-theme-engine/releases/tag/1.0.8) - 2025-09-22

### Added

- Global CSS Snippets that remain active across all profiles.
- "Save as Global Snippet" toggle in the snippet creation modal.
- Visual badge indicator distinguishing global snippets from profile-specific snippets.
- Command to cycle to the previous profile.
- Command to open the plugin settings tab directly.
- Ribbon icon for quick access to plugin settings.
- RTL layout toggle option for users of Right-to-Left languages.

### Changed

- Iconize integration settings moved into a dedicated modal.
- Settings interface visually redesigned for improved consistency.
- Search bar clear button replaced with a brush icon.
- `Import / Paste (.css)` action limited to creating CSS-based profiles.
- Snippet creation separated into a dedicated "Create New Snippet" workflow.

## [v1.0.7](https://github.com/YazanAmmar/obsidian-theme-engine/releases/tag/1.0.7) - 2025-09-19

### Added

- Drag-and-drop reordering support for CSS Snippets.
- Custom CSS variable creation support.
- Session-persistent Undo/Redo history for CSS editors (cleared on Obsidian restart).
- Full UI translations for French and Persian.

### Changed

- Notice rules are now case-insensitive.
- Improved RTL/LTR compatibility when plugin language and Obsidian interface direction differ.
- "Create New Snippet" button positioned for faster access.
- Custom variables included in statistics count.

### Refactored

- Complete migration of the codebase from JavaScript to TypeScript.
- Strongly typed internal architecture for improved stability and maintainability.

### Fixed

- Notice rules failing to match non-Latin keywords due to incorrect RegEx behavior.
- RTL layout inconsistencies in mixed LTR/RTL environments.

### Maintenance

- Improved type safety following TypeScript migration.

## [v1.0.6](https://github.com/YazanAmmar/obsidian-theme-engine/releases/tag/1.0.6) - 2025-09-13

### Added

- Advanced Notice Coloring system with prioritized keyword and Regular Expression (RegEx) rules.
- Profile-specific notice rules stored within each profile and included in export/import operations.
- "Test Rule" button for previewing notice styling.
- Additional Markdown color variables including:
  - `--blockquote-bg`
  - `--hr-color`
  - `--code-normal`
  - `--code-background`
  - `--text-highlight-bg`
- Foundational Right-to-Left (RTL) language support with full Arabic translation.

### Changed

- Search system expanded to include variable descriptions in filtering results.
- Search result highlighting added for matched terms.
- Notice rule creation interface redesigned with tag-based keyword input.
- Multiple modals redesigned for improved clarity and usability.

### Refactored

- Notice rule storage migrated from global scope to profile-specific architecture.
- Internal structure updated to better support RTL and future language expansion.
- Integrated SortableJS for drag-and-drop functionality.
- Adopted `npm run build` workflow for standardized builds.

### Fixed

- Notice rules failing to match non-Latin keywords due to incorrect RegEx handling.

## [v1.0.5](https://github.com/YazanAmmar/obsidian-theme-engine/releases/tag/1.0.5) - 2025-09-08

### Added

- CSS Snippets system allowing creation of lightweight, reusable CSS customizations alongside full CSS Profiles.
- Ability to toggle, edit, and copy snippet code independently from profiles.
- Full editing support for CSS-based profiles (rename and modify CSS code).
- Restore button for built-in profiles to revert them to their original state.
- Automatic recovery support for deleted default profiles when recreated with the same name.
- Tag styling variables: `--tag-color`, `--tag-color-hover`, and `--tag-bg`.
- "Create New" option in the JSON import modal to generate a new profile from imported data.
- Eraser button in color pickers to instantly set values to `transparent`.
- Expanded contrast checker coverage for tags, icons, and interactive elements.

### Changed

- "Paste CSS" button renamed to "Paste / Import (CSS)..." for clarity.
- Profile rename process improved to preserve associated snapshots.

### Fixed

- Snapshot system for CSS Profiles now correctly saves and restores both color variables and CSS code.
- Snapshot data no longer lost when renaming profiles.
- Resolved issue where updating a CSS profile with the same name triggered duplicate notifications.

## [v1.0.4](https://github.com/YazanAmmar/obsidian-theme-engine/releases/tag/1.0.4) - 2025-09-04

### Added

- Support for creating CSS-based profiles by pasting raw CSS code.
- Multi-step color undo system storing up to five previous values per color variable.
- Dedicated button linking to the developer’s GitHub profile.

### Changed

- Search bar repositioned to the top of the settings panel.
- Search mode hides unrelated UI sections to provide a focused results view.
- Improved search filtering logic to prevent empty category headers.
- Support section visually redesigned for improved clarity.

## [v1.0.3](https://github.com/YazanAmmar/obsidian-theme-engine/releases/tag/1.0.3) - 2025-09-03

### Added

- Profile Snapshots system with Pin and Reset to Pinned functionality.
- Search bar in the Profile Manager for filtering color variables by name or value.
- Case-sensitive and Regular Expression (RegEx) search support.
- Command to toggle the plugin on or off.
- Command to cycle to the next profile.
- Live Update FPS slider (0–60 FPS) to control preview rendering performance.
- Copy JSON action for profiles.
- Enhanced Import modal supporting Merge and Replace modes.
- Redesigned support section with live usage statistics.

### Changed

- Graph View editing now uses a temporary state system for Apply/Cancel handling.
- Closing the settings window while editing Graph View colors automatically cancels unsaved changes.
- Profile action UI redesigned and repositioned for improved clarity.

### Fixed

- Iconize colors not updating live while dragging the color picker.

## [v1.0.2](https://github.com/YazanAmmar/obsidian-theme-engine/releases/tag/1.0.2) - 2025-08-30

### Added

- Per-profile theme classification (Light, Dark, Automatic).
- Automatic Obsidian theme switching when activating a profile.
- Instant workspace-wide refresh when applying Graph View color changes.
- Permanent Refresh button in the Graph View section.
- Automated cleanup system for orphaned `Iconize` icons when the Iconize plugin is uninstalled.
- Configurable cleanup interval setting for Iconize integration.
- Support section in settings displaying usage statistics and repository links.

### Changed

- Iconize color overrides now use a `MutationObserver` to ensure consistent re-application during UI updates.

### Fixed

- Graph View color updates not applying to already opened Graph View tabs.

## [v1.0.1](https://github.com/YazanAmmar/obsidian-theme-engine/releases/tag/1.0.1) - 2025-08-28

### Added

- Integration with the Iconize plugin.
- Option to override Iconize default icon colors directly from the plugin settings.

### Changed

- Relocated the "Override Iconize Colors" setting under the Profile Manager section for improved accessibility.

### Fixed

- Resolved issue where Iconize colors persisted after disabling the main plugin toggle.

## [v1.0.0](https://github.com/YazanAmmar/obsidian-theme-engine/releases/tag/1.0.0) - 2025-08-22

### Added

- Live UI editor for core Obsidian CSS color variables with instant preview.
- Profile management system (create, delete, switch between profiles).
- Import and export support for profiles using `.json` files.
- Bilingual user interface (English and Arabic).
- Right-to-Left (RTL) layout support for Arabic.
- Bundled default profiles:
  - Default
  - OLED Matrix
  - Solarized Nebula
  - Cyberpunk Sunset
  - Citrus Zest
