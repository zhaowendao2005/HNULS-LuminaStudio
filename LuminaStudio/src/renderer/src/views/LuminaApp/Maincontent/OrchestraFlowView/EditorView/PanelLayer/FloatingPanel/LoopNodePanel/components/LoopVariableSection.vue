<template>
  <section class="of-doc-block">
    <div class="flex items-center justify-between gap-3">
      <div class="of-doc-kicker">循环变量</div>
      <button type="button" class="of-state-inline-action" @click="emit('add')">添加变量</button>
    </div>

    <div class="of-declare-loop-list">
      <div
        v-for="item in modelValue"
        :key="item.id || item.variable"
        class="of-declare-loop-entry"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="of-doc-title-muted">声明变量</div>
          <button
            type="button"
            class="of-declare-action of-declare-action-danger"
            @click="emit('remove', item.id || item.variable)"
          >
            删除
          </button>
        </div>

        <div class="of-declare-loop-line">
          <span class="of-declare-loop-label">变量名</span>
          <input
            :value="item.variable"
            class="of-declare-inline-input of-declare-inline-input-mono"
            :class="theme.controlFocusClass"
            placeholder="点击输入键名"
            @input="patch(item, { variable: ($event.target as HTMLInputElement).value })"
          />
        </div>

        <div class="of-declare-loop-line">
          <span class="of-declare-loop-label">展示名称</span>
          <input
            :value="item.label || ''"
            class="of-declare-inline-input"
            :class="theme.controlFocusClass"
            placeholder="点击输入展示名"
            @input="patch(item, { label: ($event.target as HTMLInputElement).value })"
          />
        </div>

        <div class="of-declare-loop-line">
          <span class="of-declare-loop-label">默认值</span>
          <template v-if="item.value_type === 'variable'">
            <button
              type="button"
              class="of-ref-trigger"
              :class="{ 'of-ref-trigger-empty': !formatSelector(item.value_selector) }"
              @click="emit('open-selector', item.id || item.variable, $event)"
            >
              <span class="of-ref-text">
                {{ formatSelector(item.value_selector) || '点击选择变量' }}
              </span>
            </button>
          </template>
          <textarea
            v-else-if="usesJsonEditor(item)"
            :value="displayValue(item.value)"
            rows="3"
            class="of-declare-inline-input of-declare-inline-input-mono min-w-[16rem]"
            :class="theme.controlFocusClass"
            placeholder="为空则无默认值"
            @input="patch(item, { value: ($event.target as HTMLTextAreaElement).value })"
          />
          <button v-else-if="item.type === OFVarTypeEnum.Boolean" type="button" class="of-declare-bool-toggle">
            <span
              class="of-declare-bool-option"
              :class="item.value === true ? 'of-declare-bool-option-active-true' : ''"
              @click="patch(item, { value: true })"
            >
              TRUE
            </span>
            <span class="text-gray-300">/</span>
            <span
              class="of-declare-bool-option"
              :class="item.value === false ? 'of-declare-bool-option-active-false' : ''"
              @click="patch(item, { value: false })"
            >
              FALSE
            </span>
          </button>
          <input
            v-else
            :value="displayValue(item.value)"
            :type="item.type === OFVarTypeEnum.Number ? 'number' : 'text'"
            class="of-declare-inline-input"
            :class="[theme.controlFocusClass, item.type === OFVarTypeEnum.Number ? 'w-24' : 'w-48']"
            placeholder="为空则无默认值"
            @input="patch(item, { value: ($event.target as HTMLInputElement).value })"
          />
        </div>

        <div class="of-declare-loop-line">
          <span class="of-declare-loop-label">变量类型</span>
          <button type="button" class="of-declare-choice" @click="cycleType(item)">
            {{ item.type || OFVarTypeEnum.String }}
          </button>
          <span class="of-declare-meta">(点击文字切换)</span>
        </div>

        <div class="of-declare-loop-line">
          <span class="of-declare-loop-label">值来源</span>
          <button
            type="button"
            class="of-declare-choice"
            :class="item.value_type === 'constant' ? '' : 'of-declare-choice-muted'"
            @click="patch(item, { value_type: 'constant', value_selector: [] })"
          >
            常量
          </button>
          <span class="text-gray-300">/</span>
          <button
            type="button"
            class="of-declare-choice"
            :class="item.value_type === 'variable' ? '' : 'of-declare-choice-muted'"
            @click="patch(item, { value_type: 'variable' })"
          >
            变量
          </button>
        </div>

        <div v-if="item.type === OFVarTypeEnum.Array" class="of-declare-loop-line">
          <span class="of-declare-loop-label">数组元素</span>
          <button type="button" class="of-declare-choice" @click="cycleItemType(item)">
            {{ item.item_type || OFVarTypeEnum.String }}
          </button>
          <span class="of-declare-meta">(点击文字切换)</span>
          <button
            v-if="item.item_type === OFVarTypeEnum.Object"
            type="button"
            class="of-declare-action"
            @click="emit('schema', item.id || item.variable, 'array-item')"
          >
            配置 Schema
          </button>
        </div>

        <div v-else-if="item.type === OFVarTypeEnum.Object" class="of-declare-loop-line">
          <span class="of-declare-loop-label">对象 Schema</span>
          <span class="of-declare-meta">{{ item.schema ? '已配置' : '未配置' }}</span>
          <button
            type="button"
            class="of-declare-action"
            @click="emit('schema', item.id || item.variable, 'object')"
          >
            配置
          </button>
        </div>

        <div v-if="item.value_type === 'variable'" class="of-declare-loop-line">
          <span class="of-declare-loop-label">引用路径</span>
          <input
            :value="formatSelector(item.value_selector)"
            class="of-declare-inline-input of-declare-inline-input-mono w-56"
            :class="theme.controlFocusClass"
            placeholder=".field / .0.name"
            @input="
              patch(item, {
                value_selector: parseSelector(($event.target as HTMLInputElement).value)
              })
            "
          />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { OFLoopVariableData, OFVarType } from '@shared/Orchestraflow-types'
import { OFVarType as OFVarTypeEnum } from '@shared/Orchestraflow-types'
import type { OFPanelTheme } from '../../panel-theme'

const props = defineProps<{
  modelValue: OFLoopVariableData[]
  theme: OFPanelTheme
  typeOptions: Array<{ value: string; label: string }>
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

function cycleType(item: OFLoopVariableData) {
  const current = String(item.type || OFVarTypeEnum.String)
  const currentIndex = props.typeOptions.findIndex((option) => String(option.value) === current)
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % props.typeOptions.length : 0
  patch(item, {
    type: String(props.typeOptions[nextIndex]?.value || OFVarTypeEnum.String) as OFVarType
  })
}

function cycleItemType(item: OFLoopVariableData) {
  const current = String(item.item_type || OFVarTypeEnum.String)
  const currentIndex = props.typeOptions.findIndex((option) => String(option.value) === current)
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % props.typeOptions.length : 0
  patch(item, {
    item_type: String(props.typeOptions[nextIndex]?.value || OFVarTypeEnum.String) as OFVarType
  })
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

<style scoped src="../../../../../styles/node-panel.scss"></style>
