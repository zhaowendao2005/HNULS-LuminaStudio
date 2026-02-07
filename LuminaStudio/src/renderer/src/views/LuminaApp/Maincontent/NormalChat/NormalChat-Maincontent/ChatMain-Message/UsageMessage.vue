<template>
  <div class="text-[10px] text-slate-400 mt-2">
    Tokens: {{ usage.totalTokens }} (输入: {{ usage.inputTokens }}, 输出:
    {{ usage.outputTokens }}
    <span v-if="usage.reasoningTokens">, 思考: {{ usage.reasoningTokens }}</span>
    )
  </div>
</template>

<script setup lang="ts">
defineProps<{
  usage: {
    totalTokens: number
    inputTokens: number
    outputTokens: number
    reasoningTokens?: number
  }
}>()
</script>
