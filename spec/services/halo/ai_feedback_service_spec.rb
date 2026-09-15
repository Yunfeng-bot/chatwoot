require 'rails_helper'

RSpec.describe Halo::AiFeedbackService do
  let(:event) do
    {
      sourceProject: 'halo',
      sourceAdapter: 'chatwoot',
      conversationId: '42',
      runId: 'run-1',
      targetType: 'suggestion',
      targetId: '701',
      actorType: 'agent',
      actorRef: '7',
      source: 'chatwoot',
      eventType: 'suggestion_dismissed',
      rating: 'helpful',
      clientRequestId: 'chatwoot:7:42:701:helpful',
    }
  end

  before do
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with('HALO_ENGINE_URL').and_return('https://engine.example.test')
    allow(ENV).to receive(:[]).with('HALO_ENGINE_TOKEN').and_return('engine-token')
    allow(ENV).to receive(:[]).with('HALO_ENGINE_WORKSPACE_ID').and_return('org-1')
  end

  it 'forwards a scoped feedback event to Engine' do
    request = stub_request(:post, 'https://engine.example.test/v1/customer-service/feedback')
      .with(
        headers: { 'Authorization' => 'Bearer engine-token', 'Content-Type' => 'application/json' },
      )
      .to_return(status: 200, body: { recordedAt: '2026-09-15T13:00:00Z' }.to_json)

    expect(described_class.submit(event)).to include('recordedAt' => '2026-09-15T13:00:00Z')
    expect(request).to have_been_requested.once
    expect(WebMock).to have_requested(:post, 'https://engine.example.test/v1/customer-service/feedback')
      .with { |request| JSON.parse(request.body).fetch('workspaceId') == 'org-1' }
  end

  it 'fails closed when Engine configuration is incomplete' do
    allow(ENV).to receive(:[]).with('HALO_ENGINE_TOKEN').and_return('')

    expect { described_class.submit(event) }.to raise_error(described_class::ConfigurationError)
  end

  it 'surfaces Engine failure without converting it to success' do
    stub_request(:post, 'https://engine.example.test/v1/customer-service/feedback')
      .to_return(status: 503, body: { error: 'unavailable' }.to_json)

    expect { described_class.submit(event) }.to raise_error(described_class::DeliveryError)
  end
end
