import DefaultTheme from 'vitepress/theme'
import { App } from 'vue'
import Mermaid from '../components/Mermaid.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }: { app: App }) {
    app.component('Mermaid', Mermaid)
  }
}