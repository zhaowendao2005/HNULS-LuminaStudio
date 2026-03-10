<template>
  <section
    class="of-generator-topology-panel rounded-3xl border border-cyan-200 bg-cyan-50/70 p-4 shadow-sm"
  >
    <h3 class="mb-3 text-sm font-semibold text-cyan-900">Topology Preview</h3>
    <div class="space-y-2 text-sm text-cyan-950">
      <div v-for="line in lines" :key="line" class="rounded-2xl bg-white/80 px-3 py-2">
        {{ line }}
      </div>
      <div v-if="!lines.length" class="rounded-2xl bg-white/80 px-3 py-8 text-center text-cyan-700">
        No topology yet.
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{ lines: string[] }>()
</script>
