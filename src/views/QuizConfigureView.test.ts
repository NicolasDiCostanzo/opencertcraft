import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { router } from '../router'
import { useQuizSessionStore } from '../stores/quizSession'
import { useUserAccountStore } from '../stores/userAccount'
import { useUserProgressStore } from '../stores/userProgress'
import { texts } from '../texts/en'

vi.mock('../composables/useQuizLoader', async () => {
  const { validCertBundle, secondCertBundle } = await import('../utils/fixtures/certBundle.fixture')
  return {
    useQuizLoader: () => ({
      availableCerts: [validCertBundle, secondCertBundle],
      certLoadIssues: {},
      ensureCertLoaded: async () => true,
      getCert: (code: string) =>
        code === 'FIX-001' ? validCertBundle : code === 'SECOND' ? secondCertBundle : undefined,
      activePool: (code: string) =>
        code === 'FIX-001' ? validCertBundle.questions : code === 'SECOND' ? secondCertBundle.questions : [],
    }),
  }
})

import QuizConfigureView from './QuizConfigureView.vue'

const mountView = async (
  seedProgress?: (store: ReturnType<typeof useUserProgressStore>) => void,
) => {
  await router.push('/certs/FIX-001/configure')
  await router.isReady()
  const pinia = createPinia()
  setActivePinia(pinia)
  if (seedProgress) seedProgress(useUserProgressStore())
  wrapper = mount(QuizConfigureView, { global: { plugins: [router, pinia] } })
  return wrapper
}

beforeEach(async () => {
  setActivePinia(createPinia())
  useUserAccountStore().accountMode = 'local'
  await router.push('/')
})

let wrapper!: ReturnType<typeof mount>

beforeEach(async () => {
  wrapper = await mountView()
})

afterEach(() => { wrapper?.unmount() })

describe('QuizConfigureView', () => {
  it('selects the match mode once two groups have selections', async () => {
    const includeCheckboxes = wrapper.find('.include-section').findAll('input[type="checkbox"]')

    await includeCheckboxes[0].setValue(true)
    await includeCheckboxes[2].setValue(true)

    const pills = wrapper.findAll('.include-section .match-row input[type="radio"]')
    expect((pills[1].element as HTMLInputElement).checked).toBe(true)
    expect((pills[0].element as HTMLInputElement).checked).toBe(false)

    await pills[0].setValue(true)

    expect((pills[0].element as HTMLInputElement).checked).toBe(true)
    expect((pills[1].element as HTMLInputElement).checked).toBe(false)
  })

  it('previews the matching question count', async () => {
    expect(wrapper.find('.match-preview').text()).toContain('2 questions match your filters')
  })

  it('updates the preview from a theme include checkbox', async () => {    const include = wrapper.find('.include-section')
    const lambdaCheckbox = include.findAll('input[type="checkbox"]')[0]

    await lambdaCheckbox.setValue(true)
    expect(wrapper.find('.match-preview').text()).toContain('1 question match')

    const s3Checkbox = include.findAll('input[type="checkbox"]')[1]
    await s3Checkbox.setValue(true)
    expect(wrapper.find('.match-preview').text()).toContain('1 question match')

    const servicesGroup = include.findAll('.filter-group')[0]
    const matchAllRadio = servicesGroup.findAll('input[type="radio"]')[1]
    await matchAllRadio.setValue(true)
    expect(wrapper.find('.match-preview').text()).toContain('No question matches')
  })

  it('disables exclude checkboxes for values selected in include', async () => {
    await wrapper.find('.include-section').findAll('input[type="checkbox"]')[0].setValue(true)

    const excludeCheckboxes = wrapper.find('.exclude-section').findAll('input[type="checkbox"]')
    expect(excludeCheckboxes[0].attributes('disabled')).toBeDefined()
    expect(excludeCheckboxes[1].attributes('disabled')).toBeUndefined()
  })

  it('keeps the filter questions card folded by default', async () => {    const filters = wrapper.find('details.filters-card')

    expect(filters.exists()).toBe(true)
    expect(filters.attributes('open')).toBeUndefined()
    expect(filters.find('summary').text()).toBe(texts.filterQuestionsLabel)
  })

  it('ticks the topics All option by default and unticks it when a topic is picked', async () => {    const topics = wrapper.find('.topics-section')
    const checkboxes = topics.findAll('input[type="checkbox"]')

    expect(checkboxes).toHaveLength(3)
    expect((checkboxes[0].element as HTMLInputElement).checked).toBe(true)

    await checkboxes[1].setValue(true)

    expect((topics.findAll('input[type="checkbox"]')[0].element as HTMLInputElement).checked).toBe(false)
    expect(wrapper.find('.match-preview').text()).toContain('1 question match')
  })

  it('re-ticks All when every picked topic is removed', async () => {    const topics = wrapper.find('.topics-section')
    const checkboxes = topics.findAll('input[type="checkbox"]')

    await checkboxes[1].setValue(true)
    await topics.findAll('input[type="checkbox"]')[1].setValue(false)

    expect((topics.findAll('input[type="checkbox"]')[0].element as HTMLInputElement).checked).toBe(true)
    expect(wrapper.find('.match-preview').text()).toContain('2 questions match')
  })

  it('applies topic filters to the preview', async () => {
    await wrapper.find('.topics-section input[type="checkbox"]').setValue(true)
    await wrapper.findAll('.topics-section input[type="checkbox"]')[1].setValue(true)

    expect(wrapper.find('.match-preview').text()).toContain('1 question match')
  })

  it.each([
    { mode: 'wrong', expected: 'No question matches' },
    { mode: 'flagged', expected: 'No question matches' },
    { mode: 'unattempted', expected: '2 questions match' },
  ] as { mode: string; expected: string }[])('replay mode $mode previews $expected', async ({ mode, expected }) => {    const radios = wrapper.findAll('input[name="replay-mode"]')
    const index = ['all', 'wrong', 'flagged', 'unattempted'].indexOf(mode)

    await radios[index].setValue(true)

    expect(wrapper.find('.match-preview').text()).toContain(expected)
  })

  it('applies stored progress to the replay preview', async () => {
    const progressStore = useUserProgressStore()
    progressStore.recordAnswer('FIX-001', 'q1', false)
    progressStore.toggleFlag('FIX-001', 'q2')
    await wrapper.vm.$nextTick()
    const radios = wrapper.findAll('input[name="replay-mode"]')

    await radios[1].setValue(true)
    expect(wrapper.find('.match-preview').text()).toContain('1 question match')

    await radios[2].setValue(true)
    expect(wrapper.find('.match-preview').text()).toContain('1 question match')

    await radios[3].setValue(true)
    expect(wrapper.find('.match-preview').text()).toContain('1 question match')
  })

  it('rebuilds the filter groups and clears selections when the certificate changes', async () => {
    await wrapper.find('.include-section').findAll('input[type="checkbox"]')[0].setValue(true)
    await router.push('/certs/SECOND/configure')
    await wrapper.vm.$nextTick()

    const headings = wrapper
      .find('.include-section')
      .findAll('.group-label')
      .map((heading) => heading.text())
    expect(headings).toEqual(['levels'])
    expect(wrapper.find('.match-preview').text()).toContain('1 question match')
  })

  it('resets the question count to the new certification total when the certificate changes', async () => {
    const countInput = wrapper.find('input.count-input[type="number"]')
    expect(countInput.element.getAttribute('value')).toBe('2')

    await countInput.setValue(1)
    expect(countInput.element.getAttribute('value')).toBe('1')

    await router.push('/certs/SECOND/configure')
    await wrapper.vm.$nextTick()

    const newCountInput = wrapper.find('input.count-input[type="number"]')
    expect(newCountInput.element.getAttribute('value')).toBe('1')
  })

  it('enables the start CTA once questions match the filters', async () => {
    expect(wrapper.find('.btn--primary').attributes('disabled')).toBeUndefined()
  })

  it('disables the start CTA when no question matches the filters', async () => {
    await wrapper.find('.include-section').findAll('input[type="checkbox"]')[0].setValue(true)
    await wrapper.find('.include-section').findAll('input[type="checkbox"]')[1].setValue(true)
    const matchAllRadio = wrapper.find('.include-section').findAll('.filter-group')[0].findAll('input[type="radio"]')[1]
    await matchAllRadio.setValue(true)

    expect(wrapper.find('.match-preview').text()).toContain('No question matches')
    expect(wrapper.find('.btn--primary').attributes('disabled')).toBeDefined()
  })

  it('starts a session when the CTA is clicked', async () => {
    const quizSessionStore = useQuizSessionStore()

    await wrapper.find('.btn--primary').trigger('click')

    expect(quizSessionStore.hasSession).toBe(true)
    expect(quizSessionStore.currentSession?.certCode).toBe('FIX-001')
    expect(quizSessionStore.currentSession?.questions.length).toBeGreaterThan(0)
    expect(quizSessionStore.currentSession?.mode).toBe('preparation')
  })

  it('seeds session flags from the persisted progress store', async () => {
    const progressStore = useUserProgressStore()
    progressStore.toggleFlag('FIX-001', 'q1')

    const quizSessionStore = useQuizSessionStore()
    await wrapper.find('.btn--primary').trigger('click')

    expect(quizSessionStore.currentSession?.flags).toContain('q1')
  })

  it('offers only the replay modes that can fill the exam when Exam is selected', async () => {
    await wrapper.findAll('input[name="quiz-mode"]')[1].setValue(true)

    const enabled = wrapper
      .findAll('input[name="replay-mode"]')
      .map((radio) => radio.attributes('disabled') === undefined)
    expect(enabled).toEqual([true, false, false, true])
  })

  it('starts the exam with the real time limit', async () => {
    await wrapper.findAll('input[name="quiz-mode"]')[1].setValue(true)
    await wrapper.find('.btn--primary').trigger('click')

    const session = useQuizSessionStore().currentSession!
    expect(session.mode).toBe('exam')
    expect(session.deadlineAt! - session.startedAt).toBe(60 * 60_000)
  })

  it('starts a preparation quiz without a deadline by default', async () => {
    await wrapper.find('.btn--primary').trigger('click')

    expect(useQuizSessionStore().currentSession?.deadlineAt).toBeUndefined()
  })

  it('starts a preparation quiz with the chosen timer', async () => {
    await wrapper.find('.timer-picker input[type="checkbox"]').setValue(true)
    const minutes = wrapper.find('.timer-input')
    ;(minutes.element as HTMLInputElement).value = '5'
    await minutes.trigger('change')
    await wrapper.find('.btn--primary').trigger('click')

    const session = useQuizSessionStore().currentSession!
    expect(session.deadlineAt! - session.startedAt).toBe(5 * 60_000)
  })

  it('does not offer the timer in exam mode', async () => {
    await wrapper.findAll('input[name="quiz-mode"]')[1].setValue(true)

    expect(wrapper.find('.timer-picker').exists()).toBe(false)
  })
})
