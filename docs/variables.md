# Theme Engine Variable Reference

Theme Engine exposes a large collection of Obsidian CSS variables through a visual editor.

These variables allow you to customize the appearance of your workspace without writing CSS manually.

## About Variable Types

Variables are grouped internally by purpose:

- Backgrounds
- Text & Typography
- Navigation
- Links
- Code Blocks
- Tables
- Callouts
- Interactive Elements
- Graph View
- Canvas
- Tabs
- Scrollbars
- Plugin Integrations
- Custom Variables

Each variable entry includes:

- **Variable** → Internal CSS variable name
- **UI Label** → Display name inside Theme Engine
- **Description** → What the variable controls

> [!TIP]
>
> Theme Engine also supports custom variables.
>
> You can add variables from:
>
> - Other plugins
> - Community themes
> - Your own CSS snippets

## Supported Variables

<details>
<summary><strong>Click to expand the full variable list</strong></summary>

| Variable                             | UI Label                         | Description                                                                                         |
| ------------------------------------ | -------------------------------- | --------------------------------------------------------------------------------------------------- |
| `--iconize-icon-color`               | Iconize icon color               | Sets the color for all icons added by the Iconize plugin and overrides its internal color settings. |
| `--background-primary`               | Background primary               | Main background color for the entire app, especially editor and note panes.                         |
| `--background-primary-alt`           | Background primary alt           | Alternate background often used for active editor lines.                                            |
| `--background-secondary`             | Background secondary             | Secondary background used for sidebars and panels.                                                  |
| `--background-secondary-alt`         | Background secondary alt         | Alternate sidebar background used for active files.                                                 |
| `--background-modifier-border`       | Border                           | Border color used across UI elements such as buttons and inputs.                                    |
| `--background-modifier-border-hover` | Border (hover)                   | Border color when hovering UI elements.                                                             |
| `--background-modifier-border-focus` | Border (focus)                   | Border color when an element is focused.                                                            |
| `--background-modifier-flair`        | Flair background                 | Background used for special UI states like syncing indicators.                                      |
| `--background-modifier-hover`        | Hover background                 | Background color when hovering list items or controls.                                              |
| `--background-modifier-active`       | Active background                | Background color when elements are selected or clicked.                                             |
| `--text-normal`                      | Normal text                      | Default text color used across notes and most UI elements.                                          |
| `--text-muted`                       | Muted text                       | Slightly faded text used for secondary information.                                                 |
| `--text-faint`                       | Faint text                       | Very subtle text used for disabled or low-priority UI.                                              |
| `--text-on-accent`                   | Text on accent                   | Text color displayed on top of accent backgrounds.                                                  |
| `--text-accent`                      | Accent text                      | Accent color used for links and highlighted UI elements.                                            |
| `--text-accent-hover`                | Accent text (hover)              | Accent text color when hovering links.                                                              |
| `--text-selection`                   | Text selection                   | Background color of selected text.                                                                  |
| `--checklist-done-color`             | Checklist done                   | Color used for completed checklist items.                                                           |
| `--tag-color`                        | Tag text                         | Text color of tags.                                                                                 |
| `--tag-color-hover`                  | Tag text (hover)                 | Tag color when hovering over tags.                                                                  |
| `--tag-bg`                           | Tag background                   | Background color for tags.                                                                          |
| `--nav-item-color`                   | Nav item text                    | Default text color for items in navigation lists.                                                   |
| `--nav-item-color-hover`             | Nav item text (hover)            | Text color when hovering navigation items.                                                          |
| `--nav-item-color-active`            | Nav item text (active)           | Text color of the active navigation item.                                                           |
| `--nav-item-background-hover`        | Nav item background (hover)      | Background color when hovering navigation items.                                                    |
| `--nav-item-background-active`       | Nav item background (active)     | Background color for selected navigation items.                                                     |
| `--link-color`                       | Link color                       | Default color for internal Markdown links.                                                          |
| `--link-color-hover`                 | Link color (hover)               | Color for internal links when hovering.                                                             |
| `--link-external-color`              | External link color              | Default color for external links.                                                                   |
| `--link-external-color-hover`        | External link color (hover)      | External link color when hovering.                                                                  |
| `--link-unresolved-color`            | Unresolved link color            | Color for links pointing to notes that do not exist yet.                                            |
| `--caret-color`                      | Caret color                      | Color of the text cursor in editing mode.                                                           |
| `--code-comment`                     | Code comment                     | Syntax color used for comments in code blocks.                                                      |
| `--code-function`                    | Code function                    | Syntax color for function names in code blocks.                                                     |
| `--code-keyword`                     | Code keyword                     | Syntax color for language keywords.                                                                 |
| `--code-operator`                    | Code operator                    | Syntax color for operators in code blocks.                                                          |
| `--code-property`                    | Code property                    | Syntax color for object properties in code blocks.                                                  |
| `--code-string`                      | Code string                      | Syntax color for string values in code blocks.                                                      |
| `--h1-color`                         | H1 color                         | Color of H1 headings.                                                                               |
| `--h2-color`                         | H2 color                         | Color of H2 headings.                                                                               |
| `--h3-color`                         | H3 color                         | Color of H3 headings.                                                                               |
| `--h4-color`                         | H4 color                         | Color of H4 headings.                                                                               |
| `--h5-color`                         | H5 color                         | Color of H5 headings.                                                                               |
| `--h6-color`                         | H6 color                         | Color of H6 headings.                                                                               |
| `--hr-color`                         | Horizontal rule                  | Color of horizontal rule lines (`---`).                                                             |
| `--blockquote-border-color`          | Blockquote border                | Color of the vertical border in blockquotes.                                                        |
| `--blockquote-color`                 | Blockquote text                  | Text color inside blockquotes.                                                                      |
| `--blockquote-bg`                    | Blockquote background            | Background color for blockquotes.                                                                   |
| `--code-normal`                      | Inline code text                 | Text color inside inline code.                                                                      |
| `--code-background`                  | Inline code background           | Background color for inline code blocks.                                                            |
| `--text-highlight-bg`                | Highlighted text background      | Background color of highlighted text.                                                               |
| `--table-background`                 | Table background                 | Background color of Markdown tables.                                                                |
| `--table-border-color`               | Table border                     | Border color of Markdown tables.                                                                    |
| `--table-header-background`          | Table header background          | Background color of table headers.                                                                  |
| `--table-row-alt-background`         | Table alt row background         | Alternate row background color in tables.                                                           |
| `--callout-default`                  | Callout default                  | Base color for note callouts.                                                                       |
| `--callout-info`                     | Callout info                     | Base color for info callouts.                                                                       |
| `--callout-warning`                  | Callout warning                  | Base color for warning callouts.                                                                    |
| `--callout-error`                    | Callout error / danger           | Base color for error and danger callouts.                                                           |
| `--callout-success`                  | Callout success                  | Base color for success callouts.                                                                    |
| `--callout-tip`                      | Callout tip                      | Base color for tip and hint callouts.                                                               |
| `--callout-question`                 | Callout question                 | Base color for question, help, and FAQ callouts.                                                    |
| `--callout-important`                | Callout important                | Base color for important callouts.                                                                  |
| `--callout-bug`                      | Callout bug                      | Base color for bug callouts.                                                                        |
| `--callout-example`                  | Callout example                  | Base color for example callouts.                                                                    |
| `--callout-quote`                    | Callout quote                    | Base color for quote and cite callouts.                                                             |
| `--callout-todo`                     | Callout todo                     | Base color for todo callouts.                                                                       |
| `--callout-summary`                  | Callout summary                  | Base color for summary callouts.                                                                    |
| `--callout-fail`                     | Callout fail / failure           | Base color for fail, failure, and missing callouts.                                                 |
| `--interactive-normal`               | Interactive normal               | Background color for buttons and interactive controls.                                              |
| `--interactive-hover`                | Interactive hover                | Background color when hovering interactive elements.                                                |
| `--interactive-accent`               | Interactive accent               | Accent color for important actions and buttons.                                                     |
| `--interactive-accent-hover`         | Interactive accent hover         | Accent color when hovering important buttons.                                                       |
| `--interactive-success`              | Success color                    | Color indicating successful operations.                                                             |
| `--interactive-error`                | Error color                      | Color indicating error states.                                                                      |
| `--interactive-warning`              | Warning color                    | Color indicating warning states.                                                                    |
| `--titlebar-background`              | Titlebar background              | Background color of the window title bar.                                                           |
| `--titlebar-background-focused`      | Titlebar background (focused)    | Title bar color when the window is active.                                                          |
| `--titlebar-text-color`              | Titlebar text                    | Text color of the title bar.                                                                        |
| `--sidebar-background`               | Sidebar background               | Background color of sidebars.                                                                       |
| `--sidebar-border-color`             | Sidebar border                   | Border color next to sidebars.                                                                      |
| `--header-background`                | Header background                | Background color for pane headers.                                                                  |
| `--header-border-color`              | Header border                    | Border color below pane headers.                                                                    |
| `--vault-name-color`                 | Vault name                       | Color of the vault name displayed in the sidebar.                                                   |
| `--tab-background-active`            | Active tab background            | Background color of the active tab.                                                                 |
| `--tab-text-color`                   | Tab text                         | Text color of inactive tabs.                                                                        |
| `--tab-text-color-active`            | Active tab text                  | Text color of the active tab.                                                                       |
| `--workspace-background-translucent` | Workspace translucent background | Translucent background used behind overlays.                                                        |
| `--cm-notice-text-default`           | Default notice text              | Default text color for notices unless overridden by rules.                                          |
| `--cm-notice-bg-default`             | Default notice background        | Default background color for notices unless overridden by rules.                                    |
| `--graph-line`                       | Graph line                       | Color of connections between notes in graph view.                                                   |
| `--graph-node`                       | Graph node                       | Color of nodes representing notes.                                                                  |
| `--graph-text`                       | Graph text                       | Color of text labels in graph view.                                                                 |
| `--graph-node-unresolved`            | Graph unresolved node            | Color of nodes for unresolved links.                                                                |
| `--graph-node-focused`               | Graph focused node               | Color of the highlighted node.                                                                      |
| `--graph-node-tag`                   | Graph tag node                   | Color of nodes representing tags.                                                                   |
| `--graph-node-attachment`            | Graph attachment node            | Color of nodes representing attachments.                                                            |
| `--canvas-background`                | Canvas background                | Background color of the canvas workspace.                                                           |
| `--canvas-card-label-color`          | Canvas card label                | Text color of labels displayed on canvas cards.                                                     |
| `--canvas-dot-pattern`               | Canvas dot pattern               | Color of the dotted grid pattern used in canvas.                                                    |
| `--scrollbar-thumb-bg`               | Scrollbar thumb                  | Color of the draggable scrollbar thumb.                                                             |
| `--scrollbar-active-thumb-bg`        | Scrollbar active thumb           | Color of the scrollbar thumb when dragged.                                                          |
| `--scrollbar-bg`                     | Scrollbar background             | Background color of the scrollbar track.                                                            |
| `--divider-color`                    | Divider                          | Color used for UI separator lines and dividers.                                                     |

</details>

## Notes

- Some community themes override Obsidian variables and may affect the final appearance.
- Theme Engine works best with the default Obsidian theme or imported theme profiles.
- Custom variables are exported together with profiles.

## Related Documentation

- [Usage Guide](./guide.md)
- [FAQ](./faq.md)
- [Main README](../README.md)
