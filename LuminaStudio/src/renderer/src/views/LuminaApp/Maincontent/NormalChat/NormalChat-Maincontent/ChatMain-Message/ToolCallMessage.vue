<template>
  <div class="space-y-2">
    <div
      v-for="tool in toolCalls"
      :key="tool.id"
      :class="[
        'border rounded-xl px-3 py-2.5 text-xs transition-all',
        tool.result ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200 animate-pulse'
      ]"
    >
      <div class="flex items-center gap-2 font-medium mb-2">
        <!-- 动态图标：执行中 vs 已完成 -->
        <div
          v-if="!tool.result"
          class="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin"
        ></div>
        <svg
          v-else
          class="w-4 h-4 text-blue-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
        <span :class="tool.result ? 'text-blue-700' : 'text-amber-700'">
          {{ tool.result ? '工具调用完成' : '正在调用工具...' }}: {{ tool.name }}
        </span>
      </div>

      <!-- 输入参数 -->
      <div class="pl-6 text-slate-600 space-y-1">
        <div class="flex items-start gap-2">
          <span class="text-slate-400 font-medium">输入:</span>
          <span class="flex-1 font-mono text-[11px] bg-white/50 px-2 py-1 rounded">
            {{ JSON.stringify(tool.input, null, 2) }}
          </span>
        </div>

        <!-- 结果区域（只在有结果时显示） -->
        <div v-if="tool.result" class="flex items-start gap-2 mt-2">
          <span class="text-slate-400 font-medium">结果:</span>
          <div class="flex-1 space-y-1">
            <!-- 如果是搜索结果，美化展示 -->
            <div
              v-if="tool.result?.results?.length"
              class="space-y-1.5 bg-white/70 p-2 rounded border border-slate-100"
            >
              <div
                v-for="(item, idx) in (tool.result?.results || []).slice(0, 3)"
                :key="idx"
                class="text-[11px]"
              >
                <div class="font-medium text-blue-600">• {{ item.title }}</div>
                <div v-if="item.snippet" class="text-slate-500 ml-3 mt-0.5">
                  {{ item.snippet }}
                </div>
              </div>
            </div>
            <!-- 其他类型的结果 -->
            <pre v-else class="font-mono text-[10px] bg-white/50 px-2 py-1 rounded overflow-x-auto"
              >{{ JSON.stringify(tool.result, null, 2).slice(0, 200) }}...</pre
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  toolCalls: Array<{
    id: string
    name: string
    input: any
    result?: any
  }>
}>()
</script>
