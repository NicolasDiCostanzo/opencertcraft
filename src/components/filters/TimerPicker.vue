<script setup lang="ts">
import { texts } from '../../texts/en'
import Card from '../ui/BaseCard.vue'
import FilterOption from './FilterOption.vue'

const MIN_MINUTES = 1
const MAX_MINUTES = 9999

defineProps<{
  enabled: boolean
  minutes: number
}>()

const emit = defineEmits<{
  'update:enabled': [value: boolean]
  'update:minutes': [value: number]
}>()

function updateMinutes(event: Event) {
  const raw = Number((event.target as HTMLInputElement).value)
  emit('update:minutes', Math.max(MIN_MINUTES, Math.min(Math.floor(raw) || MIN_MINUTES, MAX_MINUTES)))
}
</script>

<template>
  <Card tag="fieldset" padding="md" radius="xl" bg="none" class="timer-picker">
    <legend>{{ texts.timerLabel }}</legend>
    <FilterOption :text="texts.timerEnable">
      <input
        type="checkbox"
        :checked="enabled"
        @change="emit('update:enabled', ($event.target as HTMLInputElement).checked)"
      />
    </FilterOption>
    <label v-if="enabled" class="timer-minutes">
      <input
        class="timer-input"
        type="number"
        :min="MIN_MINUTES"
        :max="MAX_MINUTES"
        :value="minutes"
        :aria-label="texts.timerMinutesLabel"
        @change="updateMinutes"
      />
      <span>{{ texts.timerMinutesUnit }}</span>
    </label>
  </Card>
</template>

<style scoped>
.timer-minutes {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text);
}

.timer-input {
  width: 90px;
  padding: 4px 8px;
  font: inherit;
  color: var(--text-h);
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: 6px;
}
</style>
