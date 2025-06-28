import { addons } from 'storybook/manager-api';
import { create } from 'storybook/internal/theming';

addons.setConfig({
  theme: create({
    base: 'dark',
    brandTitle: 'Karaoke dApp',
  }),
});