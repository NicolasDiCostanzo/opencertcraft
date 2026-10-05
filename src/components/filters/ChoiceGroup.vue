<script setup lang="ts" generic="T extends string">
import Card from '../ui/BaseCard.vue';
import FilterOption from './FilterOption.vue';

defineProps<{
  name: string
  label: string
  options: { value: T; label: string; description?: string; disabled?: boolean }[]
  modelValue: T
}>()

const emit = defineEmits<{ 'update:modelValue': [value: T] }>()
</script>

<template>
  <Card tag="fieldset" padding="md" radius="xl" bg="none">
    <legend>{{ label }}</legend>
      <FilterOption v-for="option in options" :key="option.value" :text="option.label" :description="option.description">
        <input
        type="radio"
        :name="name"
        :checked="modelValue === option.value"
        :disabled="option.disabled"
        @change="emit('update:modelValue', option.value)"
        />
      </FilterOption>
  </Card>
</template>
