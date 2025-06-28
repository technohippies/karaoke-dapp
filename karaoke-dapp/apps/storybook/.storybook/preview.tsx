import React from 'react';
import type { Preview } from '@storybook/react';
import '../../web/src/styles/index.css';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        {
          name: 'dark',
          value: '#171717', // neutral-900
        },
      ],
    },
    layout: 'centered',
    darkMode: {
      current: 'dark',
      stylePreview: true,
    },
  },
  decorators: [
    (Story) => {
      // Ensure dark mode is applied to the root
      React.useEffect(() => {
        document.documentElement.classList.add('dark');
      }, []);
      
      return (
        <div className="min-h-screen" style={{ padding: '2rem' }}>
          <Story />
        </div>
      );
    },
  ],
};

export default preview;