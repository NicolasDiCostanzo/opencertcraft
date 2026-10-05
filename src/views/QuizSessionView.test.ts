import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import QuizSessionView from './QuizSessionView.vue'
import { useQuizHistoryStore } from '../stores/quizHistory'
import { useQuizSessionStore } from '../stores/quizSession'
import { useUserProgressStore } from '../stores/userProgress'
import type { Question } from '../types'

function makeQuestions(n: number): Question[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `q${i + 1}`,
    question: `Question ${i + 1}`,
    options: ['A', 'B', 'C', 'D'],
    answers: 'B',
    topic: 't1',
  }))
}

const questions = makeQuestions(3)

const pinia = createPinia()
setActivePinia(pinia)

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', name: 'cert-selector', component: { template: '<div/>' } },
    { path: '/certs/:certCode/configure', name: 'quiz-configure', component: { template: '<div/>' } },
    { path: '/certs/:certCode/quiz', name: 'quiz-session', component: QuizSessionView },
    { path: '/certs/:certCode/quiz/review', name: 'quiz-review', component: { template: '<div/>' } },
  ],
})

vi.mock('../composables/useQuizLoader', () => ({
  useQuizLoader: () => ({
    ensureCertLoaded: async () => true,
    getCert: () => ({
      exam: { name: 'Test', code: 'TEST', totalQuestions: 65, timeLimitMinutes: 130, passingScore: { passingScore: 700, scale: 1000 } },
    }),
  }),
}))

describe('QuizSessionView', () => {
  let store: ReturnType<typeof useQuizSessionStore>
  let progressStore: ReturnType<typeof useUserProgressStore>

  beforeEach(() => {
    store = useQuizSessionStore()
    store.resetSession()
    progressStore = useUserProgressStore()
    progressStore.byExamCode = {}
    useQuizHistoryStore().resetAll()
  })

  it('renders nothing without a session', () => {
    const wrapper = mount(QuizSessionView, { global: { plugins: [pinia, router] } })
    expect(wrapper.find('.session').exists()).toBe(false)
  })

  it.each([
    { mode: 'preparation', timeLimitMinutes: undefined, timerShown: false },
    { mode: 'preparation', timeLimitMinutes: 45, timerShown: true },
    { mode: 'exam', timeLimitMinutes: 130, timerShown: true },
  ] as { mode: 'preparation' | 'exam'; timeLimitMinutes: number | undefined; timerShown: boolean }[])(
    'shows the timer only when the session has a time limit ($mode, $timeLimitMinutes min)',
    ({ mode, timeLimitMinutes, timerShown }) => {
      store.startSession('TEST', { certCode: 'TEST', mode, includeMatchMode: 'or', replayMode: 'all', count: 'all' }, questions, timeLimitMinutes)
      const wrapper = mount(QuizSessionView, { global: { plugins: [pinia, router] } })
      expect(wrapper.findComponent({ name: 'TimerBar' }).exists()).toBe(timerShown)
    },
  )

  it('disables the previous button on the first question', () => {
    store.startSession('TEST', { certCode: 'TEST', mode: 'preparation', includeMatchMode: 'or', replayMode: 'all', count: 'all' }, questions, undefined)
    const wrapper = mount(QuizSessionView, { global: { plugins: [pinia, router] } })
    const buttons = wrapper.findAll('button')
    expect(buttons[0].attributes('disabled')).toBeDefined()
  })

  it('advances to the next question and shows finish on the last one', async () => {
    store.startSession('TEST', { certCode: 'TEST', mode: 'preparation', includeMatchMode: 'or', replayMode: 'all', count: 'all' }, questions, undefined)
    const wrapper = mount(QuizSessionView, { global: { plugins: [pinia, router] } })
    await wrapper.find('input').setValue(true)
    await wrapper.findAll('button')[1].trigger('click')
    await wrapper.findAll('button')[3].trigger('click')
    expect(wrapper.text()).toContain('Question 2 of 3')
    await wrapper.find('input').setValue(true)
    await wrapper.findAll('button')[1].trigger('click')
    await wrapper.findAll('button')[3].trigger('click')
    expect(wrapper.text()).toContain('Finish quiz')
  })

  it('toggles the flag', async () => {
    store.startSession('TEST', { certCode: 'TEST', mode: 'preparation', includeMatchMode: 'or', replayMode: 'all', count: 'all' }, questions, undefined)
    const wrapper = mount(QuizSessionView, { global: { plugins: [pinia, router] } })
    await wrapper.findAll('button')[2].trigger('click')
    expect(store.currentSession?.flags).toEqual(['q1'])
  })

  it('reveals feedback only after submitting in preparation mode', async () => {
    store.startSession('TEST', { certCode: 'TEST', mode: 'preparation', includeMatchMode: 'or', replayMode: 'all', count: 'all' }, questions, undefined)
    const wrapper = mount(QuizSessionView, { global: { plugins: [pinia, router] } })
    await wrapper.find('input').setValue(true)
    expect(wrapper.find('.feedback').exists()).toBe(false)
    await wrapper.findAll('button')[1].trigger('click')
    expect(wrapper.find('.feedback').exists()).toBe(true)
  })

  it('keeps the next button enabled in preparation mode regardless of submission', async () => {
    store.startSession('TEST', { certCode: 'TEST', mode: 'preparation', includeMatchMode: 'or', replayMode: 'all', count: 'all' }, questions, undefined)
    const wrapper = mount(QuizSessionView, { global: { plugins: [pinia, router] } })
    const nextBtn = wrapper.findAll('button')[3]
    expect(nextBtn.attributes('disabled')).toBeUndefined()
    await wrapper.find('input').setValue(true)
    expect(nextBtn.attributes('disabled')).toBeUndefined()
    await wrapper.findAll('button')[1].trigger('click')
    expect(nextBtn.attributes('disabled')).toBeUndefined()
  })

  it('does not reveal feedback in exam mode', async () => {
    store.startSession('TEST', { certCode: 'TEST', mode: 'exam', includeMatchMode: 'or', replayMode: 'all', count: 'all' }, questions, 130)
    const wrapper = mount(QuizSessionView, { global: { plugins: [pinia, router] } })
    await wrapper.find('input').setValue(true)
    expect(wrapper.find('.feedback').exists()).toBe(false)
  })

  it('finishes the session and redirects to review', async () => {
    store.startSession('TEST', { certCode: 'TEST', mode: 'preparation', includeMatchMode: 'or', replayMode: 'all', count: 'all' }, questions, undefined)
    const wrapper = mount(QuizSessionView, { global: { plugins: [pinia, router] } })
    for (let i = 0; i < 3; i++) {
      await wrapper.find('input').setValue(true)
      await wrapper.findAll('button')[1].trigger('click')
      if (i < 2) await wrapper.findAll('button')[3].trigger('click')
    }
    await wrapper.findAll('button')[3].trigger('click')
    expect(store.currentSession?.finished).toBe(true)
    expect(store.currentSession?.result).toBeTruthy()
  })

  it('does not record answers again when finishQuiz is called on an already-finished session', async () => {
    store.startSession('TEST', { certCode: 'TEST', mode: 'preparation', includeMatchMode: 'or', replayMode: 'all', count: 'all' }, questions, undefined)
    const wrapper = mount(QuizSessionView, { global: { plugins: [pinia, router] } })

    for (let i = 0; i < 3; i++) {
      await wrapper.find('input').setValue(true)
      await wrapper.findAll('button')[1].trigger('click')
      if (i < 2) await wrapper.findAll('button')[3].trigger('click')
    }
    await wrapper.findAll('button')[3].trigger('click')
    expect(store.currentSession?.finished).toBe(true)

    const firstAttemptCount = progressStore.byExamCode['TEST']?.q1?.attempts ?? 0
    expect(firstAttemptCount).toBe(1)

    await wrapper.findAll('button')[3].trigger('click')

    expect(progressStore.byExamCode['TEST']?.q1?.attempts).toBe(firstAttemptCount)
  })

  it('gives each finished session a unique history entry id even when startedAt collides', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    for (let attempt = 0; attempt < 2; attempt++) {
      store.startSession('TEST', { certCode: 'TEST', mode: 'preparation', includeMatchMode: 'or', replayMode: 'all', count: 'all' }, questions, undefined)
      const wrapper = mount(QuizSessionView, { global: { plugins: [pinia, router] } })
      for (let i = 0; i < 3; i++) {
        await wrapper.find('input').setValue(true)
        await wrapper.findAll('button')[1].trigger('click')
        if (i < 2) await wrapper.findAll('button')[3].trigger('click')
      }
      await wrapper.findAll('button')[3].trigger('click')
    }

    vi.restoreAllMocks()
    const ids = useQuizHistoryStore().entries.map((e) => e.id)
    expect(new Set(ids).size).toBe(2)
  })
})
