require 'rails_helper'

RSpec.describe 'Halo AI feedback API', type: :request do
  let(:account) { create(:account) }
  let(:conversation) { create(:conversation, account: account) }
  let(:agent) { create(:user, account: account, role: :agent) }
  let(:path) { "/api/v1/accounts/#{account.id}/conversations/#{conversation.display_id}/halo_ai_feedback" }
  let(:run_id) { SecureRandom.uuid }
  let(:suggestion) do
    create(
      :message,
      account: account,
      conversation: conversation,
      inbox: conversation.inbox,
      sender: agent,
      private: true,
      message_type: 'outgoing',
      content_attributes: {
        'halo_ai_suggestion' => true,
        'cs_engine_run_id' => run_id,
      }
    )
  end

  before do
    create(:inbox_member, inbox: conversation.inbox, user: agent)
  end

  it 'rejects an unauthenticated request' do
    post path, params: { suggestion_id: suggestion.id, run_id: run_id, rating: 'helpful' }, as: :json

    expect(response).to have_http_status(:unauthorized)
  end

  it 'rejects a message that is not a private Halo suggestion' do
    public_message = create(:message, account: account, conversation: conversation, inbox: conversation.inbox, private: false)
    allow(Halo::AiFeedbackService).to receive(:submit)

    post path,
         params: { suggestion_id: public_message.id, run_id: run_id, rating: 'helpful' },
         headers: agent.create_new_auth_token,
         as: :json

    expect(response).to have_http_status(:unprocessable_entity)
    expect(Halo::AiFeedbackService).not_to have_received(:submit)
  end

  it 'forwards the authenticated agent identity and exact suggestion target' do
    allow(Halo::AiFeedbackService).to receive(:submit).and_return('recordedAt' => '2026-09-15T13:00:00Z')

    post path,
         params: { suggestion_id: suggestion.id, run_id: run_id, rating: 'needs_edit' },
         headers: agent.create_new_auth_token,
         as: :json

    expect(response).to have_http_status(:accepted)
    expect(Halo::AiFeedbackService).to have_received(:submit).with(
      hash_including(
        runId: run_id,
        targetId: suggestion.id.to_s,
        actorRef: agent.id.to_s,
        rating: 'needs_edit'
      )
    )
  end
end
