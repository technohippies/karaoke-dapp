import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { App } from 'vue'
import Mermaid from '../components/Mermaid.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }: { app: App }) {
    app.component('Mermaid', Mermaid)
  }
} satisfies Theme