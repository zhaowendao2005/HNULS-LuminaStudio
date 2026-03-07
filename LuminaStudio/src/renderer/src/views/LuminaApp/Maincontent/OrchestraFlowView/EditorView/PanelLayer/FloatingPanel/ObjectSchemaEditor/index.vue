<template>
  <CenteredDialog
    :model-value="store.visible"
    title="结构化输出 Schema"
    subtitle="配置 structured_output 的对象字段"
    :close-on-mask="true"
    max-width="1100px"
    @update:model-value="handleVisibleChange"
  >
    <div class="flex h-[78vh] min-h-[640px] flex-col">
      <div class="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <div class="inline-flex rounded-md bg-gray-100/90 p-0.5">
          <button
            class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all"
            :class="
              activeTab === 'visual'
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:bg-gray-200/50 hover:text-gray-700'
            "
            @click="activeTab = 'visual'"
          >
            <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="currentColor">
              <path d="M3 3H10V10H3V3ZM3 14H10V21H3V14ZM14 3H21V10H14V3ZM14 14H21V21H14V14Z" />
            </svg>
            <span>Visual Editor</span>
          </button>
          <button
            class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all"
            :class="
              activeTab === 'json'
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:bg-gray-200/50 hover:text-gray-700'
            "
            @click="activeTab = 'json'"
          >
            <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="currentColor">
              <path
                d="M8.414 8L3.707 12.707L2.293 11.293L5.586 8L2.293 4.707L3.707 3.293L8.414 8ZM11 19H21V21H11V19Z"
              />
            </svg>
            <span>{ } JSON Schema</span>
          </button>
        </div>

        <div class="flex items-center gap-3 text-xs">
          <button
            type="button"
            class="flex items-center gap-1 text-indigo-600 transition-colors hover:text-indigo-700"
          >
            <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="currentColor">
              <path
                d="M12 2L14.09 8.26L20.82 9.27L15.91 13.74L17.18 20.45L12 16.77L6.82 20.45L8.09 13.74L3.18 9.27L9.91 8.26L12 2Z"
              />
            </svg>
            <span>AI 生成</span>
          </button>
          <div class="h-3 w-px bg-gray-200"></div>
          <button
            type="button"
            class="flex items-center gap-1 text-gray-600 transition-colors hover:text-gray-800"
          >
            <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="currentColor">
              <path
                d="M5 5V19H19V12H21V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V4C3 3.44772 3.44772 3 4 3H12V5H5ZM21 3V9H19V6.414L11.707 13.707L10.293 12.293L17.586 5H15V3H21Z"
              />
            </svg>
            <span>从 JSON 导入</span>
          </button>
        </div>
      </div>

      <div
        v-if="errors.length"
        class="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
      >
        <div v-for="error in errors" :key="error">{{ error }}</div>
      </div>

      <div class="flex-1 overflow-auto bg-slate-50/50 p-5">
        <div v-if="activeTab === 'visual'" class="mx-auto max-w-2xl space-y-1.5">
          <div class="flex items-center gap-2 pb-1.5">
            <span class="text-sm font-semibold text-gray-800">structured_output</span>
            <span class="text-xs text-gray-400">object</span>
          </div>

          <div class="ml-1.5 space-y-1.5 border-l-2 border-gray-200/70 pl-5">
            <div
              v-for="field in store.fields"
              :key="field.id"
              class="group relative flex items-center gap-2 rounded-md border border-transparent bg-white p-1.5 transition-all hover:border-indigo-100 hover:shadow-sm"
            >
              <div
                class="absolute -left-[21px] top-1/2 w-4 -translate-y-1/2 border-b-2 border-gray-200/70"
              ></div>

              <input
                :value="field.name"
                class="h-8 w-36 rounded-md border border-transparent bg-transparent px-2 py-1 font-mono text-xs text-gray-700 outline-none transition-colors placeholder:text-gray-300 focus:bg-white"
                :class="theme.controlFocusClass"
                placeholder="字段名"
                @input="
                  store.updateField(field.id, { name: ($event.target as HTMLInputElement).value })
                "
              />

              <WhiteSelect
                :model-value="field.type"
                :options="typeOptions"
                root-class="w-[128px]"
                trigger-class="!h-8 !rounded-md !border-transparent !bg-transparent !px-2 !py-1 !text-xs !text-gray-500 hover:!bg-gray-100"
                panel-class="min-w-[128px]"
                teleport-to="body"
                @update:model-value="
                  store.updateField(field.id, { type: String($event) as OFStructuredFieldType })
                "
              />

              <button
                type="button"
                class="rounded px-1.5 py-0.5 text-[11px] transition-colors"
                :class="
                  field.required
                    ? 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                    : 'text-gray-400 hover:bg-gray-100'
                "
                @click="store.updateField(field.id, { required: !field.required })"
              >
                {{ field.required ? '必填' : '选填' }}
              </button>

              <input
                :value="field.description || ''"
                class="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-xs text-gray-500 outline-none transition-colors placeholder:text-gray-300 focus:bg-white"
                :class="theme.controlFocusClass"
                placeholder="字段描述"
                @input="
                  store.updateField(field.id, {
                    description: ($event.target as HTMLInputElement).value
                  })
                "
              />

              <CapsuleTooltip text="删除字段" placement="top">
                <button
                  type="button"
                  class="ml-auto rounded-md p-1 text-gray-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                  @click="store.removeField(field.id)"
                >
                  <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="currentColor">
                    <path
                      d="M17 6H22V8H20V21C20 21.5523 19.5523 22 19 22H5C4.44772 22 4 21.5523 4 21V8H2V6H7V3C7 2.44772 7.44772 2 8 2H16C16.5523 2 17 2.44772 17 3V6ZM18 8H6V20H18V8ZM9 11H11V17H9V11ZM13 11H15V17H13V11ZM9 4V6H15V4H9Z"
                    />
                  </svg>
                </button>
              </CapsuleTooltip>
            </div>

            <div class="relative mt-1.5">
              <div
                class="absolute -left-[21px] top-1/2 w-4 -translate-y-1/2 border-b-2 border-gray-200/70"
              ></div>
              <button
                type="button"
                class="flex items-center gap-1 rounded-md border border-dashed border-indigo-200 bg-white px-2.5 py-1 text-xs text-indigo-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50/40"
                @click="store.addField('string')"
              >
                <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="currentColor">
                  <path d="M11 11V5H13V11H19V13H13V19H11V13H5V11H11Z" />
                </svg>
                <span>添加字段</span>
              </button>
            </div>
          </div>
        </div>

        <div
          v-else
          class="relative flex h-full overflow-hidden rounded-lg border border-gray-200 bg-white font-mono text-xs"
        >
          <div
            class="min-h-full select-none border-r border-gray-200 bg-slate-50 px-3 py-3 text-right text-gray-400"
          >
            <div v-for="lineNo in lineNumbers" :key="lineNo">{{ lineNo }}</div>
          </div>

          <textarea
            :value="prettySchema"
            class="h-full w-full flex-1 resize-none bg-transparent p-3 leading-relaxed text-gray-800 outline-none"
            spellcheck="false"
            readonly
          />

          <CapsuleTooltip text="复制代码" placement="left">
            <button
              type="button"
              class="absolute right-2 top-2 rounded-md bg-white/80 p-1.5 text-gray-400 backdrop-blur transition-colors hover:bg-gray-100 hover:text-gray-700"
              @click="copySchema"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
                <path
                  d="M7 7V3C7 2.44772 7.44772 2 8 2H20C20.5523 2 21 2.44772 21 3V17C21 17.5523 20.5523 18 20 18H16V21C16 21.5523 15.5523 22 15 22H4C3.44772 22 3 21.5523 3 21V8C3 7.44772 3.44772 7 4 7H7ZM9 7H15C15.5523 7 16 7.44772 16 8V16H19V4H9V7ZM14 9H5V20H14V9Z"
                />
              </svg>
            </button>
          </CapsuleTooltip>
        </div>
      </div>

      <div class="flex items-center justify-between border-t border-gray-100 bg-white px-5 py-3">
        <button
          type="button"
          class="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 transition-colors hover:bg-gray-50"
          @click="clearFields"
        >
          清空配置
        </button>

        <div class="flex items-center gap-2.5">
          <button
            type="button"
            class="rounded-md border border-gray-200 px-5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
            @click="store.close()"
          >
            取消
          </button>
          <button
            type="button"
            class="rounded-md bg-indigo-600 px-5 py-1.5 text-xs font-medium text-white shadow-sm shadow-indigo-600/20 transition-colors hover:bg-indigo-700"
            @click="handleSave"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  </CenteredDialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { OFJsonSchemaObject, OFStructuredFieldType } from '@shared/Orchestraflow-types'
import CenteredDialog from '@renderer/views/LuminaApp/Maincontent/OrchestraFlowView/EditorView/Common/CenteredDialog.vue'
import WhiteSelect, {
  type WhiteSelectOption
} from '@renderer/views/LuminaApp/Maincontent/NormalChat/components/WhiteSelect.vue'
import { useObjectSchemaEditorStore } from '@renderer/stores/orchestraflow/workflow-editor/object-schema-editor/object-schema-editor.store'
import CapsuleTooltip from '../components/CapsuleTooltip.vue'
import { OF_PANEL_THEME } from '../panel-theme'

const emit = defineEmits<{
  save: [schema: OFJsonSchemaObject]
}>()

const store = useObjectSchemaEditorStore()
const activeTab = ref<'visual' | 'json'>('visual')
const theme = OF_PANEL_THEME.llm

const typeOptions: WhiteSelectOption[] = [
  { label: 'string', value: 'string' },
  { label: 'number', value: 'number' },
  { label: 'boolean', value: 'boolean' }
]

const errors = computed(() => {
  const result: string[] = []
  const names = store.fields.map((field) => field.name.trim()).filter(Boolean)
  const duplicated = names.filter((name, index) => names.indexOf(name) !== index)

  if (store.fields.some((field) => !field.name.trim())) {
    result.push('字段名不能为空。')
  }
  if (duplicated.length) {
    result.push(`字段名不能重复：${[...new Set(duplicated)].join('、')}`)
  }
  return result
})

const prettySchema = computed(() => JSON.stringify(store.schema, null, 2))
const lineNumbers = computed(() => prettySchema.value.split('\n').map((_, index) => index + 1))

function handleVisibleChange(visible: boolean) {
  if (!visible) {
    store.close()
  }
}

function clearFields() {
  store.reset('string')
}

function handleSave() {
  if (errors.value.length > 0) {
    return
  }
  emit('save', store.schema)
  store.close()
}

async function copySchema() {
  await navigator.clipboard.writeText(prettySchema.value)
}
</script>
