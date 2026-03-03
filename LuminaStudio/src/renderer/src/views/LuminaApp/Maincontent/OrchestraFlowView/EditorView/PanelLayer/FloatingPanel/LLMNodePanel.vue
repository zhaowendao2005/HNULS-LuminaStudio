<template>
  <div class="of-node-config-panel of-llm-panel h-full flex flex-col">
    <!-- 头部 -->
    <div class="px-4 pt-4 pb-2 flex-shrink-0 border-b border-gray-100">
      <!-- 标题行：图标 + 输入框 + 操作按钮 -->
      <div class="flex items-center gap-3">
        <!-- 节点图标 -->
        <div
          class="flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-500 text-white shrink-0"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            class="w-3.5 h-3.5"
          >
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M5.83333 2.40625C5.04971 2.40625 4.39011 2.94431 4.20689 3.67206C4.13982 3.93846 3.91391 4.1349 3.64078 4.16432C2.94692 4.23906 2.40625 4.82766 2.40625 5.54167C2.40625 5.92943 2.56471 6.27904 2.82212 6.53129C2.94807 6.65472 3.01905 6.82365 3.01905 7C3.01905 7.17635 2.94807 7.34528 2.82212 7.46871C2.56471 7.72096 2.40625 8.07057 2.40625 8.45833C2.40625 9.03652 2.76061 9.53347 3.26651 9.74092C3.45247 9.81717 3.59324 9.97444 3.64849 10.1677C3.8841 10.9917 4.64342 11.5938 5.54167 11.5938C5.82802 11.5938 6.09916 11.533 6.34375 11.4237V9.91667C6.34375 9.31258 5.85409 8.82292 5.25 8.82292C4.88756 8.82292 4.59375 8.5291 4.59375 8.16667C4.59375 7.80423 4.88756 7.51042 5.25 7.51042C5.64385 7.51042 6.0156 7.60503 6.34375 7.77278V2.48514C6.18319 2.43393 6.01183 2.40625 5.83333 2.40625ZM7.65625 2.48514V4.08333C7.65625 4.6874 8.14592 5.17708 8.75 5.17708C9.11244 5.17708 9.40625 5.4709 9.40625 5.83333C9.40625 6.19577 9.11244 6.48958 8.75 6.48958C8.35615 6.48958 7.9844 6.39496 7.65625 6.22722V11.4237C7.90087 11.533 8.17199 11.5938 8.45833 11.5938C9.35657 11.5938 10.1159 10.9917 10.3515 10.1677C10.4068 9.97444 10.5475 9.81717 10.7335 9.74092C11.2394 9.53347 11.5938 9.03652 11.5938 8.45833C11.5938 8.07056 11.4353 7.72096 11.1779 7.46871C11.0519 7.34528 10.981 7.17635 10.981 7C10.981 6.82365 11.0519 6.65472 11.1779 6.53129C11.4353 6.27904 11.5938 5.92944 11.5938 5.54167C11.5938 4.82766 11.0531 4.23906 10.3592 4.16432C10.0861 4.1349 9.86022 3.93847 9.79315 3.67208C9.6099 2.94432 8.95027 2.40625 8.16667 2.40625C7.98817 2.40625 7.81681 2.43393 7.65625 2.48514ZM7.00001 12.565C6.56031 12.7835 6.06472 12.9062 5.54167 12.9062C4.14996 12.9062 2.96198 12.0403 2.48457 10.8188C1.65595 10.3591 1.09375 9.47501 1.09375 8.45833C1.09375 7.9213 1.2511 7.42042 1.52161 7C1.2511 6.57958 1.09375 6.0787 1.09375 5.54167C1.09375 4.30153 1.93005 3.25742 3.06973 2.94157C3.51828 1.85715 4.586 1.09375 5.83333 1.09375C6.24643 1.09375 6.64104 1.17788 7 1.33013C7.35896 1.17788 7.75357 1.09375 8.16667 1.09375C9.41399 1.09375 10.4817 1.85716 10.9303 2.94157C12.0699 3.25742 12.9062 4.30153 12.9062 5.54167C12.9062 6.07869 12.7489 6.57958 12.4784 7C12.7489 7.42043 12.9062 7.92131 12.9062 8.45833C12.9062 9.47502 12.344 10.3591 11.5154 10.8188C11.038 12.0403 9.85003 12.9062 8.45833 12.9062C7.93526 12.9062 7.4397 12.7834 7.00001 12.565Z"
              fill="currentColor"
            />
          </svg>
        </div>

        <!-- 标题输入框 -->
        <input
          v-model="localTitle"
          class="system-xl-semibold flex-1 h-7 min-w-0 appearance-none rounded-md border border-transparent bg-transparent px-1 text-gray-900 outline-none focus:shadow-xs"
          placeholder="添加标题..."
        />

        <!-- 操作按钮 -->
        <div class="flex items-center gap-1 shrink-0">
          <!-- 帮助按钮 -->
          <div
            class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md hover:bg-gray-100"
          >
            <svg
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="currentColor"
              class="h-4 w-4 text-gray-400"
            >
              <path
                d="M8 18.3915V5.60846L18.2264 12L8 18.3915ZM6 3.80421V20.1957C6 20.9812 6.86395 21.46 7.53 21.0437L20.6432 12.848C21.2699 12.4563 21.2699 11.5436 20.6432 11.152L7.53 2.95621C6.86395 2.53993 6 3.01878 6 3.80421Z"
              />
            </svg>
          </div>
          <!-- 文档链接 -->
          <a
            href="https://docs.dify.ai/zh/use-dify/nodes/llm"
            target="_blank"
            class="flex h-6 w-6 items-center justify-center rounded-md hover:bg-gray-100"
          >
            <svg
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="currentColor"
              class="h-4 w-4 text-gray-400"
            >
              <path
                d="M13 21V23H11V21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3H9C10.1947 3 11.2671 3.52375 12 4.35418C12.7329 3.52375 13.8053 3 15 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H13ZM20 19V5H15C13.8954 5 13 5.89543 13 7V19H20ZM11 19V7C11 5.89543 10.1046 5 9 5H4V19H11Z"
              />
            </svg>
          </a>
          <!-- 三点菜单 -->
          <div
            class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md hover:bg-gray-100"
          >
            <svg
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="currentColor"
              class="h-4 w-4 text-gray-400"
            >
              <path
                d="M5 10C3.9 10 3 10.9 3 12C3 13.1 3.9 14 5 14C6.1 14 7 13.1 7 12C7 10.9 6.1 10 5 10ZM19 10C17.9 10 17 10.9 17 12C17 13.1 17.9 14 19 14C20.1 14 21 13.1 21 12C21 10.9 20.1 10 19 10ZM12 10C10.9 10 10 10.9 10 12C10 13.1 10.9 14 12 14C13.1 14 14 13.1 14 12C14 10.9 13.1 10 12 10Z"
              />
            </svg>
          </div>
          <!-- 关闭按钮 -->
          <div class="flex h-6 w-6 cursor-pointer items-center justify-center" @click="handleClose">
            <svg
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="currentColor"
              class="h-4 w-4 text-gray-400"
            >
              <path
                d="M11.9997 10.5865L16.9495 5.63672L18.3637 7.05093L13.4139 12.0007L18.3637 16.9504L16.9495 18.3646L11.9997 13.4149L7.04996 18.3646L5.63574 16.9504L10.5855 12.0007L5.63574 7.05093L7.0502 5.63672L11.9997 10.5865Z"
              />
            </svg>
          </div>
        </div>
      </div>

      <!-- 描述文本框 -->
      <div class="mt-2">
        <textarea
          v-model="localDesc"
          class="w-full resize-none appearance-none bg-transparent text-xs leading-[18px] text-gray-600 outline-none placeholder:text-gray-400"
          placeholder="添加描述..."
          :style="{ height: '18px' }"
        />
      </div>

      <!-- Tab 切换 -->
      <div class="flex items-center justify-between mt-3">
        <div class="flex gap-4">
          <div
            class="system-md-semibold relative flex cursor-pointer items-center border-b-2 pb-2 pt-2.5"
            :class="
              activeTab === 'settings'
                ? 'border-indigo-500 text-gray-900'
                : 'border-transparent text-gray-400'
            "
            @click="setActiveTab('settings')"
          >
            设置
          </div>
          <div
            class="system-md-semibold relative flex cursor-pointer items-center border-b-2 pb-2 pt-2.5"
            :class="
              activeTab === 'lastRun'
                ? 'border-indigo-500 text-gray-900'
                : 'border-transparent text-gray-400'
            "
            @click="setActiveTab('lastRun')"
          >
            上次运行
          </div>
        </div>
      </div>
    </div>

    <!-- 内容区 -->
    <div class="flex-1 overflow-y-auto">
      <!-- 设置 Tab -->
      <div v-if="activeTab === 'settings'" class="mt-2 px-4 pb-4 space-y-4">
        <!-- 模型选择 -->
        <div>
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <div class="system-sm-semibold-uppercase text-gray-500">
                模型
                <span class="text-red-500">*</span>
              </div>
            </div>
          </div>
          <div class="mt-1">
            <!-- 使用全局通用模型选择组件 -->
            <ModelSelector
              v-model:visible="modelSelectorVisible"
              :current-provider-id="currentProviderId"
              :current-model-id="currentModelId"
              title="选择模型"
              :show-manage-button="false"
              @select="handleModelSelected"
            />
            <!-- 触发按钮：显示当前选择的模型，点击打开选择器 -->
            <div
              class="relative cursor-pointer rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 hover:border-gray-300"
              @click="modelSelectorVisible = true"
            >
              <div class="flex items-center">
                <div class="flex h-5 w-5 items-center justify-center mr-2">
                  <svg
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    fill="currentColor"
                    class="h-5 w-5 text-gray-500"
                    aria-hidden="true"
                  >
                    <path
                      d="M16 2C17.1046 2 18 2.89543 18 4V6H20C21.1046 6 22 6.89543 22 8V16C22 17.1046 21.1046 18 20 18H18V20C18 21.1046 17.1046 22 16 22H8C6.89543 22 6 21.1046 6 20V18H4C2.89543 18 2 17.1046 2 16V8C2 6.89543 2.89543 6 4 6H6V4C6 2.89543 6.89543 2 8 2H16ZM16 4H8V6H16V4ZM20 8H4V16H20V8ZM16 18H8V20H16V18Z"
                    />
                  </svg>
                </div>
                <div class="flex-1">
                  <div class="text-sm text-gray-900">
                    {{ displayModelText }}
                  </div>
                </div>
                <svg
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="currentColor"
                  class="h-4 w-4 text-gray-400 shrink-0"
                >
                  <path
                    d="M11.9999 13.1714L16.9497 8.22168L18.3639 9.63589L11.9999 15.9999L5.63599 9.63589L7.0502 8.22168L11.9999 13.1714Z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- 上下文 -->
        <div>
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <div class="system-sm-semibold-uppercase text-gray-500">上下文</div>
              <div class="ml-1 w-4 h-4" title="启用后可以在提示词中使用上下文变量">
                <svg
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="currentColor"
                  class="h-4 w-4 text-gray-400"
                >
                  <path
                    d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM11 15H13V17H11V15ZM13 13.3551V14H11V12.5C11 11.9477 11.4477 11.5 12 11.5C12.8284 11.5 13.5 10.8284 13.5 10C13.5 9.17157 12.8284 8.5 12 8.5C11.2723 8.5 10.6656 9.01823 10.5288 9.70577L8.56731 9.31346C8.88637 7.70919 10.302 6.5 12 6.5C13.933 6.5 15.5 8.067 15.5 10C15.5 11.5855 14.4457 12.9248 13 13.3551Z"
                  />
                </svg>
              </div>
            </div>
          </div>
          <div class="mt-1">
            <div class="rounded-lg border border-gray-200 bg-gray-50 px-2 py-2">
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <div class="text-xs text-gray-500">当前无上下文变量</div>
                </div>
                <div class="text-xs text-orange-500">
                  要启用上下文功能，请在提示中填写上下文变量。
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 提示词模板 -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center">
              <div class="system-sm-semibold-uppercase text-gray-500">提示词编排</div>
            </div>
          </div>

          <!-- 消息列表 -->
          <div class="space-y-2">
            <div
              v-for="(message, index) in localMessages"
              :key="index"
              class="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden"
            >
              <!-- 消息头部 -->
              <div
                class="flex items-center justify-between px-3 py-2 bg-gray-100 border-b border-gray-200"
              >
                <div class="flex items-center gap-2">
                  <div class="text-xs font-semibold uppercase text-gray-600">
                    {{
                      message.role === 'system'
                        ? 'SYSTEM'
                        : message.role === 'user'
                          ? 'USER'
                          : 'ASSISTANT'
                    }}
                  </div>
                  <div class="text-xs text-gray-400">{{ message.tokens || 0 }} tokens</div>
                </div>
                <div class="flex items-center gap-1">
                  <!-- 变量按钮 -->
                  <div class="p-1 hover:bg-gray-200 rounded cursor-pointer" title="插入变量">
                    <svg
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="currentColor"
                      class="h-3.5 w-3.5 text-gray-500"
                    >
                      <path
                        d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM11 15H13V17H11V15ZM13 13.3551V14H11V12.5C11 11.9477 11.4477 11.5 12 11.5C12.8284 11.5 13.5 10.8284 13.5 10C13.5 9.17157 12.8284 8.5 12 8.5C11.2723 8.5 10.6656 9.01823 10.5288 9.70577L8.56731 9.31346C8.88637 7.70919 10.302 6.5 12 6.5C13.933 6.5 15.5 8.067 15.5 10C15.5 11.5855 14.4457 12.9248 13 13.3551Z"
                      />
                    </svg>
                  </div>
                  <!-- 复制按钮 -->
                  <div class="p-1 hover:bg-gray-200 rounded cursor-pointer" title="复制">
                    <svg
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="currentColor"
                      class="h-3.5 w-3.5 text-gray-500"
                    >
                      <path
                        d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z"
                      />
                    </svg>
                  </div>
                  <!-- 编辑按钮 -->
                  <div class="p-1 hover:bg-gray-200 rounded cursor-pointer" title="编辑">
                    <svg
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="currentColor"
                      class="h-3.5 w-3.5 text-gray-500"
                    >
                      <path
                        d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25ZM20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04Z"
                      />
                    </svg>
                  </div>
                  <!-- 删除按钮 -->
                  <div
                    class="p-1 hover:bg-gray-200 rounded cursor-pointer"
                    title="删除"
                    @click="removeMessage(index)"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="currentColor"
                      class="h-3.5 w-3.5 text-gray-500 hover:text-red-500"
                    >
                      <path
                        d="M6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7H6V19ZM19 4H15.5L14.5 3H9.5L8.5 4H5V6H19V4Z"
                      />
                    </svg>
                  </div>
                </div>
              </div>
              <!-- 消息内容 -->
              <div class="p-3 min-h-[60px]">
                <textarea
                  :value="message.text"
                  class="w-full resize-none appearance-none bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                  placeholder="输入提示词内容..."
                  :style="{ minHeight: '60px' }"
                  @input="updateMessageContent(index, ($event.target as HTMLInputElement).value)"
                />
              </div>
            </div>

            <!-- 添加消息按钮 -->
            <button
              class="w-full py-2 border border-dashed border-gray-200 rounded-lg text-sm text-gray-400 hover:bg-gray-50 hover:text-gray-500 flex items-center justify-center gap-1"
              @click="addMessage"
            >
              <svg
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                class="h-4 w-4"
              >
                <path d="M11 11V5H13V11H19V13H13V19H11V13H5V11H11Z" />
              </svg>
              添加消息
            </button>
          </div>
        </div>

        <!-- 视觉（临时禁用，待后续扩展） -->
        <div class="opacity-50 pointer-events-none">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <div class="system-sm-semibold-uppercase text-gray-500">视觉</div>
              <span class="ml-2 text-xs text-gray-400">(待扩展)</span>
            </div>
            <div class="h-4 w-7 rounded-full bg-gray-200 transition-colors duration-200">
              <div
                class="h-3 w-3 rounded-full bg-white shadow transform transition-transform duration-200 mt-0.5 translate-x-0.5"
              />
            </div>
          </div>
        </div>

        <!-- 启用推理标签分离（临时禁用，待后续扩展） -->
        <div class="opacity-50 pointer-events-none">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <div class="system-sm-semibold-uppercase text-gray-500">启用推理标签分离</div>
              <span class="ml-2 text-xs text-gray-400">(待扩展)</span>
            </div>
            <div class="h-4 w-7 rounded-full bg-gray-200 transition-colors duration-200">
              <div
                class="h-3 w-3 rounded-full bg-white shadow transform transition-transform duration-200 mt-0.5 translate-x-0.5"
              />
            </div>
          </div>
        </div>

        <!-- 输出变量 -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center">
              <div class="system-sm-semibold-uppercase text-gray-500">输出变量</div>
            </div>
            <div class="text-xs text-gray-400">结构化输出</div>
          </div>

          <div class="space-y-2">
            <div
              v-for="(output, index) in localOutputs"
              :key="index"
              class="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2 py-2"
            >
              <div class="flex-1 min-w-0">
                <input
                  :value="output.variable"
                  class="w-full text-sm text-gray-700 bg-transparent outline-none"
                  placeholder="变量名"
                  @input="updateOutputVariable(index, ($event.target as HTMLInputElement).value)"
                />
              </div>
              <div class="text-gray-400">:</div>
              <div class="flex-1 min-w-0">
                <div class="w-full text-sm text-gray-500">string</div>
              </div>
              <div class="cursor-pointer shrink-0" @click="removeOutput(index)">
                <svg
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  class="h-4 w-4 text-gray-400 hover:text-red-500"
                >
                  <path
                    d="M6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7H6V19ZM19 4H15.5L14.5 3H9.5L8.5 4H5V6H19V4Z"
                  />
                </svg>
              </div>
            </div>

            <button
              class="w-full py-2 border border-dashed border-gray-200 rounded-lg text-sm text-gray-400 hover:bg-gray-50 hover:text-gray-500 flex items-center justify-center gap-1"
              @click="addOutput"
            >
              <svg
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                class="h-4 w-4"
              >
                <path d="M11 11V5H13V11H19V13H13V19H11V13H5V11H11Z" />
              </svg>
              添加输出
            </button>
          </div>
        </div>

        <!-- 失败时重试（临时禁用，待后续扩展） -->
        <div class="opacity-50 pointer-events-none">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <div class="system-sm-semibold-uppercase text-gray-500">失败时重试</div>
              <span class="ml-2 text-xs text-gray-400">(待扩展)</span>
            </div>
            <div class="h-4 w-7 rounded-full bg-gray-200 transition-colors duration-200">
              <div
                class="h-3 w-3 rounded-full bg-white shadow transform transition-transform duration-200 mt-0.5 translate-x-0.5"
              />
            </div>
          </div>
        </div>

        <!-- 异常处理 -->
        <div>
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <div class="system-sm-semibold-uppercase text-gray-500">异常处理</div>
              <div class="ml-1 w-3.5 h-3.5" title="配置节点执行异常时的处理策略">
                <svg
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="currentColor"
                  class="h-3.5 w-3.5 text-gray-400"
                >
                  <path
                    d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM11 15H13V17H11V15ZM13 13.3551V14H11V12.5C11 11.9477 11.4477 11.5 12 11.5C12.8284 11.5 13.5 10.8284 13.5 10C13.5 9.17157 12.8284 8.5 12 8.5C11.2723 8.5 10.6656 9.01823 10.5288 9.70577L8.56731 9.31346C8.88637 7.70919 10.302 6.5 12 6.5C13.933 6.5 15.5 8.067 15.5 10C15.5 11.5855 14.4457 12.9248 13 13.3551Z"
                  />
                </svg>
              </div>
            </div>
            <button class="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
              无
              <svg
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                class="h-3 w-3"
              >
                <path
                  d="M11.9999 13.1714L16.9497 8.22168L18.3639 9.63589L11.9999 15.9999L5.63599 9.63589L7.0502 8.22168L11.9999 13.1714Z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- 上次运行 Tab -->
      <div v-else-if="activeTab === 'lastRun'" class="p-4">
        <div class="text-sm text-gray-400 text-center py-8">暂无运行记录</div>
      </div>
    </div>

    <!-- 底部：下一步 -->
    <div class="flex-shrink-0 border-t border-gray-100 p-4">
      <div class="system-sm-semibold-uppercase mb-1 flex items-center text-gray-500">下一步</div>
      <div class="system-xs-regular mb-2 text-gray-400">添加此工作流程中的下一个节点</div>

      <!-- 下一步节点连接器 -->
      <div class="flex py-1">
        <div
          class="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white shadow-xs"
        >
          <!-- 这里后续会显示已连接的节点 -->
        </div>
        <svg class="w-6 shrink-0" style="height: 36px">
          <g>
            <path d="M0,18 L24,18" stroke-width="1" fill="none" class="stroke-gray-200" />
          </g>
        </svg>
        <div
          class="grow flex h-9 cursor-pointer items-center rounded-lg border border-dashed border-gray-200 px-2 text-xs text-gray-400 hover:bg-gray-50"
          @click="addNextNode"
        >
          <div class="mr-1.5 flex h-5 w-5 items-center justify-center rounded bg-gray-100">
            <svg
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="currentColor"
              class="h-3 w-3"
            >
              <path d="M11 11V5H13V11H19V13H13V19H11V13H5V11H11Z" />
            </svg>
          </div>
          <div class="flex items-center uppercase">添加节点</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useWorkflowEditorUIStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor-ui.store'
import { useWorkflowEditorStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor.store'
import ModelSelector from '@renderer/components/ModelSelector'
import type { OFLLMNodeData, OFPromptItem } from '@Public/ShareTypes/Orchestraflow-types'

const uiStore = useWorkflowEditorUIStore()
const editorStore = useWorkflowEditorStore()

// 本地表单状态（临时性质，不做全局状态）
const localTitle = ref('')
const localDesc = ref('')
const activeTab = ref<'settings' | 'lastRun'>('settings')

// 模型选择对话框显示状态
const modelSelectorVisible = ref(false)

// 获取当前选中的节点
const currentNode = computed(() => {
  if (!uiStore.selectedNodeId) return null
  return editorStore.nodes.find((n) => n.id === uiStore.selectedNodeId)
})

// 当前模型标识（从 store 读写，全局持久化）
const currentProviderId = computed({
  get() {
    if (!currentNode.value) return 'openai'
    const nodeData = currentNode.value.data as OFLLMNodeData
    return nodeData.model?.provider || 'openai'
  },
  set(newProvider: string) {
    if (!uiStore.selectedNodeId || !currentNode.value) return
    const nodeData = currentNode.value.data as OFLLMNodeData
    editorStore.updateNode(uiStore.selectedNodeId, {
      model: { ...nodeData.model, provider: newProvider }
    })
  }
})

const currentModelId = computed({
  get() {
    if (!currentNode.value) return 'gpt-4'
    const nodeData = currentNode.value.data as OFLLMNodeData
    return nodeData.model?.name || 'gpt-4'
  },
  set(newModel: string) {
    if (!uiStore.selectedNodeId || !currentNode.value) return
    const nodeData = currentNode.value.data as OFLLMNodeData
    editorStore.updateNode(uiStore.selectedNodeId, {
      model: { ...nodeData.model, name: newModel }
    })
  }
})

// 展示用文案
const displayModelText = computed(() => {
  if (!currentProviderId.value || !currentModelId.value) {
    return '请选择模型'
  }
  return `${currentProviderId.value} / ${currentModelId.value}`
})

// 处理模型选择结果
function handleModelSelected(payload: {
  provider: { id: string; name: string }
  model: { id: string; name: string }
}): void {
  currentProviderId.value = payload.provider.id
  currentModelId.value = payload.model.id
}

// 提示词消息（从 store 读写，全局持久化）
const localMessages = computed({
  get() {
    if (!currentNode.value) return []
    const nodeData = currentNode.value.data as OFLLMNodeData
    return nodeData.prompt_template || []
  },
  set(newMessages: OFPromptItem[]) {
    if (!uiStore.selectedNodeId) return
    editorStore.updateNode(uiStore.selectedNodeId, {
      prompt_template: newMessages
    })
  }
})

// 临时消息列表（用于编辑，避免直接修改 computed）
const editableMessages = ref<Array<{ role: string; content: string; tokens?: number }>>([
  { role: 'system', content: '', tokens: 0 },
  { role: 'user', content: '', tokens: 0 }
])

// 输出变量（从 store 读写，全局持久化）
const localOutputs = computed({
  get() {
    if (!currentNode.value) return []
    const nodeData = currentNode.value.data as OFLLMNodeData
    // 注意：OFLLMNodeData 类型中没有 outputs 字段，这里需要扩展类型或使用 any
    return (nodeData as any).outputs || []
  },
  set(newOutputs: Array<{ variable: string; value_selector: string[] }>) {
    if (!uiStore.selectedNodeId) return
    editorStore.updateNode(uiStore.selectedNodeId, {
      outputs: newOutputs
    } as any)
  }
})

// 开关状态（临时禁用，保持本地状态，待后续扩展）
const localVisionEnabled = ref(false)
const localReasoningEnabled = ref(false)
const localRetryEnabled = ref(false)

// Tab 切换
function setActiveTab(tab: 'settings' | 'lastRun'): void {
  activeTab.value = tab
}

// 添加消息
function addMessage(): void {
  const newMessages = [
    ...localMessages.value,
    {
      id: `msg_${Date.now()}`,
      role: 'user' as const,
      text: ''
    }
  ]
  localMessages.value = newMessages
}

// 移除消息
function removeMessage(index: number): void {
  const newMessages = [...localMessages.value]
  newMessages.splice(index, 1)
  localMessages.value = newMessages
}

// 更新消息内容
function updateMessageContent(index: number, newContent: string): void {
  const newMessages = [...localMessages.value]
  newMessages[index] = { ...newMessages[index], text: newContent }
  localMessages.value = newMessages
}

// 添加输出
function addOutput(): void {
  const newOutputs = [
    ...localOutputs.value,
    {
      variable: '',
      value_selector: []
    }
  ]
  localOutputs.value = newOutputs
}

// 移除输出
function removeOutput(index: number): void {
  const newOutputs = [...localOutputs.value]
  newOutputs.splice(index, 1)
  localOutputs.value = newOutputs
}

// 更新输出变量名
function updateOutputVariable(index: number, newVariable: string): void {
  const newOutputs = [...localOutputs.value]
  newOutputs[index] = { ...newOutputs[index], variable: newVariable }
  localOutputs.value = newOutputs
}

// 添加下一步节点
function addNextNode(): void {
  // TODO: 实现添加节点逻辑
}

// 关闭面板
function handleClose(): void {
  uiStore.closeNodeConfigPanel()
}

// 监听选中节点变化，加载数据
watch(
  () => uiStore.selectedNodeId,
  (newId) => {
    if (newId && currentNode.value) {
      const nodeData = currentNode.value.data as OFLLMNodeData
      localTitle.value = nodeData.title || 'LLM'
      localDesc.value = nodeData.desc || ''
      // 模型、消息、输出已通过 computed 自动同步
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.of-node-config-panel {
  font-family: inherit;
}
</style>
