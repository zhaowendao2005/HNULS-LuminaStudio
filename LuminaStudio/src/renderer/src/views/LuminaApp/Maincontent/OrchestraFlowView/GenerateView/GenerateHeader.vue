<template>
  <header
    class="gv-header-k91 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3"
  >
    <div>
      <div class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
        OrchestraFlow Generate
      </div>
      <div class="text-lg font-semibold text-slate-900">Analysis + Design Runtime</div>
    </div>
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
        @click="$emit('create-session')"
      >
        新建会话
      </button>
      <button
        type="button"
        class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
        @click="$emit('open-config')"
      >
        阶段配置
      </button>
      <button
        type="button"
        class="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
        @click="$emit('open-model-selector')"
      >
        选择模型
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
defineEmits<{
  (e: 'create-session'): void
  (e: 'open-config'): void
  (e: 'open-model-selector'): void
}>()
</script>
