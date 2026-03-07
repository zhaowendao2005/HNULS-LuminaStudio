<template>
  <label class="toggle-switch of-toggle-switch">
    <input
      type="checkbox"
      :checked="modelValue"
      @change="handleChange"
    />
    <div class="toggle-switch-background">
      <div class="toggle-switch-handle" />
    </div>
  </label>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue?: boolean
  }>(),
  {
    modelValue: false
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function handleChange(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.checked)
}
</script>

<style scoped>
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  cursor: pointer;
}

.toggle-switch input[type="checkbox"] {
  display: none;
}

.toggle-switch-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #ddd;
  border-radius: 12px;
  box-shadow: inset 0 0 0 1px #ccc;
  transition: background-color 0.3s ease-in-out;
}

.toggle-switch-handle {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background-color: #fff;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s ease-in-out;
}

.toggle-switch input[type="checkbox"]:checked + .toggle-switch-background {
  background-color: #05c46b;
  box-shadow: inset 0 0 0 1px #04b360;
}

.toggle-switch input[type="checkbox"]:checked + .toggle-switch-background .toggle-switch-handle {
  transform: translateX(20px);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2), 0 0 0 2px #05c46b;
}
</style>
