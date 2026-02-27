<template>
  <div class="flex h-full w-full relative bg-slate-50 overflow-hidden">
    <!-- Main Canvas Area -->
    <div class="flex-1 relative overflow-auto custom-scrollbar">
      <!-- Dot Grid Background -->
      <div
        class="absolute inset-0 pointer-events-none"
        style="
          background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
          background-size: 20px 20px;
          opacity: 0.5;
        "
      ></div>

      <!-- Graph Visualization (SVG) -->
      <div class="min-h-full min-w-full flex items-center justify-center p-10">
        <svg width="700" height="800" class="overflow-visible">
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
            </marker>
          </defs>

          <!-- Links -->
          <!-- Start -> Initial Plan (left) -->
          <path
            d="M300 80 C 300 100, 180 130, 180 150"
            fill="none"
            stroke="#94a3b8"
            stroke-width="2"
            marker-end="url(#arrowhead)"
          />
          <text x="210" y="108" fill="#6366f1" font-size="10">iter=0</text>

          <!-- Start -> Loop Plan (right) -->
          <path
            d="M300 80 C 300 100, 420 130, 420 150"
            fill="none"
            stroke="#94a3b8"
            stroke-width="2"
            marker-end="url(#arrowhead)"
          />
          <text x="370" y="108" fill="#8b5cf6" font-size="10">iter&gt;0</text>

          <!-- Initial Plan -> Knowledge Retrieval -->
          <path
            d="M180 210 C 180 240, 180 260, 180 280"
            fill="none"
            stroke="#94a3b8"
            stroke-width="2"
            marker-end="url(#arrowhead)"
          />

          <!-- Loop Plan -> PubMed Search -->
          <path
            d="M420 210 C 420 240, 420 260, 420 280"
            fill="none"
            stroke="#94a3b8"
            stroke-width="2"
            marker-end="url(#arrowhead)"
          />

          <!-- Initial Plan -> PubMed (cross) -->
          <path
            d="M240 210 C 280 240, 380 260, 420 280"
            fill="none"
            stroke="#94a3b8"
            stroke-width="1.5"
            stroke-dasharray="4,3"
            marker-end="url(#arrowhead)"
          />

          <!-- Loop Plan -> Knowledge (cross) -->
          <path
            d="M360 210 C 320 240, 220 260, 180 280"
            fill="none"
            stroke="#94a3b8"
            stroke-width="1.5"
            stroke-dasharray="4,3"
            marker-end="url(#arrowhead)"
          />

          <!-- Knowledge Retrieval -> Summary -->
          <path
            d="M180 340 C 180 360, 300 380, 300 410"
            fill="none"
            stroke="#94a3b8"
            stroke-width="2"
            marker-end="url(#arrowhead)"
          />

          <!-- PubMed Search -> Summary -->
          <path
            d="M420 340 C 420 360, 300 380, 300 410"
            fill="none"
            stroke="#94a3b8"
            stroke-width="2"
            marker-end="url(#arrowhead)"
          />

          <!-- Summary -> Output (Yes) -->
          <path
            d="M300 470 C 300 500, 300 520, 300 550"
            fill="none"
            stroke="#22c55e"
            stroke-width="2"
            marker-end="url(#arrowhead)"
          />
          <text x="310" y="510" fill="#22c55e" font-size="12" font-weight="bold">YES</text>

          <!-- Summary -> Loop Plan (No - Loopback) -->
          <path
            d="M360 440 C 540 440, 540 180, 500 180"
            fill="none"
            stroke="#ef4444"
            stroke-width="2"
            stroke-dasharray="5,5"
            marker-end="url(#arrowhead)"
          />
          <text x="500" y="310" fill="#ef4444" font-size="12" font-weight="bold">NO</text>

          <!-- Nodes -->
          <!-- Start -->
          <g transform="translate(240, 40)">
            <rect
              width="120"
              height="40"
              rx="20"
              fill="#e2e8f0"
              stroke="#94a3b8"
              stroke-width="2"
            />
            <text
              x="60"
              y="25"
              text-anchor="middle"
              fill="#475569"
              font-weight="bold"
              font-size="14"
            >
              User Input
            </text>
          </g>

          <!-- Initial Plan Node (left) -->
          <g
            transform="translate(100, 150)"
            class="cursor-pointer hover:opacity-90 transition-opacity"
            @contextmenu.prevent="openDrawer('initialPlan')"
            @click="openDrawer('initialPlan')"
          >
            <rect
              width="160"
              height="60"
              rx="12"
              fill="white"
              stroke="#6366f1"
              stroke-width="2"
              filter="drop-shadow(0 4px 6px rgb(0 0 0 / 0.1))"
            />
            <text
              x="80"
              y="25"
              text-anchor="middle"
              fill="#1e293b"
              font-weight="bold"
              font-size="14"
            >
              Initial Plan
            </text>
            <text x="80" y="45" text-anchor="middle" fill="#64748b" font-size="10">
              首轮规划（需审批）
            </text>
          </g>

          <!-- Loop Plan Node (right) -->
          <g
            transform="translate(340, 150)"
            class="cursor-pointer hover:opacity-90 transition-opacity"
            @contextmenu.prevent="openDrawer('loopPlan')"
            @click="openDrawer('loopPlan')"
          >
            <rect
              width="160"
              height="60"
              rx="12"
              fill="white"
              stroke="#8b5cf6"
              stroke-width="2"
              filter="drop-shadow(0 4px 6px rgb(0 0 0 / 0.1))"
            />
            <text
              x="80"
              y="25"
              text-anchor="middle"
              fill="#1e293b"
              font-weight="bold"
              font-size="14"
            >
              Loop Plan
            </text>
            <text x="80" y="45" text-anchor="middle" fill="#64748b" font-size="10">
              回环规划（无审批）
            </text>
          </g>

          <!-- Knowledge Retrieval Node (left) -->
          <g
            transform="translate(100, 280)"
            class="cursor-pointer hover:opacity-90 transition-opacity"
            @contextmenu.prevent="openDrawer('retrieval')"
            @click="openDrawer('retrieval')"
          >
            <rect
              width="160"
              height="60"
              rx="12"
              fill="white"
              stroke="#f59e0b"
              stroke-width="2"
              filter="drop-shadow(0 4px 6px rgb(0 0 0 / 0.1))"
            />
            <text
              x="80"
              y="25"
              text-anchor="middle"
              fill="#1e293b"
              font-weight="bold"
              font-size="14"
            >
              Knowledge
            </text>
            <text x="80" y="45" text-anchor="middle" fill="#64748b" font-size="10">
              知识库检索与重排
            </text>
          </g>

          <!-- PubMed Search Node (right) -->
          <g
            transform="translate(340, 280)"
            class="cursor-pointer hover:opacity-90 transition-opacity"
            @contextmenu.prevent="openDrawer('pubmed')"
            @click="openDrawer('pubmed')"
          >
            <rect
              width="160"
              height="60"
              rx="12"
              fill="white"
              stroke="#10b981"
              stroke-width="2"
              filter="drop-shadow(0 4px 6px rgb(0 0 0 / 0.1))"
            />
            <text
              x="80"
              y="25"
              text-anchor="middle"
              fill="#1e293b"
              font-weight="bold"
              font-size="14"
            >
              PubMed
            </text>
            <text x="80" y="45" text-anchor="middle" fill="#64748b" font-size="10">
              文献检索（API Key 可选）
            </text>
          </g>

          <!-- Summary & Judge Node -->
          <g
            transform="translate(220, 410)"
            class="cursor-pointer hover:opacity-90 transition-opacity"
            @contextmenu.prevent="openDrawer('summary')"
            @click="openDrawer('summary')"
          >
            <rect
              width="160"
              height="60"
              rx="12"
              fill="white"
              stroke="#ec4899"
              stroke-width="2"
              filter="drop-shadow(0 4px 6px rgb(0 0 0 / 0.1))"
            />
            <text
              x="80"
              y="25"
              text-anchor="middle"
              fill="#1e293b"
              font-weight="bold"
              font-size="14"
            >
              Summary & Judge
            </text>
            <text x="80" y="45" text-anchor="middle" fill="#64748b" font-size="10">
              总结与质量判断
            </text>
          </g>

          <!-- Output -->
          <g transform="translate(240, 550)">
            <rect
              width="120"
              height="40"
              rx="20"
              fill="#e2e8f0"
              stroke="#94a3b8"
              stroke-width="2"
            />
            <text
              x="60"
              y="25"
              text-anchor="middle"
              fill="#475569"
              font-weight="bold"
              font-size="14"
            >
              Output
            </text>
          </g>
        </svg>
      </div>

      <!-- Global Settings Button (Floating) -->
      <div class="absolute top-4 right-4">
        <button
          class="px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-lg text-sm font-medium text-slate-600 hover:text-emerald-600 hover:border-emerald-200 transition-colors flex items-center gap-2"
          @click="openDrawer('global')"
        >
          <svg
            class="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
            <path
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"
            />
          </svg>
          全局设置
        </button>
      </div>
    </div>

    <!-- Right Drawer -->
    <div
      class="absolute top-0 right-0 h-full w-80 bg-white border-l border-slate-200 shadow-xl transform transition-transform duration-300 ease-in-out z-20"
      :class="drawerOpen ? 'translate-x-0' : 'translate-x-full'"
    >
      <div class="h-full flex flex-col">
        <!-- Drawer Header -->
        <div class="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 class="font-semibold text-slate-800">{{ drawerTitle }}</h3>
          <button class="text-slate-400 hover:text-slate-600" @click="drawerOpen = false">
            <svg
              class="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Drawer Content -->
        <div class="flex-1 overflow-y-auto p-4 space-y-6">
          <!-- Initial Plan Node Settings -->
          <template v-if="activeNode === 'initialPlan'">
            <div class="space-y-3">
              <label class="text-sm font-medium text-slate-700">模型选择</label>
              <div class="text-xs text-slate-500 mb-2">首轮深度规划模型（需用户审批）</div>

              <button
                class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white hover:bg-slate-50 hover:border-indigo-300 transition-all flex items-center justify-between group"
                @click="openModelSelector('initialPlan')"
              >
                <div class="flex items-center gap-2">
                  <svg
                    class="w-4 h-4 text-slate-400 group-hover:text-indigo-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
                    />
                    <path
                      d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z"
                    />
                  </svg>
                  <span v-if="store.config.initialPlanModel.modelId" class="text-slate-700">
                    {{ getModelDisplayName('initialPlan') }}
                  </span>
                  <span v-else class="text-slate-400">选择模型</span>
                </div>
                <svg
                  class="w-4 h-4 text-slate-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </div>

            <!-- System Prompt Configuration -->
            <div class="space-y-4 mt-6 pt-4 border-t border-slate-100">
              <!-- Instruction Part -->
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <label class="text-sm font-medium text-slate-700">系统提示词 - 提示区</label>
                  <button
                    class="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    @click="resetPlanInstruction"
                  >
                    <svg
                      class="w-3 h-3"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                    </svg>
                    恢复默认
                  </button>
                </div>
                <div class="text-xs text-slate-500">业务逻辑提示，描述节点任务和目标</div>
                <textarea
                  :value="getPlanInstruction()"
                  :class="[
                    'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 resize-none',
                    !store.config.initialPlanModel.systemPromptInstruction ? 'text-slate-400' : ''
                  ]"
                  rows="5"
                  placeholder="业务逻辑提示..."
                  @input="updatePlanInstruction"
                ></textarea>
              </div>

              <!-- Constraint Part -->
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <label class="text-sm font-medium text-slate-700">系统提示词 - 约束区</label>
                  <button
                    class="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    @click="resetPlanConstraint"
                  >
                    <svg
                      class="w-3 h-3"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                    </svg>
                    恢复默认
                  </button>
                </div>
                <div class="text-xs text-slate-500">JSON 格式约束，一般不需要修改</div>
                <textarea
                  :value="getPlanConstraint()"
                  :class="[
                    'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 resize-none font-mono',
                    !store.config.initialPlanModel.systemPromptConstraint ? 'text-slate-400' : ''
                  ]"
                  rows="8"
                  placeholder="JSON 格式约束..."
                  @input="updatePlanConstraint"
                ></textarea>
              </div>
            </div>
          </template>

          <!-- Loop Plan Node Settings -->
          <template v-if="activeNode === 'loopPlan'">
            <div class="space-y-3">
              <label class="text-sm font-medium text-slate-700">模型选择</label>
              <div class="text-xs text-slate-500 mb-2">
                回环规划模型（summary 打回后使用，无需用户审批）
              </div>

              <button
                class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white hover:bg-slate-50 hover:border-purple-300 transition-all flex items-center justify-between group"
                @click="openModelSelector('loopPlan')"
              >
                <div class="flex items-center gap-2">
                  <svg
                    class="w-4 h-4 text-slate-400 group-hover:text-purple-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
                    />
                    <path
                      d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z"
                    />
                  </svg>
                  <span v-if="store.config.loopPlanModel.modelId" class="text-slate-700">
                    {{ getModelDisplayName('loopPlan') }}
                  </span>
                  <span v-else class="text-slate-400">选择模型</span>
                </div>
                <svg
                  class="w-4 h-4 text-slate-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </div>
          </template>

          <!-- Retrieval Node Settings -->
          <template v-if="activeNode === 'retrieval'">
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-slate-700">开启重排 (Rerank)</label>
                <button
                  class="w-10 h-5 rounded-full relative transition-colors focus:outline-none"
                  :class="store.config.retrieval.enableRerank ? 'bg-emerald-500' : 'bg-slate-200'"
                  @click="toggleEnableRerank"
                >
                  <span
                    class="absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform"
                    :class="store.config.retrieval.enableRerank ? 'translate-x-5' : 'translate-x-0'"
                  ></span>
                </button>
              </div>

              <div
                v-if="store.config.retrieval.enableRerank"
                class="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-100"
              >
                <label class="text-sm font-medium text-slate-700">重排模型</label>
                <button
                  class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white hover:bg-slate-50 hover:border-amber-300 transition-all flex items-center justify-between group"
                  @click="openRerankSelector()"
                >
                  <div class="flex items-center gap-2">
                    <svg
                      class="w-4 h-4 text-slate-400 group-hover:text-amber-500"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path
                        d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
                      />
                      <path
                        d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z"
                      />
                    </svg>
                    <span v-if="store.config.retrieval.rerankModelId" class="text-slate-700">
                      {{ getRerankModelDisplayName() }}
                    </span>
                    <span v-else class="text-slate-400">选择重排模型</span>
                  </div>
                  <svg
                    class="w-4 h-4 text-slate-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
              </div>

              <div class="space-y-3">
                <label class="text-sm font-medium text-slate-700">Top K (最大检索数)</label>
                <div class="flex items-center gap-3">
                  <input
                    :value="store.config.retrieval.topK"
                    type="range"
                    min="1"
                    max="20"
                    class="flex-1 accent-indigo-500"
                    @input="updateTopK"
                  />
                  <span class="text-sm font-mono w-8 text-center">
                    {{ store.config.retrieval.topK }}
                  </span>
                </div>
              </div>
            </div>
          </template>

          <!-- Summary Node Settings -->
          <template v-if="activeNode === 'summary'">
            <div class="space-y-3">
              <label class="text-sm font-medium text-slate-700">模型选择</label>
              <div class="text-xs text-slate-500 mb-2">负责总结检索结果并判断质量的模型</div>

              <button
                class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white hover:bg-slate-50 hover:border-indigo-300 transition-all flex items-center justify-between group"
                @click="openModelSelector('summary')"
              >
                <div class="flex items-center gap-2">
                  <svg
                    class="w-4 h-4 text-slate-400 group-hover:text-indigo-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
                    />
                    <path
                      d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z"
                    />
                  </svg>
                  <span v-if="store.config.summaryModel.modelId" class="text-slate-700">
                    {{ getModelDisplayName('summary') }}
                  </span>
                  <span v-else class="text-slate-400">选择模型</span>
                </div>
                <svg
                  class="w-4 h-4 text-slate-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </div>

            <!-- System Prompt Configuration -->
            <div class="space-y-4 mt-6 pt-4 border-t border-slate-100">
              <!-- Instruction Part -->
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <label class="text-sm font-medium text-slate-700">系统提示词 - 提示区</label>
                  <button
                    class="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    @click="resetSummaryInstruction"
                  >
                    <svg
                      class="w-3 h-3"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                    </svg>
                    恢复默认
                  </button>
                </div>
                <div class="text-xs text-slate-500">业务逻辑提示，描述节点任务和目标</div>
                <textarea
                  :value="getSummaryInstruction()"
                  :class="[
                    'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 resize-none',
                    !store.config.summaryModel.systemPromptInstruction ? 'text-slate-400' : ''
                  ]"
                  rows="5"
                  placeholder="业务逻辑提示..."
                  @input="updateSummaryInstruction"
                ></textarea>
              </div>

              <!-- Constraint Part -->
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <label class="text-sm font-medium text-slate-700">系统提示词 - 约束区</label>
                  <button
                    class="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    @click="resetSummaryConstraint"
                  >
                    <svg
                      class="w-3 h-3"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                    </svg>
                    恢复默认
                  </button>
                </div>
                <div class="text-xs text-slate-500">JSON 格式约束，一般不需要修改</div>
                <textarea
                  :value="getSummaryConstraint()"
                  :class="[
                    'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 resize-none font-mono',
                    !store.config.summaryModel.systemPromptConstraint ? 'text-slate-400' : ''
                  ]"
                  rows="8"
                  placeholder="JSON 格式约束..."
                  @input="updateSummaryConstraint"
                ></textarea>
              </div>
            </div>
          </template>

          <!-- PubMed Node Settings -->
          <template v-if="activeNode === 'pubmed'">
            <div class="space-y-3">
              <div class="text-sm text-slate-600">
                <p class="mb-3">PubMed 文献检索工具已集成，无需额外配置。</p>
                <p class="text-xs text-slate-500">
                  <strong>API Key 配置：</strong>
                  请前往 【设置 → 秘钥管理】 配置 PubMed API Key。
                  <br />
                  •
                  <strong>无 API Key</strong>
                  ：3 次/秒速率限制
                  <br />
                  •
                  <strong>有 API Key</strong>
                  ：10 次/秒速率限制
                </p>
              </div>
            </div>
          </template>

          <!-- Global Settings -->
          <template v-if="activeNode === 'global'">
            <div class="space-y-3">
              <label class="text-sm font-medium text-slate-700">最大迭代次数</label>
              <div class="text-xs text-slate-500">防止规划-判断循环过多的安全限制</div>
              <div class="flex items-center gap-3">
                <input
                  :value="store.config.graph.maxIterations"
                  type="number"
                  min="1"
                  max="10"
                  class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                  @input="updateMaxIterations"
                />
              </div>
            </div>
          </template>
        </div>

        <!-- Drawer Footer -->
        <div class="p-4 border-t border-slate-100 bg-slate-50 text-xs text-slate-400 text-center">
          配置将自动保存
        </div>
      </div>
    </div>

    <!-- Model Selector Modal (for Plan/Summary) -->
    <ModelSelectorModal
      v-model:visible="showModelSelector"
      :current-provider-id="currentProviderId"
      :current-model-id="currentModelId"
      @select="handleModelSelect"
    />

    <!-- Rerank Model Selector Modal -->
    <RerankModelSelectorModal
      v-model:visible="showRerankSelector"
      :current-model-id="store.config.retrieval.rerankModelId"
      @select="handleRerankModelSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useKnowledgeQaConfigStore } from '@renderer/stores/ai-chat/LangchainAgent-Config/knowledge-qa'
import { useModelConfigStore } from '@renderer/stores/model-config/store'
import { useRerankModelStore } from '@renderer/stores/rerank-model/store'
import ModelSelectorModal from '../ModelSelectorModal.vue'
import RerankModelSelectorModal from './RerankModelSelectorModal.vue'
import type { ModelProvider, Model } from '@renderer/stores/model-config/types'
import type { RerankModel } from '@renderer/stores/rerank-model/types'
import { PLANNING_NODE_INSTRUCTION, getPlanningNodeConstraint } from '@prompt/planning.node.prompt'
import { SUMMARY_NODE_INSTRUCTION, getSummaryNodeConstraint } from '@prompt/summary.node.prompt'

const store = useKnowledgeQaConfigStore()
const modelConfigStore = useModelConfigStore()
const rerankModelStore = useRerankModelStore()

const drawerOpen = ref(false)
const activeNode = ref<string>('')
const showModelSelector = ref(false)
const showRerankSelector = ref(false)
const currentSelectorTarget = ref<'initialPlan' | 'loopPlan' | 'summary'>('initialPlan')

const drawerTitle = computed(() => {
  switch (activeNode.value) {
    case 'initialPlan':
      return '首轮规划节点配置'
    case 'loopPlan':
      return '回环规划节点配置'
    case 'retrieval':
      return '检索节点配置'
    case 'pubmed':
      return 'PubMed 检索配置'
    case 'summary':
      return '总结与判断节点配置'
    case 'global':
      return '全局参数设置'
    default:
      return '配置'
  }
})

const currentProviderId = computed(() => {
  switch (currentSelectorTarget.value) {
    case 'initialPlan':
      return store.config.initialPlanModel.providerId
    case 'loopPlan':
      return store.config.loopPlanModel.providerId
    case 'summary':
      return store.config.summaryModel.providerId
    default:
      return null
  }
})

const currentModelId = computed(() => {
  switch (currentSelectorTarget.value) {
    case 'initialPlan':
      return store.config.initialPlanModel.modelId
    case 'loopPlan':
      return store.config.loopPlanModel.modelId
    case 'summary':
      return store.config.summaryModel.modelId
    default:
      return null
  }
})

const openDrawer = (node: string) => {
  activeNode.value = node
  drawerOpen.value = true
}

const openModelSelector = (target: 'initialPlan' | 'loopPlan' | 'summary') => {
  currentSelectorTarget.value = target
  showModelSelector.value = true
}

const openRerankSelector = () => {
  showRerankSelector.value = true
}

const toggleEnableRerank = () => {
  const newValue = !store.config.retrieval.enableRerank
  store.updateRetrievalNode(
    newValue,
    store.config.retrieval.rerankModelId,
    store.config.retrieval.topK
  )
}

const handleModelSelect = (provider: ModelProvider, model: Model) => {
  switch (currentSelectorTarget.value) {
    case 'initialPlan':
      store.updateInitialPlanNode(provider.id, model.id)
      break
    case 'loopPlan':
      store.updateLoopPlanNode(provider.id, model.id)
      break
    case 'summary':
      store.updateSummaryNode(provider.id, model.id)
      break
  }
}

const handleRerankModelSelect = (model: RerankModel) => {
  store.updateRetrievalNode(
    store.config.retrieval.enableRerank,
    model.id,
    store.config.retrieval.topK
  )
}

const getModelDisplayName = (target: 'initialPlan' | 'loopPlan' | 'summary'): string => {
  let providerId: string | null = null
  let modelId: string | null = null

  switch (target) {
    case 'initialPlan':
      providerId = store.config.initialPlanModel.providerId
      modelId = store.config.initialPlanModel.modelId
      break
    case 'loopPlan':
      providerId = store.config.loopPlanModel.providerId
      modelId = store.config.loopPlanModel.modelId
      break
    case 'summary':
      providerId = store.config.summaryModel.providerId
      modelId = store.config.summaryModel.modelId
      break
  }

  if (!providerId || !modelId) return ''

  const provider = modelConfigStore.providers.find((p) => p.id === providerId)
  if (!provider) return modelId

  const model = provider.models.find((m) => m.id === modelId)
  return model ? `${provider.name} / ${model.name}` : modelId
}

const getRerankModelDisplayName = (): string => {
  const modelId = store.config.retrieval.rerankModelId
  if (!modelId) return ''
  return rerankModelStore.getModelDisplayName(modelId)
}

const updateTopK = (event: Event) => {
  const target = event.target as HTMLInputElement
  const newValue = parseInt(target.value, 10)
  store.updateRetrievalNode(
    store.config.retrieval.enableRerank,
    store.config.retrieval.rerankModelId,
    newValue
  )
}

const updateMaxIterations = (event: Event) => {
  const target = event.target as HTMLInputElement
  const newValue = parseInt(target.value, 10)
  if (newValue >= 1 && newValue <= 10) {
    store.updateGraph(newValue)
  }
}

// ==================== Plan Node Prompt Methods ====================

const getPlanInstruction = () => {
  return store.config.initialPlanModel.systemPromptInstruction ?? PLANNING_NODE_INSTRUCTION
}

const getPlanConstraint = () => {
  const maxToolCalls = 10 // PLANNING_MAX_TOOL_CALLS
  return (
    store.config.initialPlanModel.systemPromptConstraint ?? getPlanningNodeConstraint(maxToolCalls)
  )
}

const updatePlanInstruction = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  const value = target.value.trim()
  store.updateInitialPlanPromptInstruction(
    value === PLANNING_NODE_INSTRUCTION ? undefined : value || undefined
  )
}

const updatePlanConstraint = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  const value = target.value.trim()
  const defaultConstraint = getPlanConstraint()
  store.updateInitialPlanPromptConstraint(
    value === defaultConstraint ? undefined : value || undefined
  )
}

const resetPlanInstruction = () => {
  store.updateInitialPlanPromptInstruction(undefined)
}

const resetPlanConstraint = () => {
  store.updateInitialPlanPromptConstraint(undefined)
}

// ==================== Summary Node Prompt Methods ====================

const getSummaryInstruction = () => {
  return store.config.summaryModel.systemPromptInstruction ?? SUMMARY_NODE_INSTRUCTION
}

const getSummaryConstraint = () => {
  const maxIterations = Math.max(1, Math.floor(store.config.graph?.maxIterations ?? 3))
  return store.config.summaryModel.systemPromptConstraint ?? getSummaryNodeConstraint(maxIterations)
}

const updateSummaryInstruction = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  const value = target.value.trim()
  store.updateSummaryPromptInstruction(
    value === SUMMARY_NODE_INSTRUCTION ? undefined : value || undefined
  )
}

const updateSummaryConstraint = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  const value = target.value.trim()
  const defaultConstraint = getSummaryConstraint()
  store.updateSummaryPromptConstraint(value === defaultConstraint ? undefined : value || undefined)
}

const resetSummaryInstruction = () => {
  store.updateSummaryPromptInstruction(undefined)
}

const resetSummaryConstraint = () => {
  store.updateSummaryPromptConstraint(undefined)
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(148, 163, 184, 0.5);
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(148, 163, 184, 0.8);
}
</style>
