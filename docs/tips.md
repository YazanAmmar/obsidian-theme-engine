# Theme Engine Tips & Performance Guide

This guide contains recommendations for better performance, smoother customization, and avoiding common issues.

## Reduce Live Preview Updates

If color updates feel slow while dragging color pickers:

1. Open:

```text
Advanced Settings
```

2. Locate:

```text
Live Update FPS
```

3. Reduce the value.

Recommendations:

| Value | Behavior                        |
| ----- | ------------------------------- |
| 60    | Maximum responsiveness          |
| 30    | Balanced performance            |
| 15    | Lower CPU usage                 |
| 0     | Disable live preview completely |

At `0`, updates apply only after releasing the picker.

## Community Themes May Override Colors

Theme Engine modifies Obsidian variables, but Community Themes may override them.

Examples:

- Minimal
- Atom
- Things
- Prism

Recommended setup:

1. Open:

```text
Settings → Appearance → Themes
```

2. Select:

```text
Default
```

3. Let Theme Engine control colors.

## Optimize Background Performance

Large images and videos can affect responsiveness.

Recommended practices:

### Images

Enable:

```text
Convert Images to JPG
```

Benefits:

- Smaller file sizes
- Faster loading
- Lower memory usage

### Videos

Recommendations:

- Prefer `.mp4`
- Use lower resolutions where possible
- Keep videos short

Avoid:

- Very large files
- High bitrate videos

## Profile Cleanup

Large numbers of unused profiles and snippets can make management harder.

Recommended:

- Delete old profiles
- Remove unused snippets
- Export backups periodically

## Troubleshooting

If unexpected issues occur:

See:
[FAQ →](./faq.md)

## Recommended Workflow

For the best experience:

1. Start with the Default profile
2. Customize colors gradually
3. Add snippets only when needed
4. Export profiles regularly
5. Use snapshots before major changes

## Related Documentation

- [Usage Guide](./guide.md)
- [Variable Reference](./variables.md)
- [FAQ](./faq.md)
- [Main README](../README.md)
