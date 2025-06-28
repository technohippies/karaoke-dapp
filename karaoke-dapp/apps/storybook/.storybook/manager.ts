import { addons } from 'storybook/manager-api';
import { create } from 'storybook/internal/theming';

addons.setConfig({
  theme: create({
    base: 'dark',
    brandTitle: 'Karaoke dApp',
    
    // UI
    appBg: '#171717',
    appContentBg: '#262626',
    appBorderColor: '#404040',
    appBorderRadius: 4,
    
    // Text colors
    textColor: '#fafafa',
    textInverseColor: '#171717',
    
    // Toolbar default and active colors
    barTextColor: '#e5e5e5',
    barSelectedColor: '#fafafa',
    barBg: '#262626',
  }),
});