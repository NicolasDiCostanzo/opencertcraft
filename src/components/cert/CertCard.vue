<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { texts } from '../../texts/en'
import type { CertBundleMeta } from '../../types'
import Card from '../ui/BaseCard.vue'
import CertCodeBadge from './CertCodeBadge.vue'
import CertFact from './CertFact.vue'
import ExamFacts from './ExamFacts.vue'

defineProps<{ cert: CertBundleMeta }>()
</script>

<template>
  <Card
    :as="RouterLink"
    :to="{ name: 'quiz-dashboard', params: { certCode: cert.exam.code } }"
    padding="lg"
    bg="bg"
    shadow
    hoverable
    class="cert-card"
  >
    <h2>{{ cert.exam.name }}</h2>
    <CertCodeBadge :code="cert.exam.code" />
    <ExamFacts :exam="cert.exam">
      <CertFact :label="texts.questionBankLabel" :value="String(cert.questionCount)" />
    </ExamFacts>
    <p v-if="cert.exam.instructions" class="cert-instructions">{{ cert.exam.instructions }}</p>
    <p class="cert-cta">{{ texts.viewDashboardCta }}</p>
  </Card>
</template>

<style scoped>
.cert-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-decoration: none;
}

.cert-instructions {
  font-size: 14px;
  color: var(--text);
  text-align: left;
}

.cert-cta {
  margin-top: auto;
  font-weight: 500;
  color: var(--accent);
}
</style>
