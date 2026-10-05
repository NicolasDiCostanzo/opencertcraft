import { computed, reactive, ref, watch, type ComputedRef } from 'vue'
import { useRouter } from 'vue-router'
import { useQuizSessionStore } from '../stores/quizSession'
import { useUserProgressStore } from '../stores/userProgress'
import type {
  CertBundle,
  Question,
  QuizConfig,
  QuizMode,
  ReplayMode,
  ThemeGroupFilter,
  ThemeMatchMode,
  ThemeRegistry,
} from '../types'
import { filterByReplay, filterByThemes, filterByTopics } from '../utils/filterPool'
import { sampleQuestions } from '../utils/sampling'

function emptyGroupFilters(themes: ThemeRegistry): Record<string, ThemeGroupFilter> {
  return Object.fromEntries(
    Object.keys(themes).map((group): [string, ThemeGroupFilter] => [group, { values: [], match: 'any' }]),
  )
}

export function useQuizConfiguration(
  certCode: ComputedRef<string>,
  cert: ComputedRef<CertBundle | undefined>,
  pool: ComputedRef<Question[]>,
) {
  const router = useRouter()
  const progressStore = useUserProgressStore()
  const quizSessionStore = useQuizSessionStore()

  const mode = ref<QuizMode>('preparation')
  const replayMode = ref<ReplayMode>('all')
  const count = ref<number | 'all'>(cert.value?.exam.totalQuestions ?? 'all')
  const includeMatchMode = ref<ThemeMatchMode>('or')
  const includeGroups = reactive<Record<string, ThemeGroupFilter>>(
    emptyGroupFilters(cert.value?.themes ?? {}),
  )
  const excludeGroups = reactive<Record<string, ThemeGroupFilter>>(
    emptyGroupFilters(cert.value?.themes ?? {}),
  )
  const selectedTopics = ref<string[]>([])

  watch(certCode, () => {
    const themes = cert.value?.themes ?? {}
    for (const group of Object.keys(includeGroups)) delete includeGroups[group]
    Object.assign(includeGroups, emptyGroupFilters(themes))
    for (const group of Object.keys(excludeGroups)) delete excludeGroups[group]
    Object.assign(excludeGroups, emptyGroupFilters(themes))
    selectedTopics.value = []
    count.value = cert.value?.exam.totalQuestions ?? 'all'
  })

  const availableTopics = computed(() => [...new Set(pool.value.map((question) => question.topic))])

  const selectedGroupCount = computed(
    () => Object.values(includeGroups).filter((group) => group.values.length > 0).length,
  )

  const filteredPool = computed(() =>
    filterByReplay(
      filterByTopics(
        filterByThemes(pool.value, includeGroups, includeMatchMode.value, excludeGroups),
        selectedTopics.value,
      ),
      replayMode.value,
      progressStore.byExamCode[certCode.value] ?? {},
    ),
  )

  const matchingCount = computed(() => filteredPool.value.length)

  const replayModes: ReplayMode[] = ['all', 'wrong', 'flagged', 'unattempted']

  function replayPool(replay: ReplayMode): Question[] {
    return filterByReplay(pool.value, replay, progressStore.byExamCode[certCode.value] ?? {})
  }

  const examReplayCounts = computed(
    () => Object.fromEntries(replayModes.map((replay) => [replay, replayPool(replay).length])) as Record<ReplayMode, number>,
  )

  const examReplayAvailability = computed(() => {
    const required = cert.value?.exam.totalQuestions ?? 0
    return Object.fromEntries(
      replayModes.map((replay) => [replay, examReplayCounts.value[replay] >= required]),
    ) as Record<ReplayMode, boolean>
  })

  watch([mode, examReplayAvailability], () => {
    if (mode.value === 'exam' && !examReplayAvailability.value[replayMode.value]) {
      replayMode.value = 'all'
    }
  })

  const canStart = computed(() =>
    mode.value === 'exam' ? examReplayAvailability.value[replayMode.value] : matchingCount.value > 0,
  )

  async function startQuiz() {
    const isExam = mode.value === 'exam'
    const exam = cert.value?.exam
    const questions = isExam
      ? sampleQuestions(replayPool(replayMode.value), exam?.totalQuestions ?? 'all', exam?.weights)
      : sampleQuestions(filteredPool.value, count.value, exam?.weights)
    const initialFlags = questions
      .filter((q) => progressStore.isFlagged(certCode.value, q.id))
      .map((q) => q.id)
    const config: QuizConfig = isExam
      ? {
          certCode: certCode.value,
          mode: mode.value,
          includeMatchMode: 'or',
          replayMode: replayMode.value,
          count: exam?.totalQuestions ?? 'all',
        }
      : {
          certCode: certCode.value,
          mode: mode.value,
          includeThemes: includeGroups,
          includeMatchMode: includeMatchMode.value,
          excludeThemes: excludeGroups,
          topics: selectedTopics.value,
          replayMode: replayMode.value,
          count: count.value,
        }
    const timeLimitMinutes = isExam ? exam?.timeLimitMinutes : undefined
    quizSessionStore.startSession(certCode.value, config, questions, timeLimitMinutes, initialFlags)
    await router.push({ name: 'quiz-session', params: { certCode: certCode.value } })
  }

  return {
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
  }
}