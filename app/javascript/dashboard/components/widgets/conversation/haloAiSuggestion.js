export const HALO_AI_MESSAGE_TYPES = [
  'incoming',
  'outgoing',
  'template',
  0,
  1,
  3,
];

export const isHaloAiSuggestionMessage = message =>
  message?.content_attributes?.halo_ai_suggestion === true;

export const isNewerHaloAiConversationActivity = message => {
  if (isHaloAiSuggestionMessage(message)) return false;
  if (message?.private === true) {
    return HALO_AI_MESSAGE_TYPES.includes(message.message_type);
  }
  return HALO_AI_MESSAGE_TYPES.includes(message?.message_type);
};

export const getHaloAiSuggestionText = message => {
  const attributes = message?.content_attributes || {};
  if (typeof attributes.halo_ai_suggestion_text === 'string') {
    return attributes.halo_ai_suggestion_text.trim();
  }

  return String(message?.content || '')
    .replace(/^AI回复建议\s*\n\s*/u, '')
    .trim();
};

export const findActiveHaloAiSuggestion = (
  messages = [],
  dismissedSuggestionId = null
) => {
  let suggestionIndex = -1;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (isHaloAiSuggestionMessage(messages[index])) {
      suggestionIndex = index;
      break;
    }
  }
  if (suggestionIndex < 0) return null;

  const message = messages[suggestionIndex];
  const suggestionId = String(message.id);
  if (dismissedSuggestionId === suggestionId) return null;
  if (
    messages.slice(suggestionIndex + 1).some(isNewerHaloAiConversationActivity)
  ) {
    return null;
  }

  const text = getHaloAiSuggestionText(message);
  return text ? { id: suggestionId, text } : null;
};
