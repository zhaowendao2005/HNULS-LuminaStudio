<template>
  <div class="nc_NormalChat_SourcesPlaceholder_a8d3 space-y-3">
    <!-- 仅保留左侧来源区域壳体，chat/agent 数据链路已下线 -->
    <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p class="text-xs font-medium text-slate-600">来源面板（占位）</p>
      <p class="mt-1 text-xs text-slate-400">
        当前版本仅保留页面结构，不再加载知识库与文档选择逻辑。
      </p>
    </div>

    <div class="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-3">
      <p class="text-xs text-slate-500">后续如需恢复来源能力，可在此区域重新接入新数据源。</p>
    </div>
  </div>
</template>

<script setup lang="ts"></script>
