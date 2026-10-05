<script setup lang="ts">
defineProps<{ text: string; description?: string }>()
</script>

<template>
  <label class="filter-option">
    <slot />
    <span class="text-wrapper">
      <span>{{ text }}</span>
      <span v-if="description" class="description">{{ description }}</span>
    </span>
    </label>
</template>

<style scoped>
.filter-option {
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  color: var(--text);
  margin-bottom: 8px;
}

.filter-option:has(input:disabled) {
  opacity: 0.5;
  cursor: not-allowed;
}

.text-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.description {
  font-size: 0.8rem;
  line-height: 1.1;
  color: var(--text-secondary);
  font-style: italic;
}
</style>
