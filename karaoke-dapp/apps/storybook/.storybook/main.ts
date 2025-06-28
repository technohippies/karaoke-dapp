import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: [
    '../stories/**/*.stories.@(js|jsx|ts|tsx|mdx)',
    '../stories/**/*.mdx'
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
    // Add Tailwind CSS processing
    return {
      ...config,
      css: {
        postcss: {
          plugins: [],
        },
      },
    };
  },
  docs: {
    autodocs: 'tag',
  },
};

export default config;