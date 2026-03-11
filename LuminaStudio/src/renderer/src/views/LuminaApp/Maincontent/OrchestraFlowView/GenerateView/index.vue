<template>
  <div
    class="of-generate-view of-generate-shell h-full w-full overflow-hidden bg-gray-50 text-gray-800"
  >
    <div class="flex h-full w-full flex-col overflow-hidden font-sans">
      <header class="h-12 shrink-0 border-b border-gray-200 bg-white px-4">
        <div class="flex h-full items-center justify-between">
          <div class="flex items-center gap-4">
            <button
              class="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100"
              @click="isLeftSidebarCollapsed = !isLeftSidebarCollapsed"
            >
              <Menu :size="18" />
            </button>
            <div class="flex items-center gap-2">
              <div class="flex h-6 w-6 items-center justify-center rounded bg-gray-800">
                <span class="text-xs font-bold text-white">L</span>
              </div>
              <span class="text-sm font-semibold tracking-wide text-gray-800">LuminaStudio</span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button class="rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100">
              <Search :size="16" />
            </button>
            <button
              class="relative rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100"
            >
              <Bell :size="16" />
              <span class="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-rose-500"></span>
            </button>
            <button class="rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100">
              <User :size="16" />
            </button>
          </div>
        </div>
      </header>

      <div class="relative flex flex-1 overflow-hidden">
        <aside
          :class="[
            'z-10 flex shrink-0 flex-col border-r border-gray-200 bg-white transition-all duration-300 ease-in-out',
            isLeftSidebarCollapsed ? 'w-14' : 'w-56'
          ]"
        >
          <div class="flex-1 overflow-y-auto py-3">
            <div class="mb-5">
              <div
                v-if="!isLeftSidebarCollapsed"
                class="mb-1.5 px-4 text-[10px] font-semibold uppercase tracking-wider text-gray-400"
              >
                基础功能
              </div>
              <nav class="flex flex-col gap-0.5 px-2">
                <button
                  v-for="item in basicMenus"
                  :key="item.value"
                  :title="isLeftSidebarCollapsed ? item.label : undefined"
                  :class="[
                    'group relative flex w-full items-center gap-2 px-2 py-1.5 transition-colors',
                    isLeftSidebarCollapsed ? 'justify-center' : 'justify-start',
                    activeMenu === item.value
                      ? 'text-gray-900'
                      : 'text-gray-500 hover:bg-gray-50/50 hover:text-gray-800'
                  ]"
                  @click="activeMenu = item.value"
                >
                  <span
                    v-if="activeMenu === item.value"
                    class="absolute bottom-1 left-0 top-1 w-0.5 rounded-r-sm bg-gray-800"
                  ></span>
                  <component
                    :is="item.icon"
                    :size="16"
                    :class="
                      activeMenu === item.value
                        ? 'text-gray-800'
                        : 'text-gray-400 group-hover:text-gray-600'
                    "
                  />
                  <span
                    v-if="!isLeftSidebarCollapsed"
                    class="whitespace-nowrap text-[12px] font-medium"
                  >
                    {{ item.label }}
                  </span>
                </button>
              </nav>
            </div>

            <div class="mb-5">
              <div
                v-if="!isLeftSidebarCollapsed"
                class="mb-1.5 px-4 text-[10px] font-semibold uppercase tracking-wider text-gray-400"
              >
                工作流生成
              </div>
              <nav class="flex flex-col gap-0.5 px-2">
                <button
                  v-for="item in workflowMenus"
                  :key="item.value"
                  :title="isLeftSidebarCollapsed ? item.label : undefined"
                  :class="[
                    'group relative flex w-full items-center gap-2 px-2 py-1.5 transition-colors',
                    isLeftSidebarCollapsed ? 'justify-center' : 'justify-start',
                    activeMenu === item.value
                      ? 'text-gray-900'
                      : 'text-gray-500 hover:bg-gray-50/50 hover:text-gray-800'
                  ]"
                  @click="activeMenu = item.value"
                >
                  <span
                    v-if="activeMenu === item.value"
                    class="absolute bottom-1 left-0 top-1 w-0.5 rounded-r-sm bg-gray-800"
                  ></span>
                  <component
                    :is="item.icon"
                    :size="16"
                    :class="
                      activeMenu === item.value
                        ? 'text-gray-800'
                        : 'text-gray-400 group-hover:text-gray-600'
                    "
                  />
                  <span
                    v-if="!isLeftSidebarCollapsed"
                    class="whitespace-nowrap text-[12px] font-medium"
                  >
                    {{ item.label }}
                  </span>
                </button>
              </nav>
            </div>

            <div>
              <div
                v-if="!isLeftSidebarCollapsed"
                class="mb-1.5 px-4 text-[10px] font-semibold uppercase tracking-wider text-gray-400"
              >
                配置
              </div>
              <nav class="flex flex-col gap-0.5 px-2">
                <button
                  v-for="item in configMenus"
                  :key="item.value"
                  :title="isLeftSidebarCollapsed ? item.label : undefined"
                  :class="[
                    'group relative flex w-full items-center gap-2 px-2 py-1.5 transition-colors',
                    isLeftSidebarCollapsed ? 'justify-center' : 'justify-start',
                    activeMenu === item.value
                      ? 'text-gray-900'
                      : 'text-gray-500 hover:bg-gray-50/50 hover:text-gray-800'
                  ]"
                  @click="activeMenu = item.value"
                >
                  <span
                    v-if="activeMenu === item.value"
                    class="absolute bottom-1 left-0 top-1 w-0.5 rounded-r-sm bg-gray-800"
                  ></span>
                  <component
                    :is="item.icon"
                    :size="16"
                    :class="
                      activeMenu === item.value
                        ? 'text-gray-800'
                        : 'text-gray-400 group-hover:text-gray-600'
                    "
                  />
                  <span
                    v-if="!isLeftSidebarCollapsed"
                    class="whitespace-nowrap text-[12px] font-medium"
                  >
                    {{ item.label }}
                  </span>
                </button>
              </nav>
            </div>
          </div>
        </aside>

        <main class="relative flex flex-1 overflow-hidden bg-white">
          <div
            :class="[
              'flex-1 overflow-y-auto transition-all duration-300',
              isRightPanelFullscreen ? 'hidden' : 'block'
            ]"
          >
            <div v-if="activeMenu === 'dashboard'" class="mx-auto max-w-5xl space-y-6 p-6">
              <h2 class="mb-4 text-sm font-semibold text-gray-800">系统概览 Dashboard</h2>

              <div class="grid grid-cols-3 gap-4">
                <div class="group relative overflow-hidden border border-gray-100 p-4">
                  <div class="mb-1 text-xs text-gray-500">活跃会话数</div>
                  <div class="text-2xl font-bold text-gray-800">1,284</div>
                  <div
                    class="absolute bottom-0 left-0 h-1 w-1/3 bg-emerald-500 transition-all group-hover:w-full"
                  ></div>
                </div>
                <div class="group relative overflow-hidden border border-gray-100 p-4">
                  <div class="mb-1 text-xs text-gray-500">已落成设计</div>
                  <div class="text-2xl font-bold text-gray-800">856</div>
                  <div
                    class="absolute bottom-0 left-0 h-1 w-2/3 bg-cyan-500 transition-all group-hover:w-full"
                  ></div>
                </div>
                <div class="group relative overflow-hidden border border-gray-100 p-4">
                  <div class="mb-1 text-xs text-gray-500">系统负载</div>
                  <div class="text-2xl font-bold text-gray-800">42%</div>
                  <div
                    class="absolute bottom-0 left-0 h-1 w-1/2 bg-violet-500 transition-all group-hover:w-full"
                  ></div>
                </div>
              </div>

              <div class="mt-6 border border-gray-100 p-5">
                <div class="mb-6 flex items-center justify-between">
                  <h3 class="text-[13px] font-semibold text-gray-800">请求流量趋势</h3>
                  <div class="flex gap-2">
                    <span class="flex items-center gap-1 text-[10px] uppercase text-gray-500">
                      <span class="h-2 w-2 rounded-full bg-cyan-500"></span>
                      读请求
                    </span>
                    <span class="flex items-center gap-1 text-[10px] uppercase text-gray-500">
                      <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
                      写请求
                    </span>
                  </div>
                </div>
                <div class="relative h-48 w-full">
                  <div class="absolute inset-0 flex flex-col justify-between">
                    <div
                      v-for="line in 5"
                      :key="line"
                      class="h-0 w-full border-b border-gray-50"
                    ></div>
                  </div>
                  <svg
                    class="absolute inset-0 h-full w-full"
                    preserveAspectRatio="none"
                    viewBox="0 0 100 100"
                  >
                    <path
                      d="M0,80 Q10,70 20,85 T40,60 T60,50 T80,70 T100,30 L100,100 L0,100 Z"
                      fill="url(#cyanGrad)"
                      opacity="0.1"
                    />
                    <path
                      d="M0,80 Q10,70 20,85 T40,60 T60,50 T80,70 T100,30"
                      fill="none"
                      stroke="#06b6d4"
                      stroke-width="1.5"
                    />
                    <path
                      d="M0,90 Q15,95 30,80 T50,85 T70,60 T90,75 T100,50 L100,100 L0,100 Z"
                      fill="url(#emeraldGrad)"
                      opacity="0.1"
                    />
                    <path
                      d="M0,90 Q15,95 30,80 T50,85 T70,60 T90,75 T100,50"
                      fill="none"
                      stroke="#10b981"
                      stroke-width="1.5"
                    />
                    <defs>
                      <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#06b6d4" stop-opacity="1" />
                        <stop offset="100%" stop-color="#06b6d4" stop-opacity="0" />
                      </linearGradient>
                      <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#10b981" stop-opacity="1" />
                        <stop offset="100%" stop-color="#10b981" stop-opacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>
            </div>

            <div v-else-if="activeMenu === 'sessions'" class="mx-auto max-w-4xl py-6">
              <div class="mb-4 flex items-center justify-between px-6">
                <h2 class="text-sm font-semibold text-gray-800">会话管理</h2>
                <span
                  class="cursor-pointer rounded bg-cyan-50 px-2 py-1 text-xs text-cyan-600 hover:bg-cyan-100"
                >
                  + 新建会话
                </span>
              </div>

              <div class="flex flex-col">
                <div
                  v-for="session in sessions"
                  :key="session.id"
                  class="group flex cursor-pointer items-center justify-between border-b border-gray-100 px-6 py-3 transition-colors hover:bg-gray-50/50"
                >
                  <div class="flex items-center gap-3">
                    <span
                      :class="['h-2 w-2 rounded-full shadow-sm', getStatusColor(session.status)]"
                    ></span>
                    <span
                      class="text-[13px] font-semibold text-gray-800 transition-colors group-hover:text-cyan-600"
                    >
                      {{ session.title }}
                    </span>
                  </div>
                  <div class="text-xs text-gray-400">{{ session.time }}</div>
                </div>
              </div>
            </div>

            <div
              v-else-if="activeMenu === 'analysis'"
              class="mx-auto flex h-full max-w-4xl flex-col"
            >
              <div class="flex-1 space-y-6 overflow-y-auto px-6 py-4">
                <div class="flex gap-4">
                  <div
                    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100"
                  >
                    <UserCircle :size="18" class="text-gray-500" />
                  </div>
                  <div class="space-y-1.5 pt-1.5">
                    <div class="text-xs font-semibold text-gray-800">User</div>
                    <div class="text-[13px] leading-relaxed text-gray-800">
                      我需要你帮我分析一下“后台权限管理模块”的需求。要求支持
                      RBAC，并且前端要有可视化的角色配置面板。
                    </div>
                  </div>
                </div>

                <div class="flex gap-4">
                  <div
                    class="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-cyan-100 bg-cyan-50"
                  >
                    <Bot :size="18" class="text-cyan-600" />
                  </div>
                  <div class="w-full space-y-1.5 pt-1.5">
                    <div class="text-xs font-semibold text-gray-800">Lumina Agent</div>
                    <div class="text-[13px] leading-relaxed text-gray-800">
                      已收到需求。基于
                      RBAC（基于角色的访问控制）模型，我们需要以下几个核心实体：用户(User)、角色(Role)、权限(Permission)。
                      <br />
                      前端可视化面板需要支持角色树的勾选分配。我将为您生成一份执行计划。
                    </div>
                  </div>
                </div>

                <div class="mt-2 flex gap-4">
                  <div
                    class="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-emerald-100 bg-emerald-50"
                  >
                    <Activity :size="18" class="text-emerald-600" />
                  </div>
                  <div class="w-full">
                    <div class="group relative border-l-2 border-emerald-500 bg-gray-50/50 p-4">
                      <div
                        class="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-600"
                      >
                        <Check :size="12" />
                        计划生成完毕
                      </div>

                      <div class="mb-4 space-y-3">
                        <div>
                          <div class="mb-0.5 text-xs text-gray-500">需求摘要</div>
                          <div class="text-[13px] font-semibold text-gray-800">
                            实现完整的 RBAC 鉴权体系与前端管理 UI
                          </div>
                        </div>
                        <div>
                          <div class="mb-0.5 text-xs text-gray-500">执行步骤</div>
                          <ol class="list-decimal space-y-1 pl-4 text-[13px] text-gray-800">
                            <li>
                              设计数据库表结构 (User, Role, Permission, User_Role, Role_Permission)
                            </li>
                            <li>编写后端鉴权中间件及 CRUD 接口</li>
                            <li>实现前端 "角色管理" 可视化配置面板</li>
                            <li>集成前后端鉴权链路测试</li>
                          </ol>
                        </div>
                      </div>

                      <div class="flex gap-2 border-t border-gray-200 pt-3">
                        <button
                          class="flex items-center gap-1 rounded-sm bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                          @click="activeRightPanel = 'planDesign'"
                        >
                          批准并进入设计
                        </button>
                        <button
                          class="rounded-sm px-3 py-1.5 text-xs font-semibold text-gray-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
                        >
                          不批准
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="shrink-0 border-t border-gray-100 bg-white p-4">
                <div
                  class="relative flex items-center rounded-md border border-gray-200 bg-gray-50 px-3 py-2 transition-all focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400"
                >
                  <input
                    v-model="analysisInput"
                    type="text"
                    placeholder="输入补充需求或修改意见..."
                    class="flex-1 border-none bg-transparent text-[13px] text-gray-800 placeholder-gray-400 focus:outline-none"
                  />
                  <button class="p-1.5 text-gray-400 transition-colors hover:text-cyan-600">
                    <Send :size="16" />
                  </button>
                </div>
              </div>
            </div>

            <div v-else class="p-6 text-[13px] text-gray-500">{{ activeMenu }} 模块开发中...</div>
          </div>

          <div
            :class="[
              'of-generate-right-panel flex shrink-0 flex-col border-l border-gray-200 bg-white transition-all duration-300 ease-in-out',
              activeRightPanel !== null
                ? isRightPanelFullscreen
                  ? 'absolute inset-0 z-20 w-full'
                  : 'relative w-1/2'
                : 'w-0 overflow-hidden border-l-0 opacity-0'
            ]"
          >
            <template v-if="activeRightPanel === 'planDesign'">
              <div class="z-20 flex h-full flex-col bg-white shadow-[-4px_0_24px_rgba(0,0,0,0.03)]">
                <div
                  class="flex h-12 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4"
                >
                  <div class="flex items-center gap-2">
                    <GitBranch :size="16" class="text-gray-400" />
                    <h3 class="text-[13px] font-semibold text-gray-800">计划设计面板</h3>
                    <span class="ml-2 rounded bg-cyan-50 px-1.5 py-0.5 text-[10px] text-cyan-600">
                      交互中
                    </span>
                  </div>
                  <div class="flex items-center gap-1">
                    <button
                      :title="isRightPanelFullscreen ? '退出全屏' : '全屏'"
                      class="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                      @click="isRightPanelFullscreen = !isRightPanelFullscreen"
                    >
                      <Minimize2 v-if="isRightPanelFullscreen" :size="14" />
                      <Maximize2 v-else :size="14" />
                    </button>
                    <div class="mx-1 h-3 w-px bg-gray-200"></div>
                    <button
                      class="rounded p-1.5 text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      @click="closeRightPanel"
                    >
                      <X :size="16" />
                    </button>
                  </div>
                </div>

                <div
                  :class="[
                    'flex flex-1 overflow-hidden',
                    isRightPanelFullscreen ? 'flex-row' : 'flex-col'
                  ]"
                >
                  <div
                    :class="[
                      'flex flex-col bg-white',
                      isRightPanelFullscreen
                        ? 'w-1/2 border-r border-gray-200'
                        : 'h-1/2 border-b border-gray-200'
                    ]"
                  >
                    <div
                      class="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-3 py-2"
                    >
                      <div class="flex items-center gap-2">
                        <FileText :size="14" class="text-gray-400" />
                        <span class="text-xs font-semibold text-gray-700">execution_plan.md</span>
                        <span class="ml-1 text-[10px] text-gray-400">● 包含未保存的更改</span>
                      </div>
                      <div class="flex gap-2">
                        <button class="text-[11px] text-gray-500 hover:text-gray-800">取消</button>
                        <button
                          class="rounded-sm border border-emerald-100/50 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700"
                        >
                          确认合并
                        </button>
                      </div>
                    </div>

                    <div class="flex-1 overflow-y-auto bg-[#fafafa]">
                      <div class="min-w-max pb-4 font-mono text-[12px] leading-[22px]">
                        <div
                          v-for="(line, index) in diffLines"
                          :key="`${line.type}-${index}`"
                          :class="[
                            'group flex',
                            line.type === 'added'
                              ? 'bg-emerald-50/60'
                              : line.type === 'removed'
                                ? 'bg-rose-50/60'
                                : 'hover:bg-gray-100/50'
                          ]"
                        >
                          <div
                            :class="[
                              'w-10 shrink-0 select-none border-r pr-3 text-right',
                              line.type === 'added'
                                ? 'border-emerald-200/50 bg-emerald-100/30 text-emerald-400'
                                : line.type === 'removed'
                                  ? 'border-rose-200/50 bg-rose-100/30 text-rose-400'
                                  : 'border-gray-100 bg-gray-50/50 text-gray-300 group-hover:border-gray-200 group-hover:bg-gray-100/80'
                            ]"
                          >
                            {{ line.num ?? '\u00A0' }}
                          </div>
                          <div
                            :class="[
                              'whitespace-pre pl-4',
                              line.type === 'added'
                                ? 'text-emerald-800'
                                : line.type === 'removed'
                                  ? 'text-rose-700/80 line-through decoration-rose-400/50'
                                  : 'text-gray-700'
                            ]"
                          >
                            {{ line.text }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    :class="['flex flex-col bg-white', isRightPanelFullscreen ? 'w-1/2' : 'h-1/2']"
                  >
                    <div class="border-b border-gray-100 bg-gray-50/80 px-4 py-2">
                      <span
                        class="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500"
                      >
                        <RefreshCw :size="12" />
                        计划修改 Agent
                      </span>
                    </div>

                    <div class="flex-1 space-y-4 overflow-y-auto p-4">
                      <div class="text-center text-xs text-gray-400">
                        您可以直接指示我修改上方计划
                      </div>

                      <div class="flex gap-3">
                        <div
                          class="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-gray-100"
                        >
                          <UserCircle :size="14" class="text-gray-500" />
                        </div>
                        <div
                          class="rounded-bl-md rounded-r-md bg-gray-50 p-2 text-[13px] text-gray-800"
                        >
                          第二步先弄个Mock，前端早点介入，另外需要提前加一个前端权限指令。
                        </div>
                      </div>

                      <div class="flex gap-3">
                        <div
                          class="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-violet-100 bg-violet-50"
                        >
                          <Bot :size="14" class="text-violet-600" />
                        </div>
                        <div class="text-[13px] text-gray-800">
                          没问题，我已经修改了计划：
                          <br />
                          1. 将第二步修改为优先提供 Mock。
                          <br />
                          2. 插入了新的步骤：开发前端
                          <code class="rounded bg-gray-100 px-1 py-0.5 text-[11px] text-rose-500">
                            v-permission
                          </code>
                          指令。
                          <br />
                          <span class="mt-2 block text-xs text-violet-600">
                            请在上方 Diff 视图中查看并确认合并。
                          </span>
                        </div>
                      </div>
                    </div>

                    <div class="border-t border-gray-100 p-3">
                      <div
                        class="relative flex items-center border border-gray-200 bg-gray-50 px-2 py-1.5 transition-all focus-within:border-violet-400 focus-within:ring-1 focus-within:ring-violet-400"
                      >
                        <input
                          v-model="planAgentInput"
                          type="text"
                          placeholder="要求 Agent 调整细节..."
                          class="flex-1 border-none bg-transparent text-xs text-gray-800 placeholder-gray-400 focus:outline-none"
                        />
                        <button class="p-1 text-gray-400 transition-colors hover:text-violet-600">
                          <Send :size="14" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  Activity,
  Bell,
  Bot,
  Check,
  CheckCircle,
  FileText,
  GitBranch,
  LayoutTemplate,
  Maximize2,
  Menu,
  MessageSquare,
  Minimize2,
  RefreshCw,
  Search,
  Send,
  Settings,
  User,
  UserCircle,
  X
} from 'lucide-vue-next'

type MenuValue = 'dashboard' | 'sessions' | 'analysis' | 'design' | 'verify' | 'settings'
type SessionStatus = 'active' | 'planning' | 'completed'
type RightPanel = 'planDesign' | null
type DiffLine = {
  num: number | null
  type: 'context' | 'removed' | 'added'
  text: string
}

type SessionItem = {
  id: string
  title: string
  status: SessionStatus
  time: string
}

type MenuItem = {
  value: MenuValue
  label: string
  icon: any
}

const isLeftSidebarCollapsed = ref(false)
const activeMenu = ref<MenuValue>('analysis')
const activeRightPanel = ref<RightPanel>(null)
const isRightPanelFullscreen = ref(false)
const analysisInput = ref('')
const planAgentInput = ref('')

const basicMenus: MenuItem[] = [
  { value: 'dashboard', label: 'Dashboard', icon: Activity },
  { value: 'sessions', label: '会话管理', icon: MessageSquare }
]

const workflowMenus: MenuItem[] = [
  { value: 'analysis', label: '需求分析与计划', icon: GitBranch },
  { value: 'design', label: '设计落成', icon: LayoutTemplate },
  { value: 'verify', label: '校验', icon: CheckCircle }
]

const configMenus: MenuItem[] = [{ value: 'settings', label: '全局配置', icon: Settings }]

const sessions: SessionItem[] = [
  { id: '1', title: '电商平台重构计划与分析', status: 'active', time: '10 分钟前' },
  { id: '2', title: '后台权限管理模块设计', status: 'planning', time: '2 小时前' },
  { id: '3', title: '用户中心 API 校验流', status: 'completed', time: '昨天' },
  { id: '4', title: '数据看板图表组件抽取', status: 'active', time: '2 天前' }
]

const diffLines: DiffLine[] = [
  { num: 1, type: 'context', text: '# 核心执行计划：后台权限管理' },
  { num: 2, type: 'context', text: '' },
  { num: 3, type: 'context', text: '## 阶段 1：基础架构' },
  { num: 4, type: 'context', text: '- [x] 设计数据库表结构 (User, Role, Permission)' },
  { num: null, type: 'removed', text: '- [ ] 编写后端鉴权中间件及 CRUD 接口' },
  { num: 5, type: 'added', text: '+ [ ] 编写后端鉴权中间件及 CRUD 接口' },
  { num: 6, type: 'added', text: '+     > 注意: 优先提供 Mock 数据，便于前端尽早联调' },
  { num: 7, type: 'added', text: '+ [ ] 开发前端 `v-permission` 细粒度权限指令' },
  { num: 8, type: 'context', text: '- [ ] 实现前端 "角色管理" 可视化配置面板' },
  { num: 9, type: 'context', text: '- [ ] 集成前后端鉴权链路测试' },
  { num: 10, type: 'context', text: '' }
]

function closeRightPanel() {
  activeRightPanel.value = null
  isRightPanelFullscreen.value = false
}

function getStatusColor(status: SessionStatus) {
  switch (status) {
    case 'active':
      return 'bg-cyan-500'
    case 'planning':
      return 'bg-amber-500'
    case 'completed':
      return 'bg-emerald-500'
    default:
      return 'bg-gray-300'
  }
}
</script>

<style scoped src="./generate-view.scss"></style>
