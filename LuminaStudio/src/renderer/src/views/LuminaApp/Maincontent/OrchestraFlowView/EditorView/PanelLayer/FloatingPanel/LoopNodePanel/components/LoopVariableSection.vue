<template>
  <section class="space-y-3">
    <div class="flex items-center justify-between">
      <div class="system-sm-semibold-uppercase text-gray-700">循环变量</div>
      <button
        type="button"
        class="text-[13px] font-semibold leading-[18px] text-emerald-600 transition hover:text-emerald-700"
        @click="emit('add')"
      >
        添加变量
      </button>
    </div>

    <div class="space-y-4">
      <div
        v-for="item in modelValue"
        :key="item.id || item.variable"
        class="space-y-3 border-l-2 border-emerald-200 pl-3"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1 space-y-2">
            <div class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_124px] gap-3">
              <div class="min-w-0">
                <div class="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">显示名</div>
                <input
                  :value="item.label || ''"
                  class="h-7 w-full border-0 border-b border-gray-300 bg-transparent px-0 text-[13px] font-semibold leading-[18px] text-gray-900 outline-none"
                  :class="theme.controlFocusClass"
                  placeholder="label"
                  @input="patch(item, { label: ($event.target as HTMLInputElement).value })"
                />
              </div>
              <div class="min-w-0">
                <div class="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">变量名</div>
                <input
                  :value="item.variable"
                  class="h-7 w-full border-0 border-b border-gray-300 bg-transparent px-0 text-[13px] font-semibold leading-[18px] text-gray-900 outline-none"
                  :class="theme.controlFocusClass"
                  placeholder="variable"
                  @input="patch(item, { variable: ($event.target as HTMLInputElement).value })"
                />
              </div>
              <div class="min-w-0">
                <div class="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">类型</div>
                <WhiteSelect
                  :model-value="item.type || OFVarTypeEnum.String"
                  :options="typeOptions"
                  root-class="w-[124px]"
                  trigger-class="!h-7 !w-full !rounded-none !border-0 !border-b !border-gray-300 !bg-transparent !px-0 !text-[13px] !font-semibold !leading-[18px] !text-gray-700"
                  panel-class="min-w-[140px]"
                  teleport-to="body"
                  @update:model-value="patch(item, { type: String($event) as OFVarType })"
                />
              </div>
            </div>
            <div class="text-xs text-gray-500">
              {{ (item.label || '未命名显示名') + ' · ' + (item.variable || '未命名变量') }}
            </div>
          </div>
          <button
            type="button"
            class="shrink-0 text-xs font-semibold text-gray-400 transition hover:text-rose-600"
            @click="emit('remove', item.id || item.variable)"
          >
            删除
          </button>
        </div>

        <div class="flex items-center gap-3 text-xs">
          <button
            type="button"
            class="font-semibold transition"
            :class="item.value_type === 'constant' ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'"
            @click="patch(item, { value_type: 'constant', value_selector: [] })"
          >
            常量
          </button>
          <span class="text-gray-300">/</span>
          <button
            type="button"
            class="font-semibold transition"
            :class="item.value_type === 'variable' ? 'text-cyan-600' : 'text-gray-400 hover:text-gray-600'"
            @click="patch(item, { value_type: 'variable' })"
          >
            变量
          </button>
        </div>

        <div class="space-y-3">
          <template v-if="item.value_type === 'variable'">
            <button
              type="button"
              class="flex w-full items-center gap-2 text-left text-xs"
              @click="emit('open-selector', item.id || item.variable, $event)"
            >
              <span class="font-semibold text-cyan-600">初始值</span>
              <span
                class="truncate transition"
                :class="
                  formatSelector(item.value_selector)
                    ? 'text-cyan-700 hover:text-cyan-800'
                    : 'text-gray-400 hover:text-cyan-600'
                "
              >
                {{ formatSelector(item.value_selector) || '点击选择变量' }}
              </span>
            </button>
            <div class="flex items-center gap-2 border-b border-gray-200 pb-1">
              <span class="text-xs font-semibold text-gray-500">路径</span>
              <input
                :value="formatSelector(item.value_selector)"
                class="min-w-0 flex-1 border-0 bg-transparent px-0 text-[13px] leading-[18px] text-gray-800 outline-none"
                :class="theme.controlFocusClass"
                placeholder=".field / .0.name"
                @input="patch(item, { value_selector: parseSelector(($event.target as HTMLInputElement).value) })"
              />
            </div>
          </template>

          <template v-else>
            <textarea
              v-if="usesJsonEditor(item)"
              :value="displayValue(item.value)"
              rows="4"
              class="w-full border-0 border-b border-gray-200 bg-transparent px-0 py-1 font-mono text-[13px] leading-5 text-gray-800 outline-none"
              :class="theme.controlFocusClass"
              @input="patch(item, { value: ($event.target as HTMLTextAreaElement).value })"
            />
            <button
              v-else-if="item.type === OFVarTypeEnum.Boolean"
              type="button"
              class="inline-flex items-center gap-3 text-xs"
            >
              <span
                class="font-semibold transition"
                :class="item.value === true ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'"
                @click="patch(item, { value: true })"
              >
                TRUE
              </span>
              <span class="text-gray-300">/</span>
              <span
                class="font-semibold transition"
                :class="item.value === false ? 'text-rose-600' : 'text-gray-400 hover:text-gray-600'"
                @click="patch(item, { value: false })"
              >
                FALSE
              </span>
            </button>
            <input
              v-else
              :value="displayValue(item.value)"
              :type="item.type === OFVarTypeEnum.Number ? 'number' : 'text'"
              class="h-7 w-full border-0 border-b border-gray-200 bg-transparent px-0 text-[13px] leading-[18px] text-gray-800 outline-none"
              :class="theme.controlFocusClass"
              @input="patch(item, { value: ($event.target as HTMLInputElement).value })"
            />
          </template>

          <div v-if="item.type === OFVarTypeEnum.Array" class="grid grid-cols-[1fr_auto] gap-3 border-t border-gray-100 pt-3">
            <WhiteSelect
              :model-value="item.item_type || OFVarTypeEnum.String"
              :options="typeOptions"
              root-class="w-full"
              trigger-class="!h-7 !w-full !rounded-none !border-0 !border-b !border-gray-300 !bg-transparent !px-0 !text-[13px] !leading-[18px] !text-gray-700"
              panel-class="min-w-[140px]"
              teleport-to="body"
              @update:model-value="patch(item, { item_type: String($event) as OFVarType })"
            />
            <button
              v-if="item.item_type === OFVarTypeEnum.Object"
              type="button"
              class="text-[13px] font-semibold leading-[18px] text-amber-600 transition hover:text-amber-700"
              @click="emit('schema', item.id || item.variable, 'array-item')"
            >
              配置 Schema
            </button>
          </div>

          <div
            v-else-if="item.type === OFVarTypeEnum.Object"
            class="flex items-center justify-between border-t border-gray-100 pt-3"
          >
            <div>
              <div class="text-[13px] font-semibold leading-[18px] text-gray-700">对象 Schema</div>
              <div class="text-xs text-gray-500">{{ item.schema ? '已配置' : '未配置' }}</div>
            </div>
            <button
              type="button"
              class="text-[13px] font-semibold leading-[18px] text-amber-600 transition hover:text-amber-700"
              @click="emit('schema', item.id || item.variable, 'object')"
            >
              配置
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { OFLoopVariableData, OFVarType } from '@shared/Orchestraflow-types'
import { OFVarType as OFVarTypeEnum } from '@shared/Orchestraflow-types'
import WhiteSelect from '@renderer/views/LuminaApp/Maincontent/NormalChat/components/WhiteSelect.vue'
import type { WhiteSelectOption } from '@renderer/views/LuminaApp/Maincontent/NormalChat/components/WhiteSelect.vue'
import type { OFPanelTheme } from '../../panel-theme'

const props = defineProps<{
  modelValue: OFLoopVariableData[]
  theme: OFPanelTheme
  typeOptions: WhiteSelectOption[]
}>()

const emit = defineEmits<{
  add: []
  remove: [id: string]
  patch: [id: string, patch: Partial<OFLoopVariableData>]
  'open-selector': [id: string, event: MouseEvent]
  schema: [id: string, mode: 'object' | 'array-item']
}>()

function patch(item: OFLoopVariableData, patchValue: Partial<OFLoopVariableData>) {
  emit('patch', item.id || item.variable, patchValue)
}

function formatSelector(selector?: string[]) {
  return selector?.length ? selector.join('.') : ''
}

function parseSelector(value: string): string[] {
  return value
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean)
}

function usesJsonEditor(item: OFLoopVariableData) {
  return item.type === OFVarTypeEnum.Object || item.type === OFVarTypeEnum.Array
}

function displayValue(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}
</script>
