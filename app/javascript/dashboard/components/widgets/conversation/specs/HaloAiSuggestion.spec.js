import {
  findActiveHaloAiSuggestion,
  getHaloAiSuggestionText,
  isHaloAiSuggestionMessage,
} from '../haloAiSuggestion';

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
