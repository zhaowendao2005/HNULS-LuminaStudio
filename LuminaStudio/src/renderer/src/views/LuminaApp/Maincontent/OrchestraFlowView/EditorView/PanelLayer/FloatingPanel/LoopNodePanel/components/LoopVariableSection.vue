<template>
  <section class="space-y-3">
    <div class="flex items-center justify-between">
      <div class="system-sm-semibold-uppercase text-gray-700">循环变量</div>
      <button
        type="button"
        class="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
        @click="emit('add')"
      >
        添加变量
      </button>
    </div>

    <div class="space-y-3">
      <div
        v-for="item in modelValue"
        :key="item.id || item.variable"
        class="rounded-2xl border border-gray-200 bg-white p-4"
      >
        <div class="mb-3 flex items-center gap-3">
          <input
            :value="item.variable"
            class="h-10 flex-1 rounded-xl border border-[#e5e7eb] bg-[#f3f4f6] px-3 text-sm text-gray-800 outline-none focus:bg-white"
            :class="theme.controlFocusClass"
            placeholder="变量名"
            @input="patch(item, { variable: ($event.target as HTMLInputElement).value })"
          />
          <WhiteSelect
            :model-value="item.type || OFVarTypeEnum.String"
            :options="typeOptions"
            root-class="w-[148px]"
            trigger-class="!h-10 !w-full !rounded-xl !border-[#e5e7eb] !bg-[#f3f4f6] !px-3 !text-sm !text-gray-800"
            panel-class="min-w-[140px]"
            teleport-to="body"
            @update:model-value="patch(item, { type: String($event) as OFVarType })"
          />
          <button
            type="button"
            class="rounded-md p-1 text-gray-300 hover:bg-red-50 hover:text-red-500"
            @click="emit('remove', item.id || item.variable)"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
              <path
                d="M17 6H22V8H20V21C20 21.5523 19.5523 22 19 22H5C4.44772 22 4 21.5523 4 21V8H2V6H7V3C7 2.44772 7.44772 2 8 2H16C16.5523 2 17 2.44772 17 3V6ZM18 8H6V20H18V8ZM9 11H11V17H9V11ZM13 11H15V17H13V11ZM9 4V6H15V4H9Z"
              />
            </svg>
          </button>
        </div>

        <div class="mb-3 inline-flex rounded-lg bg-gray-100 p-0.5">
          <button
            type="button"
            class="rounded-md px-3 py-1 text-xs font-medium transition"
            :class="item.value_type === 'constant' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'"
            @click="patch(item, { value_type: 'constant', value_selector: [] })"
          >
            常量
          </button>
          <button
            type="button"
            class="rounded-md px-3 py-1 text-xs font-medium transition"
            :class="item.value_type === 'variable' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'"
            @click="patch(item, { value_type: 'variable' })"
          >
            变量
          </button>
        </div>

        <div class="space-y-3">
          <template v-if="item.value_type === 'variable'">
            <VariablePillButton
              :text="formatSelector(item.value_selector)"
              placeholder="选择初始值变量"
              :button-class="theme.controlFocusClass"
              tooltip-max-width="520px"
              @click="emit('open-selector', item.id || item.variable, $event)"
            />
            <input
              :value="formatSelector(item.value_selector)"
              class="h-10 w-full rounded-xl border border-[#e5e7eb] bg-[#f3f4f6] px-3 text-sm text-gray-800 outline-none focus:bg-white"
              :class="theme.controlFocusClass"
              placeholder="可手动补全 .field 或 .0.name"
              @input="patch(item, { value_selector: parseSelector(($event.target as HTMLInputElement).value) })"
            />
          </template>

          <template v-else>
            <textarea
              v-if="usesJsonEditor(item)"
              :value="displayValue(item.value)"
              rows="4"
              class="w-full rounded-xl border border-[#e5e7eb] bg-[#f3f4f6] px-3 py-2 font-mono text-sm text-gray-800 outline-none focus:bg-white"
              :class="theme.controlFocusClass"
              @input="patch(item, { value: ($event.target as HTMLTextAreaElement).value })"
            />
            <button
              v-else-if="item.type === OFVarTypeEnum.Boolean"
              type="button"
              class="inline-flex h-10 max-w-full items-center overflow-hidden rounded-xl border border-gray-200 bg-white p-0.5 shadow-sm"
            >
              <span
                class="min-w-[64px] rounded-[8px] px-2 text-center text-xs font-semibold leading-8 transition"
                :class="item.value === true ? 'bg-green-50 text-green-700 shadow-sm' : 'text-gray-400'"
                @click="patch(item, { value: true })"
              >
                TRUE
              </span>
              <span
                class="min-w-[64px] rounded-[8px] px-2 text-center text-xs font-semibold leading-8 transition"
                :class="item.value === false ? 'bg-rose-50 text-rose-700 shadow-sm' : 'text-gray-400'"
                @click="patch(item, { value: false })"
              >
                FALSE
              </span>
            </button>
            <input
              v-else
              :value="displayValue(item.value)"
              :type="item.type === OFVarTypeEnum.Number ? 'number' : 'text'"
              class="h-10 w-full rounded-xl border border-[#e5e7eb] bg-[#f3f4f6] px-3 text-sm text-gray-800 outline-none focus:bg-white"
              :class="theme.controlFocusClass"
              @input="patch(item, { value: ($event.target as HTMLInputElement).value })"
            />
          </template>

          <div v-if="item.type === OFVarTypeEnum.Array" class="grid grid-cols-[1fr_auto] gap-3">
            <WhiteSelect
              :model-value="item.item_type || OFVarTypeEnum.String"
              :options="typeOptions"
              root-class="w-full"
              trigger-class="!h-10 !w-full !rounded-xl !border-[#e5e7eb] !bg-[#f3f4f6] !px-3 !text-sm !text-gray-800"
              panel-class="min-w-[140px]"
              teleport-to="body"
              @update:model-value="patch(item, { item_type: String($event) as OFVarType })"
            />
            <button
              v-if="item.item_type === OFVarTypeEnum.Object"
              type="button"
              class="h-10 rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs font-medium text-amber-700 hover:bg-amber-100"
              @click="emit('schema', item.id || item.variable, 'array-item')"
            >
              配置 Schema
            </button>
          </div>

          <div
            v-else-if="item.type === OFVarTypeEnum.Object"
            class="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
          >
            <div>
              <div class="text-sm font-medium text-gray-700">对象 Schema</div>
              <div class="text-xs text-gray-400">{{ item.schema ? '已配置' : '未配置' }}</div>
            </div>
            <button
              type="button"
              class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
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
import VariablePillButton from '../../components/VariablePillButton.vue'
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
