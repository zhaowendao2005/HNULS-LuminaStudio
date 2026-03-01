<template>
  <Teleport to="body">
    <div
      v-if="props.show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="$emit('close')"
    >
      <div
        class="of-create-workflow-modal relative w-full max-w-2xl max-h-[90vh] bg-white rounded-xl shadow-xl overflow-hidden flex flex-col"
        @click.stop
      >
        <!-- 头部 -->
        <div
          class="flex-shrink-0 px-6 py-4 border-b border-slate-200 flex items-center justify-between"
        >
          <h2 class="text-lg font-semibold text-slate-900">创建工作流</h2>
          <button
            @click="$emit('close')"
            class="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <!-- 内容区 -->
        <div class="flex-1 overflow-y-auto px-6 py-6">
          <!-- 工作流名称 -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-slate-700 mb-2">
              工作流名称
              <span class="text-red-500">*</span>
            </label>
            <input
              v-model="formData.name"
              type="text"
              placeholder="请输入工作流名称"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              @keyup.enter="handleConfirm"
            />
          </div>

          <!-- 描述 -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-slate-700 mb-2">描述（可选）</label>
            <textarea
              v-model="formData.description"
              rows="3"
              placeholder="请输入工作流描述"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
            />
          </div>

          <!-- 图标选择 -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-slate-700 mb-2">图标</label>
            <div class="flex items-center gap-4">
              <!-- 图标预览 -->
              <div
                class="flex h-16 w-16 items-center justify-center rounded-lg text-2xl cursor-pointer border-2 transition-colors"
                :class="selectedIcon ? 'border-emerald-500' : 'border-slate-300'"
                :style="{ backgroundColor: formData.iconBackground || '#E5E7EB' }"
                @click="showIconPicker = true"
              >
                {{ formData.icon || '📋' }}
              </div>

              <!-- 背景色选择 -->
              <div class="flex-1">
                <label class="block text-xs text-slate-500 mb-2">背景色</label>
                <div class="flex gap-2 flex-wrap">
                  <button
                    v-for="color in iconBackgrounds"
                    :key="color"
                    @click="formData.iconBackground = color"
                    class="w-8 h-8 rounded border-2 transition-all"
                    :class="
                      formData.iconBackground === color
                        ? 'border-emerald-500 scale-110'
                        : 'border-slate-300'
                    "
                    :style="{ backgroundColor: color }"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- 图标选择器（简化版） -->
          <div v-if="showIconPicker" class="mb-6">
            <div
              class="grid grid-cols-8 gap-2 p-4 border border-slate-200 rounded-lg bg-slate-50 max-h-48 overflow-y-auto"
            >
              <button
                v-for="icon in commonIcons"
                :key="icon"
                @click="() => { formData.icon = icon; showIconPicker = false }"
                class="w-10 h-10 flex items-center justify-center text-xl rounded hover:bg-emerald-100 transition-colors"
              >
                {{ icon }}
              </button>
            </div>
          </div>
        </div>

        <!-- 底部按钮 -->
        <div
          class="flex-shrink-0 px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3"
        >
          <button
            @click="$emit('close')"
            class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            取消
          </button>
          <button
            @click="handleConfirm"
            :disabled="!formData.name.trim()"
            class="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            创建
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (
    e: 'confirm',
    data: {
      name: string
      description?: string
      icon?: string
      iconBackground?: string
    }
  ): void
}>()

const formData = reactive({
  name: '',
  description: '',
  icon: '📋',
  iconBackground: '#E5E7EB'
})

const showIconPicker = ref(false)

const commonIcons = [
  '📋',
  '🤖',
  '💬',
  '📄',
  '🔧',
  '⚙️',
  '🎯',
  '🚀',
  '📊',
  '🔍',
  '💡',
  '⭐',
  '🎨',
  '🔐',
  '📝',
  '🌐'
]

const iconBackgrounds = [
  '#FFEAD5',
  '#E0F2FE',
  '#F3E8FF',
  '#E5E7EB',
  '#FEF3C7',
  '#D1FAE5',
  '#FCE7F3',
  '#E0E7FF'
]

function handleConfirm() {
  if (!formData.name.trim()) {
    return
  }
  emit('confirm', {
    name: formData.name.trim(),
    description: formData.description.trim() || undefined,
    icon: formData.icon,
    iconBackground: formData.iconBackground
  })
  // 重置表单
  formData.name = ''
  formData.description = ''
  formData.icon = '📋'
  formData.iconBackground = '#E5E7EB'
  showIconPicker.value = false
}
</script>
