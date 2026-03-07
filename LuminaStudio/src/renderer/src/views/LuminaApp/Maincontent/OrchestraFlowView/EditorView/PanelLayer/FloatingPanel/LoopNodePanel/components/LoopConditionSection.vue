<template>
  <section class="space-y-3">
    <div class="flex items-center justify-between">
      <div class="system-sm-semibold-uppercase text-gray-700">循环终止条件</div>
      <div class="flex items-center gap-2">
        <div class="inline-flex rounded-lg bg-gray-100 p-0.5">
          <button
            type="button"
            class="rounded-md px-3 py-1 text-xs font-medium transition"
            :class="logicalOperator === 'and' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'"
            @click="emit('update:logical-operator', 'and')"
          >
            AND
          </button>
          <button
            type="button"
            class="rounded-md px-3 py-1 text-xs font-medium transition"
            :class="logicalOperator === 'or' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'"
            @click="emit('update:logical-operator', 'or')"
          >
            OR
          </button>
        </div>
        <button
          type="button"
          class="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
          @click="emit('add')"
        >
          添加条件
        </button>
      </div>
    </div>

    <div class="space-y-3">
      <div v-for="item in modelValue" :key="item.id" class="rounded-2xl border border-gray-200 bg-white p-4">
        <div class="mb-3 flex items-center justify-between">
          <div class="text-sm font-medium text-gray-700">{{ item.variable_label || item.variable_path || '未选择左值' }}</div>
          <button
            type="button"
            class="rounded-md p-1 text-gray-300 hover:bg-red-50 hover:text-red-500"
            @click="emit('remove', item.id)"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
              <path
                d="M17 6H22V8H20V21C20 21.5523 19.5523 22 19 22H5C4.44772 22 4 21.5523 4 21V8H2V6H7V3C7 2.44772 7.44772 2 8 2H16C16.5523 2 17 2.44772 17 3V6ZM18 8H6V20H18V8ZM9 11H11V17H9V11ZM13 11H15V17H13V11ZM9 4V6H15V4H9Z"
              />
            </svg>
          </button>
        </div>

        <div class="space-y-3">
          <VariablePillButton
            :text="item.variable_path || ''"
            placeholder="选择左值变量"
            :button-class="theme.controlFocusClass"
            tooltip-max-width="520px"
            @click="emit('open-left-selector', item.id, $event)"
          />

          <WhiteSelect
            :model-value="item.operator"
            :options="operatorOptions(item)"
            root-class="w-full"
            trigger-class="!h-10 !w-full !rounded-xl !border-[#e5e7eb] !bg-[#f3f4f6] !px-3 !text-sm !text-gray-800"
            panel-class="min-w-[180px]"
            teleport-to="body"
            @update:model-value="emit('patch', item.id, { operator: String($event) as OFIfElseConditionOperator })"
          />

          <template v-if="needsRightValue(item)">
            <div class="inline-flex rounded-lg bg-gray-100 p-0.5">
              <button
                type="button"
                class="rounded-md px-3 py-1 text-xs font-medium transition"
                :class="(item.compare_source_mode || 'constant') === 'constant' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'"
                @click="emit('patch', item.id, { compare_source_mode: 'constant', compare_selector: [] })"
              >
                常量
              </button>
              <button
                type="button"
                class="rounded-md px-3 py-1 text-xs font-medium transition"
                :class="item.compare_source_mode === 'variable' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'"
                @click="emit('patch', item.id, { compare_source_mode: 'variable' })"
              >
                变量
              </button>
            </div>

            <template v-if="item.compare_source_mode === 'variable'">
              <VariablePillButton
                :text="item.compare_path || ''"
                placeholder="选择右值变量"
                :button-class="theme.controlFocusClass"
                tooltip-max-width="520px"
                @click="emit('open-right-selector', item.id, $event)"
              />
              <input
                :value="item.compare_path || ''"
                class="h-10 w-full rounded-xl border border-[#e5e7eb] bg-[#f3f4f6] px-3 text-sm text-gray-800 outline-none focus:bg-white"
                :class="theme.controlFocusClass"
                @input="emit('patch', item.id, { compare_path: ($event.target as HTMLInputElement).value, compare_selector: parseSelector(($event.target as HTMLInputElement).value) })"
              />
            </template>

            <template v-else>
              <button
                v-if="resolveRightType(item) === OFVarTypeEnum.Boolean"
                type="button"
                class="inline-flex h-10 max-w-full items-center overflow-hidden rounded-xl border border-gray-200 bg-white p-0.5 shadow-sm"
              >
                <span
                  class="min-w-[64px] rounded-[8px] px-2 text-center text-xs font-semibold leading-8 transition"
                  :class="item.value === true ? 'bg-green-50 text-green-700 shadow-sm' : 'text-gray-400'"
                  @click="emit('patch', item.id, { value: true })"
                >
                  TRUE
                </span>
                <span
                  class="min-w-[64px] rounded-[8px] px-2 text-center text-xs font-semibold leading-8 transition"
                  :class="item.value === false ? 'bg-rose-50 text-rose-700 shadow-sm' : 'text-gray-400'"
                  @click="emit('patch', item.id, { value: false })"
                >
                  FALSE
                </span>
              </button>
              <input
                v-else
                :value="displayValue(item.value)"
                :type="resolveRightType(item) === OFVarTypeEnum.Number ? 'number' : 'text'"
                class="h-10 w-full rounded-xl border border-[#e5e7eb] bg-[#f3f4f6] px-3 text-sm text-gray-800 outline-none focus:bg-white"
                :class="theme.controlFocusClass"
                @input="emit('patch', item.id, { value: ($event.target as HTMLInputElement).value })"
              />
            </template>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type {
  OFIfElseCondition,
  OFIfElseConditionOperator,
  OFIfElseLogicalOperator
} from '@shared/Orchestraflow-types'
import { OFVarType as OFVarTypeEnum } from '@shared/Orchestraflow-types'
import WhiteSelect from '@renderer/views/LuminaApp/Maincontent/NormalChat/components/WhiteSelect.vue'
import type { WhiteSelectOption } from '@renderer/views/LuminaApp/Maincontent/NormalChat/components/WhiteSelect.vue'
import VariablePillButton from '../../components/VariablePillButton.vue'
import type { OFPanelTheme } from '../../panel-theme'

defineProps<{
  modelValue: OFIfElseCondition[]
  logicalOperator: OFIfElseLogicalOperator
  theme: OFPanelTheme
}>()

const emit = defineEmits<{
  add: []
  remove: [id: string]
  patch: [id: string, patch: Partial<OFIfElseCondition>]
  'open-left-selector': [id: string, event: MouseEvent]
  'open-right-selector': [id: string, event: MouseEvent]
  'update:logical-operator': [value: OFIfElseLogicalOperator]
}>()

function operatorOptions(item: OFIfElseCondition): WhiteSelectOption[] {
  if (item.variable_type === OFVarTypeEnum.Array) {
    return [
      { label: 'contains', value: 'contains' },
      { label: 'not_contains', value: 'not_contains' },
      { label: 'is_empty', value: 'is_empty' },
      { label: 'is_not_empty', value: 'is_not_empty' },
      { label: 'length_is', value: 'length_is' },
      { label: 'length_gt', value: 'length_gt' },
      { label: 'length_gte', value: 'length_gte' },
      { label: 'length_lt', value: 'length_lt' },
      { label: 'length_lte', value: 'length_lte' }
    ]
  }

  if (item.variable_type === OFVarTypeEnum.Number) {
    return [
      { label: 'is', value: 'is' },
      { label: 'is_not', value: 'is_not' },
      { label: 'gt', value: 'gt' },
      { label: 'gte', value: 'gte' },
      { label: 'lt', value: 'lt' },
      { label: 'lte', value: 'lte' },
      { label: 'is_empty', value: 'is_empty' },
      { label: 'is_not_empty', value: 'is_not_empty' }
    ]
  }

  if (item.variable_type === OFVarTypeEnum.Boolean) {
    return [
      { label: 'is', value: 'is' },
      { label: 'is_not', value: 'is_not' },
      { label: 'is_empty', value: 'is_empty' },
      { label: 'is_not_empty', value: 'is_not_empty' }
    ]
  }

  return [
    { label: 'contains', value: 'contains' },
    { label: 'not_contains', value: 'not_contains' },
    { label: 'starts_with', value: 'starts_with' },
    { label: 'ends_with', value: 'ends_with' },
    { label: 'is', value: 'is' },
    { label: 'is_not', value: 'is_not' },
    { label: 'is_empty', value: 'is_empty' },
    { label: 'is_not_empty', value: 'is_not_empty' }
  ]
}

function needsRightValue(item: OFIfElseCondition) {
  return item.operator !== 'is_empty' && item.operator !== 'is_not_empty'
}

function resolveRightType(item: OFIfElseCondition) {
  if (String(item.operator).startsWith('length_')) return OFVarTypeEnum.Number
  return item.compare_type || item.variable_type || OFVarTypeEnum.String
}

function parseSelector(value: string): string[] {
  return value
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean)
}

function displayValue(value: unknown): string {
  return value === undefined || value === null ? '' : String(value)
}
</script>
