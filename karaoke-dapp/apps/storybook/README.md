# Storybook Organization

This Storybook is organized to scale with a large, multi-lingual karaoke dApp project.

## Directory Structure

```
stories/
├── Introduction.mdx          # Welcome page
├── components/              # Basic UI components
│   ├── Button.stories.tsx
│   ├── Card.stories.tsx
│   └── Form.stories.tsx
├── features/               # Domain-specific components
│   ├── KaraokePlayer.stories.tsx
│   ├── SongCard.stories.tsx
│   └── VoiceCredits.stories.tsx
├── foundations/            # Design tokens
│   ├── Colors.stories.tsx
│   ├── Typography.stories.tsx
│   └── Spacing.stories.tsx
├── patterns/              # Common UI patterns
│   ├── Authentication.stories.tsx
│   ├── PurchaseFlow.stories.tsx
│   └── LoadingStates.stories.tsx
└── examples/              # Full page examples
    ├── SongCatalog.stories.tsx
    ├── Dashboard.stories.tsx
    └── Settings.stories.tsx
```

## Best Practices

1. **Keep stories separate from source code** - All stories live in `apps/storybook/stories`
2. **Use meaningful categories** - Group related components together
3. **Document with MDX** - Use MDX files for documentation pages
4. **Test all states** - Include loading, error, empty, and edge cases
5. **Support i18n** - Show examples in all supported languages (EN, ZH, UG)
6. **Accessibility** - Use Storybook's a11y addon to test accessibility

## Adding New Stories

1. Create a new file in the appropriate category
2. Import components from `@karaoke-dapp/ui` or other packages
3. Define meta and stories
4. Test in both light and dark modes
5. Verify RTL support for Uyghur content

## Localization Testing

Always include examples for:
- English (default)
- Mandarin Chinese (中文)
- Uyghur (ئۇيغۇرچە) - RTL layout

## Component States to Document

- Default
- Hover/Active/Focus
- Disabled
- Loading
- Error
- Empty
- With different content lengths
- Mobile vs Desktop layouts