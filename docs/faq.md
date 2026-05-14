# Theme Engine FAQ

Frequently asked questions and solutions for common issues.

## Why are my colors not changing after activating a profile?

This is the most common issue.

Usually this happens because a Community Theme (such as Minimal or other installed themes) is overriding the variables managed by Theme Engine.

### Recommended Solution

1. Open:

   `Settings → Appearance → Themes`

2. Select:

   `Default`

3. Return to Theme Engine.

Your profile colors should now apply correctly.

### Alternative Solution (Customize Existing Themes)

If you want to continue using another community theme:

1. Switch Obsidian temporarily to the Default theme.
2. Open Theme Engine.
3. Click:

   `Import / Paste (.css)`

4. Select:

   `Import from installed theme`

5. Choose the desired theme.

Theme Engine creates an editable profile based on that theme.

## Why is my background visible but parts of the UI remain dark?

Theme Engine uses automatic transparency handling.

When a background is active, important variables are automatically adjusted, including:

- `--background-primary`
- `--sidebar-background`
- `--background-secondary`

This allows your image or video background to become visible through the interface.

## What is the difference between Profile Snippets and Global Snippets?

### Profile Snippets

Profile snippets belong to one profile only.

Characteristics:

- Activate only with their profile
- Included when exporting profiles
- Useful for profile-specific styles

Example:

```css
h1 {
  color: red;
}
```

### Global Snippets

Global snippets remain active across all profiles.

Characteristics:

- Always active
- Not tied to a specific profile
- Useful for universal customization

Example:

```css
body {
  font-family: Inter;
}
```

## What are Snapshots?

Snapshots are a safety mechanism.

When using:

```txt
Pin
```

Theme Engine saves:

- Colors
- Snippets
- CSS
- Rules
- Related settings

If you later dislike your changes:

```txt
Reset to Pinned
```

restores the previous saved state instantly.

## I used the old Color Master beta. How can I keep my profiles?

Automatic migration was removed to comply with Obsidian plugin guidelines.

To migrate manually:

1. Close Obsidian.
2. Open:

```txt
.obsidian/plugins/obsidian-color-master/
```

3. Copy:

```txt
data.json
```

4. Paste into:

```txt
.obsidian/plugins/theme-engine/
```

5. Restart Obsidian.

## Still having problems?

If you encounter unexpected behavior:

1. Export your important profiles first.
2. Open:

```txt
Theme Engine → Advanced Settings
```

3. Use:

```txt
Reset Plugin
```

If problems continue:

- Open a GitHub issue
- Include screenshots if possible
- Mention your Obsidian version and plugin version

## Related Documentation

- [Usage Guide](./guide.md)
- [Variable Reference](./variables.md)
- [Main README](../README.md)
