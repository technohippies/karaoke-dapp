import type { Config } from 'tailwindcss'
import sharedConfig from '@karaoke-dapp/ui/tailwind.config.js'

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: sharedConfig.theme,
  plugins: sharedConfig.plugins,
} satisfies Config