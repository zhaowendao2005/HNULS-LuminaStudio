<template>
  <section class="of-doc-section">
    <div class="of-condition-header">
      <div class="of-doc-section">
        <div class="of-doc-title-row">
          <div class="of-doc-title-strong">循环终止条件</div>
          <CapsuleTooltip
            text="任一条件成立时即可结束循环；左值通常使用循环变量或上游输出。"
            placement="top"
            max-width="300px"
          >
            <span class="of-info-trigger" aria-label="循环终止条件说明">
              <span class="of-info-trigger-icon">i</span>
            </span>
          </CapsuleTooltip>
        </div>
        <div class="of-doc-line-soft">用接近自然语言的条件句描述何时停止当前循环。</div>
      </div>
      <div class="of-condition-header-actions">
        <div class="of-condition-mode-switch">
          <button
            type="button"
            class="of-condition-mode-option"
            :class="{ 'is-active': logicalOperator === 'and' }"
            @click="emit('update:logical-operator', 'and')"
          >
            AND
          </button>
          <button
            type="button"
            class="of-condition-mode-option"
            :class="{ 'is-active': logicalOperator === 'or' }"
            @click="emit('update:logical-operator', 'or')"
          >
            OR
          </button>
        </div>
        <button type="button" class="of-state-inline-action" @click="emit('add')">添加条件</button>
      </div>
    </div>

    <div v-if="modelValue.length === 0" class="of-state-empty">
      暂无终止条件，循环会按最大轮次继续执行。
    </div>

    <div v-else class="of-condition-list">
      <div v-for="item in modelValue" :key="item.id" class="of-condition-entry">
        <div class="of-condition-entry-head">
          <div class="of-condition-index">
            条件 {{ modelValue.findIndex((entry) => entry.id === item.id) + 1 }}
          </div>
          <button
            type="button"
            class="of-declare-action of-declare-action-danger"
            @click="emit('remove', item.id)"
          >
            删除
          </button>
        </div>

        <div class="of-doc-section">
          <div class="of-condition-line">
            <span>当</span>
            <VariablePillButton
              :text="getOFPathFromRef(item.variable_ref)"
              placeholder="选择左值变量"
              :button-class="theme.controlFocusClass"
              tooltip-max-width="520px"
              @click="emit('open-left-selector', item.id, $event)"
            />
            <span>满足</span>
            <div ref="operatorTriggerRefs" :data-condition-id="item.id" class="of-choice-anchor">
              <button
                type="button"
                class="of-condition-operator"
                @click.stop="toggleOperatorPicker(item.id)"
              >
                {{ getOperatorLabel(item.operator, item.variable_type) }}
              </button>
            </div>
            <Teleport to="body">
              <div
                v-if="isOperatorPickerOpen(item.id)"
                class="of-choice-popup of-choice-popup-fixed"
                :style="getOperatorPopupStyle(item.id)"
              >
                <CapsuleTooltip
                  v-for="option in operatorOptions(item)"
                  :key="String(option.value)"
                  :text="
                    getOperatorDescription(
                      String(option.value) as OFIfElseConditionOperator,
                      item.variable_type
                    )
                  "
                  placement="top"
                  max-width="260px"
                >
                  <button
                    type="button"
                    class="of-choice-option"
                    :class="String(option.value) === item.operator ? 'of-choice-option-active' : ''"
                    @click.stop="
                      selectOperator(item.id, String(option.value) as OFIfElseConditionOperator)
                    "
                  >
                    {{ option.label }}
                  </button>
                </CapsuleTooltip>
              </div>
            </Teleport>
            <span>这一条件</span>
          </div>

          <template v-if="needsRightValue(item)">
            <div class="of-condition-line">
              <span>比较对象使用</span>
              <button
                type="button"
                class="of-declare-text-mode"
                @click="
                  emit('patch', item.id, {
                    compare_source_mode:
                      (item.compare_source_mode || 'constant') === 'variable'
                        ? 'constant'
                        : 'variable',
                    compare_ref:
                      (item.compare_source_mode || 'constant') === 'variable'
                        ? undefined
                        : item.compare_ref
                  })
                "
              >
                {{ item.compare_source_mode === 'variable' ? '变量' : '常量' }}
              </button>
              <span>作为右值</span>
            </div>

            <div v-if="item.compare_source_mode === 'variable'" class="of-condition-line">
              <span>右值引用</span>
              <div class="of-declare-text-input-wrapper min-w-[12rem] flex-1">
                <button
                  v-if="getOFPathFromRef(item.compare_ref)"
                  type="button"
                  class="of-declare-text-var-pill"
                  @click="emit('open-right-selector', item.id, $event)"
                >
                  {{ getOFPathFromRef(item.compare_ref) }}
                </button>
                <input
                  v-else
                  :value="getOFPathFromRef(item.compare_ref)"
                  class="of-declare-text-input"
                  :class="theme.controlFocusClass"
                  placeholder="输入路径或选择变量"
                  @input="
                    emit('patch', item.id, {
                      compare_ref: {
                        selector: parseSelector(($event.target as HTMLInputElement).value),
                        path: ($event.target as HTMLInputElement).value
                      }
                    })
                  "
                />
                <button
                  type="button"
                  class="of-declare-text-var-btn"
                  @click="emit('open-right-selector', item.id, $event)"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    class="of-declare-text-var-icon"
                  >
                    <g>
                      <path
                        d="M13.9986 8.76189C14.6132 8.04115 15.5117 7.625 16.459 7.625H16.5486C17.1009 7.625 17.5486 8.07272 17.5486 8.625C17.5486 9.17728 17.1009 9.625 16.5486 9.625H16.459C16.0994 9.625 15.7564 9.78289 15.5205 10.0595L13.1804 12.8039L13.9213 15.4107C13.9372 15.4666 13.9859 15.5 14.0355 15.5H15.4296C15.9819 15.5 16.4296 15.9477 16.4296 16.5C16.4296 17.0523 15.9819 17.5 15.4296 17.5H14.0355C13.0858 17.5 12.2562 16.8674 11.9975 15.9575L11.621 14.6328L10.1457 16.3631C9.5311 17.0839 8.63257 17.5 7.68532 17.5H7.59564C7.04336 17.5 6.59564 17.0523 6.59564 16.5C6.59564 15.9477 7.04336 15.5 7.59564 15.5H7.68532C8.04487 15.5 8.38789 15.3421 8.62379 15.0655L10.964 12.3209L10.2231 9.71433C10.2072 9.65839 10.1586 9.625 10.1089 9.625H8.71484C8.16256 9.625 7.71484 9.17728 7.71484 8.625C7.71484 8.07272 8.16256 7.625 8.71484 7.625H10.1089C11.0586 7.625 11.8883 8.25756 12.1469 9.16754L12.5234 10.4921L13.9986 8.76189Z"
                        fill="currentColor"
                      ></path>
                      <path
                        d="M5.429 3C3.61372 3 2.143 4.47071 2.143 6.286V10.4428L1.29289 11.2929C1.10536 11.4804 1 11.7348 1 12C1 12.2652 1.10536 12.5196 1.29289 12.7071L2.143 13.5572V17.714C2.143 19.5293 3.61372 21 5.429 21C5.98128 21 6.429 20.5523 6.429 20C6.429 19.4477 5.98128 19 5.429 19C4.71828 19 4.143 18.4247 4.143 17.714V13.143C4.143 12.8778 4.03764 12.6234 3.85011 12.4359L3.41421 12L3.85011 11.5641C4.03764 11.3766 4.143 11.1222 4.143 10.857V6.286C4.143 5.57528 4.71828 5 5.429 5C5.98128 5 6.429 4.55228 6.429 4C6.429 3.44772 5.98128 3 5.429 3Z"
                        fill="currentColor"
                      ></path>
                      <path
                        d="M18.5708 3C18.0185 3 17.5708 3.44772 17.5708 4C17.5708 4.55228 18.0185 5 18.5708 5C19.2815 5 19.8568 5.57529 19.8568 6.286V10.857C19.8568 11.1222 19.9622 11.3766 20.1497 11.5641L20.5856 12L20.1497 12.4359C19.9622 12.6234 19.8568 12.8778 19.8568 13.143V17.714C19.8568 18.4244 19.2808 19 18.5708 19C18.0185 19 17.5708 19.4477 17.5708 20C17.5708 20.5523 18.0185 21 18.5708 21C20.3848 21 21.8568 19.5296 21.8568 17.714V13.5572L22.7069 12.7071C23.0974 12.3166 23.0974 11.6834 22.7069 11.2929L21.8568 10.4428V6.286C21.8568 4.47071 20.3861 3 18.5708 3Z"
                        fill="currentColor"
                      ></path>
                    </g>
                  </svg>
                </button>
              </div>
            </div>

            <div v-else class="of-condition-line">
              <template v-if="resolveRightType(item) === OFVarTypeEnum.Boolean">
                <span>常量值为</span>
                <div class="of-condition-bool-toggle">
                  <button
                    type="button"
                    class="of-condition-bool-option"
                    :class="{ 'is-true-active': item.value === true }"
                    @click="emit('patch', item.id, { value: true })"
                  >
                    TRUE
                  </button>
                  <button
                    type="button"
                    class="of-condition-bool-option"
                    :class="{ 'is-false-active': item.value === false }"
                    @click="emit('patch', item.id, { value: false })"
                  >
                    FALSE
                  </button>
                </div>
              </template>
              <template v-else>
                <span>常量值为</span>
                <input
                  :value="displayValue(item.value)"
                  :type="resolveRightType(item) === OFVarTypeEnum.Number ? 'number' : 'text'"
                  class="of-condition-input min-w-[8rem]"
                  :class="theme.controlFocusClass"
                  :placeholder="
                    resolveRightType(item) === OFVarTypeEnum.Number ? '输入数字' : '输入文本'
                  "
                  @input="
                    emit('patch', item.id, { value: ($event.target as HTMLInputElement).value })
                  "
                />
              </template>
            </div>
          </template>

          <div class="of-doc-line-soft">
            {{
              logicalOperator === 'and'
                ? '需要同时满足其它条件后才终止。'
                : '满足任一条件即可终止。'
            }}
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import CapsuleTooltip from '../../components/CapsuleTooltip.vue'
import type {
  OFIfElseCondition,
  OFIfElseConditionOperator,
  OFIfElseLogicalOperator
} from '@shared/Orchestraflow-types'
import { getOFPathFromRef, OFVarType as OFVarTypeEnum } from '@shared/Orchestraflow-types'
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

const activeOperatorConditionId = ref<string | null>(null)
const operatorPopupPosition = ref<Record<string, { top: number; left: number }>>({})
const operatorTriggerRefs = ref<HTMLElement[]>([])

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

function getOperatorLabel(
  operator: OFIfElseCondition['operator'],
  type?: OFIfElseCondition['variable_type']
) {
  return (
    operatorOptions({ operator, variable_type: type } as OFIfElseCondition).find(
      (option) => option.value === operator
    )?.label || '选择比较'
  )
}

function getOperatorDescription(
  operator: OFIfElseCondition['operator'],
  type?: OFIfElseCondition['variable_type']
) {
  const descriptions: Record<string, string> = {
    contains: '左值中包含右值。',
    not_contains: '左值中不包含右值。',
    starts_with: '左值以前缀形式匹配右值。',
    ends_with: '左值以后缀形式匹配右值。',
    is: type === OFVarTypeEnum.Boolean ? '左值与右值布尔状态一致。' : '左值与右值完全相等。',
    is_not: type === OFVarTypeEnum.Boolean ? '左值与右值布尔状态不一致。' : '左值与右值不相等。',
    gt: '左值大于右值。',
    gte: '左值大于或等于右值。',
    lt: '左值小于右值。',
    lte: '左值小于或等于右值。',
    is_empty: '左值为空、空字符串或没有内容。',
    is_not_empty: '左值存在有效内容。',
    length_is: '左值长度等于右值。',
    length_gt: '左值长度大于右值。',
    length_gte: '左值长度大于或等于右值。',
    length_lt: '左值长度小于右值。',
    length_lte: '左值长度小于或等于右值。'
  }

  return descriptions[String(operator)] || '选择条件判断方式。'
}

function toggleOperatorPicker(conditionId: string) {
  activeOperatorConditionId.value =
    activeOperatorConditionId.value === conditionId ? null : conditionId
  if (activeOperatorConditionId.value === conditionId) {
    void nextTick(() => updateOperatorPopupPosition(conditionId))
  }
}

function isOperatorPickerOpen(conditionId: string) {
  return activeOperatorConditionId.value === conditionId
}

function selectOperator(conditionId: string, operator: OFIfElseConditionOperator) {
  emit('patch', conditionId, { operator })
  activeOperatorConditionId.value = null
}

function findOperatorTrigger(conditionId: string) {
  return (
    operatorTriggerRefs.value.find((element) => element.dataset.conditionId === conditionId) || null
  )
}

function updateOperatorPopupPosition(conditionId: string) {
  const trigger = findOperatorTrigger(conditionId)
  if (!trigger) return
  const rect = trigger.getBoundingClientRect()
  operatorPopupPosition.value = {
    ...operatorPopupPosition.value,
    [conditionId]: {
      top: rect.bottom + 8,
      left: rect.left + rect.width / 2
    }
  }
}

function getOperatorPopupStyle(conditionId: string) {
  const position = operatorPopupPosition.value[conditionId]
  if (!position) {
    return {
      top: '-9999px',
      left: '-9999px'
    }
  }

  return {
    top: `${position.top}px`,
    left: `${position.left}px`,
    transform: 'translateX(-50%)'
  }
}

function closePopup() {
  activeOperatorConditionId.value = null
}

function handleGlobalPointerDown(event: Event) {
  const target = event.target as HTMLElement | null
  if (target?.closest('.of-choice-anchor')) return
  closePopup()
}

function handleGlobalKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closePopup()
  }
}

function handleWindowLayoutChange() {
  if (!activeOperatorConditionId.value) return
  updateOperatorPopupPosition(activeOperatorConditionId.value)
}

onMounted(() => {
  window.addEventListener('pointerdown', handleGlobalPointerDown)
  window.addEventListener('keydown', handleGlobalKeydown)
  window.addEventListener('scroll', handleWindowLayoutChange, true)
  window.addEventListener('resize', handleWindowLayoutChange)
})

onUnmounted(() => {
  window.removeEventListener('pointerdown', handleGlobalPointerDown)
  window.removeEventListener('keydown', handleGlobalKeydown)
  window.removeEventListener('scroll', handleWindowLayoutChange, true)
  window.removeEventListener('resize', handleWindowLayoutChange)
})
</script>

<style scoped src="../../../../../styles/node-panel.scss"></style>
