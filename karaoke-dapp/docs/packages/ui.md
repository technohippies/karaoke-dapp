# UI Components

The `@karaoke-dapp/ui` package provides all shared UI components used across the application.

## Installation

```bash
bun add @karaoke-dapp/ui
```

## Core Components

### KaraokeDisplay

The main karaoke interface that displays lyrics, handles countdown, and shows performance feedback.

```typescript
interface KaraokeDisplayProps {
  lines: KaraokeLyricLine[]
  currentTime?: number
  countdown?: number
  lineColors?: Map<number, number>
}

interface KaraokeLyricLine {
  id: string
  text: string
  startTime: number
  endTime: number
}
```

**Usage:**
```tsx
import { KaraokeDisplay } from '@karaoke-dapp/ui'

<KaraokeDisplay
  lines={karaokeLyrics}
  currentTime={currentTime * 1000}
  lineColors={lineGrades}
/>
```

**Features:**
- Real-time lyric highlighting
- Performance-based color coding
- Countdown overlay
- Responsive design

### KaraokeScore

Post-performance scoring interface with options to practice or continue.

```typescript
interface KaraokeScoreProps {
  score: number
  songTitle: string
  artist: string
  onPractice: () => void
}
```

**Usage:**
```tsx
<KaraokeScore
  score={85}
  songTitle="Royals"
  artist="Lorde"
  onPractice={() => send({ type: 'PRACTICE' })}
/>
```

### PurchaseSlider

Interactive purchase interface with slide-to-confirm functionality.

```typescript
interface PurchaseSliderProps {
  songTitle: string
  packagePrice: number
  packageCredits: number
  onPurchase: () => void
  isPurchasing: boolean
  children: React.ReactNode
}
```

**Usage:**
```tsx
<PurchaseSlider
  songTitle="Royals"
  packagePrice={2}
  packageCredits={2}
  onPurchase={() => purchaseSong()}
  isPurchasing={isLoading}
>
  <Button>Purchase Song Pack</Button>
</PurchaseSlider>
```

### ConnectWalletSheet

Modal interface for Web3 wallet connection with support for multiple connectors.

```typescript
interface ConnectWalletSheetProps {
  connectors: readonly Connector[]
  onConnect: (connector: Connector) => void
  isConnecting: boolean
  error?: Error | null
  children: React.ReactNode
}
```

**Usage:**
```tsx
<ConnectWalletSheet
  connectors={connectors}
  onConnect={(connector) => connect({ connector })}
  isConnecting={status === 'pending'}
  error={connectError}
>
  <Button>Connect Wallet</Button>
</ConnectWalletSheet>
```

### MicrophonePermission

Handles microphone permission requests with user-friendly messaging.

```typescript
interface MicrophonePermissionProps {
  onRequestPermission: () => Promise<void>
}
```

## Base UI Components

### Button

Versatile button component with multiple variants and sizes.

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  asChild?: boolean
}
```

**Variants:**
- `default` - Primary button style
- `outline` - Outlined button
- `ghost` - Transparent background
- `destructive` - For dangerous actions

### Header

Application header with navigation and user account integration.

```typescript
interface HeaderProps {
  onAccountClick?: () => void
  leftContent?: React.ReactNode
}
```

### Sheet

Modal overlay component for forms and detailed content.

```typescript
interface SheetProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}
```

## Styling

All components use Tailwind CSS for styling with a custom design system:

### Color Palette
- **Primary**: Blue gradient (`from-blue-600 to-blue-700`)
- **Secondary**: Neutral grays
- **Success**: Green for positive feedback
- **Warning**: Yellow/orange for caution
- **Error**: Red for errors

### Typography
- **Headers**: Font weight 600-700
- **Body**: Font weight 400
- **Labels**: Font weight 500

### Spacing
Following Tailwind's spacing scale (4px base unit):
- `p-2` (8px), `p-4` (16px), `p-6` (24px), `p-8` (32px)

## Accessibility

All components follow WCAG 2.1 guidelines:

- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Proper ARIA labels and descriptions
- **Color Contrast**: Meets AA standards
- **Focus Management**: Visible focus indicators

## Storybook Integration

All components are documented in Storybook with:

- **Stories**: Different component states
- **Controls**: Interactive property editing
- **Documentation**: Auto-generated props tables

```bash
# Start Storybook
bun run storybook
```

## Theme Customization

Components use CSS custom properties for theming:

```css
:root {
  --primary: 216 100% 64%;
  --secondary: 210 11% 15%;
  --background: 0 0% 4%;
  --foreground: 0 0% 98%;
}
```

## Testing

UI components include comprehensive tests:

```typescript
// Example test
import { render, screen } from '@testing-library/react'
import { Button } from './button'

test('renders button with text', () => {
  render(<Button>Click me</Button>)
  expect(screen.getByRole('button')).toHaveTextContent('Click me')
})
```

## Performance

Components are optimized for performance:

- **Tree Shaking**: Only import used components
- **Bundle Size**: Minimal external dependencies
- **React Optimization**: Proper use of memo and callbacks