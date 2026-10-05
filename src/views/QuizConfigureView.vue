<script setup lang="ts">
  import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Card from '../components/ui/BaseCard.vue'
import ExamFacts from '../components/cert/ExamFacts.vue'
import ChoiceGroup from '../components/filters/ChoiceGroup.vue'
import CountPicker from '../components/filters/CountPicker.vue'
import FilterOption from '../components/filters/FilterOption.vue'
import PrimaryButton from '../components/ui/PrimaryButton.vue'
import ThemeFilter from '../components/filters/ThemeFilter.vue'
import { useQuizConfiguration } from '../composables/useQuizConfiguration'
import { useQuizLoader } from '../composables/useQuizLoader'
import { texts } from '../texts/en'
import type { QuizMode, ReplayMode, ThemeMatchMode } from '../types'

  const route = useRoute()
  const { getCert, activePool } = useQuizLoader()

  const certCode = computed(() => String(route.params.certCode))
  const cert = computed(() => getCert(certCode.value))
  const pool = computed(() => activePool(certCode.value))

  const {
    mode,
    replayMode,
    count,
    includeMatchMode,
    includeGroups,
    excludeGroups,
    selectedTopics,
    availableTopics,
    selectedGroupCount,
    matchingCount,
    examReplayCounts,
    examReplayAvailability,
    canStart,
    startQuiz,
  } = useQuizConfiguration(certCode, cert, pool)

  const modeOptions: { value: QuizMode; label: string; description?: string }[] = [
    { value: 'preparation', label: texts.modePreparation, description: texts.modePreparationDescription },
    { value: 'exam', label: texts.modeExam, description: texts.modeExamDescription },
  ]

  const isExam = computed(() => mode.value === 'exam')

  const footerMessage = computed(() => {
    if (isExam.value) {
      return canStart.value
        ? texts.examReadyValue(cert.value?.exam.totalQuestions ?? 0)
        : texts.examPoolTooSmallWarning
    }
    return matchingCount.value === 0 ? texts.noMatchWarning : texts.matchingCountValue(matchingCount.value)
  })

  const replayChoices: { value: ReplayMode; label: string }[] = [
    { value: 'all', label: texts.replayAll },
    { value: 'wrong', label: texts.replayWrong },
    { value: 'flagged', label: texts.replayFlagged },
    { value: 'unattempted', label: texts.replayUnattempted },
  ]

  const replayOptions = computed(() =>
    replayChoices.map((choice) => {
      if (!isExam.value || examReplayAvailability.value[choice.value]) return choice
      return {
        ...choice,
        disabled: true,
        description: texts.examReplayUnavailable(cert.value?.exam.totalQuestions ?? 0, examReplayCounts.value[choice.value]),
      }
    }),
  )

  const matchGroupsOptions: { value: ThemeMatchMode; label: string }[] = [
    { value: 'and', label: texts.matchAllGroups },
    { value: 'or', label: texts.matchAnyGroups },
]
</script>

<template>
  <section v-if="cert" class="configure-shell">
    <h1 class="page-title">{{ cert.exam.name }}</h1>

    <Card padding="xl" radius="3xl" shadow border-top class="config-card">
      <h2 class="section-title">{{ texts.quickSetupLabel }}</h2>
      <div class="quick-grid">
        <ChoiceGroup name="quiz-mode" :label="texts.modeLabel" :options="modeOptions" v-model="mode" />
        <ChoiceGroup name="replay-mode" :label="texts.replayLabel" :options="replayOptions" v-model="replayMode" />
        <Card v-if="isExam" tag="section" padding="md" radius="xl" bg="none" class="exam-settings">
          <h3 class="col-heading">{{ texts.examSettingsLabel }}</h3>
          <ExamFacts :exam="cert.exam" />
        </Card>
        <CountPicker v-else :max="matchingCount" v-model="count" />
      </div>
    </Card>

    <Card v-if="!isExam" tag="details" padding="xl" radius="3xl" shadow border-top class="config-card filters-card">
      <summary class="section-title">{{ texts.filterQuestionsLabel }}</summary>
      <div class="advanced-grid">
        <div class="filter-col topics-section">
          <h3 class="col-heading">{{ texts.topicsLabel }}</h3>
          <ThemeFilter :values="availableTopics" :model-value="{ values: selectedTopics, match: 'any' }"
            :match-choice="false" :all-option="true" @update:model-value="selectedTopics = $event.values" />
        </div>

        <details class="filter-col include-section">
          <summary class="col-heading">{{ texts.includeLabel }}</summary>
          <div class="match-row" :class="{ 'match-row--disabled': selectedGroupCount < 2 }" role="radiogroup"
            :aria-label="texts.matchGroupsLabel">
            <FilterOption v-for="option in matchGroupsOptions" :key="option.value" class="pill" :text="option.label">
              <input type="radio" name="include-match" :disabled="selectedGroupCount < 2"
                :checked="includeMatchMode === option.value" @change="includeMatchMode = option.value" />
            </FilterOption>
          </div>
          <div class="filter-wrapper">
            <ThemeFilter v-for="(values, group) in cert.themes" :key="`include-${group}`" :label="group"
              :values="values" :model-value="includeGroups[group]" :match-choice="true"
              :disabled-values="excludeGroups[group]?.values ?? []"
              @update:model-value="includeGroups[group] = $event" />
          </div>

        </details>

        <details class="filter-col exclude-section">
          <summary class="col-heading">{{ texts.excludeLabel }}</summary>
          <div class="filter-wrapper">
            <ThemeFilter v-for="(values, group) in cert.themes" :key="`exclude-${group}`" :label="group"
              :values="values" :model-value="excludeGroups[group] ?? { values: [], match: 'any' }"
              :match-choice="false" :disabled-values="includeGroups[group]?.values ?? []"
              @update:model-value="excludeGroups[group] = $event" />
          </div>
        </details>
      </div>
    </Card>

    <footer class="config-footer">
      <p class="match-preview" :class="{ warning: !canStart }">
        {{ footerMessage }}
      </p>
      <PrimaryButton pill ghost size="lg" :disabled="!canStart" @click="startQuiz">{{ texts.startQuizCta }}</PrimaryButton>
    </footer>
  </section>
</template>

<style scoped>
  .filter-wrapper {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 16px;
  }

  .configure-shell {
    max-width: 1100px;
    margin: 0 auto;
    padding: 32px 24px 64px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .page-title {
    margin: 0;
    font-size: 28px;
    font-weight: 700;
    color: var(--text-h);
    text-align: center;
  }

  .config-card {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .section-title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: var(--text);
  }

  summary.section-title {
    cursor: pointer;
    user-select: none;
    list-style: none;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  summary.section-title::-webkit-details-marker {
    display: none;
  }

  summary.section-title::before {
    content: '+';
    font-size: 16px;
    color: var(--accent);
  }

  details[open]>summary.section-title::before {
    content: '−';
  }

  .exam-settings {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .col-heading {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-h);
  }

  summary.col-heading {
    cursor: pointer;
    user-select: none;
    list-style: none;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  summary.col-heading::before {
    content: '−';
    color: var(--accent);
  }

  details:not([open])>summary.col-heading::before {
    content: '+';
  }

  .quick-grid,
  .advanced-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
    align-items: start;
  }

  .advanced-grid {
    grid-template-columns: 280px 1fr 1fr;
  }

  .filter-col {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .include-section {
    border-left: 2px solid var(--green);
    padding-left: 16px;
  }

  .exclude-section {
    border-left: 2px solid var(--red);
    padding-left: 16px;
  }

  .match-row {
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    gap: 8px;
  }

  .match-row--disabled {
    opacity: 0.5;
  }

  .match-row--disabled .pill {
    cursor: not-allowed;
  }

  .pill {
    position: relative;
    padding: 4px 14px;
    border: 1px solid var(--border);
    border-radius: 999px;
    white-space: nowrap;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
  }

  .pill:has(input:checked) {
    color: var(--text-h);
    background: var(--accent-bg);
    border-color: var(--accent-border);
  }

  .pill input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .config-footer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding-top: 8px;
  }

  .match-preview {
    margin: 0;
    font-weight: 600;
    font-size: 16px;
    text-align: center;
    color: var(--accent);
  }

  .match-preview.warning {
    color: var(--text-h);
  }

  @media (max-width: 1024px) {
    .configure-shell {
      padding: 24px 16px 48px;
      gap: 20px;
    }

    .config-card.config-card {
      padding: 20px;
    }

    .quick-grid,
    .advanced-grid {
      grid-template-columns: 1fr;
      gap: 16px;
    }
  }
</style>
