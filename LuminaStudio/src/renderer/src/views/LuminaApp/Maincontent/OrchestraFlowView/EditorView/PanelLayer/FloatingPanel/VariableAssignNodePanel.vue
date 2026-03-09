<template>
  <div class="of-panel-shell of-variable-assign-node-panel" :class="theme.panelClass">
    <div class="of-panel-shell-header">
      <div class="of-panel-shell-title-row">
        <div class="of-panel-shell-icon" :class="theme.iconBgClass">
          <svg
            viewBox="0 0 24 24"
            class="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M7 7H17M7 12H13M7 17H11M16 12L18 14L22 10"
            />
          </svg>
        </div>

        <input
          v-model="titleModel"
          class="system-xl-semibold of-panel-shell-title-input"
          placeholder="添加标题..."
        />

        <div class="of-panel-shell-actions">
          <CapsuleTooltip text="调试运行" placement="bottom">
            <button
              class="of-panel-icon-button flex h-6 w-6 items-center justify-center rounded-md"
              @click="enterDebugMode"
            >
              <svg viewBox="0 0 24 24" class="of-panel-icon-svg h-4 w-4" fill="currentColor">
                <path
                  d="M8 18.3915V5.60846L18.2264 12L8 18.3915ZM6 3.80421V20.1957C6 20.9812 6.86395 21.46 7.53 21.0437L20.6432 12.848C21.2699 12.4563 21.2699 11.5436 20.6432 11.152L7.53 2.95621C6.86395 2.53993 6 3.01878 6 3.80421Z"
                />
              </svg>
            </button>
          </CapsuleTooltip>
          <CapsuleTooltip text="关闭面板" placement="bottom">
            <button
              class="of-panel-icon-button flex h-6 w-6 items-center justify-center rounded-md"
              @click="handleClose"
            >
              <svg viewBox="0 0 24 24" class="of-panel-icon-svg h-4 w-4" fill="currentColor">
                <path
                  d="M11.9997 10.5865L16.9495 5.63672L18.3637 7.05093L13.4139 12.0007L18.3637 16.9504L16.9495 18.3646L11.9997 13.4149L7.04996 18.3646L5.63574 16.9504L10.5855 12.0007L5.63574 7.05093L7.0502 5.63672L11.9997 10.5865Z"
                />
              </svg>
            </button>
          </CapsuleTooltip>
        </div>
      </div>

      <div class="of-panel-shell-description">
        <textarea
          v-model="descModel"
          class="of-panel-shell-description-input"
          placeholder="添加描述..."
          :style="{ height: '18px' }"
        />
      </div>

      <div class="of-panel-shell-tabs">
        <button
          class="system-md-semibold of-panel-tab-button"
          :class="
            activeTab === 'settings'
              ? [theme.tabActiveClass, 'of-panel-tab-button-active']
              : 'of-panel-tab-button-inactive'
          "
          @click="setActiveTab('settings')"
        >
          设置
        </button>
        <button
          class="system-md-semibold of-panel-tab-button"
          :class="
            activeTab === 'lastRun'
              ? [theme.tabActiveClass, 'of-panel-tab-button-active']
              : 'of-panel-tab-button-inactive'
          "
          @click="setActiveTab('lastRun')"
        >
          上次运行
        </button>
      </div>
    </div>

    <div class="of-panel-shell-body">
      <div
        v-if="activeTab === 'settings' && !debugMode"
        class="of-panel-shell-body-inner of-doc-block"
      >
        <section class="of-doc-section">
          <div class="flex items-center justify-between">
            <div class="of-doc-title-strong">赋值规则</div>
            <button type="button" class="of-state-inline-action" @click="addRule">添加规则</button>
          </div>

          <div class="of-declare-list">
            <div v-for="(rule, index) in rules" :key="rule.id" class="of-declare-entry">
              <div class="of-declare-text-row">
                <span class="of-declare-text-label">源</span>

                <div class="of-declare-text-left">
                  <template v-if="rule.source_mode === 'variable'">
                    <CapsuleTooltip
                      :text="`点击选择上游节点输出${rule.source_path ? '\n完整路径：' + rule.source_path : ''}`"
                      placement="top"
                      :allow-newline="true"
                    >
                      <button
                        type="button"
                        class="of-declare-text-var-pill"
                        :class="{ 'of-declare-text-var-pill-empty': !rule.source_path }"
                        @click="openRuleSelector(rule.id, $event)"
                      >
                        {{ rule.source_path || '请选择源' }}
                      </button>
                    </CapsuleTooltip>
                  </template>
                  <template v-else>
                    <CapsuleTooltip
                      :text="`直接输入固定值${getConstantDisplayValue(rule) ? '\n当前值：' + getConstantDisplayValue(rule) : ''}`"
                      placement="top"
                      :allow-newline="true"
                    >
                      <input
                        :value="getConstantDisplayValue(rule)"
                        :type="rule.target_type === OFVarTypeEnum.Number ? 'number' : 'text'"
                        class="of-declare-text-input"
                        placeholder="输入常量"
                        @input="
                          patchRule(rule.id, {
                            constant_value: ($event.target as HTMLInputElement).value
                          })
                        "
                      />
                    </CapsuleTooltip>
                  </template>
                </div>

                <div class="of-declare-text-right">
                  <CapsuleTooltip text="点击切换变量/常量模式" placement="top">
                    <button
                      type="button"
                      class="of-declare-text-mode"
                      @click="
                        patchRule(rule.id, {
                          source_mode: rule.source_mode === 'variable' ? 'constant' : 'variable'
                        })
                      "
                    >
                      {{ rule.source_mode === 'variable' ? '变量' : '常量' }}
                    </button>
                  </CapsuleTooltip>
                </div>
              </div>

              <div class="of-declare-text-row">
                <span class="of-declare-text-label">目标</span>

                <div class="of-declare-text-left">
                  <CapsuleTooltip
                    :text="`输入新变量名${rule.target_variable ? '\n变量名：' + rule.target_variable : ''}`"
                    placement="top"
                    :allow-newline="true"
                  >
                    <div class="of-declare-text-input-wrapper">
                      <div v-if="rule.target_variable" class="of-declare-text-var-pill-inner">
                        {{ rule.target_variable }}
                      </div>
                      <input
                        v-else
                        :value="rule.target_variable"
                        class="of-declare-text-input"
                        placeholder="请输入目标变量名"
                        @input="
                          patchRule(rule.id, {
                            target_variable: ($event.target as HTMLInputElement).value
                          })
                        "
                      />
                    </div>
                  </CapsuleTooltip>

                  <CapsuleTooltip text="点击引用已有变量" placement="top">
                    <button
                      type="button"
                      class="of-declare-text-var-btn"
                      @click="openTargetSelector(rule.id, $event)"
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
                  </CapsuleTooltip>
                </div>

                <div class="of-declare-text-right">
                  <CapsuleTooltip text="点击循环切换类型" placement="top">
                    <button
                      type="button"
                      class="of-declare-text-type"
                      :class="`of-declare-text-type-${rule.target_type.toLowerCase()}`"
                      @click="cycleRuleTargetType(rule)"
                    >
                      {{ rule.target_type }}
                    </button>
                  </CapsuleTooltip>
                </div>
              </div>

              <div class="of-declare-text-row">
                <span class="of-declare-text-index"></span>
                <div class="of-declare-text-left"></div>
                <div class="of-declare-text-right">
                  <button
                    type="button"
                    class="of-declare-action of-declare-action-danger"
                    @click="removeRule(rule.id)"
                  >
                    删除
                  </button>
                </div>
              </div>

              <div
                v-if="rule.target_type === OFVarTypeEnum.Boolean && rule.source_mode === 'constant'"
                class="of-declare-bool-toggle"
              >
                <span
                  class="of-declare-bool-option"
                  :class="rule.constant_value === true ? 'of-declare-bool-option-active-true' : ''"
                  @click="patchRule(rule.id, { constant_value: true })"
                >
                  TRUE
                </span>
                <span class="text-gray-300">/</span>
                <span
                  class="of-declare-bool-option"
                  :class="
                    rule.constant_value === false ? 'of-declare-bool-option-active-false' : ''
                  "
                  @click="patchRule(rule.id, { constant_value: false })"
                >
                  FALSE
                </span>
              </div>

              <div
                v-if="rule.target_type === OFVarTypeEnum.Array && rule.item_type"
                class="of-state-hint"
              >
                数组元素类型：
                <button type="button" class="of-declare-choice" @click="cycleRuleItemType(rule)">
                  {{ rule.item_type }}
                </button>
                <button
                  v-if="rule.item_type === OFVarTypeEnum.Object"
                  type="button"
                  class="of-declare-action"
                  @click="openSchemaEditor(rule.id)"
                >
                  配置 Schema
                </button>
              </div>

              <div v-else-if="rule.target_type === OFVarTypeEnum.Object" class="of-state-hint">
                对象 Schema：{{ getSchemaSummary(rule) }}
                <button type="button" class="of-declare-action" @click="openSchemaEditor(rule.id)">
                  配置
                </button>
              </div>
            </div>
          </div>
        </section>

        <div class="of-doc-divider"></div>

        <section class="of-doc-section">
          <div class="flex items-center justify-between">
            <div>
              <div class="of-doc-title-strong">输出预览</div>
              <div class="of-state-hint">{{ outputNamespaceLabel }}</div>
            </div>
          </div>

          <div class="of-output-tree">
            <div class="of-output-tree-root">
              <span class="of-output-tree-root-label">Output</span>
            </div>

            <div
              v-for="(item, index) in outputPreviewVariables"
              :key="item.variable"
              class="of-output-tree-item of-output-tree-branch"
              :class="{ 'of-output-tree-item-last': index === outputPreviewVariables.length - 1 }"
            >
              <span class="of-output-tree-prop">{{ item.variable }}</span>
              <span>:</span>
              <span class="of-output-tree-type">{{ item.type || 'string' }}</span>
            </div>
          </div>
        </section>

        <ObjectSchemaEditor @save="handleSchemaSave" />
      </div>

      <div v-else-if="activeTab === 'settings' && debugMode" class="of-panel-shell-body-inner">
        <NodeDebugForm
          :fields="debugFields"
          :model-value="debugFormValues"
          :running="nodeDebugStore.runningNodeId === uiStore.selectedNodeId"
          @update:model-value="handleDebugFormUpdate"
          @execute="executeNodeDebug"
        />
      </div>

      <div v-else-if="activeTab === 'lastRun'" class="of-panel-shell-body-inner">
        <NodeDebugLastRun
          :result="nodeDebugResult"
          :loading="nodeDebugStore.runningNodeId === uiStore.selectedNodeId"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type {
  OFStructuredJsonSchema,
  OFVarType,
  OFVariableAssignNodeData,
  OFVariableAssignRule
} from '@shared/Orchestraflow-types'
import { OFBlockEnum, OFVarType as OFVarTypeEnum } from '@shared/Orchestraflow-types'
import { useWorkflowEditorUIStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor-ui.store'
import { useWorkflowEditorStore } from '@renderer/stores/orchestraflow/workflow-editor/workflow-editor.store'
import { useVariableSelectorStore } from '@renderer/stores/orchestraflow/workflow-editor/variable-selector/variable-selector.store'
import { useNodeDebugStore } from '@renderer/stores/orchestraflow/node-debug/node-debug.store'
import { useObjectSchemaEditorStore } from '@renderer/stores/orchestraflow/workflow-editor/object-schema-editor/object-schema-editor.store'
import { useVariableAssignNodeConfigStore } from '@renderer/stores/orchestraflow/workflow-editor/node-config/variable-assign-node-config/variable-assign-node-config.store'
import type { NodeDebugField } from './NodeDebug/NodeDebugForm.vue'
import NodeDebugForm from './NodeDebug/NodeDebugForm.vue'
import NodeDebugLastRun from './NodeDebug/NodeDebugLastRun.vue'
import CapsuleTooltip from './components/CapsuleTooltip.vue'
import VariablePillButton from './components/VariablePillButton.vue'
import ObjectSchemaEditor from './ObjectSchemaEditor/index.vue'
import { OF_PANEL_THEME } from './panel-theme'

const uiStore = useWorkflowEditorUIStore()
const editorStore = useWorkflowEditorStore()
const variableSelectorStore = useVariableSelectorStore()
const nodeDebugStore = useNodeDebugStore()
const objectSchemaEditorStore = useObjectSchemaEditorStore()
const configStore = useVariableAssignNodeConfigStore()
const theme = OF_PANEL_THEME.variableAssign

const activeTab = ref<'settings' | 'lastRun'>('settings')
const debugMode = ref(false)
const activeRuleId = ref<string | null>(null)
const activeSchemaRuleId = ref<string | null>(null)

const targetTypeOptions = [
  { label: 'string', value: OFVarTypeEnum.String },
  { label: 'number', value: OFVarTypeEnum.Number },
  { label: 'boolean', value: OFVarTypeEnum.Boolean },
  { label: 'object', value: OFVarTypeEnum.Object },
  { label: 'array', value: OFVarTypeEnum.Array }
]

const arrayItemTypeOptions = [
  { label: 'string', value: OFVarTypeEnum.String },
  { label: 'number', value: OFVarTypeEnum.Number },
  { label: 'boolean', value: OFVarTypeEnum.Boolean },
  { label: 'object', value: OFVarTypeEnum.Object }
]

const currentNode = computed(() => {
  if (!uiStore.selectedNodeId) return null
  return editorStore.findNodeById(uiStore.selectedNodeId) || null
})

const nodeData = computed(() => currentNode.value?.data as OFVariableAssignNodeData | undefined)
const rules = computed(() => nodeData.value?.rules || [])
const outputPreviewVariables = computed(() => nodeData.value?.output?.variables || [])
const outputNamespaceLabel = computed(() => nodeData.value?.title || 'assign')

const titleModel = computed({
  get: () => nodeData.value?.title || '变量赋值',
  set: (value: string) => patchNode({ title: value })
})

const descModel = computed({
  get: () => nodeData.value?.desc || '',
  set: (value: string) => patchNode({ desc: value })
})

const debugFields = computed<NodeDebugField[]>(() => {
  const fieldMap = new Map<string, NodeDebugField>()

  for (const rule of rules.value) {
    if (rule.source_mode !== 'variable' || !rule.source_selector?.length) continue
    const rootKey = rule.source_selector[0]
    if (!rootKey || fieldMap.has(rootKey)) continue

    let fieldType = rule.source_type || OFVarTypeEnum.String
    if (rule.source_selector.length > 1) {
      fieldType = /^\d+$/.test(rule.source_selector[1]) ? OFVarTypeEnum.Array : OFVarTypeEnum.Object
    }

    fieldMap.set(rootKey, {
      key: rootKey,
      label: rootKey,
      type: fieldType,
      required: true,
      placeholder:
        fieldType === OFVarTypeEnum.Array
          ? `请输入 ${rootKey} 对应的 JSON 数组`
          : fieldType === OFVarTypeEnum.Object
            ? `请输入 ${rootKey} 对应的 JSON 对象`
            : `请输入 ${rootKey}`
    })
  }

  return Array.from(fieldMap.values())
})

const debugFormValues = computed(() => {
  const nodeId = uiStore.selectedNodeId
  return nodeId ? nodeDebugStore.getNodeFormValues(nodeId) : {}
})

const nodeDebugResult = computed(() => {
  const nodeId = uiStore.selectedNodeId
  return nodeId ? nodeDebugStore.getLastRun(nodeId) : undefined
})

function setActiveTab(tab: 'settings' | 'lastRun') {
  activeTab.value = tab
  if (tab !== 'settings') {
    debugMode.value = false
  }
}

function enterDebugMode() {
  debugMode.value = true
  activeTab.value = 'settings'
}

function handleClose() {
  uiStore.closeNodeConfigPanel()
}

function patchNode(patch: Partial<OFVariableAssignNodeData>) {
  if (!currentNode.value) return
  configStore.patchConfig(patch as any)
  editorStore.updateNode(currentNode.value.id, patch)
}

function patchRule(ruleId: string, patch: Partial<OFVariableAssignRule>) {
  const nextRules = rules.value.map((rule) => (rule.id === ruleId ? { ...rule, ...patch } : rule))
  patchNode({ rules: nextRules })
}

function addRule() {
  const nextRules = [...rules.value, configStore.createDefaultRule()]
  patchNode({ rules: nextRules })
}

function removeRule(ruleId: string) {
  const nextRules = rules.value.filter((rule) => rule.id !== ruleId)
  patchNode({ rules: nextRules.length > 0 ? nextRules : [configStore.createDefaultRule()] })
}

function openRuleSelector(ruleId: string, event: MouseEvent) {
  if (!uiStore.selectedNodeId) return
  activeRuleId.value = ruleId
  const anchorRect =
    (event.currentTarget as HTMLElement | null)?.getBoundingClientRect() || undefined
  variableSelectorStore.openSelector(
    uiStore.selectedNodeId,
    'variable-assign-source',
    anchorRect,
    undefined,
    {
      x: event.clientX,
      y: event.clientY
    }
  )
}

function openTargetSelector(ruleId: string, event: MouseEvent) {
  if (!uiStore.selectedNodeId) return
  activeRuleId.value = ruleId
  const anchorRect =
    (event.currentTarget as HTMLElement | null)?.getBoundingClientRect() || undefined
  variableSelectorStore.openSelector(
    uiStore.selectedNodeId,
    'variable-assign-target',
    anchorRect,
    undefined,
    {
      x: event.clientX,
      y: event.clientY
    }
  )
}

function parseSelectorPath(value: string): string[] {
  return value
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean)
}

function handleSourcePathInput(ruleId: string, value: string) {
  patchRule(ruleId, {
    source_path: value,
    source_selector: parseSelectorPath(value)
  })
}

function handleTargetTypeChange(ruleId: string, targetType: OFVarType) {
  const patch: Partial<OFVariableAssignRule> = {
    target_type: targetType
  }

  if (targetType !== OFVarTypeEnum.Array) {
    patch.item_type = undefined
    patch.item_schema = null
  } else if (!rules.value.find((rule) => rule.id === ruleId)?.item_type) {
    patch.item_type = OFVarTypeEnum.String
  }

  if (targetType !== OFVarTypeEnum.Object) {
    patch.schema = null
  }

  patchRule(ruleId, patch)
}

function cycleRuleTargetType(rule: OFVariableAssignRule) {
  const currentIndex = targetTypeOptions.findIndex((item) => item.value === rule.target_type)
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % targetTypeOptions.length : 0
  handleTargetTypeChange(rule.id, targetTypeOptions[nextIndex].value as OFVarType)
}

function cycleRuleItemType(rule: OFVariableAssignRule) {
  const currentValue = rule.item_type || OFVarTypeEnum.String
  const currentIndex = arrayItemTypeOptions.findIndex((item) => item.value === currentValue)
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % arrayItemTypeOptions.length : 0
  patchRule(rule.id, { item_type: arrayItemTypeOptions[nextIndex].value as OFVarType })
}

function usesJsonConstantEditor(rule: OFVariableAssignRule) {
  return rule.target_type === OFVarTypeEnum.Object || rule.target_type === OFVarTypeEnum.Array
}

function getConstantDisplayValue(rule: OFVariableAssignRule): string {
  const value = rule.constant_value
  if (value === undefined || value === null) {
    return ''
  }
  if (typeof value === 'string') {
    return value
  }
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function openSchemaEditor(ruleId: string) {
  const rule = rules.value.find((item) => item.id === ruleId)
  if (!rule || !currentNode.value) return
  activeSchemaRuleId.value = ruleId
  objectSchemaEditorStore.open(currentNode.value.id, rule.schema || null)
}

function getSchemaSummary(rule: OFVariableAssignRule) {
  if (!rule.schema) return '未配置 schema'
  return rule.schema.type === 'array' ? 'array<object>' : 'object'
}

function handleSchemaSave(schema: OFStructuredJsonSchema) {
  if (!activeSchemaRuleId.value) return
  const activeRule = rules.value.find((item) => item.id === activeSchemaRuleId.value)
  if (!activeRule) return

  if (activeRule.target_type === OFVarTypeEnum.Array) {
    patchRule(activeSchemaRuleId.value, {
      item_type: OFVarTypeEnum.Object,
      item_schema: schema.type === 'array' ? schema.items : schema,
      schema
    })
  } else {
    patchRule(activeSchemaRuleId.value, {
      schema: schema.type === 'array' ? schema.items : schema
    })
  }
}

function formatSelector(selector?: string[]) {
  return selector?.length ? selector.join('.') : ''
}

function handleVariableSelect(event: Event) {
  const detail = (event as CustomEvent).detail
  if (detail?.nodeId !== uiStore.selectedNodeId || !activeRuleId.value) {
    return
  }

  if (detail.targetType === 'variable-assign-source') {
    patchRule(activeRuleId.value, {
      source_mode: 'variable',
      source_selector: detail.variable.valueSelector || [],
      source_path: detail.variable.path,
      source_label: detail.variable.label,
      source_type: detail.variable.type
    })
    activeRuleId.value = null
    return
  }

  if (detail.targetType === 'variable-assign-target') {
    const rootVariable = detail.variable.valueSelector?.[0] || detail.variable.variable
    patchRule(activeRuleId.value, {
      target_variable: rootVariable,
      target_label: detail.variable.label || rootVariable,
      target_type: (detail.variable.type as OFVarType | undefined) || OFVarTypeEnum.String,
      item_type: detail.variable.type === OFVarTypeEnum.Array ? detail.variable.type : undefined,
      schema: detail.variable.schema || null
    })
  }
  activeRuleId.value = null
}

function handleDebugFormUpdate(values: Record<string, any>) {
  if (!uiStore.selectedNodeId) return
  Object.entries(values).forEach(([key, value]) => {
    nodeDebugStore.setNodeFormValue(uiStore.selectedNodeId!, key, value)
  })
}

async function executeNodeDebug(values: Record<string, any>) {
  if (!editorStore.currentWorkflowId || !uiStore.selectedNodeId) return
  debugMode.value = false
  activeTab.value = 'lastRun'
  await nodeDebugStore.runNodeDebug({
    workflowId: editorStore.currentWorkflowId,
    nodeId: uiStore.selectedNodeId,
    inputs: { ...values },
    scopePath: editorStore.getNodeAncestorPath(uiStore.selectedNodeId)
  })
}

watch(
  () => uiStore.selectedNodeId,
  () => {
    debugMode.value = false
    if (!currentNode.value || currentNode.value.data.type !== OFBlockEnum.VariableAssign) return
    configStore.loadConfig(currentNode.value.id, {
      ...(currentNode.value.data as OFVariableAssignNodeData),
      nodeId: currentNode.value.id
    })
  },
  { immediate: true }
)

onMounted(() => {
  window.addEventListener('of:variable-select', handleVariableSelect as EventListener)
})

onUnmounted(() => {
  window.removeEventListener('of:variable-select', handleVariableSelect as EventListener)
})
</script>

<style scoped src="../../../styles/node-panel.scss"></style>
