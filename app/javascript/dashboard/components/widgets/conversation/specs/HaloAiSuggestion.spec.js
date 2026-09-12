import {
  findActiveHaloAiSuggestion,
  getHaloAiSuggestionText,
  isHaloAiSuggestionMessage,
} from '../haloAiSuggestion';
import { mount } from '@vue/test-utils';
import HaloAiSuggestion from '../HaloAiSuggestion.vue';

const suggestion = {
  id: 10,
  private: true,
  message_type: 'outgoing',
  content: 'AI回复建议\n\n旧正文',
  content_attributes: {
    halo_ai_suggestion: true,
    halo_ai_suggestion_text: '结构化正文',
  },
};

describe('haloAiSuggestion helpers', () => {
  it('recognizes and reads the structured private suggestion', () => {
    expect(isHaloAiSuggestionMessage(suggestion)).toBe(true);
    expect(getHaloAiSuggestionText(suggestion)).toBe('结构化正文');
    expect(findActiveHaloAiSuggestion([suggestion])).toEqual({
      id: '10',
      text: '结构化正文',
    });
  });

  it('hides the suggestion after a newer customer or human message', () => {
    expect(
      findActiveHaloAiSuggestion([
        suggestion,
        { id: 11, private: false, message_type: 'incoming' },
      ])
    ).toBeNull();
  });

  it('supports old notes by removing only the marker prefix', () => {
    expect(
      getHaloAiSuggestionText({
        content: 'AI回复建议\n\n请检查设备是否已开机。',
        content_attributes: { halo_ai_suggestion: true },
      })
    ).toBe('请检查设备是否已开机。');
  });
});

describe('HaloAiSuggestion editor', () => {
  it('auto-sizes the editable suggestion and disables manual resizing', () => {
    const wrapper = mount(HaloAiSuggestion, {
      props: {
        suggestion: { id: '10', text: '需要检查设备的安装环境。' },
      },
      global: {
        mocks: { $t: key => key },
        stubs: { NextButton: { template: '<button><slot /></button>' } },
      },
    });
    const textarea = wrapper.find('textarea');
    Object.defineProperty(textarea.element, 'scrollHeight', {
      configurable: true,
      value: 184,
    });

    wrapper.vm.resizeDraftTextArea();

    expect(textarea.classes()).toContain('resize-none');
    expect(textarea.classes()).not.toContain('resize-y');
    expect(textarea.element.style.height).toBe('184px');
  });

  it('closes without copying the suggestion into the main reply box', async () => {
    const wrapper = mount(HaloAiSuggestion, {
      props: {
        suggestion: { id: '10', text: '需要检查设备的安装环境。' },
      },
      global: {
        mocks: { $t: key => key },
        stubs: {
          NextButton: {
            name: 'NextButton',
            props: { label: String },
            template:
              '<button :data-label="label" @click="$emit(\'click\')">{{ label }}</button>',
          },
        },
      },
    });

    const closeButton = wrapper
      .findAllComponents({ name: 'NextButton' })
      .find(button => button.props('label') === 'CONVERSATION.HEADER.CLOSE');

    await closeButton.vm.$emit('click');

    expect(wrapper.emitted('dismiss')).toEqual([['10']]);
    expect(wrapper.emitted('apply')).toBeUndefined();
  });
});
