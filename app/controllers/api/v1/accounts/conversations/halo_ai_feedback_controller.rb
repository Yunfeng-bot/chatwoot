class Api::V1::Accounts::Conversations::HaloAiFeedbackController < Api::V1::Accounts::Conversations::BaseController
  ALLOWED_RATINGS = %w[helpful needs_edit irrelevant].freeze

  def create
    suggestion_id = params[:suggestion_id].to_s
    run_id = params[:run_id].to_s
    rating = params[:rating].presence
    suggestion = @conversation.messages.find_by(id: suggestion_id)
    attributes = suggestion&.content_attributes || {}
    stored_run_id = attributes['cs_engine_run_id'] || attributes[:cs_engine_run_id]
    unless suggestion&.private? && attributes['halo_ai_suggestion'] == true && stored_run_id.present? && stored_run_id.to_s == run_id && (rating.nil? || ALLOWED_RATINGS.include?(rating))
      return render json: { error: 'invalid_feedback_target' }, status: :unprocessable_entity
    end

    event = {
      sourceProject: 'halo', sourceAdapter: 'chatwoot', conversationId: @conversation.display_id.to_s,
      runId: run_id, targetType: 'suggestion', targetId: suggestion.id.to_s,
      actorType: 'agent', actorRef: Current.user.id.to_s, source: 'chatwoot',
      eventType: 'suggestion_dismissed',
      clientRequestId: "chatwoot:#{Current.user.id}:#{@conversation.id}:#{suggestion.id}:#{rating}",
    }
    event[:rating] = rating if rating.present?
    result = Halo::AiFeedbackService.submit(event)
    render json: { accepted: true, feedback: result }, status: :accepted
  rescue Halo::AiFeedbackService::ConfigurationError
    render json: { accepted: false, error: 'feedback_not_configured' }, status: :service_unavailable
  rescue Halo::AiFeedbackService::DeliveryError
    render json: { accepted: false, error: 'feedback_unavailable' }, status: :service_unavailable
  end
end
