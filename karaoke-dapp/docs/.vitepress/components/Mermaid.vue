<template>
  <div class="mermaid-wrapper">
    <div ref="mermaidRef" class="mermaid">{{ graph }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'

interface Props {
  graph: string
}

const props = defineProps<Props>()
const mermaidRef = ref<HTMLElement>()

onMounted(async () => {
  if (typeof window !== 'undefined') {
    try {
      const mermaid = await import('mermaid')
      mermaid.default.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
      })
      
      await nextTick()
      
      if (mermaidRef.value) {
        const id = `mermaid-${Date.now()}`
        const { svg } = await mermaid.default.render(id, props.graph)
        mermaidRef.value.innerHTML = svg
      }
    } catch (error) {
      console.error('Failed to render Mermaid diagram:', error)
      if (mermaidRef.value) {
        mermaidRef.value.innerHTML = `<pre>${props.graph}</pre>`
      }
    }
  }
})
</script>

<style scoped>
.mermaid-wrapper {
  margin: 1rem 0;
  text-align: center;
}

.mermaid {
  display: inline-block;
}
</style>