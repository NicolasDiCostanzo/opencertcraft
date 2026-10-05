<script setup lang="ts">
import { texts } from '../../texts/en'
import type { ExamInfo } from '../../types'
import { formatPassingScore } from '../../utils/examDisplay'
import CertFact from './CertFact.vue'
import WeightPill from './WeightPill.vue'

defineProps<{ exam: ExamInfo }>()
</script>

<template>
  <div class="exam-facts">
    <dl class="exam-facts-grid">
      <slot />
      <CertFact :label="texts.realExamLabel" :value="texts.realExamValue(exam.totalQuestions)" />
      <CertFact :label="texts.timeLimitLabel" :value="texts.timeLimitValue(exam.timeLimitMinutes)" />
      <CertFact :label="texts.passingScoreLabel" :value="formatPassingScore(exam.passingScore)" />
    </dl>
    <ul v-if="exam.weights" class="exam-facts-weights">
      <WeightPill v-for="(weight, topic) in exam.weights" :key="topic" :topic="topic" :weight="weight" />
    </ul>
  </div>
</template>

<style scoped>
.exam-facts {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.exam-facts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 10px 16px;
  margin: 0;
}

.exam-facts-weights {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
</style>
