# Theme Engine Usage Guide

This guide explains the most common workflows inside Theme Engine.

## Profiles: Create, Import, Export

A profile is a complete theme package that can store:

- Colors
- Snippets
- Backgrounds
- Notice rules
- Settings

### Create a Profile

1. Open `Profile Manager`
2. Click `New`
3. Enter a profile name
4. Select:

- Light
- Dark
- Auto

5. Save

### Export a Profile

1. Select the profile
2. Click:

```text
Export File
```

Theme Engine creates a single `.json` file containing the profile data.

Exported data may include:

- Colors
- Snippets
- Rules
- Background configuration
- Custom variables

### Import a Profile

1. Click:

```text
Import / Paste (.json)
```

2. Upload a file or paste JSON content
3. Choose a new profile name
4. Confirm import

## Using Backgrounds (Images & Videos)

Theme Engine supports profile-specific backgrounds.

### Add a Background

1. Navigate to:

```text
Advanced Settings → Set Custom Background
```

2. Click:

```text
+
```

3. Choose one of:

- Upload file
- Drag and drop
- Paste URL

Theme Engine automatically stores and activates the media.

### Manage Existing Backgrounds

Open:

```text
Browse
```

Available actions:

- Preview
- Rename
- Delete
- Activate

### Background Settings

Open:

```text
Settings
```

Available controls:

For videos:

- Opacity
- Mute

For images:

- JPG conversion
- Compression quality

## Using CSS Snippets

Theme Engine supports two snippet types.

### Profile Snippets

Profile snippets:

- Activate only for one profile
- Export with profiles
- Useful for profile-specific behavior

Example:

```css
h1 {
  color: orange;
}
```

### Global Snippets

Global snippets:

- Stay active across all profiles
- Remain independent from profile switching

Example:

```css
body {
  font-family: Inter;
}
```

### Snippet Order

Snippets support drag-and-drop ordering.

Lower snippets may override higher snippets.

## Notice Coloring Rules

Theme Engine can style notices dynamically based on content.

### Create a Rule

1. Locate:

```text
Notices
```

2. Click the settings icon beside:

```text
--cm-notice-bg-default
```

or:

```text
--cm-notice-text-default
```

3. Click:

```text
Add New Rule
```

### Keyword Rules

Examples:

```text
Success
Saved
Warning
```

Press:

```text
Space
```

or:

```text
Enter
```

to add items.

### Regular Expression Rules

Example:

```regex
\bError\b
```

Enable:

```text
Regex
```

### Highlight Only Mode

Enable:

```text
Highlight Only
```

This colors only matching text instead of the entire notice.

## Related Documentation

- [Variable Reference](./variables.md)
- [FAQ](./faq.md)
- [Main README](../README.md)
- [Commands & Hotkeys](./hotkeys.md)
