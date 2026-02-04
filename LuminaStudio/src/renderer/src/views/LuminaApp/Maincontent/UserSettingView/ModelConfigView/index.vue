<template>
  <div
    class="usersetting-model-config flex h-full w-full bg-[#f9f9f9] text-gray-800 font-sans overflow-hidden"
  >
    <!-- 左侧边栏 -->
    <div
      class="w-72 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col z-20 shadow-[2px_0_15px_rgba(0,0,0,0.03)]"
    >
      <div class="h-16 flex items-center px-5 border-b border-gray-100">
        <div
          class="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white mr-3 shadow-md shadow-gray-200"
        >
          <!-- Cpu Icon -->
          <svg
            class="w-[18px] h-[18px]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
            <rect x="9" y="9" width="6" height="6"></rect>
            <line x1="9" y1="1" x2="9" y2="4"></line>
            <line x1="15" y1="1" x2="15" y2="4"></line>
            <line x1="9" y1="20" x2="9" y2="23"></line>
            <line x1="15" y1="20" x2="15" y2="23"></line>
            <line x1="20" y1="9" x2="23" y2="9"></line>
            <line x1="20" y1="14" x2="23" y2="14"></line>
            <line x1="1" y1="9" x2="4" y2="9"></line>
            <line x1="1" y1="14" x2="4" y2="14"></line>
          </svg>
        </div>
        <span class="font-bold text-lg tracking-tight text-gray-900">模型管理</span>
      </div>

      <div class="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 py-2 mb-1">
          模型服务商
        </div>
        <div
          v-for="provider in providers"
          :key="provider.id"
          class="group relative flex items-center justify-between px-3 py-3 rounded-xl cursor-pointer transition-all duration-200 border"
          :class="
            selectedProviderId === provider.id
              ? 'bg-blue-50/80 border-blue-200 text-blue-700 shadow-sm'
              : 'bg-white border-transparent hover:bg-gray-100 hover:border-gray-200 text-gray-700'
          "
          @click="selectProvider(provider.id)"
        >
          <div class="flex items-center gap-3 overflow-hidden">
            <div
              class="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center border transition-colors"
              :class="
                selectedProviderId === provider.id
                  ? 'bg-white border-blue-100 text-blue-600'
                  : 'bg-gray-50 border-gray-100 text-gray-500'
              "
            >
              <!-- Zap Icon for openai -->
              <svg
                v-if="provider.icon === 'openai'"
                class="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
              </svg>
              <!-- Server Icon for server -->
              <svg
                v-else-if="provider.icon === 'server'"
                class="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                <line x1="6" y1="6" x2="6.01" y2="6"></line>
                <line x1="6" y1="18" x2="6.01" y2="18"></line>
              </svg>
              <!-- Box Icon for default -->
              <svg
                v-else
                class="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
                ></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
            </div>
            <div class="flex flex-col min-w-0">
              <span
                class="font-semibold text-sm truncate"
                :class="selectedProviderId === provider.id ? 'text-blue-900' : 'text-gray-700'"
              >
                {{ provider.name }}
              </span>
              <span class="text-[10px] text-gray-400 truncate flex items-center gap-1.5 mt-0.5">
                <span
                  class="w-1.5 h-1.5 rounded-full"
                  :class="provider.enabled ? 'bg-green-500' : 'bg-gray-300'"
                ></span>
                {{ provider.type === 'openai' ? 'OpenAI Protocol' : 'Custom' }}
              </span>
            </div>
          </div>
          <div class="flex items-center">
            <svg
              v-if="selectedProviderId === provider.id"
              class="w-[14px] h-[14px] text-blue-400 opacity-80"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
            <button
              v-else
              class="p-1.5 rounded-md text-gray-400 hover:bg-red-50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              @click.stop="handleDeleteProvider(provider.id)"
            >
              <!-- Trash2 Icon -->
              <svg
                class="w-[14px] h-[14px]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="3 6 5 6 21 6"></polyline>
                <path
                  d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                ></path>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div class="p-4 border-t border-gray-100 bg-gray-50/30 backdrop-blur-sm">
        <button
          class="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-blue-300 hover:text-blue-600 hover:shadow-md text-gray-600 font-medium py-3 rounded-xl transition-all duration-200 shadow-sm"
          @click="isAddProviderModalOpen = true"
        >
          <!-- Plus Icon -->
          <svg
            class="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span class="text-sm">添加提供商</span>
        </button>
      </div>
    </div>

    <!-- 右侧主区域 -->
    <div class="flex-1 flex flex-col h-full overflow-hidden bg-[#fafafa]">
      <!-- Header -->
      <div
        v-if="selectedProvider"
        class="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 px-8 flex items-center justify-between sticky top-0 z-10"
      >
        <div class="flex items-center gap-4">
          <div class="flex flex-col">
            <h1 class="text-xl font-bold text-gray-800 flex items-center gap-2">
              {{ selectedProvider.name }}
              <span
                class="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-mono rounded border border-gray-200 tracking-wide uppercase"
              >
                {{ selectedProvider.type }}
              </span>
            </h1>
          </div>
        </div>
      </div>

      <!-- 内容滚动区 -->
      <div class="flex-1 overflow-y-auto p-8">
        <!-- 骨架屏：没有提供商时显示 -->
        <div
          v-if="!selectedProvider && providers.length === 0"
          class="max-w-4xl mx-auto space-y-8 pb-20">
        >
          <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-8">
            <div class="animate-pulse space-y-6">
              <div class="h-4 bg-gray-200 rounded w-1/4"></div>
              <div class="space-y-4">
                <div class="h-3 bg-gray-200 rounded w-1/6"></div>
                <div class="h-10 bg-gray-100 rounded"></div>
              </div>
              <div class="space-y-4">
                <div class="h-3 bg-gray-200 rounded w-1/6"></div>
                <div class="h-10 bg-gray-100 rounded"></div>
              </div>
            </div>
            <div class="mt-8 pt-8 border-t border-gray-100 text-center">
              <p class="text-sm text-gray-500">请先添加模型服务商</p>
            </div>
          </div>
        </div>

        <!-- 正常内容：有提供商时显示 -->
        <div v-else class="max-w-4xl mx-auto space-y-8 pb-20">
          <!-- Settings Card -->
          <section class="space-y-4">
            <div class="flex items-center gap-2 mb-2">
              <div class="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                <!-- Settings Icon -->
                <svg
                  class="w-[18px] h-[18px]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <circle cx="12" cy="12" r="3"></circle>
                  <path
                    d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"
                  ></path>
                </svg>
              </div>
              <h2 class="text-lg font-bold text-gray-900">服务配置</h2>
            </div>
            <div
              class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-6 grid grid-cols-1 gap-6"
            >
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  API Key
                </label>
                <input
                  v-model="apiKeyDraft"
                  type="password"
                  class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono"
                  placeholder="sk-..."
                  @blur="handleApiKeyBlur"
                />
              </div>
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  API Host URL
                </label>
                <input
                  v-model="baseUrlDraft"
                  type="text"
                  class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono"
                  placeholder="https://api.openai.com"
                  @blur="handleBaseUrlBlur"
                />
                <!-- 端点信息提示 -->
                <div class="mt-2 space-y-1">
                  <p class="text-[10px] text-gray-400 font-mono">
                    <span class="text-gray-500">端点：</span>
                    <span v-if="baseUrlDraft">{{ computedModelsEndpoint }}</span>
                    <span v-else class="text-gray-300">请输入 API Host URL</span>
                  </p>
                  <p class="text-[10px] text-gray-400 font-mono">
                    <span class="text-gray-500">Chat：</span>
                    <span v-if="baseUrlDraft">{{ computedChatEndpoint }}</span>
                    <span v-else class="text-gray-300">请输入 API Host URL</span>
                  </p>
                  <p class="text-[10px] text-gray-400 font-mono">
                    <span class="text-gray-500">Completion：</span>
                    <span v-if="baseUrlDraft">{{ computedCompletionEndpoint }}</span>
                    <span v-else class="text-gray-300">请输入 API Host URL</span>
                  </p>
                </div>
              </div>
            </div>
          </section>

          <!-- Models Card -->
          <section class="space-y-4">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <div class="p-1.5 bg-purple-100 text-purple-600 rounded-lg">
                  <!-- Box Icon -->
                  <svg
                    class="w-[18px] h-[18px]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
                    ></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                  </svg>
                </div>
                <h2 class="text-lg font-bold text-gray-900">模型列表</h2>
                <span
                  class="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full font-medium"
                >
                  {{ selectedProvider?.models.length || 0 }}
                </span>
              </div>
              <div class="flex gap-2">
                <button
                  class="text-xs font-medium bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg transition-all flex items-center gap-2 shadow-sm"
                  @click="handleOpenManageModels"
                >
                  <!-- ListFilter Icon -->
                  <svg
                    class="w-[14px] h-[14px]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M3 6h18M7 12h10M11 18h2"></path>
                  </svg>
                  管理模型
                </button>
                <button
                  class="text-xs font-medium bg-black text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition-all flex items-center gap-1.5 shadow-sm"
                  @click="isAddModelModalOpen = true"
                >
                  <!-- Plus Icon -->
                  <svg
                    class="w-[14px] h-[14px]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  手动添加
                </button>
              </div>
            </div>

            <div
              class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-h-[120px]"
            >
              <!-- 按分组显示模型列表 -->
              <div v-if="groupedModels.length > 0" class="divide-y divide-gray-100">
                <div v-for="[groupName, models] in groupedModels" :key="groupName" class="p-4">
                  <!-- 分组标题 -->
                  <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        {{ groupName || '未分组' }}
                      </span>
                      <span class="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-md">
                        {{ models.length }}
                      </span>
                    </div>
                  </div>
                  <!-- 模型列表 -->
                  <div class="space-y-2">
                    <div
                      v-for="model in models"
                      :key="model.id"
                      class="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div class="flex items-center gap-3 flex-1 min-w-0">
                        <span
                          class="font-mono text-xs text-gray-600 px-2 py-1 bg-gray-100 rounded border border-gray-200 truncate"
                        >
                          {{ model.id }}
                        </span>
                        <span class="text-sm text-gray-800 font-medium truncate">
                          {{ model.name }}
                        </span>
                      </div>
                      <div class="flex items-center gap-2 flex-shrink-0">
                        <button
                          class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                          @click="removeModel(model.id)"
                          title="删除模型"
                        >
                          <!-- Minus Icon -->
                          <svg
                            class="w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                          >
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="flex flex-col items-center justify-center py-12 text-gray-400">
                <p class="text-sm">暂无模型</p>
                <p class="text-xs mt-1 opacity-60">点击"管理模型"从 API 获取列表，或手动添加</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>

    <!-- 弹窗 1：管理模型 -->
    <div
      v-if="isManageModelsModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      @click="isManageModelsModalOpen = false"
    >
      <div
        class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] border border-gray-200"
        @click.stop
      >
        <!-- Header -->
        <div class="px-6 py-5 border-b border-gray-100 bg-white space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex flex-col">
              <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2">
                <!-- ListFilter Icon -->
                <svg
                  class="w-[18px] h-[18px] text-blue-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M3 6h18M7 12h10M11 18h2"></path>
                </svg>
                管理模型列表
              </h2>
              <p class="text-xs text-gray-500 mt-0.5">从 API 获取模型，点击 + 按钮添加模型或整组</p>
            </div>
            <button
              class="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full p-2 transition-colors"
              @click="isManageModelsModalOpen = false"
            >
              <!-- X Icon -->
              <svg
                class="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- Search Bar -->
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <!-- Search Icon -->
              <svg
                class="w-4 h-4 text-gray-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
            </div>
            <input
              v-model="modelSearchQuery"
              type="text"
              placeholder="搜索模型 ID 或分组名称..."
              class="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            <button
              v-if="modelSearchQuery"
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              @click="clearSearch"
            >
              <!-- X Icon -->
              <svg
                class="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- Search Stats -->
          <div v-if="modelSearchQuery" class="flex items-center justify-between text-xs">
            <span class="text-gray-500">
              找到
              <span class="font-semibold text-blue-600">{{ filteredModelCount }}</span>
              个模型
              <span v-if="filteredGroupCount < totalGroupCount">
                在
                <span class="font-semibold text-blue-600">{{ filteredGroupCount }}</span>
                个分组中
              </span>
            </span>
            <button class="text-blue-600 hover:text-blue-700 font-medium" @click="clearSearch">
              清除搜索
            </button>
          </div>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto bg-gray-50/50 p-6">
          <div
            v-if="isLoadingModels"
            class="flex flex-col items-center justify-center h-64 space-y-4"
          >
            <!-- RefreshCw Icon (spinning) -->
            <svg
              class="w-8 h-8 animate-spin text-blue-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            <p class="text-sm text-gray-500 font-medium">正在连接 API 获取模型列表...</p>
          </div>
          <div v-else class="space-y-6">
            <!-- No Results Message -->
            <div
              v-if="modelSearchQuery && filteredModelGroups.length === 0"
              class="flex flex-col items-center justify-center py-16 text-gray-400"
            >
              <svg
                class="w-16 h-16 mb-4 text-gray-300"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <p class="text-sm font-medium text-gray-500">未找到匹配的模型</p>
              <p class="text-xs text-gray-400 mt-1">尝试使用其他关键词搜索</p>
            </div>

            <div
              v-for="[groupName, models] in filteredModelGroups"
              :key="groupName"
              class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
            >
              <div
                class="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between"
              >
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {{ groupName }}
                  </span>
                  <span class="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-md">
                    {{ models.length }}
                  </span>
                </div>
                <!-- 批量添加/取消订阅整组按钮 -->
                <button
                  v-if="isGroupFullyAdded(groupName, models)"
                  class="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                  @click="handleRemoveGroupModels(groupName, models)"
                >
                  <svg
                    class="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  取消订阅整组
                </button>
                <button
                  v-else
                  class="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                  @click="handleAddGroupModels(groupName, models)"
                >
                  <svg
                    class="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  添加整组
                </button>
              </div>
              <div class="space-y-2">
                <div
                  v-for="model in models"
                  :key="model.id"
                  class="relative flex items-center justify-between px-4 py-3 transition-colors group border rounded-lg"
                  :class="
                    isModelAdded(model.id)
                      ? 'bg-blue-50/70 border-blue-200 shadow-sm'
                      : 'border-transparent hover:bg-gray-50'
                  "
                >
                  <span
                    v-if="isModelAdded(model.id)"
                    class="absolute left-0 top-0 h-full w-1 bg-blue-400/80 rounded-r-full"
                  ></span>
                  <div class="flex flex-col flex-1 min-w-0">
                    <span class="text-sm font-medium text-gray-900 truncate">
                      {{ model.id }}
                    </span>
                    <span class="text-[10px] text-gray-400">
                      Created: {{ new Date(model.created * 1000).toLocaleDateString() }}
                    </span>
                  </div>
                  <!-- 添加/取消订阅单个模型按钮（双态） -->
                  <button
                    v-if="isModelAdded(model.id)"
                    class="flex-shrink-0 ml-3 p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                    @click="handleRemoveSingleModel(model.id)"
                    title="取消订阅"
                  >
                    <svg
                      class="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </button>
                  <button
                    v-else
                    class="flex-shrink-0 ml-3 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                    @click="handleAddSingleModel(model)"
                    title="添加模型"
                  >
                    <svg
                      class="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div
              v-if="!modelSearchQuery && Object.keys(remoteModelGroups).length === 0"
              class="text-center py-10 text-gray-400"
            >
              未能获取到模型数据
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div
          class="px-6 py-4 bg-white border-t border-gray-100 flex justify-between items-center z-10"
        >
          <button
            class="px-5 py-2 text-sm font-medium text-white bg-black hover:bg-gray-800 rounded-lg shadow-lg transition-all"
            @click="isManageModelsModalOpen = false"
          >
            关闭
          </button>
        </div>
      </div>
    </div>

    <!-- 弹窗 2：手动添加模型 -->
    <div
      v-if="isAddModelModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-[1px]"
      @click="isAddModelModalOpen = false"
    >
      <div
        class="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-gray-100 p-6"
        @click.stop
      >
        <h3 class="text-lg font-bold text-gray-900 mb-4">手动添加模型</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">模型 ID</label>
            <input
              v-model="newModelForm.id"
              type="text"
              class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="e.g. gpt-4-32k"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">显示名称</label>
            <input
              v-model="newModelForm.name"
              type="text"
              class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="e.g. GPT-4 32K"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">分组</label>
            <input
              v-model="newModelForm.group"
              type="text"
              class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="e.g. deepseek, gemini 2.5, gpt-4 系列"
            />
            <p class="mt-1 text-xs text-gray-400">用于聚合 API 提供商的模型分组管理，可为空</p>
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-6">
          <button
            class="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            @click="isAddModelModalOpen = false"
          >
            取消
          </button>
          <button
            class="px-4 py-2 text-sm text-white bg-black hover:bg-gray-800 rounded-lg"
            @click="handleManualAddModel()"
          >
            添加
          </button>
        </div>
      </div>
    </div>

    <!-- 弹窗 3：添加提供商 -->
    <div
      v-if="isAddProviderModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-[2px]"
      @click="isAddProviderModalOpen = false"
    >
      <div
        class="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100"
        @click.stop
      >
        <div class="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 class="text-lg font-bold text-gray-800">添加模型服务</h2>
          <button
            class="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full p-1.5 transition-colors"
            @click="isAddProviderModalOpen = false"
          >
            <!-- X Icon -->
            <svg
              class="w-[18px] h-[18px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-xs font-bold text-gray-500 mb-1.5 uppercase">类型</label>
            <div class="space-y-2">
              <label
                v-for="type in PROVIDER_TYPES"
                :key="type.id"
                class="flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition-all"
                :class="
                  !type.available
                    ? 'bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed'
                    : newProviderForm.type === type.id
                      ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-100'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                "
              >
                <div class="flex items-center gap-3">
                  <input
                    type="radio"
                    name="providerType"
                    :value="type.id"
                    :checked="newProviderForm.type === type.id"
                    :disabled="!type.available"
                    class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    @change="newProviderForm.type = type.id"
                  />
                  <span
                    :class="!type.available ? 'text-gray-400' : 'text-gray-700'"
                    class="text-sm font-medium"
                  >
                    {{ type.name }}
                  </span>
                </div>
              </label>
            </div>
          </div>
          <div>
            <label class="block text-xs font-bold text-gray-500 mb-1.5 uppercase">名称</label>
            <input
              v-model="newProviderForm.name"
              type="text"
              placeholder="例如：My Workspace"
              class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
          </div>
        </div>
        <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
          <button
            class="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
            @click="isAddProviderModalOpen = false"
          >
            取消
          </button>
          <button
            class="px-6 py-2 text-sm font-medium text-white bg-black hover:bg-gray-800 rounded-lg shadow-sm transition-all"
            @click="handleAddProvider()"
          >
            添加
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useModelConfigStore } from '@renderer/stores/model-config/store'
import type { Model } from '@renderer/stores/model-config/types'
import { storeToRefs } from 'pinia'

const emit = defineEmits<{
  (e: 'back'): void
}>()

// 使用 Store
const store = useModelConfigStore()
const {
  providers,
  selectedProviderId,
  selectedProvider,
  isAddProviderModalOpen,
  isAddModelModalOpen,
  isManageModelsModalOpen,
  isLoadingModels,
  remoteModelGroups,
  newProviderForm,
  newModelForm
} = storeToRefs(store)

// Provider 类型选项
const PROVIDER_TYPES = [
  { id: 'openai', name: 'OpenAI Protocol', available: true },
  { id: 'custom', name: 'Custom', available: false }
] as const

// 本地 UI 状态
const apiKeyDraft = ref('')
const baseUrlDraft = ref('')
const modelSearchQuery = ref('')

const computedModelsEndpoint = computed(() => {
  if (!baseUrlDraft.value) return ''
  const base = baseUrlDraft.value.trim().replace(/\/$/, '')
  return `${base}/v1/models`
})

const computedChatEndpoint = computed(() => {
  if (!baseUrlDraft.value) return ''
  const base = baseUrlDraft.value.trim().replace(/\/$/, '')
  return `${base}/v1/chat/completions`
})

const computedCompletionEndpoint = computed(() => {
  if (!baseUrlDraft.value) return ''
  const base = baseUrlDraft.value.trim().replace(/\/$/, '')
  return `${base}/v1/completions`
})

// 按分组组织模型列表
const groupedModels = computed(() => {
  if (!selectedProvider.value?.models.length) return []
  const groups: Record<string, Model[]> = {}
  selectedProvider.value.models.forEach((model) => {
    const group = model.group || 'default'
    if (!groups[group]) {
      groups[group] = []
    }
    groups[group].push(model)
  })
  return Object.entries(groups).sort(([a], [b]) => {
    if (a === 'default') return 1
    if (b === 'default') return -1
    return a.localeCompare(b)
  })
})

// 过滤模型分组（基于搜索）
const filteredModelGroups = computed(() => {
  if (!modelSearchQuery.value.trim()) {
    return Object.entries(remoteModelGroups.value)
  }

  const query = modelSearchQuery.value.toLowerCase().trim()
  const filtered: [string, any[]][] = []

  Object.entries(remoteModelGroups.value).forEach(([groupName, models]) => {
    const groupMatches = groupName.toLowerCase().includes(query)
    const matchedModels = models.filter((model: any) => {
      const modelIdMatches = model.id.toLowerCase().includes(query)
      return groupMatches || modelIdMatches
    })

    if (matchedModels.length > 0) {
      filtered.push([groupName, matchedModels])
    }
  })

  return filtered
})

const filteredModelCount = computed(() => {
  return filteredModelGroups.value.reduce((sum, [, models]) => sum + models.length, 0)
})

const filteredGroupCount = computed(() => {
  return filteredModelGroups.value.length
})

const totalGroupCount = computed(() => {
  return Object.keys(remoteModelGroups.value).length
})

// 初始化
onMounted(async () => {
  // 从后端加载配置
  await store.fetchProviders()
  
  if (selectedProvider.value) {
    apiKeyDraft.value = selectedProvider.value.apiKey
    baseUrlDraft.value = selectedProvider.value.baseUrl
  }
})

// 监听选中的提供商变化，更新草稿
watch(selectedProvider, (provider) => {
  if (provider) {
    apiKeyDraft.value = provider.apiKey
    baseUrlDraft.value = provider.baseUrl
  }
})

// 方法
async function selectProvider(id: string): Promise<void> {
  await store.selectProvider(id)
}

async function handleDeleteProvider(id: string): Promise<void> {
  if (confirm('确定要删除该提供商吗？')) {
    await store.handleDeleteProvider(id)
  }
}

async function handleOpenManageModels(): Promise<void> {
  await store.openManageModels()
}

async function handleApiKeyBlur(): Promise<void> {
  if (!selectedProvider.value || !selectedProviderId.value) return
  if (apiKeyDraft.value !== selectedProvider.value.apiKey) {
    await store.updateProviderApiKey(selectedProviderId.value, apiKeyDraft.value)
  }
}

async function handleBaseUrlBlur(): Promise<void> {
  if (!selectedProvider.value || !selectedProviderId.value) return
  if (baseUrlDraft.value !== selectedProvider.value.baseUrl) {
    await store.updateProviderBaseUrl(selectedProviderId.value, baseUrlDraft.value)
  }
}

async function removeModel(modelId: string): Promise<void> {
  await store.removeModel(modelId)
}

function isModelAdded(modelId: string): boolean {
  return selectedProvider.value?.models.some((m) => m.id === modelId) || false
}

function isGroupFullyAdded(_groupName: string, models: any[]): boolean {
  if (!models.length) return false
  return models.every((model) => isModelAdded(model.id))
}

async function handleAddSingleModel(model: any): Promise<void> {
  await store.addSingleRemoteModel(model)
}

async function handleRemoveSingleModel(modelId: string): Promise<void> {
  await store.removeSingleRemoteModel(modelId)
}

async function handleAddGroupModels(groupName: string, models: any[]): Promise<void> {
  await store.addGroupModels(groupName, models)
}

async function handleRemoveGroupModels(groupName: string, models: any[]): Promise<void> {
  await store.removeGroupModels(groupName, models)
}

async function handleManualAddModel(): Promise<void> {
  await store.handleManualAddModel()
}

async function handleAddProvider(): Promise<void> {
  await store.handleAddProvider()
}

function clearSearch(): void {
  modelSearchQuery.value = ''
}

</script>

<style scoped>
/* Component-specific styles (if needed) will go here */
</style>
