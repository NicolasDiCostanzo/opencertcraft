import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { texts } from '../../texts/en'
import ChoiceGroup from './ChoiceGroup.vue'

describe('ChoiceGroup', () => {
  const options = [
    { value: 'a' as const, label: 'Option A' },
    { value: 'b' as const, label: 'Option B' },
  ]

  function mountGroup(modelValue: 'a' | 'b' = 'a') {
    return mount(ChoiceGroup, {
      props: { name: 'test-group', label: texts.modeLabel, options, modelValue },
    })
  }

  it('reflects the checked state of each option', () => {
    const wrapper = mountGroup()
    const radios = wrapper.findAll('input[type="radio"]')

    expect((radios[0].element as HTMLInputElement).checked).toBe(true)
    expect((radios[1].element as HTMLInputElement).checked).toBe(false)
  })

  it('emits the picked option value', async () => {
    const wrapper = mountGroup()

    await wrapper.findAll('input[type="radio"]')[1].setValue(true)

    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['b'])
  })

  it('emits nothing when the already-selected option is clicked', async () => {
    const wrapper = mountGroup()

    await wrapper.findAll('input[type="radio"]')[0].setValue(true)

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('disables the radio of a disabled option', () => {
    const wrapper = mount(ChoiceGroup, {
      props: {
        name: 'test-group',
        label: texts.modeLabel,
        options: [options[0], { ...options[1], disabled: true }],
        modelValue: 'a' as const,
      },
    })
    const radios = wrapper.findAll('input[type="radio"]')

    expect(radios[0].attributes('disabled')).toBeUndefined()
    expect(radios[1].attributes('disabled')).toBeDefined()
  })
})
