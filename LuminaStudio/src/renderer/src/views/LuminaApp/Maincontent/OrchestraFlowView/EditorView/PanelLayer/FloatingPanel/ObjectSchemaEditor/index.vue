<template>
  <CenteredDialog
    :model-value="store.visible"
    title="结构化输出 Schema"
    subtitle="配置 structured_output 的对象字段"
    :close-on-mask="true"
    @update:model-value="handleVisibleChange"
  >
    <div class="of-object-schema-editor flex h-[70vh] min-h-[560px] flex-col">
      <div class="mb-4 flex items-center justify-between">
        <div class="inline-flex rounded-xl bg-[#eef2f5] p-1">
          <button
            class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            :class="
              activeTab === 'visual'
                ? 'bg-white text-[#1f2937] shadow-sm'
                : 'text-[#667085] hover:text-[#1f2937]'
            "
            @click="activeTab = 'visual'"
          >
            Visual Editor
          </button>
          <button
            class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            :class="
              activeTab === 'json'
                ? 'bg-white text-[#1f2937] shadow-sm'
                : 'text-[#667085] hover:text-[#1f2937]'
            "
            @click="activeTab = 'json'"
          >
            JSON Schema
          </button>
        </div>

        <div class="flex items-center gap-2">
          <button
            class="rounded-lg border border-[#d6dde7] bg-white px-3 py-1.5 text-sm text-[#526072] hover:bg-[#f8fafc]"
            @click="store.addField('string')"
          >
            添加字符串
          </button>
          <button
            class="rounded-lg border border-[#d6dde7] bg-white px-3 py-1.5 text-sm text-[#526072] hover:bg-[#f8fafc]"
            @click="store.addField('number')"
          >
            添加数字
          </button>
          <button
            class="rounded-lg border border-[#d6dde7] bg-white px-3 py-1.5 text-sm text-[#526072] hover:bg-[#f8fafc]"
            @click="store.addField('boolean')"
          >
            添加布尔
          </button>
        </div>
      </div>

      <div v-if="errors.length" class="mb-4 rounded-xl border border-[#f2c6c6] bg-[#fff6f6] px-4 py-3 text-sm text-[#c24141]">
        <div v-for="error in errors" :key="error">{{ error }}</div>
      </div>

      <div v-if="activeTab === 'visual'" class="flex-1 overflow-y-auto rounded-2xl bg-[#f6f8fb] p-3">
        <div class="rounded-2xl bg-white p-3 shadow-sm">
          <div class="mb-2 flex items-center gap-2 pl-1">
            <div class="text-sm font-semibold text-[#1f2937]">structured_output</div>
            <div class="rounded px-2 py-0.5 text-xs text-[#667085]">object</div>
          </div>

          <div class="space-y-3 border-l border-[#e3e8ef] pl-5">
            <div
              v-for="field in store.fields"
              :key="field.id"
              class="rounded-2xl border border-[#e3e8ef] bg-[#fbfcfe] p-3 shadow-sm"
            >
              <div class="flex items-start gap-3">
                <input
                  :value="field.name"
                  class="h-9 min-w-0 flex-1 rounded-lg border border-[#d6dde7] bg-white px-3 text-sm text-[#1f2937] outline-none focus:border-[#8fb0ff]"
                  placeholder="字段名"
                  @input="
                    store.updateField(field.id, { name: ($event.target as HTMLInputElement).value })
                  "
                />

                <select
                  :value="field.type"
                  class="h-9 rounded-lg border border-[#d6dde7] bg-white px-3 text-sm text-[#334155] outline-none focus:border-[#8fb0ff]"
                  @change="
                    store.updateField(field.id, {
                      type: (($event.target as HTMLSelectElement).value as OFStructuredFieldType)
                    })
                  "
                >
                  <option value="string">string</option>
                  <option value="number">number</option>
                  <option value="boolean">boolean</option>
                </select>

                <button
                  class="flex h-9 w-9 items-center justify-center rounded-lg text-[#98a2b3] hover:bg-[#f1f5f9] hover:text-[#d14343]"
                  @click="store.removeField(field.id)"
                >
                  <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
                    <path
                      d="M17 6H22V8H20V21C20 21.5523 19.5523 22 19 22H5C4.44772 22 4 21.5523 4 21V8H2V6H7V3C7 2.44772 7.44772 2 8 2H16C16.5523 2 17 2.44772 17 3V6ZM18 8H6V20H18V8ZM9 11H11V17H9V11ZM13 11H15V17H13V11ZM9 4V6H15V4H9Z"
                    />
                  </svg>
                </button>
              </div>

              <div class="mt-3 flex items-center justify-between rounded-xl bg-white px-3 py-2">
                <div>
                  <div class="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                    Required
                  </div>
                  <div class="text-xs text-[#64748b]">控制该字段是否写入 `required`</div>
                </div>
                <button
                  class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                  :class="field.required ? 'bg-[#2563eb]' : 'bg-[#cbd5e1]'"
                  @click="store.updateField(field.id, { required: !field.required })"
                >
                  <span
                    class="inline-block h-5 w-5 transform rounded-full bg-white transition-transform"
                    :class="field.required ? 'translate-x-5' : 'translate-x-1'"
                  />
                </button>
              </div>

              <textarea
                :value="field.description || ''"
                class="mt-3 min-h-[72px] w-full rounded-xl border border-[#d6dde7] bg-white px-3 py-2 text-sm text-[#475467] outline-none focus:border-[#8fb0ff]"
                placeholder="字段描述（可选）"
                @input="
                  store.updateField(field.id, {
                    description: ($event.target as HTMLTextAreaElement).value
                  })
                "
              />
            </div>
          </div>
        </div>
      </div>

      <div v-else class="flex-1 overflow-hidden rounded-2xl bg-[#0f172a] p-4">
        <pre class="h-full overflow-auto text-xs leading-6 text-[#dbeafe]">{{ prettySchema }}</pre>
      </div>

    </div>
    <template #footer>
      <div class="flex items-center justify-between">
        <button
          class="rounded-lg border border-[#d6dde7] bg-white px-4 py-2 text-sm text-[#526072] hover:bg-[#f8fafc]"
          @click="clearFields"
        >
          清空配置
        </button>
        <div class="flex items-center gap-2">
          <button
            class="rounded-lg border border-[#d6dde7] bg-white px-4 py-2 text-sm text-[#526072] hover:bg-[#f8fafc]"
            @click="store.close()"
          >
            取消
          </button>
          <button
            class="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-medium text-white hover:bg-[#1d4ed8]"
            @click="handleSave"
          >
            保存
          </button>
        </div>
      </div>
    </template>
  </CenteredDialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { OFJsonSchemaObject, OFStructuredFieldType } from '@shared/Orchestraflow-types'
import CenteredDialog from '@renderer/views/LuminaApp/Maincontent/OrchestraFlowView/EditorView/Common/CenteredDialog.vue'
import { useObjectSchemaEditorStore } from '@renderer/stores/orchestraflow/workflow-editor/object-schema-editor/object-schema-editor.store'

const emit = defineEmits<{
  save: [schema: OFJsonSchemaObject]
}>()

const store = useObjectSchemaEditorStore()
const activeTab = ref<'visual' | 'json'>('visual')

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
</script>
