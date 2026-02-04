<template>
  <div class="nc_NormalChat_Root_a8d3 flex h-full w-full gap-4">
    <!-- Left Panel -->
    <section
      class="nc_NormalChat_LeftPanel_a8d3 flex-shrink-0 bg-white border border-slate-200 rounded-2xl overflow-hidden transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col"
      :style="{ width: leftCollapsed ? '64px' : '320px' }"
    >
      <div
        class="nc_NormalChat_LeftHeader_a8d3 flex items-center border-b border-slate-100"
        :class="leftCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-4 py-3'"
      >
        <div v-if="!leftCollapsed" class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span class="text-sm font-semibold text-slate-700">来源</span>
        </div>
        <button
          class="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 hover:text-emerald-600 hover:border-emerald-200 transition-colors flex items-center justify-center"
          @click="leftCollapsed = !leftCollapsed"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path v-if="leftCollapsed" d="M9 6l6 6-6 6" />
            <path v-else d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      <div v-if="!leftCollapsed" class="nc_NormalChat_LeftContent_a8d3 flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <button class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-slate-200 text-sm font-medium text-slate-600 hover:border-emerald-200 hover:text-emerald-600 transition-colors">
          <span class="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm font-bold">+</span>
          添加来源
        </button>

        <div class="relative">
          <svg class="absolute left-3 top-2.5 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="在网络中搜索新来源"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-10 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all"
          />
          <div class="absolute right-2 top-2 w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-500 flex items-center justify-center">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        </div>

        <div class="flex gap-2">
          <button class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs text-slate-600">
            <span class="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[10px]">W</span>
            Web
          </button>
          <button class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs text-slate-600">
            <span class="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[10px]">F</span>
            Fast Research
          </button>
        </div>

        <div class="flex items-center justify-between text-xs text-slate-400">
          <span>选择所有来源</span>
          <input type="checkbox" checked class="w-4 h-4 accent-emerald-500" />
        </div>

        <div class="space-y-3">
          <div
            v-for="item in sourceItems"
            :key="item.id"
            class="flex items-center justify-between gap-3"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center text-[10px] font-bold">PDF</div>
              <div class="text-sm text-slate-600 truncate">{{ item.title }}</div>
            </div>
            <input type="checkbox" :checked="item.checked" class="w-4 h-4 accent-emerald-500" />
          </div>
        </div>
      </div>
      <div v-else class="nc_NormalChat_LeftCollapsed_a8d3 flex-1" />
    </section>

    <!-- Center Chat -->
    <section class="nc_NormalChat_Center_a8d3 flex-1 min-w-0 bg-white/80 border border-slate-200 rounded-2xl overflow-hidden flex flex-col relative">
      <header class="nc_NormalChat_CenterHeader_a8d3 h-12 flex items-center justify-between px-6 border-b border-slate-100 bg-white/60 backdrop-blur-sm">
        <div class="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <span>对话</span>
        </div>
        <div class="flex items-center gap-2 text-slate-400">
          <button class="w-8 h-8 rounded-full hover:bg-slate-100 transition-colors flex items-center justify-center">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 10h18" />
              <path d="M7 6h10" />
              <path d="M7 14h10" />
              <path d="M3 18h18" />
            </svg>
          </button>
          <button class="w-8 h-8 rounded-full hover:bg-slate-100 transition-colors flex items-center justify-center">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="19" cy="12" r="1.5" />
              <circle cx="5" cy="12" r="1.5" />
            </svg>
          </button>
        </div>
      </header>

      <main class="nc_NormalChat_CenterMain_a8d3 flex-1 overflow-y-auto px-6 pt-5 pb-44">
        <div class="max-w-3xl mx-auto space-y-8">
          <div v-for="msg in messages" :key="msg.id" class="flex w-full gap-4">
            <div
              :class="[
                'w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0',
                msg.role === 'ai'
                  ? 'bg-gradient-to-tr from-emerald-500 to-teal-600'
                  : 'bg-slate-100 text-slate-500'
              ]"
            >
              <span v-if="msg.role === 'ai'" class="text-xs font-bold">AI</span>
              <span v-else class="text-[10px] font-bold">YOU</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-xs text-slate-400 font-medium mb-2">
                {{ msg.role === 'ai' ? 'EcoMind Agent' : 'User' }}
              </div>
              <div
                :class="[
                  'text-sm leading-relaxed text-slate-800',
                  msg.role === 'user' ? 'bg-emerald-50 px-4 py-3 rounded-2xl inline-block' : ''
                ]"
              >
                <p v-for="(line, idx) in msg.lines" :key="idx" class="mb-2 last:mb-0">
                  {{ line }}
                </p>
                <ul v-if="msg.points" class="list-disc pl-5 space-y-1 text-slate-700">
                  <li v-for="(point, idx) in msg.points" :key="idx">{{ point }}</li>
                </ul>
              </div>
              <div v-if="msg.role === 'ai'" class="mt-3 flex items-center gap-2 text-slate-400">
                <button class="w-7 h-7 rounded-full hover:bg-slate-100 transition-colors flex items-center justify-center">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <rect x="2" y="2" width="13" height="13" rx="2" />
                  </svg>
                </button>
                <button class="w-7 h-7 rounded-full hover:bg-slate-100 transition-colors flex items-center justify-center">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 9V5a3 3 0 0 0-6 0v4" />
                    <path d="M5 11h14l-1 9H6l-1-9z" />
                  </svg>
                </button>
                <button class="w-7 h-7 rounded-full hover:bg-slate-100 transition-colors flex items-center justify-center">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10 9V5a3 3 0 0 1 6 0v4" />
                    <path d="M5 11h14l-1 9H6l-1-9z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div class="nc_NormalChat_CenterInput_a8d3 absolute bottom-0 left-0 w-full px-6 pb-6 pt-16 bg-gradient-to-t from-white via-white/95 to-transparent">
        <div class="max-w-3xl mx-auto">
          <div class="flex gap-2 mb-3 ml-2">
            <button class="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-medium text-emerald-600 hover:border-emerald-200 transition-colors">
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20l9-17-9 6-9-6 9 17z" />
              </svg>
              智能润色
            </button>
            <button class="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-medium text-blue-600 hover:border-blue-200 transition-colors">
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 3h12" />
                <path d="M6 8h12" />
                <path d="M6 13h12" />
                <path d="M6 18h12" />
              </svg>
              智能扩写
            </button>
            <button class="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-medium text-orange-600 hover:border-orange-200 transition-colors">
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h10" />
              </svg>
              智能总结
            </button>
          </div>

          <div class="relative bg-white border border-slate-200 rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] focus-within:shadow-[0_8px_40px_rgba(16,185,129,0.12)] focus-within:border-emerald-200 transition-all">
            <div
              contenteditable="true"
              class="w-full min-h-[56px] max-h-40 overflow-y-auto px-12 py-4 focus:outline-none text-[15px] leading-relaxed text-slate-700 empty:before:content-[attr(placeholder)] empty:before:text-slate-300"
              placeholder="开始输入..."
            ></div>
            <div class="absolute left-4 top-4 text-slate-300 hover:text-emerald-500 transition-colors cursor-pointer">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.2-9.19a4 4 0 0 1 5.65 5.65L9.64 16.3a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </div>
            <div class="absolute right-3 bottom-3">
              <button class="w-9 h-9 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-100">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 19V5" />
                  <path d="m5 12 7-7 7 7" />
                </svg>
              </button>
            </div>
          </div>
          <p class="text-center mt-3 text-[10px] text-slate-300">Powered by Gemini 2.5</p>
        </div>
      </div>
    </section>

    <!-- Right Panel -->
    <section
      class="nc_NormalChat_RightPanel_a8d3 flex-shrink-0 bg-white border border-slate-200 rounded-2xl overflow-hidden transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col"
      :style="{ width: rightCollapsed ? '64px' : '320px' }"
    >
      <div
        class="nc_NormalChat_RightHeader_a8d3 flex items-center border-b border-slate-100"
        :class="rightCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-4 py-3'"
      >
        <div v-if="!rightCollapsed" class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-blue-500"></div>
          <span class="text-sm font-semibold text-slate-700">Studio</span>
        </div>
        <button
          class="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 hover:text-emerald-600 hover:border-emerald-200 transition-colors flex items-center justify-center"
          @click="rightCollapsed = !rightCollapsed"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path v-if="rightCollapsed" d="M15 6l-6 6 6 6" />
            <path v-else d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <div v-if="!rightCollapsed" class="nc_NormalChat_RightContent_a8d3 flex-1 overflow-y-auto px-4 py-4">
        <div class="grid grid-cols-2 gap-3">
          <button
            v-for="tool in tools"
            :key="tool.id"
            :class="['flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-colors', tool.color]"
          >
            <span class="w-7 h-7 rounded-lg bg-white/60 flex items-center justify-center">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <template v-if="tool.icon === 'audio'">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="2" />
                  <circle cx="18" cy="16" r="2" />
                </template>
                <template v-else-if="tool.icon === 'video'">
                  <rect x="3" y="5" width="15" height="14" rx="2" />
                  <path d="m18 9 4-2v10l-4-2z" />
                </template>
                <template v-else-if="tool.icon === 'mind'">
                  <circle cx="9" cy="9" r="3" />
                  <circle cx="17" cy="7" r="2" />
                  <circle cx="17" cy="17" r="2" />
                  <path d="M11.5 10.5l3-2" />
                  <path d="M11.5 12.5l3 2" />
                </template>
                <template v-else-if="tool.icon === 'report'">
                  <rect x="4" y="3" width="16" height="18" rx="2" />
                  <path d="M8 7h8" />
                  <path d="M8 11h8" />
                  <path d="M8 15h5" />
                </template>
                <template v-else-if="tool.icon === 'cards'">
                  <rect x="3" y="5" width="12" height="16" rx="2" />
                  <rect x="9" y="3" width="12" height="16" rx="2" />
                </template>
                <template v-else-if="tool.icon === 'quiz'">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.3-1 .7-1 1.7" />
                  <circle cx="12" cy="17" r="1" />
                </template>
                <template v-else-if="tool.icon === 'info'">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 10v6" />
                  <circle cx="12" cy="7" r="1" />
                </template>
                <template v-else-if="tool.icon === 'slides'">
                  <rect x="3" y="4" width="18" height="12" rx="2" />
                  <path d="M8 20h8" />
                  <path d="M12 16v4" />
                </template>
                <template v-else>
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <path d="M7 8h10" />
                  <path d="M7 12h10" />
                  <path d="M7 16h10" />
                </template>
              </svg>
            </span>
            <span class="text-slate-700">{{ tool.title }}</span>
          </button>
        </div>

        <div class="mt-6 border-t border-slate-100 pt-4">
          <div class="text-xs font-semibold text-slate-500 mb-3">最近笔记</div>
          <div class="space-y-3">
            <div v-for="note in notes" :key="note.id" class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h16v12H7l-3 3V4z" />
                </svg>
              </div>
              <div class="min-w-0">
                <div class="text-sm text-slate-700 truncate">{{ note.title }}</div>
                <div class="text-[10px] text-slate-400 mt-1">{{ note.time }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="nc_NormalChat_RightCollapsed_a8d3 flex-1" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const leftCollapsed = ref(false)
const rightCollapsed = ref(false)

const sourceItems = [
  { id: 12, title: '核酸理论.pdf', checked: true },
  { id: 13, title: '核酸的结构.pdf', checked: true },
  { id: 14, title: '核酸的物理化学性质.pdf', checked: true },
  { id: 15, title: '核酸的研究方法.pdf', checked: true },
  { id: 23, title: '春季汇总.pdf', checked: false },
  { id: 40, title: '基因工程及蛋白质工程.pdf', checked: false }
]

const tools = [
  { id: 'audio', title: '音频概览', icon: 'audio', color: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
  { id: 'video', title: '视频概览', icon: 'video', color: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
  { id: 'mind', title: '思维导图', icon: 'mind', color: 'bg-purple-50 border-purple-100 text-purple-700' },
  { id: 'report', title: '报告', icon: 'report', color: 'bg-amber-50 border-amber-100 text-amber-700' },
  { id: 'cards', title: '闪卡', icon: 'cards', color: 'bg-rose-50 border-rose-100 text-rose-700' },
  { id: 'quiz', title: '测验', icon: 'quiz', color: 'bg-sky-50 border-sky-100 text-sky-700' },
  { id: 'info', title: '信息图', icon: 'info', color: 'bg-indigo-50 border-indigo-100 text-indigo-700' },
  { id: 'slides', title: '演示文稿', icon: 'slides', color: 'bg-amber-50 border-amber-100 text-amber-700' },
  { id: 'table', title: '数据表格', icon: 'table', color: 'bg-blue-50 border-blue-100 text-blue-700' }
]

const notes = [
  { id: 1, title: '现代分子生物学核心考点指南', time: '46 天前' },
  { id: 2, title: '分子生物学重点', time: '47 天前' },
  { id: 3, title: '细胞生物学复习提纲', time: '51 天前' },
  { id: 4, title: '细胞工程原理与应用概论', time: '53 天前' }
]

const messages = [
  {
    id: 1,
    role: 'ai',
    lines: [
      '体细胞杂交技术的应用价值主要体现在突破生殖隔离，创造常规育种无法获得的新材料。',
      '下面是关键要点摘要：'
    ],
    points: [
      '改良基因控制的复杂性状，使多基因协同成为可能。',
      '促进细胞质遗传性状的转移与重组。',
      '为远缘杂交和特异性状导入提供路径。'
    ]
  },
  {
    id: 2,
    role: 'user',
    lines: [
      '请补充一点：原生质体培养在现代育种中的核心价值。'
    ]
  },
  {
    id: 3,
    role: 'ai',
    lines: [
      '原生质体培养是实现植物细胞全能性的基础平台，可用于无性系快速扩繁、突变体筛选与定向改良。'
    ]
  }
]
</script>
