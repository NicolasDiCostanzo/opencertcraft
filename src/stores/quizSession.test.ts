import { createPinia, setActivePinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, nextTick } from 'vue'
import type { Question, QuizConfig } from '../types'
import { useQuizSessionStore } from './quizSession'

function makeQuestions(): Question[] {
  return [
    { id: 'q1', question: 'Q1?', options: ['A', 'B', 'C'], answers: 'B', topic: 'Security' },
    { id: 'q2', question: 'Q2?', options: ['A', 'B', 'C', 'D'], answers: ['A', 'C'], topic: 'Deployment' },
    { id: 'q3', question: 'Q3?', options: ['A', 'B'], answers: 'A', topic: 'Security' },
  ]
}

const config = (mode: QuizConfig['mode']): QuizConfig => ({
  certCode: 'DVA-C02',
  mode,
  includeMatchMode: 'or',
  replayMode: 'all',
  count: 'all',
})

beforeEach(() => {
  setActivePinia(createPinia())
  sessionStorage.clear()
})

describe('quizSession store', () => {
  it('starts a session with its questions at the first index', () => {
    const store = useQuizSessionStore()
    store.startSession('DVA-C02', config('preparation'), makeQuestions(), undefined)

    const session = store.currentSession
    expect(session?.mode).toBe('preparation')
    expect(session?.questions).toHaveLength(3)
    expect(session?.currentIndex).toBe(0)
    expect(session?.startedAt).toBeGreaterThan(0)
  })

  it.each([
    { mode: 'preparation', timeLimitMinutes: undefined, expectedMinutes: undefined },
    { mode: 'preparation', timeLimitMinutes: 45, expectedMinutes: 45 },
    { mode: 'exam', timeLimitMinutes: 130, expectedMinutes: 130 },
    { mode: 'exam', timeLimitMinutes: undefined, expectedMinutes: undefined },
  ] as { mode: QuizConfig['mode']; timeLimitMinutes: number | undefined; expectedMinutes: number | undefined }[])(
    'sets the deadline from the time limit alone ($mode, $timeLimitMinutes min)',
    ({ mode, timeLimitMinutes, expectedMinutes }) => {
      const store = useQuizSessionStore()
      vi.useFakeTimers()
      const startedAt = Date.now()
      store.startSession('DVA-C02', config(mode), makeQuestions(), timeLimitMinutes)
      vi.useRealTimers()

      const session = store.currentSession!
      expect(session.startedAt).toBe(startedAt)
      expect(session.deadlineAt).toBe(expectedMinutes === undefined ? undefined : startedAt + expectedMinutes * 60_000)
    },
  )

  it('records a correct single answer and marks it', () => {
    const store = useQuizSessionStore()
    store.startSession('DVA-C02', config('preparation'), makeQuestions(), undefined)

    store.answerQuestion('q1', ['B'])
    expect(store.currentSession?.answers.q1).toMatchObject({ selected: ['B'], correct: true })
  })

  it('records a wrong single answer and marks it', () => {
    const store = useQuizSessionStore()
    store.startSession('DVA-C02', config('preparation'), makeQuestions(), undefined)

    store.answerQuestion('q3', ['B'])
    expect(store.currentSession?.answers.q3.correct).toBe(false)
  })

  it('marks a multi-answer correct only with the exact set', () => {
    const store = useQuizSessionStore()
    store.startSession('DVA-C02', config('preparation'), makeQuestions(), undefined)

    store.answerQuestion('q2', ['A', 'C'])
    expect(store.currentSession?.answers.q2.correct).toBe(true)

    store.answerQuestion('q2', ['A', 'D'])
    expect(store.currentSession?.answers.q2.correct).toBe(false)
  })

  it('rejects duplicate selections for a multi-answer', () => {
    const store = useQuizSessionStore()
    store.startSession('DVA-C02', config('preparation'), makeQuestions(), undefined)

    store.answerQuestion('q2', ['A', 'A'])
    expect(store.currentSession?.answers.q2.correct).toBe(false)
  })

  it('requires the exact selection length for a multi-answer', () => {
    const store = useQuizSessionStore()
    store.startSession('DVA-C02', config('preparation'), makeQuestions(), undefined)

    store.answerQuestion('q2', ['A'])
    expect(store.currentSession?.answers.q2.correct).toBe(false)
  })

  it('replaces a previous answer on re-answer', () => {
    const store = useQuizSessionStore()
    store.startSession('DVA-C02', config('preparation'), makeQuestions(), undefined)

    store.answerQuestion('q1', ['B'])
    store.answerQuestion('q1', ['A'])
    expect(store.currentSession?.answers.q1).toMatchObject({ selected: ['A'], correct: false })
  })

  it('toggles a flag and guards navigation within bounds', () => {
    const store = useQuizSessionStore()
    store.startSession('DVA-C02', config('preparation'), makeQuestions(), undefined)

    store.toggleFlag('q2')
    expect(store.currentSession?.flags).toEqual(['q2'])
    store.toggleFlag('q2')
    expect(store.currentSession?.flags).toEqual([])

    store.nextQuestion()
    expect(store.currentSession?.currentIndex).toBe(1)
    store.goToQuestion(99)
    expect(store.currentSession?.currentIndex).toBe(2)
    store.goToQuestion(-5)
    expect(store.currentSession?.currentIndex).toBe(0)
    store.previousQuestion()
    expect(store.currentSession?.currentIndex).toBe(0)
  })

  it('ignores answers and flags once finished', () => {
    const store = useQuizSessionStore()
    store.startSession('DVA-C02', config('exam'), makeQuestions(), 130)
    store.answerQuestion('q1', ['B'])
    store.finishSession({ percentCorrect: 100, passed: true, timesCorrect: 1, totalAnswered: 1 })

    store.answerQuestion('q2', ['A', 'C'])
    store.toggleFlag('q2')

    expect(store.currentSession?.answers.q2).toBeUndefined()
    expect(store.currentSession?.flags).toEqual([])
    expect(store.currentSession?.finished).toBe(true)
    expect(store.currentSession?.result).toEqual({ percentCorrect: 100, passed: true, timesCorrect: 1, totalAnswered: 1 })
  })

  it('resets the session', () => {
    const store = useQuizSessionStore()
    store.startSession('DVA-C02', config('preparation'), makeQuestions(), undefined)

    store.resetSession()
    expect(store.hasSession).toBe(false)
  })

  it('persists the session to sessionStorage and restores it on a fresh store', async () => {
    const pinia = createPinia()
    createApp({ render: () => null }).use(pinia)
    pinia.use(piniaPluginPersistedstate)
    const first = useQuizSessionStore(pinia)
    first.startSession('DVA-C02', config('exam'), makeQuestions(), 130)
    first.answerQuestion('q1', ['B'])
    first.toggleFlag('q2')
    await nextTick()

    const freshPinia = createPinia()
    createApp({ render: () => null }).use(freshPinia)
    freshPinia.use(piniaPluginPersistedstate)
    const second = useQuizSessionStore(freshPinia)
    expect(second.hasSession).toBe(true)
    expect(second.currentSession?.mode).toBe('exam')
    expect(second.currentSession?.questions).toHaveLength(3)
    expect(Object.keys(second.currentSession?.answers ?? {})).toEqual(['q1'])
    expect(second.currentSession?.flags).toEqual(['q2'])
  })
})
