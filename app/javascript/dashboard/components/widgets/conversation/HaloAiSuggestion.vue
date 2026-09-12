<script>
import NextButton from 'dashboard/components-next/button/Button.vue';

export default {
  name: 'HaloAiSuggestion',
  components: { NextButton },
  props: {
    suggestion: {
      type: Object,
      required: true,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    isSending: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['apply', 'send', 'dismiss'],
  data() {
    return {
      draftText: this.suggestion.text,
    };
  },
  computed: {
    canSend() {
      return !this.disabled && !this.isSending && !!this.draftText.trim();
    },
  },
  watch: {
    'suggestion.id': {
      immediate: true,
      handler() {
        this.draftText = this.suggestion.text;
        this.$nextTick(() => this.resizeDraftTextArea());
      },
    },
    draftText() {
      this.$nextTick(() => this.resizeDraftTextArea());
    },
  },
  mounted() {
    this.resizeDraftTextArea();
  },
  methods: {
    resizeDraftTextArea() {
      const textarea = this.$refs.draftText;
      if (!textarea) return;

      const minHeight = 96;
      const maxHeight = 320;
      textarea.style.height = 'auto';
      const contentHeight = textarea.scrollHeight || minHeight;
      textarea.style.height = `${Math.min(
        Math.max(contentHeight, minHeight),
        maxHeight
      )}px`;
    },
    applySuggestion() {
      const text = this.draftText.trim();
      if (text) this.$emit('apply', text);
    },
    sendSuggestion() {
      const text = this.draftText.trim();
      if (text && this.canSend) {
        this.$emit('send', {
          text,
          suggestionId: this.suggestion.id,
          originalText: this.suggestion.text,
        });
      }
    },
  },
};
</script>

<template>
  <section
    class="mx-3 mb-2 rounded-lg border border-n-blue-7 bg-n-blue-1 p-3"
    data-testid="halo-ai-suggestion"
  >
    <div class="mb-2 flex items-center justify-between gap-2">
      <div class="flex min-w-0 items-center gap-2">
        <span class="text-sm font-semibold text-n-blue-11">
          {{ $t('CONVERSATION.REPLYBOX.HALO_AI.TITLE') }}
        </span>
        <span class="text-xs text-n-slate-11">
          {{ $t('CONVERSATION.REPLYBOX.HALO_AI.PRIVATE_NOTICE') }}
        </span>
      </div>
      <NextButton
        ghost
        slate
        xs
        icon="i-lucide-x"
        :aria-label="$t('CONVERSATION.REPLYBOX.HALO_AI.DISMISS')"
        :title="$t('CONVERSATION.REPLYBOX.HALO_AI.DISMISS')"
        @click="$emit('dismiss', suggestion.id)"
      />
    </div>

    <textarea
      ref="draftText"
      v-model="draftText"
      rows="1"
      class="min-h-24 max-h-80 w-full resize-none overflow-y-auto rounded-md border border-n-weak bg-n-surface-1 p-2 text-sm text-n-slate-12 outline-none focus:border-n-brand"
      :aria-label="$t('CONVERSATION.REPLYBOX.HALO_AI.EDITOR_LABEL')"
      :disabled="disabled || isSending"
      :maxlength="4000"
      @input="resizeDraftTextArea"
    />

    <div class="mt-2 flex items-center justify-end gap-2">
      <NextButton
        faded
        slate
        sm
        :disabled="disabled || isSending || !draftText.trim()"
        :label="$t('CONVERSATION.REPLYBOX.HALO_AI.APPLY')"
        @click="applySuggestion"
      />
      <NextButton
        solid
        blue
        sm
        :is-loading="isSending"
        :disabled="!canSend"
        :label="$t('CONVERSATION.REPLYBOX.HALO_AI.SEND')"
        @click="sendSuggestion"
      />
    </div>
  </section>
</template>
