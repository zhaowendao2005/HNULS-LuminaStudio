<template>
  <div class="nc_NormalChat_Root_a8d3 flex h-full w-full gap-4">
    <!-- nc = NormalChat -->
    <!-- nc_NormalChat_Root_a8d3: 页面根容器 -->
    <!-- nc_NormalChat_LeftPanel_a8d3: 左侧来源面板 -->
    <!-- nc_NormalChat_Center_a8d3: 中间对话区 -->
    <!-- nc_NormalChat_RightPanel_a8d3: 右侧工具面板 -->
    <!-- Left Panel -->
    <section
      class="nc_NormalChat_LeftPanel_a8d3 flex-shrink-0 bg-white border border-slate-200 rounded-2xl overflow-hidden transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col"
      :style="{ width: leftCollapsed ? '64px' : '320px' }"
    >
      <div
        class="nc_NormalChat_LeftHeader_a8d3 flex items-center gap-2 border-b border-slate-100"
        :class="leftCollapsed ? 'justify-center px-2 py-3' : 'px-4 py-3'"
      >
        <div v-if="!leftCollapsed" class="flex-1 min-w-0">
          <WhiteSelect
            v-model="currentTab"
            :options="leftTabOptions"
            placeholder="选择页面"
            trigger-class="!px-3 !py-2 !text-sm !font-semibold border-0 hover:bg-slate-50"
          />
        </div>
        <button
          class="w-7 h-7 flex-shrink-0 rounded-lg border border-slate-200 text-slate-500 hover:text-emerald-600 hover:border-emerald-200 transition-colors flex items-center justify-center"
          @click="leftCollapsed = !leftCollapsed"
        >
          <svg
            class="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path v-if="leftCollapsed" d="M9 6l6 6-6 6" />
            <path v-else d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      <div
        v-if="!leftCollapsed"
        class="nc_NormalChat_LeftContent_a8d3 flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        <!-- Tab: 来源 -->
        <div v-if="currentTab === 'sources'" class="space-y-4">
          <button
            class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-slate-200 text-sm font-medium text-slate-600 hover:border-emerald-200 hover:text-emerald-600 transition-colors"
          >
            <span
              class="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm font-bold"
            >
              +
            </span>
            添加来源
          </button>

          <div class="relative">
            <svg
              class="absolute left-3 top-2.5 w-4 h-4 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="在网络中搜索新来源"
              class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-10 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all"
            />
            <div
              class="absolute right-2 top-2 w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-500 flex items-center justify-center"
            >
              <svg
                class="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </div>

          <div class="flex gap-2">
            <button
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs text-slate-600"
            >
              <span
                class="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[10px]"
              >
                W
              </span>
              Web
            </button>
            <button
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs text-slate-600"
            >
              <span
                class="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[10px]"
              >
                F
              </span>
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
                <div
                  class="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center text-[10px] font-bold"
                >
                  PDF
                </div>
                <div class="text-sm text-slate-600 truncate">{{ item.title }}</div>
              </div>
              <input type="checkbox" :checked="item.checked" class="w-4 h-4 accent-emerald-500" />
            </div>
          </div>
        </div>

        <!-- Tab: 设置 -->
        <div v-else-if="currentTab === 'settings'" class="space-y-4">
          <div class="text-center text-slate-400 py-8">
            <svg
              class="w-12 h-12 mx-auto mb-3 text-slate-300"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="3" />
              <path
                d="M12 1v6m0 6v6m-9-9h6m6 0h6M4.93 4.93l4.24 4.24m5.66 5.66l4.24 4.24M4.93 19.07l4.24-4.24m5.66-5.66l4.24-4.24"
              />
            </svg>
            <p class="text-sm">设置功能开发中...</p>
          </div>
        </div>

        <!-- Tab: 历史 -->
        <div v-else-if="currentTab === 'history'" class="space-y-4">
          <div class="text-center text-slate-400 py-8">
            <svg
              class="w-12 h-12 mx-auto mb-3 text-slate-300"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <p class="text-sm">历史记录功能开发中...</p>
          </div>
        </div>
      </div>
      <div v-else class="nc_NormalChat_LeftCollapsed_a8d3 flex-1" />
    </section>

    <!-- Center Chat -->
    <section
      class="nc_NormalChat_Center_a8d3 flex-1 min-w-0 bg-white/80 border border-slate-200 rounded-2xl overflow-hidden flex flex-col relative"
    >
      <header
        class="nc_NormalChat_CenterHeader_a8d3 h-12 flex items-center justify-between px-6 border-b border-slate-100 bg-white/60 backdrop-blur-sm"
      >
        <!-- Left: Conversation List Trigger -->
        <button
          @click="showConversationList = true"
          class="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-emerald-600 transition-colors group"
        >
          <span>对话</span>
          <svg
            class="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        <!-- Center: Model Selector -->
        <button
          @click="showModelSelector = true"
          class="flex items-center gap-2 px-4 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-600 hover:border-emerald-200 hover:text-emerald-700 hover:shadow-sm transition-all"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span class="uppercase">{{ displayProviderId }}</span>
          <span class="text-slate-300">/</span>
          <span>{{ displayModelId }}</span>
          <svg
            class="w-3 h-3 text-slate-400 ml-1"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        <!-- Right: Actions -->
        <div class="flex items-center gap-2 text-slate-400">
          <button
            class="w-8 h-8 rounded-full hover:bg-slate-100 transition-colors flex items-center justify-center"
          >
            <svg
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M3 10h18" />
              <path d="M7 6h10" />
              <path d="M7 14h10" />
              <path d="M3 18h18" />
            </svg>
          </button>
          <button
            class="w-8 h-8 rounded-full hover:bg-slate-100 transition-colors flex items-center justify-center"
          >
            <svg
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="19" cy="12" r="1.5" />
              <circle cx="5" cy="12" r="1.5" />
            </svg>
          </button>
        </div>
      </header>

      <main
        ref="messagesContainerRef"
        class="nc_NormalChat_CenterMain_a8d3 flex-1 overflow-y-auto px-6 pt-5 pb-44"
      >
        <div class="max-w-3xl mx-auto space-y-8">
          <!-- 消息列表 -->
          <div v-for="msg in messages" :key="msg.id" class="flex w-full gap-4 animate-in fade-in">
            <!-- Avatar -->
            <div
              :class="[
                'w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-sm',
                msg.role === 'assistant'
                  ? 'bg-gradient-to-tr from-emerald-500 to-teal-600'
                  : 'bg-slate-100 text-slate-500'
              ]"
            >
              <span v-if="msg.role === 'assistant'" class="text-xs font-bold">AI</span>
              <span v-else class="text-[10px] font-bold">YOU</span>
            </div>

            <!-- 消息内容 -->
            <div class="flex-1 min-w-0 space-y-3">
              <!-- 角色名称 -->
              <div class="text-xs text-slate-400 font-medium">
                {{ msg.role === 'assistant' ? 'LuminaStudio AI' : 'User' }}
              </div>

              <!-- 深度思考区域 (AI only) -->
              <div
                v-if="msg.role === 'assistant' && msg.thinkingSteps && msg.thinkingSteps.length > 0"
                class="mb-4 w-full"
              >
                <button
                  @click="toggleThinking(msg.id)"
                  :class="[
                    'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 border',
                    isThinkingExpanded(msg.id)
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50'
                  ]"
                >
                  <div class="relative flex items-center justify-center w-5 h-5">
                    <svg
                      v-if="!msg.isThinking"
                      class="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="M12 2v4" />
                      <path d="M12 18v4" />
                      <path d="m4.93 4.93 2.83 2.83" />
                      <path d="m16.24 16.24 2.83 2.83" />
                      <path d="M2 12h4" />
                      <path d="M18 12h4" />
                      <path d="m4.93 19.07 2.83-2.83" />
                      <path d="m16.24 7.76 2.83-2.83" />
                    </svg>
                    <div
                      v-else
                      class="animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent"
                    ></div>
                  </div>
                  <span>{{ msg.isThinking ? '正在思考...' : '深度思考已完成' }}</span>
                  <svg
                    :class="[
                      'w-3.5 h-3.5 ml-auto opacity-50 transition-transform',
                      isThinkingExpanded(msg.id) ? 'rotate-180' : ''
                    ]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                <!-- 思考步骤展开 -->
                <div
                  :class="[
                    'overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]',
                    isThinkingExpanded(msg.id) ? 'max-h-[500px] opacity-100 mt-2' : 'max-h-0 opacity-0'
                  ]"
                >
                  <div class="pl-4 border-l-2 border-emerald-100 space-y-3 py-2">
                    <div
                      v-for="(step, idx) in msg.thinkingSteps"
                      :key="step.id"
                      class="flex items-start gap-3 text-xs animate-in fade-in"
                    >
                      <span class="text-emerald-500 font-mono mt-0.5">{{
                        String(idx + 1).padStart(2, '0')
                      }}</span>
                      <span class="text-slate-600 leading-relaxed">{{ step.content }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 工具调用区域 (AI only) -->
              <div
                v-if="msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0"
                class="space-y-2"
              >
                <div
                  v-for="tool in msg.toolCalls"
                  :key="tool.id"
                  :class="[
                    'border rounded-xl px-3 py-2.5 text-xs transition-all',
                    tool.result
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-amber-50 border-amber-200 animate-pulse'
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
                      <span class="flex-1 font-mono text-[11px] bg-white/50 px-2 py-1 rounded">{{
                        JSON.stringify(tool.input, null, 2)
                      }}</span>
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
                        <pre
                          v-else
                          class="font-mono text-[10px] bg-white/50 px-2 py-1 rounded overflow-x-auto"
                          >{{ JSON.stringify(tool.result, null, 2).slice(0, 200) }}...</pre
                        >
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 主文本内容 -->
              <div v-if="msg.role === 'assistant'" class="text-[15px] leading-relaxed text-slate-800">
                <div v-html="renderMarkdown(msg.content)"></div>
                <span
                  v-if="msg.isStreaming"
                  class="inline-block w-1 h-4 bg-emerald-500 animate-pulse ml-0.5 align-middle"
                ></span>
              </div>
              <div
                v-else
                class="text-[15px] leading-relaxed text-slate-800 whitespace-pre-wrap bg-emerald-50 px-4 py-3 rounded-2xl inline-block"
              >
                {{ msg.content }}
                <span
                  v-if="msg.isStreaming"
                  class="inline-block w-1 h-4 bg-emerald-500 animate-pulse ml-0.5 align-middle"
                ></span>
              </div>

              <!-- Token 使用信息 -->
              <div
                v-if="msg.role === 'assistant' && msg.usage && !msg.isStreaming"
                class="text-[10px] text-slate-400 mt-2"
              >
                Tokens: {{ msg.usage.totalTokens }} (输入: {{ msg.usage.inputTokens }}, 输出:
                {{ msg.usage.outputTokens }}<span v-if="msg.usage.reasoningTokens">
                  , 思考: {{ msg.usage.reasoningTokens }}</span
                >)
              </div>

              <!-- 操作按钮 (AI only) -->
              <div
                v-if="msg.role === 'assistant' && !msg.isStreaming"
                class="mt-3 flex items-center gap-2 text-slate-400"
              >
                <button
                  class="w-7 h-7 rounded-full hover:bg-slate-100 transition-colors flex items-center justify-center"
                  title="复制"
                >
                  <svg
                    class="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
                <button
                  class="w-7 h-7 rounded-full hover:bg-slate-100 transition-colors flex items-center justify-center"
                  title="点赞"
                >
                  <svg
                    class="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M14 9V5a3 3 0 0 0-6 0v4" />
                    <path d="M5 11h14l-1 9H6l-1-9z" />
                  </svg>
                </button>
                <button
                  class="w-7 h-7 rounded-full hover:bg-slate-100 transition-colors flex items-center justify-center"
                  title="点踩"
                >
                  <svg
                    class="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- 正在生成提示 -->
          <div v-if="isGenerating" class="flex gap-4 animate-pulse">
            <div
              class="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm"
            >
              <span class="text-xs font-bold">AI</span>
            </div>
            <div class="flex items-center gap-1.5 mt-3">
              <span class="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-bounce"></span>
              <span
                class="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-bounce [animation-delay:0.2s]"
              ></span>
              <span
                class="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-bounce [animation-delay:0.4s]"
              ></span>
            </div>
          </div>
        </div>
      </main>

      <div
        class="nc_NormalChat_CenterInput_a8d3 absolute bottom-0 left-0 w-full px-6 pb-6 pt-16 bg-gradient-to-t from-white via-white/95 to-transparent"
      >
        <div class="max-w-3xl mx-auto">
          <!-- 智能工具栏 (暂时隐藏，后续可扩展) -->
          <!-- <div class="flex gap-2 mb-3 ml-2">
            <button
              class="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-medium text-emerald-600 hover:border-emerald-200 transition-colors"
            >
              智能润色
            </button>
          </div> -->

          <div
            class="relative bg-white border border-slate-200 rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] focus-within:shadow-[0_8px_40px_rgba(16,185,129,0.12)] focus-within:border-emerald-200 transition-all"
          >
            <textarea
              v-model="userInput"
              @keydown="handleInputKeydown"
              class="w-full min-h-[56px] max-h-40 overflow-y-auto px-12 py-4 focus:outline-none text-[15px] leading-relaxed text-slate-700 placeholder:text-slate-300 resize-none bg-transparent"
              placeholder="开始输入..."
              :disabled="isGenerating"
            ></textarea>
            <div
              class="absolute left-4 top-4 text-slate-300 hover:text-emerald-500 transition-colors cursor-pointer"
            >
              <svg
                class="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.2-9.19a4 4 0 0 1 5.65 5.65L9.64 16.3a2 2 0 0 1-2.83-2.83l8.49-8.48"
                />
              </svg>
            </div>
            <div class="absolute right-3 bottom-3">
              <!-- 中断按钮 (生成中显示) -->
              <button
                v-if="isGenerating"
                @click="handleAbort"
                class="w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg"
                title="中断生成"
              >
                <svg
                  class="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                </svg>
              </button>
              <!-- 发送按钮 (默认显示) -->
              <button
                v-else
                @click="handleSend"
                :disabled="!userInput.trim()"
                class="w-9 h-9 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-100 disabled:bg-slate-300 disabled:cursor-not-allowed"
                title="发送消息"
              >
                <svg
                  class="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M12 19V5" />
                  <path d="m5 12 7-7 7 7" />
                </svg>
              </button>
            </div>
          </div>
          <p class="text-center mt-3 text-[10px] text-slate-300">
            LuminaStudio AI · 支持深度思考与工具调用
          </p>
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
          <svg
            class="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path v-if="rightCollapsed" d="M15 6l-6 6 6 6" />
            <path v-else d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <div
        v-if="!rightCollapsed"
        class="nc_NormalChat_RightContent_a8d3 flex-1 overflow-y-auto px-4 py-4"
      >
        <div class="grid grid-cols-2 gap-3">
          <button
            v-for="tool in tools"
            :key="tool.id"
            :class="[
              'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-colors',
              tool.color
            ]"
          >
            <span class="w-7 h-7 rounded-lg bg-white/60 flex items-center justify-center">
              <svg
                class="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
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
              <div
                class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0"
              >
                <svg
                  class="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
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

    <!-- Modals -->
    <ModelSelectorModal
      v-model:visible="showModelSelector"
      :current-provider-id="currentProviderId"
      :current-model-id="currentModelId"
      @select="handleModelSelect"
    />

    <ConversationListModal v-model:visible="showConversationList" />
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, computed } from 'vue'
import MarkdownIt from 'markdown-it'
import ModelSelectorModal from './components/ModelSelectorModal.vue'
import ConversationListModal from './components/ConversationListModal.vue'
import WhiteSelect, { type WhiteSelectOption } from './components/WhiteSelect.vue'
import { useAiChatStore } from '@renderer/stores/ai-chat/store'
import { useModelConfigStore } from '@renderer/stores/model-config/store'

const chatStore = useAiChatStore()
const modelConfigStore = useModelConfigStore()

// ===== 面板控制 =====
const leftCollapsed = ref(true) // 默认折叠左侧栏
const rightCollapsed = ref(true) // 默认折叠右侧栏

// ===== Tab 控制 =====
const currentTab = ref<string>('sources')
const leftTabOptions: WhiteSelectOption[] = [
  { label: '来源', value: 'sources' },
  { label: '设置', value: 'settings' },
  { label: '历史', value: 'history' }
]

// ===== 模态框控制 =====
const showModelSelector = ref(false)
const showConversationList = ref(false)

// ===== 静态数据 =====
const sourceItems = [
  { id: 12, title: '核酸理论.pdf', checked: true },
  { id: 13, title: '核酸的结构.pdf', checked: true },
  { id: 14, title: '核酸的物理化学性质.pdf', checked: true },
  { id: 15, title: '核酸的研究方法.pdf', checked: true },
  { id: 23, title: '春季汇总.pdf', checked: false },
  { id: 40, title: '基因工程及蛋白质工程.pdf', checked: false }
]

const tools = [
  {
    id: 'audio',
    title: '音频概览',
    icon: 'audio',
    color: 'bg-emerald-50 border-emerald-100 text-emerald-700'
  },
  {
    id: 'video',
    title: '视频概览',
    icon: 'video',
    color: 'bg-emerald-50 border-emerald-100 text-emerald-700'
  },
  {
    id: 'mind',
    title: '思维导图',
    icon: 'mind',
    color: 'bg-purple-50 border-purple-100 text-purple-700'
  },
  {
    id: 'report',
    title: '报告',
    icon: 'report',
    color: 'bg-amber-50 border-amber-100 text-amber-700'
  },
  { id: 'cards', title: '闪卡', icon: 'cards', color: 'bg-rose-50 border-rose-100 text-rose-700' },
  { id: 'quiz', title: '测验', icon: 'quiz', color: 'bg-sky-50 border-sky-100 text-sky-700' },
  {
    id: 'info',
    title: '信息图',
    icon: 'info',
    color: 'bg-indigo-50 border-indigo-100 text-indigo-700'
  },
  {
    id: 'slides',
    title: '演示文稿',
    icon: 'slides',
    color: 'bg-amber-50 border-amber-100 text-amber-700'
  },
  {
    id: 'table',
    title: '数据表格',
    icon: 'table',
    color: 'bg-blue-50 border-blue-100 text-blue-700'
  }
]

const notes = [
  { id: 1, title: '现代分子生物学核心考点指南', time: '46 天前' },
  { id: 2, title: '分子生物学重点', time: '47 天前' },
  { id: 3, title: '细胞生物学复习提纲', time: '51 天前' },
  { id: 4, title: '细胞工程原理与应用概论', time: '53 天前' }
]

const userInput = ref('')
const messagesContainerRef = ref<HTMLElement | null>(null)

const messages = computed(() => chatStore.currentMessages)
const isGenerating = computed(() => chatStore.isGenerating)

const currentProviderId = computed(() => chatStore.currentProviderId)
const currentModelId = computed(() => chatStore.currentModelId)
const displayProviderId = computed(() => currentProviderId.value || 'provider')
const displayModelId = computed(() => currentModelId.value || 'model')

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true
})

const renderMarkdown = (content: string) => {
  return markdown.render(content || '')
}

// ===== 自动滚动 =====
const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainerRef.value) {
    messagesContainerRef.value.scrollTop = messagesContainerRef.value.scrollHeight
  }
}

watch(
  messages,
  () => scrollToBottom(),
  { deep: true, flush: 'post' }
)

// ===== 深度思考折叠状态 =====
const thinkingExpandedMap = ref<Record<string, boolean>>({})

const toggleThinking = (msgId: string) => {
  thinkingExpandedMap.value[msgId] = !thinkingExpandedMap.value[msgId]
}

const isThinkingExpanded = (msgId: string) => {
  return thinkingExpandedMap.value[msgId] ?? true // 默认展开
}

const handleModelSelect = (provider: any, model: any) => {
  chatStore.setCurrentModel(provider.id, model.id)
}

// ===== 发送消息 =====
const handleSend = async () => {
  const input = userInput.value.trim()
  if (!input || isGenerating.value) return

  try {
    await chatStore.sendMessage(input)
    userInput.value = ''
  } catch (error) {
    console.error('AI 生成失败:', error)
  }
}

// ===== 中断生成 =====
const handleAbort = async () => {
  await chatStore.abortGeneration()
}

// ===== 输入框回车发送 =====
const handleInputKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

// 初始化模型配置
modelConfigStore.fetchProviders().catch(() => {})
chatStore.loadAgents().catch(() => {})

watch(
  () => modelConfigStore.providers,
  (providers) => {
    if (chatStore.currentProviderId || providers.length === 0) return
    const firstProvider = providers[0]
    const firstModel = firstProvider.models[0]
    if (firstModel) {
      chatStore.setCurrentModel(firstProvider.id, firstModel.id)
    }
  },
  { deep: true, immediate: true }
)
</script>
