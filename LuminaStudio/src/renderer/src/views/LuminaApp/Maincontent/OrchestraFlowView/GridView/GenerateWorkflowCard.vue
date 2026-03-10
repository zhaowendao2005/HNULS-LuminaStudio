<template>
  <div
    class="of-generate-workflow-card relative col-span-1 inline-flex h-[160px] cursor-pointer flex-col justify-between rounded-xl border-[0.5px] border-cyan-200 bg-[linear-gradient(145deg,_rgba(236,254,255,0.96),_rgba(255,255,255,0.98))] transition-all hover:border-cyan-300 hover:shadow-md"
    @click="$emit('generate')"
  >
    <div class="p-5">
      <div class="text-xs font-medium uppercase tracking-[0.16em] text-cyan-700">AI Generation</div>
      <div class="mt-3 text-lg font-semibold text-slate-900">Describe and generate</div>
      <p class="mt-2 text-sm leading-6 text-slate-600">
        Start with a prompt, preview the topology, validate, then confirm compile.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{ (e: 'generate'): void }>()
</script>
