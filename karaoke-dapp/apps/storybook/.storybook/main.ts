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
    // Import Tailwind plugin dynamically with content paths
    const { default: tailwindcss } = await import('@tailwindcss/vite');
    config.plugins = config.plugins || [];
    config.plugins.push(tailwindcss({
      content: [
        '../stories/**/*.{js,ts,jsx,tsx}',
        '../web/src/**/*.{js,ts,jsx,tsx}',
      ],
    }));
    return config;
  },
  docs: {
    autodocs: 'tag',
  },
};

export default config;