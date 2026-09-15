import {
  findActiveHaloAiSuggestion,
  findLatestHaloAiSuggestion,
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

  it('keeps the Engine run id separate from the Chatwoot note id', () => {
    expect(
      findActiveHaloAiSuggestion([
        {
          ...suggestion,
          content_attributes: {
            ...suggestion.content_attributes,
            cs_engine_run_id: 'run-10',
          },
        },
      ])
    ).toEqual({ id: '10', text: '结构化正文', runId: 'run-10' });
  });

  it('hides the suggestion after a newer customer or human message', () => {
    expect(
      findLatestHaloAiSuggestion([
        suggestion,
        { id: 11, private: false, message_type: 'incoming' },
      ])
    ).toEqual({ id: '10', text: '结构化正文', stale: true });
    expect(
      findActiveHaloAiSuggestion([
        suggestion,
        { id: 11, private: false, message_type: 'incoming' },
      ])
    ).toBeNull();
  });

  it('keeps an edited draft visible but prevents sending after it becomes stale', async () => {
    const wrapper = mount(HaloAiSuggestion, {
      props: {
        suggestion: { id: '10', text: '旧建议' },
        stale: true,
      },
      global: {
        mocks: { $t: key => key },
        stubs: { NextButton: { template: '<button><slot /></button>' } },
      },
    });
    await wrapper.find('textarea').setValue('客服正在修改的草稿');
    expect(wrapper.emitted('updateText')).toEqual([
      [{ suggestionId: '10', text: '客服正在修改的草稿' }],
    ]);
    expect(wrapper.vm.canSend).toBe(false);
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
        suggestion: {
          id: '10',
          text: '需要检查设备的安装环境。',
          runId: 'run-10',
        },
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

    expect(wrapper.find('[data-testid="halo-ai-feedback"]').exists()).toBe(
      true
    );
    expect(wrapper.emitted('dismiss')).toBeUndefined();
    expect(wrapper.emitted('apply')).toBeUndefined();
  });

  it('records a skipped rating before dismissing the suggestion', async () => {
    const wrapper = mount(HaloAiSuggestion, {
      props: {
        suggestion: { id: '10', text: '需要检查设备。', runId: 'run-10' },
      },
      global: {
        mocks: { $t: key => key },
        stubs: { NextButton: { template: '<button><slot /></button>' } },
      },
    });

    wrapper.vm.skipFeedback();

    expect(wrapper.emitted('feedback')).toEqual([
      [{ suggestionId: '10', runId: 'run-10' }],
    ]);
    expect(wrapper.emitted('dismiss')).toEqual([['10']]);
  });
});
