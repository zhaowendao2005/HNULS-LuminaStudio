<template>
  <section
    class="nc_NormalChat_Center_a8d3 flex-1 min-w-0 bg-white/80 border border-slate-200 rounded-2xl overflow-hidden flex flex-col relative"
  >
    <header
      class="nc_NormalChat_CenterHeader_a8d3 h-12 flex items-center justify-between px-6 border-b border-slate-100 bg-white/60 backdrop-blur-sm"
    >
      <div class="flex items-center gap-2">
        <span class="inline-flex w-2 h-2 rounded-full bg-emerald-500"></span>
        <span class="text-sm font-semibold text-slate-700">NormalChat 主区壳体</span>
      </div>
      <span class="text-xs text-slate-400">Chat/Agent 内核已移除</span>
    </header>

    <main class="nc_NormalChat_CenterMain_a8d3 flex-1 flex items-center justify-center p-8">
      <!-- 保留中间主区的视觉结构，便于后续接入新的业务模块 -->
      <div class="max-w-xl w-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8">
        <p class="text-sm font-semibold text-slate-700">中间内容区（占位）</p>
        <p class="mt-2 text-xs leading-6 text-slate-500">
          当前页面仅保留布局外壳与交互容器，原有消息流、输入栏、模型切换、历史会话等能力已下线。
        </p>
      </div>
    </main>
  </section>
</template>

<script setup lang="ts"></script>
