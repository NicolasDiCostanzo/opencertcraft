import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TimerPicker from './TimerPicker.vue'

function mountPicker(enabled = true, minutes = 30) {
  return mount(TimerPicker, { props: { enabled, minutes } })
}

describe('TimerPicker', () => {
  it('hides the minutes input until the timer is enabled', () => {
    expect(mountPicker(false).find('.timer-input').exists()).toBe(false)
    expect(mountPicker(true).find('.timer-input').exists()).toBe(true)
  })

  it('emits the new enabled state when the checkbox is toggled', async () => {
    const wrapper = mountPicker(false)

    await wrapper.find('input[type="checkbox"]').setValue(true)

    expect(wrapper.emitted('update:enabled')![0]).toEqual([true])
  })

  it.each([
    ['45', 45],
    ['0', 1],
    ['-5', 1],
    ['', 1],
    ['12.7', 12],
    ['9999', 9999],
    ['10000', 9999],
  ])('typing "%s" minutes emits %i', async (typed, expected) => {
    const wrapper = mountPicker()
    const input = wrapper.find('.timer-input')
      ; (input.element as HTMLInputElement).value = typed

    await input.trigger('change')

    expect(wrapper.emitted('update:minutes')![0]).toEqual([expected])
  })
})
