import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: [
    '../stories/**/*.stories.@(js|jsx|ts|tsx|mdx)',
    '../stories/**/*.mdx',
    '../../../packages/ui/src/stories/**/*.stories.@(js|jsx|ts|tsx)'
  ],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-themes',
    '@storybook/addon-docs',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: async (config) => {
    // Import Tailwind PostCSS plugin for better HMR in monorepos
    const { default: tailwindcss } = await import('@tailwindcss/postcss');
    
    // Configure PostCSS with Tailwind
    config.css = {
      ...config.css,
      postcss: {
        plugins: [
          tailwindcss()
        ],
      }
    };
    
    // Ensure proper module resolution for workspace packages
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        '@karaoke-dapp/ui': new URL('../../../packages/ui/src', import.meta.url).pathname,
      },
    };
    
    return config;
  },
  docs: {
    autodocs: 'tag',
  },
};

export default config;