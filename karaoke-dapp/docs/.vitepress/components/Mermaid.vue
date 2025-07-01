<template>
  <div class="mermaid-wrapper">
    <div ref="mermaidRef" class="mermaid"><slot /></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'

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
        let graphContent = mermaidRef.value.textContent?.trim() || ''
        
        // Remove code block markers if present
        graphContent = graphContent.replace(/^```\s*/, '').replace(/\s*```$/, '')
        
        console.log('Mermaid content:', JSON.stringify(graphContent))
        
        const id = `mermaid-${Date.now()}`
        const { svg } = await mermaid.default.render(id, graphContent)
        mermaidRef.value.innerHTML = svg
      }
    } catch (error) {
      console.error('Failed to render Mermaid diagram:', error)
      if (mermaidRef.value) {
        let graphContent = mermaidRef.value.textContent?.trim() || ''
        graphContent = graphContent.replace(/^```\s*/, '').replace(/\s*```$/, '')
        mermaidRef.value.innerHTML = `<pre>${graphContent}</pre>`
      }
    }
  }
})
</script>

<style scoped>
.mermaid-wrapper {
  margin: 1rem 0;
  text-align: center;
  overflow-x: auto;
  max-width: 100%;
}

.mermaid {
  display: inline-block;
  max-width: 100%;
}

.mermaid svg {
  max-width: 100%;
  height: auto;
}
</style>