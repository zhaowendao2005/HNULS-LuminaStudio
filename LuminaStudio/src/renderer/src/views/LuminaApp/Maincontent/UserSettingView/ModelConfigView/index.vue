<template>
  <div
    class="usersetting-model-config flex h-full w-full overflow-hidden bg-[#f9f9f9] font-sans text-gray-800"
  >
    <div
      class="z-20 flex w-72 flex-shrink-0 flex-col border-r border-gray-200 bg-white shadow-[2px_0_15px_rgba(0,0,0,0.03)]"
    >
      <div class="flex h-16 items-center border-b border-gray-100 px-5">
        <div
          class="mr-3 flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white shadow-md shadow-gray-200"
        >
          <svg
            class="h-[18px] w-[18px]"
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
        <span class="text-lg font-bold tracking-tight text-gray-900">模型管理</span>
      </div>

      <div class="flex-1 space-y-1 overflow-y-auto px-3 py-3">
        <div class="mb-1 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
          模型服务商
        </div>
        <div
          v-for="provider in providers"
          :key="provider.id"
          class="group relative flex cursor-pointer items-center justify-between rounded-xl border px-3 py-3 transition-all duration-200"
          :class="
            selectedProviderId === provider.id
              ? 'border-blue-200 bg-blue-50/80 text-blue-700 shadow-sm'
              : 'border-transparent bg-white text-gray-700 hover:border-gray-200 hover:bg-gray-100'
          "
          @click="selectProvider(provider.id)"
          @contextmenu.prevent="openEditProvider(provider.id)"
        >
          <div class="flex items-center gap-3 overflow-hidden">
            <div
              class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border transition-colors"
              :class="
                selectedProviderId === provider.id
                  ? 'border-blue-100 bg-white text-blue-600'
                  : 'border-gray-100 bg-gray-50 text-gray-500'
              "
            >
              <svg
                v-if="provider.icon === 'openai'"
                class="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
              </svg>
              <svg
                v-else-if="provider.icon === 'anthropic'"
                class="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M12 3 4 21h3l1.7-4h6.6l1.7 4h3L12 3Z"></path>
                <path d="M10 13h4"></path>
              </svg>
              <svg
                v-else-if="provider.icon === 'google'"
                class="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M12 3v6"></path>
                <path d="M12 15v6"></path>
                <path d="m5.64 5.64 4.24 4.24"></path>
                <path d="m14.12 14.12 4.24 4.24"></path>
                <path d="M3 12h6"></path>
                <path d="M15 12h6"></path>
                <path d="m5.64 18.36 4.24-4.24"></path>
                <path d="m14.12 9.88 4.24-4.24"></path>
              </svg>
              <svg
                v-else
                class="h-5 w-5"
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
            </div>
            <div class="flex min-w-0 flex-col">
              <span
                class="truncate text-sm font-semibold"
                :class="selectedProviderId === provider.id ? 'text-blue-900' : 'text-gray-700'"
              >
                {{ provider.name }}
              </span>
              <span class="mt-0.5 flex items-center gap-1.5 truncate text-[10px] text-gray-400">
                <span
                  class="h-1.5 w-1.5 rounded-full"
                  :class="provider.enabled ? 'bg-green-500' : 'bg-gray-300'"
                ></span>
                {{ providerTypeLabelMap[provider.type] }}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="rounded-md p-1.5 text-gray-400 opacity-0 transition-opacity hover:bg-blue-50 hover:text-blue-500 group-hover:opacity-100"
              title="编辑提供商"
              @click.stop="openEditProvider(provider.id)"
            >
              <svg
                class="h-[14px] w-[14px]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M12 20h9"></path>
                <path d="m16.5 3.5 4 4L7 21l-4 1 1-4 12.5-14.5Z"></path>
              </svg>
            </button>
            <button
              type="button"
              class="rounded-md p-1.5 text-gray-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
              title="删除提供商"
              @click.stop="handleDeleteProvider(provider.id)"
            >
              <svg
                class="h-[14px] w-[14px]"
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

      <div class="border-t border-gray-100 bg-gray-50/30 p-4 backdrop-blur-sm">
        <button
          class="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 font-medium text-gray-600 shadow-sm transition-all duration-200 hover:border-blue-300 hover:text-blue-600 hover:shadow-md"
          @click="store.openCreateProviderModal()"
        >
          <svg
            class="h-4 w-4"
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

    <div class="flex h-full flex-1 flex-col overflow-hidden bg-[#fafafa]">
      <div
        v-if="selectedProvider"
        class="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 px-8 backdrop-blur-md"
      >
        <div class="flex items-center gap-4">
          <div class="flex flex-col">
            <h1 class="flex items-center gap-2 text-xl font-bold text-gray-800">
              {{ selectedProvider.name }}
              <span
                class="rounded border border-gray-200 bg-gray-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-gray-500"
              >
                {{ selectedProvider.type }}
              </span>
            </h1>
          </div>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-8">
        <div
          v-if="!selectedProvider && providers.length === 0"
          class="mx-auto max-w-4xl space-y-8 pb-20"
        >
          <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div class="animate-pulse space-y-6">
              <div class="h-4 w-1/4 rounded bg-gray-200"></div>
              <div class="space-y-4">
                <div class="h-3 w-1/6 rounded bg-gray-200"></div>
                <div class="h-10 rounded bg-gray-100"></div>
              </div>
              <div class="space-y-4">
                <div class="h-3 w-1/6 rounded bg-gray-200"></div>
                <div class="h-10 rounded bg-gray-100"></div>
              </div>
            </div>
            <div class="mt-8 border-t border-gray-100 pt-8 text-center">
              <p class="text-sm text-gray-500">请先添加模型服务商</p>
            </div>
          </div>
        </div>

        <div v-else class="mx-auto max-w-4xl space-y-8 pb-20">
          <section class="space-y-4">
            <div class="mb-2 flex items-center justify-between gap-4">
              <div class="flex items-center gap-2">
                <div class="rounded-lg bg-blue-100 p-1.5 text-blue-600">
                  <svg
                    class="h-[18px] w-[18px]"
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
              <div class="flex items-center gap-2">
                <button
                  class="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  title="跳转至官网"
                  aria-label="跳转至官网"
                  :disabled="!officialWebsiteDraft.trim()"
                  @click="handleOpenOfficialWebsite"
                >
                  <svg
                    class="h-[14px] w-[14px]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </button>
              </div>
            </div>
            <div
              class="grid grid-cols-1 gap-6 overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div>
                <label class="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-500">
                  官网地址
                </label>
                <input
                  v-model="officialWebsiteDraft"
                  type="text"
                  class="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  placeholder="https://openai.com"
                  @blur="handleOfficialWebsiteBlur"
                />
              </div>
              <div>
                <label class="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-500">
                  API Key
                </label>
                <input
                  v-model="apiKeyDraft"
                  type="password"
                  class="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-sm text-gray-800 transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  placeholder="sk-..."
                  @blur="handleApiKeyBlur"
                />
              </div>
              <div>
                <label class="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-500">
                  API Host URL
                </label>
                <input
                  v-model="baseUrlDraft"
                  type="text"
                  class="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-sm text-gray-800 transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  :placeholder="baseUrlPlaceholder"
                  @blur="handleBaseUrlBlur"
                />
                <div class="mt-2 space-y-1">
                  <p class="font-mono text-[10px] text-gray-400">
                    <span class="text-gray-500">端点：</span>
                    <span v-if="baseUrlDraft">{{ computedModelsEndpoint }}</span>
                    <span v-else class="text-gray-300">请输入 API Host URL</span>
                  </p>
                  <p class="font-mono text-[10px] text-gray-400">
                    <span class="text-gray-500">Chat：</span>
                    <span v-if="baseUrlDraft">{{ computedChatEndpoint }}</span>
                    <span v-else class="text-gray-300">请输入 API Host URL</span>
                  </p>
                  <p class="font-mono text-[10px] text-gray-400">
                    <span class="text-gray-500">Chat Completion：</span>
                    <span v-if="baseUrlDraft">{{ computedCompletionEndpoint }}</span>
                    <span v-else class="text-gray-300">请输入 API Host URL</span>
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section class="space-y-4">
            <div class="mb-2 flex items-center justify-between gap-4">
              <div class="flex items-center gap-2">
                <div class="rounded-lg bg-purple-100 p-1.5 text-purple-600">
                  <svg
                    class="h-[18px] w-[18px]"
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
                  class="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600"
                >
                  {{ selectedProvider?.models.length || 0 }}
                </span>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <button
                  class="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50"
                  title="管理模型"
                  aria-label="管理模型"
                  @click="handleOpenManageModels"
                >
                  <svg
                    class="h-[14px] w-[14px]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M3 6h18M7 12h10M11 18h2"></path>
                  </svg>
                </button>
                <button
                  class="rounded-lg bg-black p-2 text-white shadow-sm transition-all hover:bg-gray-800"
                  title="手动添加"
                  aria-label="手动添加"
                  @click="store.isAddModelModalOpen = true"
                >
                  <svg
                    class="h-[14px] w-[14px]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
                <button
                  class="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50"
                  title="测试提示词配置"
                  aria-label="测试提示词配置"
                  @click="openSmokeTestPromptDialog"
                >
                  <svg
                    class="h-[14px] w-[14px]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M4 21h16"></path>
                    <path d="M5 21V7l5-4h9v18"></path>
                    <path d="M9 9h6"></path>
                    <path d="M9 13h6"></path>
                  </svg>
                </button>
                <button
                  class="rounded-lg border border-blue-200 bg-blue-50 p-2 text-blue-700 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-100"
                  title="测试服务"
                  aria-label="测试服务"
                  @click="openSmokeTestDialog"
                >
                  <svg
                    class="h-[14px] w-[14px]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M9 12l2 2 4-4"></path>
                    <path
                      d="M21 12c0 1.2-.2 2.3-.7 3.3-.4 1-1 1.9-1.8 2.7-.8.8-1.7 1.4-2.7 1.8-1 .5-2.1.7-3.3.7s-2.3-.2-3.3-.7c-1-.4-1.9-1-2.7-1.8-.8-.8-1.4-1.7-1.8-2.7C3.2 14.3 3 13.2 3 12s.2-2.3.7-3.3c.4-1 1-1.9 1.8-2.7.8-.8 1.7-1.4 2.7-1.8 1-.5 2.1-.7 3.3-.7s2.3.2 3.3.7"
                    ></path>
                  </svg>
                </button>
              </div>
            </div>

            <div
              class="min-h-[120px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
            >
              <div v-if="groupedModels.length > 0" class="divide-y divide-gray-100">
                <div v-for="[groupName, models] in groupedModels" :key="groupName" class="p-4">
                  <div class="mb-3 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-bold uppercase tracking-wider text-gray-500">
                        {{ groupName || '未分组' }}
                      </span>
                      <span class="rounded-md bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600">
                        {{ models.length }}
                      </span>
                    </div>
                  </div>
                  <div class="space-y-2">
                    <div
                      v-for="model in models"
                      :key="model.id"
                      class="group flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-gray-50"
                    >
                      <div class="flex min-w-0 flex-1 items-center gap-3">
                        <span
                          class="truncate rounded border border-gray-200 bg-gray-100 px-2 py-1 font-mono text-xs text-gray-600"
                        >
                          {{ model.id }}
                        </span>
                        <span class="truncate text-sm font-medium text-gray-800">
                          {{ model.name }}
                        </span>
                      </div>
                      <div class="ml-4 flex flex-shrink-0 items-center gap-3">
                        <span
                          v-if="getModelTestDisplay(model.id)"
                          class="rounded-md px-2 py-1 text-[11px] font-medium"
                          :class="getModelTestDisplay(model.id)?.className"
                        >
                          {{ getModelTestDisplay(model.id)?.text }}
                        </span>
                        <button
                          class="rounded-md p-1.5 text-gray-400 opacity-0 transition-colors hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                          title="删除模型"
                          @click="removeModel(model.id)"
                        >
                          <svg
                            class="h-4 w-4"
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
                <p class="mt-1 text-xs opacity-60">点击“管理模型”从 API 获取列表，或手动添加</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>

    <div
      v-if="store.isManageModelsModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      @click="store.isManageModelsModalOpen = false"
    >
      <div
        class="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
        @click.stop
      >
        <div class="space-y-4 border-b border-gray-100 bg-white px-6 py-5">
          <div class="flex items-center justify-between">
            <div class="flex flex-col">
              <h2 class="flex items-center gap-2 text-lg font-bold text-gray-800">
                <svg
                  class="h-[18px] w-[18px] text-blue-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M3 6h18M7 12h10M11 18h2"></path>
                </svg>
                管理模型列表
              </h2>
              <p class="mt-0.5 text-xs text-gray-500">从 API 获取模型，点击 + 按钮添加模型或整组</p>
            </div>
            <button
              class="rounded-full bg-gray-50 p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              @click="store.isManageModelsModalOpen = false"
            >
              <svg
                class="h-5 w-5"
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

          <div class="relative">
            <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg
                class="h-4 w-4 text-gray-400"
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
              class="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-10 text-sm text-gray-800 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
            <button
              v-if="modelSearchQuery"
              class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition-colors hover:text-gray-600"
              @click="clearSearch"
            >
              <svg
                class="h-4 w-4"
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

          <div v-if="modelSearchQuery" class="flex items-center justify-between text-xs">
            <span class="text-gray-500">
              找到
              <span class="font-semibold text-blue-600">{{ filteredModelCount }}</span>
              个模型
              <span v-if="filteredGroupCount < totalGroupCount">
                ，分布在
                <span class="font-semibold text-blue-600">{{ filteredGroupCount }}</span>
                个分组
              </span>
            </span>
            <button class="font-medium text-blue-600 hover:text-blue-700" @click="clearSearch">
              清除搜索
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto bg-gray-50/50 p-6">
          <div
            v-if="store.isLoadingModels"
            class="flex h-64 flex-col items-center justify-center space-y-4"
          >
            <svg
              class="h-8 w-8 animate-spin text-blue-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            <p class="text-sm font-medium text-gray-500">正在连接 API 获取模型列表...</p>
          </div>
          <div v-else class="space-y-6">
            <div
              v-if="modelSearchQuery && filteredModelGroups.length === 0"
              class="flex flex-col items-center justify-center py-16 text-gray-400"
            >
              <svg
                class="mb-4 h-16 w-16 text-gray-300"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <p class="text-sm font-medium text-gray-500">未找到匹配的模型</p>
              <p class="mt-1 text-xs text-gray-400">尝试使用其他关键词搜索</p>
            </div>

            <div
              v-for="[groupName, models] in filteredModelGroups"
              :key="groupName"
              class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
            >
              <div
                class="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-2"
              >
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold uppercase tracking-wider text-gray-500">
                    {{ groupName }}
                  </span>
                  <span class="rounded-md bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600">
                    {{ models.length }}
                  </span>
                </div>
                <button
                  v-if="isGroupFullyAdded(groupName, models)"
                  class="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                  @click="handleRemoveGroupModels(groupName, models)"
                >
                  <svg
                    class="h-3.5 w-3.5"
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
                  class="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
                  @click="handleAddGroupModels(groupName, models)"
                >
                  <svg
                    class="h-3.5 w-3.5"
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
                  class="group relative flex items-center justify-between rounded-lg border px-4 py-3 transition-colors"
                  :class="
                    isModelAdded(model.id)
                      ? 'border-blue-200 bg-blue-50/70 shadow-sm'
                      : 'border-transparent hover:bg-gray-50'
                  "
                >
                  <span
                    v-if="isModelAdded(model.id)"
                    class="absolute left-0 top-0 h-full w-1 rounded-r-full bg-blue-400/80"
                  ></span>
                  <div class="flex min-w-0 flex-1 flex-col">
                    <span class="truncate text-sm font-medium text-gray-900">{{ model.id }}</span>
                    <span class="text-[10px] text-gray-400">
                      Created: {{ new Date(model.created * 1000).toLocaleDateString() }}
                    </span>
                  </div>
                  <button
                    v-if="isModelAdded(model.id)"
                    class="ml-3 flex-shrink-0 rounded-md p-1.5 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                    title="取消订阅"
                    @click="handleRemoveSingleModel(model.id)"
                  >
                    <svg
                      class="h-4 w-4"
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
                    class="ml-3 flex-shrink-0 rounded-md p-1.5 text-gray-400 opacity-0 transition-colors hover:bg-blue-50 hover:text-blue-600 group-hover:opacity-100"
                    title="添加模型"
                    @click="handleAddSingleModel(model)"
                  >
                    <svg
                      class="h-4 w-4"
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
              class="py-10 text-center text-gray-400"
            >
              未能获取到模型数据
            </div>
          </div>
        </div>

        <div
          class="z-10 flex items-center justify-between border-t border-gray-100 bg-white px-6 py-4"
        >
          <button
            class="rounded-lg bg-black px-5 py-2 text-sm font-medium text-white shadow-lg transition-all hover:bg-gray-800"
            @click="store.isManageModelsModalOpen = false"
          >
            关闭
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="isSmokeTestDialogOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-[2px]"
      @click="closeSmokeTestDialog"
    >
      <div
        class="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl"
        @click.stop
      >
        <div class="border-b border-gray-100 px-6 py-4">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h3 class="text-lg font-bold text-gray-900">测试服务</h3>
              <p class="mt-1 text-xs text-gray-500">请选择要测试的模型</p>
            </div>
            <button
              class="rounded-full bg-gray-50 p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              @click="closeSmokeTestDialog"
            >
              <svg
                class="h-4 w-4"
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
        </div>

        <div class="space-y-4 px-6 py-4">
          <div>
            <label class="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-500">
              测试提示词配置
            </label>
            <select
              v-model="selectedSmokeTestPromptConfigId"
              class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 transition-colors focus:border-blue-400 focus:bg-white focus:outline-none"
            >
              <option
                v-for="config in smokeTestPromptStore.configs"
                :key="config.id"
                :value="config.id"
              >
                {{ config.name }}
              </option>
            </select>
          </div>
          <div class="max-h-[38vh] space-y-2 overflow-y-auto">
            <label
              v-for="model in smokeTestModels"
              :key="model.id"
              class="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2 transition-colors hover:border-gray-300 hover:bg-gray-50"
            >
              <div class="flex min-w-0 items-center gap-3">
                <input
                  :checked="selectedSmokeTestModelIds.includes(model.id)"
                  type="checkbox"
                  class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  @change="toggleSmokeTestModel(model.id)"
                />
                <div class="min-w-0">
                  <div class="truncate text-[13px] font-semibold leading-[18px] text-gray-800">
                    {{ model.name }}
                  </div>
                  <div class="truncate font-mono text-[11px] text-gray-500">{{ model.id }}</div>
                </div>
              </div>
              <span v-if="model.group" class="text-[11px] text-gray-400">{{ model.group }}</span>
            </label>
            <div
              v-if="smokeTestModels.length === 0"
              class="py-10 text-center text-sm text-gray-400"
            >
              当前 Provider 暂无可测试模型
            </div>
          </div>
        </div>

        <div
          class="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-6 py-4"
        >
          <div class="text-xs text-gray-500">
            已选择
            <span class="font-semibold text-gray-700">{{ selectedSmokeTestModelIds.length }}</span>
            / {{ smokeTestModels.length }} 个模型
          </div>
          <div class="flex items-center gap-2">
            <button
              class="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
              @click="closeSmokeTestDialog"
            >
              取消
            </button>
            <button
              class="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
              :disabled="selectedSmokeTestModelIds.length === 0 || !smokeTestProviderId"
              @click="confirmSmokeTest"
            >
              确定
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="isSmokeTestPromptDialogOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-[2px]"
      @click="closeSmokeTestPromptDialog"
    >
      <div
        class="flex h-[78vh] w-full max-w-6xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
        @click.stop
      >
        <div class="flex w-72 shrink-0 flex-col border-r border-gray-200 bg-gray-50">
          <div class="border-b border-gray-200 px-4 py-4">
            <div class="flex items-center justify-between gap-3">
              <div>
                <h3 class="text-sm font-semibold text-gray-900">测试提示词配置</h3>
                <p class="mt-1 text-xs text-gray-500">
                  配置在模型配置页范围共享，不区分 provider。
                </p>
              </div>
              <button
                class="flex h-8 w-8 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white text-gray-500 transition-colors hover:border-blue-300 hover:text-blue-600"
                @click="handleCreateSmokeTestPromptConfig"
              >
                <svg
                  class="h-4 w-4"
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
          <div class="flex-1 space-y-2 overflow-y-auto p-3">
            <div
              v-for="config in smokeTestPromptStore.configs"
              :key="config.id"
              class="rounded-xl border p-3 transition-colors"
              :class="
                smokeTestPromptStore.selectedConfigId === config.id
                  ? 'border-blue-200 bg-blue-50'
                  : 'border-transparent bg-white hover:border-gray-200 hover:bg-gray-50'
              "
            >
              <div class="flex items-start gap-2">
                <button
                  class="min-w-0 flex-1 text-left"
                  @click="smokeTestPromptStore.selectConfig(config.id)"
                >
                  <input
                    :value="config.name"
                    class="w-full truncate bg-transparent text-[13px] font-semibold leading-[18px] text-gray-800 outline-none"
                    @blur="handleRenameSmokeTestPromptConfig(config.id, $event)"
                  />
                  <div class="mt-1 text-xs text-gray-400">
                    {{ config.id }}
                  </div>
                </button>
                <div class="flex items-center gap-1">
                  <button
                    class="rounded-md px-1.5 py-1 text-[11px] font-medium transition-colors"
                    :class="
                      smokeTestPromptStore.activeConfigId === config.id
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    "
                    @click="handleSetDefaultSmokeTestPromptConfig(config.id)"
                  >
                    {{ smokeTestPromptStore.activeConfigId === config.id ? '默认' : '设为默认' }}
                  </button>
                  <button
                    class="rounded-md p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                    :disabled="smokeTestPromptStore.configs.length <= 1"
                    @click="handleRemoveSmokeTestPromptConfig(config.id)"
                  >
                    <svg
                      class="h-4 w-4"
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

        <div class="flex min-w-0 flex-1 flex-col bg-white">
          <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div>
              <h3 class="text-lg font-bold text-gray-900">
                {{ smokeTestPromptStore.selectedConfig?.name || '测试提示词' }}
              </h3>
              <p class="mt-1 text-xs text-gray-500">
                编辑后会用于后续模型测试，并持久化保存到本地。
              </p>
            </div>
            <button
              class="rounded-full bg-gray-50 p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              @click="closeSmokeTestPromptDialog"
            >
              <svg
                class="h-4 w-4"
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

          <div class="flex flex-1 flex-col px-6 py-5">
            <div class="mb-3 flex items-center justify-between text-xs text-gray-500">
              <span>测试提示词</span>
              <span>字数 {{ smokeTestPromptStore.promptCharCount }}</span>
            </div>
            <textarea
              :value="smokeTestPromptStore.selectedConfig?.prompt || ''"
              class="min-h-0 flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 font-mono text-sm leading-6 text-gray-800 outline-none transition-colors focus:border-blue-400 focus:bg-white"
              placeholder="输入模型测试时使用的提示词..."
              @input="handleSmokeTestPromptInput"
            ></textarea>
          </div>

          <div
            class="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4"
          >
            <div class="flex min-w-0 flex-1 items-center gap-3 text-xs text-gray-500">
              <span>当前配置会保存在模型配置域设置中。</span>
              <span v-if="smokeTestPromptStore.configs.length <= 1" class="text-amber-600">
                至少保留 1 条配置
              </span>
            </div>
            <div class="flex items-center gap-2">
              <button
                class="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
                @click="handleResetSmokeTestPrompt"
              >
                恢复默认
              </button>
              <button
                class="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
                @click="closeSmokeTestPromptDialog"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="store.isAddModelModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 backdrop-blur-[1px]"
      @click="store.isAddModelModalOpen = false"
    >
      <div
        class="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-6 shadow-xl"
        @click.stop
      >
        <h3 class="mb-4 text-lg font-bold text-gray-900">手动添加模型</h3>
        <div class="space-y-4">
          <div>
            <label class="mb-1 block text-xs font-bold uppercase text-gray-500">模型 ID</label>
            <input
              v-model="store.newModelForm.id"
              type="text"
              class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder="e.g. gpt-4-32k"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-bold uppercase text-gray-500">显示名称</label>
            <input
              v-model="store.newModelForm.name"
              type="text"
              class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder="e.g. GPT-4 32K"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-bold uppercase text-gray-500">分组</label>
            <input
              v-model="store.newModelForm.group"
              type="text"
              class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder="e.g. gemini-2.5"
            />
            <p class="mt-1 text-xs text-gray-400">用于聚合 API 提供商的模型分组管理，可为空</p>
          </div>
        </div>
        <div class="mt-6 flex justify-end gap-2">
          <button
            class="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
            @click="store.isAddModelModalOpen = false"
          >
            取消
          </button>
          <button
            class="rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
            @click="handleManualAddModel"
          >
            添加
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="store.isProviderModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 backdrop-blur-[2px]"
      @click="store.closeProviderModal()"
    >
      <div
        class="w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl"
        @click.stop
      >
        <div class="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <h2 class="text-lg font-bold text-gray-800">
            {{ store.isEditingProvider ? '编辑模型服务' : '添加模型服务' }}
          </h2>
          <button
            class="rounded-full bg-gray-50 p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            @click="store.closeProviderModal()"
          >
            <svg
              class="h-[18px] w-[18px]"
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
        <div class="space-y-4 p-6">
          <div>
            <label class="mb-1.5 block text-xs font-bold uppercase text-gray-500">类型</label>
            <div class="space-y-2">
              <label
                v-for="type in providerTypeOptions"
                :key="type.id"
                class="flex cursor-pointer items-start justify-between rounded-xl border px-4 py-3 transition-all"
                :class="
                  store.providerForm.type === type.id
                    ? 'border-blue-200 bg-blue-50 ring-1 ring-blue-100'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                "
              >
                <div class="flex items-start gap-3">
                  <input
                    type="radio"
                    name="providerType"
                    :value="type.id"
                    :checked="store.providerForm.type === type.id"
                    class="mt-0.5 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                    @change="store.providerForm.type = type.id"
                  />
                  <div>
                    <div class="text-sm font-medium text-gray-700">{{ type.name }}</div>
                    <div class="mt-0.5 text-xs text-gray-400">{{ type.description }}</div>
                  </div>
                </div>
              </label>
            </div>
          </div>
          <div>
            <label class="mb-1.5 block text-xs font-bold uppercase text-gray-500">名称</label>
            <input
              v-model="store.providerForm.name"
              type="text"
              placeholder="例如：Claude Team / Gemini Dev / OpenAI Responses"
              class="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
        <div class="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4">
          <button
            class="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
            @click="store.closeProviderModal()"
          >
            取消
          </button>
          <button
            class="rounded-lg bg-black px-6 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-gray-800"
            @click="store.submitProviderForm()"
          >
            {{ store.isEditingProvider ? '保存' : '添加' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useModelConfigStore } from '@renderer/stores/model-config/store'
import { useSmokeTestPromptStore } from '@renderer/stores/model-config/smoke-test-prompt.store'
import { deriveOfficialWebsiteFromBaseUrl } from '@renderer/stores/model-config/use-provider-website'
import type { Model, ModelTestState, ProviderTypeOption } from '@renderer/stores/model-config/types'

defineEmits<{
  (e: 'back'): void
}>()

const store = useModelConfigStore()
const smokeTestPromptStore = useSmokeTestPromptStore()
const { providers, selectedProviderId, selectedProvider, remoteModelGroups, testResults } =
  storeToRefs(store)

const providerTypeOptions: ProviderTypeOption[] = [
  {
    id: 'openai',
    name: 'OpenAI Official',
    description: '仅用于 OpenAI 官方服务，固定官方 base URL。',
    available: true
  },
  {
    id: 'openai-response',
    name: 'OpenAI Responses',
    description: 'OpenAI 新版 Responses API。',
    available: true
  },
  {
    id: 'openai-completion',
    name: 'OpenAI Chat Completions',
    description: 'OpenAI 兼容 /v1/chat/completions 接口，适合聚合 API。',
    available: true
  },
  {
    id: 'claude',
    name: 'Claude',
    description: 'Anthropic Claude 官方协议。',
    available: true
  },
  {
    id: 'gemini',
    name: 'Gemini',
    description: 'Google Gemini 官方协议。',
    available: true
  }
]

const providerTypeLabelMap: Record<string, string> = {
  openai: 'OpenAI Official',
  'openai-response': 'OpenAI Responses',
  'openai-completion': 'OpenAI Chat Completions',
  claude: 'Claude',
  gemini: 'Gemini'
}

const apiKeyDraft = ref('')
const baseUrlDraft = ref('')
const officialWebsiteDraft = ref('')
const modelSearchQuery = ref('')
const isSmokeTestDialogOpen = ref(false)
const isSmokeTestPromptDialogOpen = ref(false)
const smokeTestProviderId = ref<string | null>(null)
const selectedSmokeTestModelIds = ref<string[]>([])
const selectedSmokeTestPromptConfigId = ref<string>('')

const groupedModels = computed(() => {
  if (!selectedProvider.value?.models.length) return [] as [string, Model[]][]
  const groups: Record<string, Model[]> = {}
  selectedProvider.value.models.forEach((model) => {
    const group = model.group || 'default'
    if (!groups[group]) groups[group] = []
    groups[group].push(model)
  })
  return Object.entries(groups).sort(([left], [right]) => {
    if (left === 'default') return 1
    if (right === 'default') return -1
    return left.localeCompare(right)
  })
})

const smokeTestModels = computed(() => {
  if (!smokeTestProviderId.value) return []
  return providers.value.find((provider) => provider.id === smokeTestProviderId.value)?.models || []
})

const filteredModelGroups = computed(() => {
  if (!modelSearchQuery.value.trim()) {
    return Object.entries(remoteModelGroups.value)
  }

  const query = modelSearchQuery.value.toLowerCase().trim()
  const filtered: [string, Array<{ id: string; created: number }>][] = []

  Object.entries(remoteModelGroups.value).forEach(([groupName, models]) => {
    const groupMatches = groupName.toLowerCase().includes(query)
    const matchedModels = models.filter((model) => {
      return groupMatches || model.id.toLowerCase().includes(query)
    })
    if (matchedModels.length > 0) {
      filtered.push([groupName, matchedModels])
    }
  })

  return filtered
})

const filteredModelCount = computed(() => {
  return filteredModelGroups.value.reduce((total, [, models]) => total + models.length, 0)
})

const filteredGroupCount = computed(() => filteredModelGroups.value.length)
const totalGroupCount = computed(() => Object.keys(remoteModelGroups.value).length)

const baseUrlPlaceholder = computed(() => {
  if (selectedProvider.value?.type === 'claude') return 'https://api.anthropic.com'
  if (selectedProvider.value?.type === 'gemini') return 'https://generativelanguage.googleapis.com'
  return 'https://api.openai.com/v1'
})

const computedModelsEndpoint = computed(() => {
  const base = baseUrlDraft.value.trim().replace(/\/$/, '')
  if (!base) return ''
  if (selectedProvider.value?.type === 'claude') return `${base}/v1/models`
  if (selectedProvider.value?.type === 'gemini') return `${base}/v1beta/models`
  return base.endsWith('/v1') ? `${base}/models` : `${base}/v1/models`
})

const computedChatEndpoint = computed(() => {
  const base = baseUrlDraft.value.trim().replace(/\/$/, '')
  if (!base) return ''
  if (selectedProvider.value?.type === 'claude') return `${base}/v1/messages`
  if (selectedProvider.value?.type === 'gemini') {
    return `${base}/v1beta/models/{model}:streamGenerateContent`
  }
  if (selectedProvider.value?.type === 'openai-response') {
    return base.endsWith('/v1') ? `${base}/responses` : `${base}/v1/responses`
  }
  return base.endsWith('/v1') ? `${base}/chat/completions` : `${base}/v1/chat/completions`
})

const computedCompletionEndpoint = computed(() => {
  const base = baseUrlDraft.value.trim().replace(/\/$/, '')
  if (!base) return ''
  if (selectedProvider.value?.type === 'openai-completion') {
    return base.endsWith('/v1') ? `${base}/chat/completions` : `${base}/v1/chat/completions`
  }
  return '-'
})

onMounted(async () => {
  await Promise.all([store.fetchProviders(), smokeTestPromptStore.ensureLoaded()])
  if (selectedProvider.value) {
    apiKeyDraft.value = selectedProvider.value.apiKey
    baseUrlDraft.value = selectedProvider.value.baseUrl
    officialWebsiteDraft.value = selectedProvider.value.officialWebsite
  }
  selectedSmokeTestPromptConfigId.value = smokeTestPromptStore.activeConfigId || ''
})

watch(selectedProvider, (provider) => {
  if (!provider) return
  apiKeyDraft.value = provider.apiKey
  baseUrlDraft.value = provider.baseUrl
  officialWebsiteDraft.value = provider.officialWebsite
})

function getModelTestState(modelId: string): ModelTestState {
  if (!selectedProvider.value) return { status: 'idle' }
  return testResults.value[selectedProvider.value.id]?.[modelId] || { status: 'idle' }
}

function getModelTestDisplay(modelId: string): { text: string; className: string } | null {
  const state = getModelTestState(modelId)
  if (state.status === 'idle') return null
  if (state.status === 'testing') {
    return {
      text: '测试中...',
      className: 'bg-blue-50 text-blue-700'
    }
  }
  if (state.status === 'success') {
    return {
      text: `成功 (${state.latency ?? 0}ms)`,
      className: 'bg-green-50 text-green-700'
    }
  }

  const detail = state.errorCode || state.errorType || state.message || 'Unknown Error'
  return {
    text: `失败 (${detail})`,
    className: 'bg-red-50 text-red-700'
  }
}

async function selectProvider(id: string): Promise<void> {
  await store.selectProvider(id)
}

function openEditProvider(providerId: string): void {
  store.openEditProviderModal(providerId)
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
  if (baseUrlDraft.value === selectedProvider.value.baseUrl) return

  const previousDerivedOfficialWebsite = deriveOfficialWebsiteFromBaseUrl(
    selectedProvider.value.baseUrl
  )
  const nextDerivedOfficialWebsite = deriveOfficialWebsiteFromBaseUrl(baseUrlDraft.value)
  const shouldAutofillOfficialWebsite =
    !officialWebsiteDraft.value.trim() ||
    officialWebsiteDraft.value.trim() === previousDerivedOfficialWebsite

  const nextOfficialWebsite = shouldAutofillOfficialWebsite
    ? nextDerivedOfficialWebsite
    : officialWebsiteDraft.value

  officialWebsiteDraft.value = nextOfficialWebsite
  await store.updateProviderServiceSettings(selectedProviderId.value, {
    baseUrl: baseUrlDraft.value,
    officialWebsite: nextOfficialWebsite
  })
}

async function handleOfficialWebsiteBlur(): Promise<void> {
  if (!selectedProvider.value || !selectedProviderId.value) return
  if (officialWebsiteDraft.value !== selectedProvider.value.officialWebsite) {
    await store.updateProviderOfficialWebsite(selectedProviderId.value, officialWebsiteDraft.value)
  }
}

function handleOpenOfficialWebsite(): void {
  const officialWebsite = officialWebsiteDraft.value.trim()
  if (!officialWebsite) return
  window.open(officialWebsite, '_blank', 'noopener,noreferrer')
}

function openSmokeTestPromptDialog(): void {
  isSmokeTestPromptDialogOpen.value = true
}

function closeSmokeTestPromptDialog(): void {
  isSmokeTestPromptDialogOpen.value = false
}

function openSmokeTestDialog(): void {
  if (!selectedProvider.value) return
  smokeTestProviderId.value = selectedProvider.value.id
  selectedSmokeTestModelIds.value = selectedProvider.value.models.map((model) => model.id)
  selectedSmokeTestPromptConfigId.value = smokeTestPromptStore.activeConfigId || ''
  isSmokeTestDialogOpen.value = true
}

function closeSmokeTestDialog(): void {
  isSmokeTestDialogOpen.value = false
}

function toggleSmokeTestModel(modelId: string): void {
  if (selectedSmokeTestModelIds.value.includes(modelId)) {
    selectedSmokeTestModelIds.value = selectedSmokeTestModelIds.value.filter((id) => id !== modelId)
    return
  }
  selectedSmokeTestModelIds.value = [...selectedSmokeTestModelIds.value, modelId]
}

async function handleCreateSmokeTestPromptConfig(): Promise<void> {
  await smokeTestPromptStore.createConfig()
}

async function handleSetDefaultSmokeTestPromptConfig(id: string): Promise<void> {
  await smokeTestPromptStore.setActiveConfig(id)
}

async function handleRemoveSmokeTestPromptConfig(id: string): Promise<void> {
  await smokeTestPromptStore.removeConfig(id)
}

async function handleRenameSmokeTestPromptConfig(id: string, event: Event): Promise<void> {
  const target = event.target as HTMLInputElement | null
  await smokeTestPromptStore.renameConfig(id, target?.value || '')
}

async function handleSmokeTestPromptInput(event: Event): Promise<void> {
  const target = event.target as HTMLTextAreaElement | null
  await smokeTestPromptStore.updateSelectedPrompt(target?.value || '')
}

async function handleResetSmokeTestPrompt(): Promise<void> {
  await smokeTestPromptStore.resetSelectedPrompt()
}

async function confirmSmokeTest(): Promise<void> {
  if (!smokeTestProviderId.value || selectedSmokeTestModelIds.value.length === 0) return
  const providerId = smokeTestProviderId.value
  const modelIds = [...selectedSmokeTestModelIds.value]
  const prompt = smokeTestPromptStore.getPromptByConfigId(selectedSmokeTestPromptConfigId.value)
  closeSmokeTestDialog()
  await store.testProviderModels(providerId, modelIds, prompt)
}

async function removeModel(modelId: string): Promise<void> {
  await store.removeModel(modelId)
}

function isModelAdded(modelId: string): boolean {
  return selectedProvider.value?.models.some((model) => model.id === modelId) || false
}

function isGroupFullyAdded(_groupName: string, models: Array<{ id: string }>): boolean {
  return models.length > 0 && models.every((model) => isModelAdded(model.id))
}

async function handleAddSingleModel(model: { id: string }): Promise<void> {
  await store.addSingleRemoteModel(model)
}

async function handleRemoveSingleModel(modelId: string): Promise<void> {
  await store.removeSingleRemoteModel(modelId)
}

async function handleAddGroupModels(
  groupName: string,
  models: Array<{ id: string }>
): Promise<void> {
  await store.addGroupModels(groupName, models)
}

async function handleRemoveGroupModels(
  groupName: string,
  models: Array<{ id: string }>
): Promise<void> {
  await store.removeGroupModels(groupName, models)
}

async function handleManualAddModel(): Promise<void> {
  await store.handleManualAddModel()
}

function clearSearch(): void {
  modelSearchQuery.value = ''
}
</script>
