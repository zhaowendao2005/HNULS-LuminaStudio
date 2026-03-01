<template>
  <div
    class="of-bottom-panel w-80 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col overflow-hidden max-h-[80vh]"
  >
    <!-- 标签页 -->
    <div
      class="px-3 pt-3 pb-2 border-b border-gray-200 flex items-center justify-between flex-shrink-0"
    >
      <div class="flex gap-2">
        <button class="px-3 py-1.5 text-sm font-medium bg-green-100 text-green-700 rounded-md">
          设置
        </button>
        <button class="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md">
          属性
        </button>
        <button class="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md">
          样式
        </button>
      </div>
      <button
        class="w-6 h-6 hover:bg-gray-100 rounded flex items-center justify-center"
        @click="emit('close')"
      >
        <svg class="w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>

    <!-- 大量内容用于测试滚动 -->
    <div class="flex-1 overflow-y-auto p-3 space-y-4">
      <!-- 设置项 -->
      <div class="space-y-3">
        <div class="text-sm font-medium text-gray-700">基本设置</div>

        <div class="space-y-2">
          <label class="flex items-center justify-between">
            <span class="text-sm text-gray-600">启用功能</span>
            <div class="w-10 h-5 bg-green-500 rounded-full relative cursor-pointer">
              <div class="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5"></div>
            </div>
          </label>

          <label class="flex items-center justify-between">
            <span class="text-sm text-gray-600">自动保存</span>
            <div class="w-10 h-5 bg-gray-300 rounded-full relative cursor-pointer">
              <div class="w-4 h-4 bg-white rounded-full absolute left-0.5 top-0.5"></div>
            </div>
          </label>

          <label class="flex items-center justify-between">
            <span class="text-sm text-gray-600">显示调试</span>
            <div class="w-10 h-5 bg-gray-300 rounded-full relative cursor-pointer">
              <div class="w-4 h-4 bg-white rounded-full absolute left-0.5 top-0.5"></div>
            </div>
          </label>
        </div>
      </div>

      <div class="h-px bg-gray-200"></div>

      <!-- 输入框组 -->
      <div class="space-y-3">
        <div class="text-sm font-medium text-gray-700">参数配置</div>

        <div>
          <label class="block text-xs text-gray-500 mb-1">节点名称</label>
          <input
            type="text"
            value="GPT-4 节点"
            class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-green-400"
          />
        </div>

        <div>
          <label class="block text-xs text-gray-500 mb-1">API Key</label>
          <input
            type="password"
            value="sk-xxxxx"
            class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-green-400"
          />
        </div>

        <div>
          <label class="block text-xs text-gray-500 mb-1">模型选择</label>
          <select
            class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-green-400"
          >
            <option>gpt-4</option>
            <option>gpt-4-turbo</option>
            <option>gpt-3.5-turbo</option>
          </select>
        </div>

        <div>
          <label class="block text-xs text-gray-500 mb-1">Temperature</label>
          <input type="range" min="0" max="2" step="0.1" value="0.7" class="w-full" />
          <div class="flex justify-between text-xs text-gray-400">
            <span>0</span>
            <span>0.7</span>
            <span>2</span>
          </div>
        </div>
      </div>

      <div class="h-px bg-gray-200"></div>

      <!-- 更多设置项 -->
      <div class="space-y-3">
        <div class="text-sm font-medium text-gray-700">高级选项</div>

        <div class="p-2 bg-gray-50 rounded-md">
          <div class="text-xs text-gray-500 mb-2">系统提示词</div>
          <textarea
            rows="3"
            class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-green-400 resize-none"
          >
你是一个有用的AI助手...</textarea
          >
        </div>

        <div class="p-2 bg-gray-50 rounded-md">
          <div class="text-xs text-gray-500 mb-2">JSON 配置</div>
          <pre class="text-xs text-gray-600 bg-gray-100 p-2 rounded overflow-x-auto">
{ "max_tokens": 2000, "top_p": 1 }</pre
          >
        </div>
      </div>

      <div class="h-px bg-gray-200"></div>

      <!-- 更多内容 -->
      <div class="space-y-2">
        <div class="text-sm font-medium text-gray-700">历史记录</div>

        <div class="space-y-1">
          <div
            v-for="i in 10"
            :key="i"
            class="px-2 py-2 hover:bg-gray-50 rounded cursor-pointer flex items-center gap-2"
          >
            <div class="w-2 h-2 bg-green-400 rounded-full"></div>
            <span class="text-sm text-gray-600">配置项 {{ i }}</span>
          </div>
        </div>
      </div>

      <div class="h-px bg-gray-200"></div>

      <!-- 更多信息 -->
      <div class="space-y-2">
        <div class="text-sm font-medium text-gray-700">日志输出</div>

        <div
          class="p-2 bg-gray-900 rounded-md font-mono text-xs text-green-400 max-h-32 overflow-y-auto"
        >
          <div>[INFO] 节点初始化完成</div>
          <div>[INFO] 连接到 API...</div>
          <div>[DEBUG] 请求参数: {</div>
          <div>[DEBUG] model: "gpt-4"</div>
          <div>[DEBUG] temperature: 0.7</div>
          <div>[DEBUG] }</div>
          <div>[INFO] 响应成功</div>
          <div>[INFO] 解析完成</div>
          <div>[DEBUG] 输出 tokens: 1234</div>
        </div>
      </div>

      <div class="h-px bg-gray-200"></div>

      <!-- 最后的内容 -->
      <div class="space-y-2">
        <div class="text-sm font-medium text-gray-700">其他</div>

        <div v-for="i in 5" :key="i" class="p-2 border border-gray-200 rounded-md">
          <div class="text-sm font-medium text-gray-700">项目 {{ i }}</div>
          <div class="text-xs text-gray-500 mt-1">这是一些描述文本，用于填充内容高度。</div>
        </div>
      </div>

      <!-- 最底部 -->
      <div class="pt-2 pb-4">
        <button
          class="w-full py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-md"
        >
          保存配置
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  close: []
}>()
</script>
