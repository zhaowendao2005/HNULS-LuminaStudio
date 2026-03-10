<template>
  <div
    class="of-generator-workbench of-generator-view flex h-full w-full overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.08),_transparent_38%),linear-gradient(180deg,_#fbfdff_0%,_#f8fafc_100%)] text-slate-900"
  >
    <div class="flex h-full w-full flex-col overflow-hidden">
      <header
        class="flex h-14 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-md"
      >
        <div class="flex min-w-0 items-center gap-3">
          <button
            type="button"
            class="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-900"
            title="返回列表"
            @click="$emit('back')"
          >
            <svg
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <div class="flex min-w-0 flex-col">
            <div class="flex items-center gap-2">
              <span class="text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Generation Studio
              </span>
              <span
                class="rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-cyan-700"
              >
                {{ stageTitle }}
              </span>
            </div>
            <div class="flex min-w-0 items-center gap-2 text-sm text-slate-700">
              <span class="truncate font-semibold">
                {{ session?.workflow_name || '未命名会话' }}
              </span>
              <span class="text-slate-300">/</span>
              <code class="truncate rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                {{ session?.id || '未加载' }}
              </code>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-900"
            title="Agent 模型配置"
            @click="openDrawer('agents')"
          >
            <svg
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M12 3v6" />
              <path d="M12 15v6" />
              <path d="M5.64 5.64l4.24 4.24" />
              <path d="m14.12 14.12 4.24 4.24" />
              <path d="M3 12h6" />
              <path d="M15 12h6" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          <button
            type="button"
            class="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-900"
            title="上下文窗口"
            @click="openDrawer('context')"
          >
            <svg
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          <button
            type="button"
            class="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-900"
            title="查看注入提示词"
            @click="openDrawer('injection')"
          >
            <svg
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M8 13h8" />
              <path d="M8 17h5" />
            </svg>
          </button>
          <button
            type="button"
            class="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-900"
            :title="showRawJson ? '收起协议视图' : '展开协议视图'"
            @click="showRawJson = !showRawJson"
          >
            <svg
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="m8 9 4-4 4 4" />
              <path d="m16 15-4 4-4-4" />
            </svg>
          </button>
        </div>
      </header>

      <div class="flex min-h-0 flex-1 overflow-hidden">
        <aside
          class="of-generator-sidebar flex w-[320px] shrink-0 flex-col border-r border-slate-200/80 bg-white/75 px-3 py-3 backdrop-blur-sm"
        >
          <section class="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  概况
                </div>
                <div class="mt-1 text-[13px] font-semibold text-slate-900">
                  {{ session?.workflow_name || '当前会话' }}
                </div>
              </div>
              <div class="rounded-2xl bg-cyan-50 p-3 text-cyan-700">
                <svg
                  class="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M3 12h4l3 8 4-16 3 8h4" />
                </svg>
              </div>
            </div>
            <div class="mt-4 grid grid-cols-2 gap-3">
              <div class="rounded-2xl bg-slate-50 px-3 py-3">
                <div class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  阶段
                </div>
                <div class="mt-1 text-sm font-semibold text-slate-900">
                  {{ phaseStageMap[currentPhase] }}
                </div>
              </div>
              <div class="rounded-2xl bg-slate-50 px-3 py-3">
                <div class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  状态
                </div>
                <div class="mt-1 text-sm font-semibold" :class="statusToneClass">
                  {{ statusLabelMap[currentStatus] }}
                </div>
              </div>
              <div class="rounded-2xl bg-slate-50 px-3 py-3">
                <div class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  节点数
                </div>
                <div class="mt-1 font-mono text-sm text-slate-900">{{ summary.node_count }}</div>
              </div>
              <div class="rounded-2xl bg-slate-50 px-3 py-3">
                <div class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  校验问题
                </div>
                <div class="mt-1 font-mono text-sm text-slate-900">
                  {{ validationIssues.length }}
                </div>
              </div>
            </div>
          </section>

          <section
            class="mt-4 min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div class="border-b border-slate-100 px-4 py-3">
              <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                会话列表
              </div>
            </div>
            <div class="flex max-h-full flex-col gap-2 overflow-y-auto px-3 py-3">
              <button
                v-for="item in sessions"
                :key="item.id"
                type="button"
                class="rounded-2xl border px-4 py-3 text-left transition-all"
                :class="
                  item.id === session?.id
                    ? 'border-cyan-200 bg-cyan-50/70 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                "
                @click="handleSwitchSession(item.id)"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <div class="truncate text-[13px] font-semibold text-slate-900">
                      {{ item.workflow_name }}
                    </div>
                    <div class="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                      <span
                        class="h-2 w-2 rounded-full"
                        :class="sessionStatusDot(item.status)"
                      ></span>
                      {{ statusLabelMap[item.status] }}
                    </div>
                  </div>
                  <span
                    class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500"
                  >
                    {{ phaseStageMap[item.current_phase] }}
                  </span>
                </div>
              </button>
              <button
                type="button"
                class="px-2 py-2 text-left text-xs font-semibold text-cyan-700 transition-colors hover:text-cyan-800"
                @click="handleCreateSession"
              >
                + 创建新的会话
              </button>
            </div>
          </section>

          <section class="mt-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div class="border-b border-slate-100 px-4 py-3">
              <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                阶段导航
              </div>
            </div>
            <div class="flex flex-col gap-1 px-2 py-2">
              <button
                v-for="stage in stageEntries"
                :key="stage.id"
                type="button"
                class="flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors"
                :class="
                  stage.id === activeStage
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                "
                @click="activeStage = stage.id"
              >
                <span
                  class="inline-flex h-8 w-8 items-center justify-center rounded-2xl text-xs font-semibold"
                  :class="
                    stage.id === activeStage
                      ? 'bg-white/10 text-white'
                      : 'bg-slate-100 text-slate-500'
                  "
                >
                  {{ stage.short }}
                </span>
                <div class="min-w-0">
                  <div class="text-[13px] font-semibold">{{ stage.label }}</div>
                  <div
                    class="text-[11px]"
                    :class="stage.id === activeStage ? 'text-white/70' : 'text-slate-400'"
                  >
                    {{ stage.description }}
                  </div>
                </div>
              </button>
            </div>
          </section>
        </aside>

        <main class="relative flex min-w-0 flex-1 overflow-hidden bg-white/70">
          <section
            class="flex min-w-[360px] flex-col border-r border-slate-200/80 bg-white/85 transition-[width] duration-300"
            :style="{ width: `${leftPanelWidth}px` }"
          >
            <div class="border-b border-slate-100 px-4 py-3">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {{ stageTitle }}
                  </div>
                  <div class="mt-1 text-sm font-semibold text-slate-900">{{ stageSubtitle }}</div>
                </div>
                <button
                  v-if="activeStage === 'topology'"
                  type="button"
                  class="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
                  @click="handleRunStage('topology')"
                >
                  重新生成
                </button>
              </div>
            </div>

            <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <div v-if="activeStage === 'draft'" class="flex h-full flex-col gap-4">
                <div
                  class="flex-1 overflow-y-auto rounded-3xl border border-slate-200 bg-slate-50/70 p-4"
                >
                  <div v-if="draftMessages.length" class="space-y-3">
                    <div
                      v-for="message in draftMessages"
                      :key="message.id"
                      class="rounded-2xl px-4 py-3"
                      :class="
                        message.role === 'user'
                          ? 'ml-10 bg-cyan-600 text-white'
                          : 'mr-10 bg-white text-slate-800 shadow-sm border border-slate-200'
                      "
                    >
                      <div class="whitespace-pre-wrap text-sm leading-7">{{ message.content }}</div>
                      <div
                        v-if="
                          message.meta?.block === 'approval-draft' &&
                          approvalDraft &&
                          approvalDraft.id === message.meta?.approval_id
                        "
                        class="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-slate-800"
                      >
                        <div
                          class="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700"
                        >
                          需求确认
                        </div>
                        <div class="mt-2 text-sm font-semibold text-slate-900">
                          {{ approvalDraft.summary }}
                        </div>
                        <div class="mt-3 grid gap-3 text-xs text-slate-600">
                          <div>
                            <div class="font-semibold text-slate-900">需求清单</div>
                            <div class="mt-1 flex flex-col gap-1">
                              <span v-for="item in approvalDraft.requirements" :key="item">
                                - {{ item }}
                              </span>
                            </div>
                          </div>
                          <div>
                            <div class="font-semibold text-slate-900">设计方向</div>
                            <div class="mt-1 flex flex-col gap-1">
                              <span v-for="item in approvalDraft.design_direction" :key="item">
                                - {{ item }}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div class="mt-4 flex gap-2">
                          <button
                            type="button"
                            class="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                            @click="handleApproval('approved')"
                          >
                            批准并生成计划
                          </button>
                          <button
                            type="button"
                            class="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:border-rose-300 hover:bg-rose-50"
                            @click="handleApproval('rejected')"
                          >
                            继续修改
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    v-else
                    class="flex h-full items-center justify-center text-sm text-slate-400"
                  >
                    从左侧输入需求，开始与 draft agent 对话。
                  </div>
                </div>
                <div class="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
                  <textarea
                    v-model="draftInput"
                    class="min-h-[120px] w-full resize-none bg-transparent px-2 py-2 text-sm leading-7 text-slate-800 outline-none placeholder:text-slate-400"
                    placeholder="描述你想生成的工作流、节点结构、输入输出约束、异常分支与确认方式。"
                  />
                  <div
                    class="mt-2 flex items-center justify-between border-t border-slate-100 px-2 pt-3"
                  >
                    <span class="text-xs text-slate-400">
                      支持连续追问；agent 会在认为需求收敛时给出确认块。
                    </span>
                    <button
                      type="button"
                      class="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
                      @click="handleDraftSend"
                    >
                      发送
                    </button>
                  </div>
                </div>
              </div>

              <div v-else-if="activeStage === 'validation'" class="space-y-4">
                <div class="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                  <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    校验状态
                  </div>
                  <div
                    class="mt-2 text-sm font-semibold"
                    :class="session?.validation.ok ? 'text-emerald-700' : 'text-rose-700'"
                  >
                    {{
                      session?.validation.ok
                        ? '当前可确认编译'
                        : `仍有 ${validationIssues.length} 个待处理问题`
                    }}
                  </div>
                </div>
                <div class="space-y-3">
                  <div
                    v-for="issue in validationIssues"
                    :key="issue.id"
                    class="rounded-2xl border bg-white px-4 py-4 shadow-sm"
                    :class="issue.level === 'error' ? 'border-rose-200' : 'border-amber-200'"
                  >
                    <div class="text-sm font-semibold text-slate-900">{{ issue.message }}</div>
                    <div class="mt-1 text-xs leading-6 text-slate-500">
                      {{ issue.suggested_action }}
                    </div>
                  </div>
                  <div
                    v-if="!validationIssues.length"
                    class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700 shadow-sm"
                  >
                    没有校验问题，可以直接确认编译。
                  </div>
                </div>
                <div class="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
                  <textarea
                    v-model="planInput"
                    class="min-h-[100px] w-full resize-none bg-transparent px-2 py-2 text-sm leading-7 text-slate-800 outline-none placeholder:text-slate-400"
                    placeholder="如果要让计划 agent 继续细化校验，请在这里补充修改意见。"
                  />
                  <div
                    class="mt-2 flex items-center justify-between border-t border-slate-100 px-2 pt-3"
                  >
                    <button
                      type="button"
                      class="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300"
                      @click="handlePlanSend"
                    >
                      发送给计划 Agent
                    </button>
                    <button
                      type="button"
                      class="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                      :disabled="!session?.validation.ok"
                      @click="handleConfirm"
                    >
                      确认并打开编辑器
                    </button>
                  </div>
                </div>
              </div>

              <div v-else class="space-y-3">
                <div
                  v-for="message in sideThreadMessages"
                  :key="message.id"
                  class="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                >
                  <div class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    {{ message.role }}
                  </div>
                  <div class="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-800">
                    {{ message.content }}
                  </div>
                </div>
                <div class="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
                  <textarea
                    v-model="planInput"
                    class="min-h-[120px] w-full resize-none bg-transparent px-2 py-2 text-sm leading-7 text-slate-800 outline-none placeholder:text-slate-400"
                    :placeholder="
                      activeStage === 'plan'
                        ? '告诉计划 agent 如何修改规划草案。'
                        : '告诉拓扑 agent 如何调整图谱与结构。'
                    "
                  />
                  <div
                    class="mt-2 flex items-center justify-between border-t border-slate-100 px-2 pt-3"
                  >
                    <span class="text-xs text-slate-400">
                      {{
                        activeStage === 'plan'
                          ? '支持 replace_plan / patch_plan 语义。'
                          : '这里会驱动 topology_graph agent 重新整理拓扑与 DSL。'
                      }}
                    </span>
                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        class="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300"
                        @click="
                          activeStage === 'plan'
                            ? handleRunStage('plan')
                            : handleRunStage('topology')
                        "
                      >
                        自动生成
                      </button>
                      <button
                        type="button"
                        class="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
                        @click="activeStage === 'plan' ? handlePlanSend() : handleTopologySend()"
                      >
                        发送
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div
            class="of-generator-resize relative w-3 shrink-0 cursor-col-resize bg-transparent transition-colors hover:bg-cyan-50"
            title="拖拽调整左右面板宽度"
            @pointerdown="startResize"
          >
            <div class="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-slate-200"></div>
            <div
              class="absolute left-1/2 top-1/2 h-14 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-300"
            ></div>
          </div>

          <Transition name="of-right-panel">
            <section v-if="showRightPanel" class="flex min-w-0 flex-1 flex-col bg-slate-50/80">
              <div class="border-b border-slate-200/80 bg-white/85 px-4 py-3 backdrop-blur-sm">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <div
                      class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500"
                    >
                      {{ rightPanelTitle }}
                    </div>
                    <div class="mt-1 text-sm font-semibold text-slate-900">
                      {{ rightPanelSubtitle }}
                    </div>
                  </div>
                  <button
                    type="button"
                    class="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
                    @click="showRightPanel = false"
                  >
                    收起
                  </button>
                </div>
              </div>

              <div class="min-h-0 flex-1 overflow-y-auto p-4">
                <div v-if="activeStage === 'plan'" class="space-y-4">
                  <div class="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                    <div
                      class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500"
                    >
                      规划标题
                    </div>
                    <div class="mt-2 text-base font-semibold text-slate-900">
                      {{ planArtifact.title }}
                    </div>
                  </div>
                  <div class="grid gap-4 xl:grid-cols-2">
                    <article
                      class="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
                    >
                      <div
                        class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500"
                      >
                        需求目标
                      </div>
                      <div class="mt-3 flex flex-col gap-2 text-sm text-slate-700">
                        <span v-for="item in planArtifact.objectives" :key="item">
                          - {{ item }}
                        </span>
                      </div>
                    </article>
                    <article
                      class="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
                    >
                      <div
                        class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500"
                      >
                        约束条件
                      </div>
                      <div class="mt-3 flex flex-col gap-2 text-sm text-slate-700">
                        <span v-for="item in planArtifact.constraints" :key="item">
                          - {{ item }}
                        </span>
                      </div>
                    </article>
                  </div>
                  <article class="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                    <div
                      class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500"
                    >
                      步骤清单
                    </div>
                    <div class="mt-3 flex flex-col gap-2 text-sm text-slate-700">
                      <span v-for="item in planArtifact.steps" :key="item">- {{ item }}</span>
                    </div>
                  </article>
                  <article class="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                    <div
                      class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500"
                    >
                      DSL Outline
                    </div>
                    <pre
                      class="mt-3 whitespace-pre-wrap rounded-2xl bg-slate-950 p-4 font-mono text-[12px] leading-6 text-slate-200"
                      >{{ planArtifact.dsl_outline.join('\n') || '暂无 DSL Outline' }}</pre
                    >
                  </article>
                </div>

                <div v-else-if="activeStage === 'topology'" class="space-y-4">
                  <div class="grid gap-4 lg:grid-cols-2">
                    <div class="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                      <div
                        class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500"
                      >
                        图谱摘要
                      </div>
                      <div class="mt-2 text-sm font-semibold text-slate-900">
                        {{ topologyArtifact.summary || '尚未生成拓扑草案' }}
                      </div>
                      <div class="mt-4 grid grid-cols-2 gap-3">
                        <div class="rounded-2xl bg-slate-50 px-3 py-3">
                          <div
                            class="text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                          >
                            节点
                          </div>
                          <div class="mt-1 font-mono text-sm text-slate-900">
                            {{ summary.node_count }}
                          </div>
                        </div>
                        <div class="rounded-2xl bg-slate-50 px-3 py-3">
                          <div
                            class="text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                          >
                            边
                          </div>
                          <div class="mt-1 font-mono text-sm text-slate-900">
                            {{ summary.edge_count }}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                      <div
                        class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500"
                      >
                        拓扑文本
                      </div>
                      <div class="mt-3 flex flex-col gap-2 text-sm text-slate-700">
                        <span v-for="line in topologyArtifact.topology_text" :key="line">
                          - {{ line }}
                        </span>
                        <span v-if="!topologyArtifact.topology_text.length" class="text-slate-400">
                          暂无拓扑文本
                        </span>
                      </div>
                    </div>
                  </div>
                  <article class="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                    <div
                      class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500"
                    >
                      DSL 草案
                    </div>
                    <pre
                      class="mt-3 whitespace-pre-wrap rounded-2xl bg-slate-950 p-4 font-mono text-[12px] leading-6 text-slate-200"
                      >{{ topologyArtifact.dsl_text || '暂无 DSL 输出' }}</pre
                    >
                  </article>
                  <article class="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                    <div
                      class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500"
                    >
                      命名空间
                    </div>
                    <div class="mt-3 flex flex-wrap gap-2">
                      <span
                        v-for="namespace in summary.namespaces"
                        :key="namespace"
                        class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
                      >
                        {{ namespace }}
                      </span>
                      <span v-if="!summary.namespaces.length" class="text-sm text-slate-400">
                        暂无命名空间
                      </span>
                    </div>
                  </article>
                </div>

                <div v-else-if="activeStage === 'validation'" class="space-y-4">
                  <article class="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                    <div
                      class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500"
                    >
                      Review Notes
                    </div>
                    <div class="mt-3 flex flex-col gap-2 text-sm text-slate-700">
                      <span v-for="item in validationArtifact.review_notes" :key="item">
                        - {{ item }}
                      </span>
                    </div>
                  </article>
                  <article class="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                    <div
                      class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500"
                    >
                      协议视图
                    </div>
                    <pre
                      class="mt-3 whitespace-pre-wrap rounded-2xl bg-slate-950 p-4 font-mono text-[12px] leading-6 text-slate-200"
                      >{{ executionPayloadJson }}</pre
                    >
                  </article>
                </div>

                <div v-else class="space-y-4">
                  <article class="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                    <div
                      class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500"
                    >
                      需求摘要
                    </div>
                    <div class="mt-3 text-sm leading-7 text-slate-700">
                      {{ approvalDraft?.summary || draftPrompt || '暂无输入内容。' }}
                    </div>
                  </article>
                  <article class="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                    <div
                      class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500"
                    >
                      Agent 配置概况
                    </div>
                    <div class="mt-3 space-y-2 text-sm text-slate-700">
                      <div
                        v-for="agent in agentEntries"
                        :key="agent.agent_id"
                        class="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3"
                      >
                        <div>
                          <div class="font-semibold text-slate-900">{{ agent.label }}</div>
                          <div class="text-xs text-slate-500">
                            {{ agent.provider || 'provider' }} / {{ agent.model || '未设置' }}
                          </div>
                        </div>
                        <div class="font-mono text-xs text-cyan-700">
                          N={{ agent.context_limit }}
                        </div>
                      </div>
                    </div>
                  </article>
                  <article class="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                    <div
                      class="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500"
                    >
                      Recent Agent Events
                    </div>
                    <div class="mt-3 flex flex-col gap-2 text-sm text-slate-700">
                      <div
                        v-for="event in recentAgentEvents"
                        :key="event.request_id + event.created_at"
                        class="rounded-2xl bg-slate-50 px-3 py-3"
                      >
                        <div class="flex items-center justify-between gap-3">
                          <span class="font-semibold text-slate-900">{{ event.agent_id }}</span>
                          <span class="font-mono text-[11px] text-cyan-700">{{ event.type }}</span>
                        </div>
                        <div class="mt-1 text-xs text-slate-500">
                          {{ event.payload ? JSON.stringify(event.payload) : 'session updated' }}
                        </div>
                      </div>
                      <div v-if="!recentAgentEvents.length" class="text-sm text-slate-400">
                        暂无 agent 事件。
                      </div>
                    </div>
                  </article>
                </div>
              </div>
            </section>
          </Transition>

          <div
            class="absolute bottom-0 left-0 right-0 flex flex-col border-t border-slate-200 bg-white transition-all duration-300"
            :class="showRawJson ? 'h-72' : 'h-8'"
          >
            <button
              type="button"
              class="flex h-8 shrink-0 items-center justify-between bg-slate-50 px-4 text-slate-600 transition-colors hover:bg-slate-100"
              @click="showRawJson = !showRawJson"
            >
              <span class="text-[11px] font-semibold uppercase tracking-wider">
                原始协议报文 (JSON)
              </span>
              <span class="text-sm">{{ showRawJson ? '▾' : '▸' }}</span>
            </button>
            <div v-if="showRawJson" class="flex flex-1 overflow-hidden font-mono text-[11px]">
              <div
                class="w-1/2 overflow-auto border-r border-slate-200 bg-slate-950 p-3 text-emerald-300"
              >
                <div class="mb-2 text-slate-500">// Request</div>
                <pre>{{ requestJson }}</pre>
              </div>
              <div class="w-1/2 overflow-auto bg-slate-950 p-3 text-cyan-300">
                <div class="mb-2 text-slate-500">// Response</div>
                <pre>{{ responseJson }}</pre>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>

    <GenerationConfigDrawer
      :visible="drawerVisible"
      :active-tab="drawerTab"
      :agent-configs="agentConfigs"
      :injection-preview="promptPayloadJson"
      @close="drawerVisible = false"
      @save="handleSaveAgentConfigs"
      @update-agent="handleUpdateAgentConfig"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue'
import type {
  OFGenerationAgentId,
  OFGenerationAgentRuntimeConfig,
  OFGenerationConversationMessage,
  OFGenerationPhase,
  OFGenerationSessionStatus
} from '@shared/Orchestraflow-types'
import {
  getOFDefaultGenerationAgentConfigs,
  normalizeOFGenerationAgentConfigs,
  normalizeOFGenerationSession
} from '@shared/Orchestraflow-types'
import { useWorkflowGenerationStore } from '@renderer/stores/orchestraflow/workflow-generation/workflow-generation.store'
import GenerationConfigDrawer from './GenerationConfigDrawer.vue'

type StageId = 'draft' | 'plan' | 'topology' | 'validation'
type DrawerTab = 'agents' | 'context' | 'injection'

const props = defineProps<{ sessionId: string | null }>()
const emit = defineEmits<{
  (e: 'back'): void
  (e: 'open-workflow', workflowId: string): void
  (e: 'switch-session', sessionId: string): void
}>()

const store = useWorkflowGenerationStore()
const activeStage = ref<StageId>('draft')
const showRightPanel = ref(true)
const showRawJson = ref(false)
const drawerVisible = ref(false)
const drawerTab = ref<DrawerTab>('agents')
const leftPanelWidth = ref(520)
const draftInput = ref('')
const planInput = ref('')
const localAgentConfigs = ref(getOFDefaultGenerationAgentConfigs())

const session = computed(() =>
  store.currentSession ? normalizeOFGenerationSession(store.currentSession) : null
)
const sessions = computed(() => store.sessions)
const currentPhase = computed<OFGenerationPhase>(() => session.value?.current_phase || 'plan')
const currentStatus = computed<OFGenerationSessionStatus>(() => session.value?.status || 'draft')
const summary = computed(
  () =>
    session.value?.preview.summary || {
      node_count: 0,
      edge_count: 0,
      namespaces: [],
      node_types: {}
    }
)
const validationIssues = computed(() => session.value?.validation.issues || [])
const approvalDraft = computed(() => session.value?.artifacts.approval_draft || null)
const planArtifact = computed(
  () =>
    session.value?.artifacts.plan || {
      title: '未生成规划',
      objectives: [],
      constraints: [],
      steps: [],
      dsl_outline: []
    }
)
const topologyArtifact = computed(
  () => session.value?.artifacts.topology || { summary: '', topology_text: [], dsl_text: '' }
)
const validationArtifact = computed(
  () => session.value?.artifacts.validation_review || { review_notes: [] }
)
const agentConfigs = computed(() => localAgentConfigs.value)
const agentEntries = computed(() => [
  agentConfigs.value.draft_chat,
  agentConfigs.value.plan_panel,
  agentConfigs.value.topology_graph
])
const recentAgentEvents = computed(() => store.agentEvents.slice(0, 8))
const draftMessages = computed<OFGenerationConversationMessage[]>(
  () => session.value?.agent_threads.draft_chat.messages || []
)
const sideThreadMessages = computed<OFGenerationConversationMessage[]>(() => {
  if (activeStage.value === 'plan' || activeStage.value === 'validation')
    return session.value?.agent_threads.plan_panel.messages || []
  if (activeStage.value === 'topology')
    return session.value?.agent_threads.topology_graph.messages || []
  return []
})

const stageEntries = [
  {
    id: 'draft' as const,
    short: '草',
    label: '草案规划',
    description: '与 draft agent 交互并确认需求。'
  },
  { id: 'plan' as const, short: '计', label: '计划面板', description: '审阅并修改规划草案。' },
  {
    id: 'topology' as const,
    short: '图',
    label: '拓扑与图谱生成',
    description: '生成 topology / DSL / graph 草案。'
  },
  {
    id: 'validation' as const,
    short: '验',
    label: '校验与确认',
    description: '复审质量并确认编译。'
  }
]

const statusLabelMap: Record<OFGenerationSessionStatus, string> = {
  draft: '草稿',
  running: '进行中',
  'waiting-confirm': '待确认',
  confirmed: '已确认',
  failed: '失败'
}
const phaseStageMap: Record<OFGenerationPhase, string> = {
  plan: '草案规划',
  wire: '拓扑与图谱生成',
  config: '拓扑与图谱生成',
  validate: '校验与确认'
}

const stageTitle = computed(
  () => stageEntries.find((item) => item.id === activeStage.value)?.label || '草案规划'
)
const stageSubtitle = computed(() => {
  if (activeStage.value === 'draft') return '通过多轮对话收敛需求，等待用户批准。'
  if (activeStage.value === 'plan') return 'plan_panel 负责维护规划草案与 DSL Outline。'
  if (activeStage.value === 'topology') return 'topology_graph 负责图谱、拓扑文本与 DSL 草案。'
  return '校验当前产物质量，并决定是否确认编译。'
})
const rightPanelTitle = computed(() =>
  activeStage.value === 'draft' ? '概览 / 配置' : stageTitle.value
)
const rightPanelSubtitle = computed(() => {
  if (activeStage.value === 'plan') return '规划草案挂载在右侧 plan-panel。'
  if (activeStage.value === 'topology') return '拓扑与 DSL 产物在此查看。'
  if (activeStage.value === 'validation') return '质量复审与最终确认。'
  return '当前会话摘要与 agent 配置概况。'
})
const statusToneClass = computed(() => {
  if (currentStatus.value === 'failed') return 'text-rose-600'
  if (currentStatus.value === 'waiting-confirm') return 'text-amber-600'
  if (currentStatus.value === 'confirmed') return 'text-emerald-600'
  return 'text-cyan-700'
})
const promptPayloadJson = computed(() =>
  JSON.stringify(
    {
      session_id: session.value?.id,
      prompt: session.value?.prompt || draftInput.value,
      current_phase: currentPhase.value,
      agent_configs: agentConfigs.value,
      approval_draft: approvalDraft.value,
      plan: planArtifact.value,
      topology: topologyArtifact.value
    },
    null,
    2
  )
)
const executionPayloadJson = computed(() =>
  JSON.stringify(
    {
      validation: session.value?.validation,
      artifacts: session.value?.artifacts,
      current_phase: currentPhase.value
    },
    null,
    2
  )
)
const requestJson = computed(() =>
  JSON.stringify(
    { action: activeStage.value, session_id: session.value?.id, agent_configs: agentConfigs.value },
    null,
    2
  )
)
const responseJson = computed(() => JSON.stringify(session.value, null, 2))

watch(
  () => props.sessionId,
  async (value) => {
    if (value) await store.loadSession(value)
  },
  { immediate: true }
)

watch(
  () => session.value,
  (value) => {
    if (!value) return
    draftInput.value = value.prompt || ''
    localAgentConfigs.value = normalizeOFGenerationAgentConfigs(
      toRaw(value.agent_configs),
      toRaw(value.phase_models)
    )
    activeStage.value = phaseToStage(value.current_phase)
  },
  { immediate: true }
)

onMounted(async () => {
  store.ensureAgentEventBridge()
  await store.fetchSessions()
  if (props.sessionId) await store.loadSession(props.sessionId)
})

function phaseToStage(phase: OFGenerationPhase): StageId {
  if (phase === 'plan') return 'draft'
  if (phase === 'wire' || phase === 'config') return 'topology'
  return 'validation'
}

function openDrawer(tab: DrawerTab) {
  drawerTab.value = tab
  drawerVisible.value = true
}

function sessionStatusDot(status: OFGenerationSessionStatus): string {
  if (status === 'failed') return 'bg-rose-500'
  if (status === 'waiting-confirm') return 'bg-amber-500'
  if (status === 'confirmed') return 'bg-emerald-500'
  if (status === 'running') return 'bg-cyan-500'
  return 'bg-slate-300'
}

async function handleDraftSend() {
  if (!draftInput.value.trim()) return
  await store.sendAgentMessage('draft_chat', draftInput.value)
}

async function handlePlanSend() {
  if (!planInput.value.trim()) return
  await store.sendAgentMessage('plan_panel', planInput.value)
  planInput.value = ''
  showRightPanel.value = true
}

async function handleTopologySend() {
  if (!planInput.value.trim()) return
  await store.sendAgentMessage('topology_graph', planInput.value)
  planInput.value = ''
  showRightPanel.value = true
}

async function handleRunStage(stage: StageId) {
  const mapped =
    stage === 'draft'
      ? 'draft'
      : stage === 'plan'
        ? 'plan'
        : stage === 'topology'
          ? 'topology'
          : 'validation'
  await store.runStage(mapped)
  showRightPanel.value = true
}

async function handleApproval(decision: 'approved' | 'rejected') {
  if (!approvalDraft.value) return
  await store.resolveApproval(approvalDraft.value.id, decision)
  if (decision === 'approved') {
    activeStage.value = 'plan'
    showRightPanel.value = true
  }
}

function handleUpdateAgentConfig(
  agentId: OFGenerationAgentId,
  patch: Partial<OFGenerationAgentRuntimeConfig>
) {
  localAgentConfigs.value = {
    ...localAgentConfigs.value,
    [agentId]: {
      ...localAgentConfigs.value[agentId],
      ...patch,
      agent_id: agentId
    }
  }
}

async function handleSaveAgentConfigs() {
  for (const agent of Object.values(localAgentConfigs.value)) {
    await store.updateAgentConfig(agent.agent_id, agent)
  }
  drawerVisible.value = false
}

async function handleSwitchSession(sessionId: string) {
  await store.loadSession(sessionId)
  emit('switch-session', sessionId)
}

async function handleCreateSession() {
  const created = await store.createSession({
    workflow_name: `生成工作流 ${store.sessions.length + 1}`,
    prompt: ''
  })
  if (created) emit('switch-session', created.id)
}

async function handleConfirm() {
  const result = await store.confirmSession()
  emit('open-workflow', result.workflowId)
}

function startResize(event: PointerEvent) {
  const startX = event.clientX
  const startWidth = leftPanelWidth.value
  const move = (moveEvent: PointerEvent) => {
    const nextWidth = startWidth + moveEvent.clientX - startX
    leftPanelWidth.value = Math.min(760, Math.max(400, nextWidth))
  }
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', () => undefined)
  window.removeEventListener('pointerup', () => undefined)
})
</script>

<style scoped>
.of-right-panel-enter-active,
.of-right-panel-leave-active {
  transition:
    transform 0.34s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.of-right-panel-enter-from,
.of-right-panel-leave-to {
  opacity: 0;
  transform: translateX(18px) scale(0.99);
}
</style>
