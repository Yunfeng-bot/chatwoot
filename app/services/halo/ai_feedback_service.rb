require 'httparty'

module Halo
  class AiFeedbackService
    class ConfigurationError < StandardError; end
    class DeliveryError < StandardError; end

    def self.submit(event)
      base_url = ENV['HALO_ENGINE_URL'].to_s.strip
      token = ENV['HALO_ENGINE_TOKEN'].to_s
      workspace_id = ENV['HALO_ENGINE_WORKSPACE_ID'].to_s.strip
      raise ConfigurationError if base_url.empty? || token.empty? || workspace_id.empty?

      uri = URI.join("#{base_url.chomp('/')}/", 'v1/customer-service/feedback')
      response = HTTParty.post(uri.to_s,
                               headers: { 'Authorization' => "Bearer #{token}", 'Content-Type' => 'application/json' },
                               body: event.merge(workspaceId: workspace_id).to_json,
                               timeout: 5)
      raise DeliveryError unless response.success?

      JSON.parse(response.body)
    rescue URI::InvalidURIError, JSON::ParserError
      raise ConfigurationError
    rescue Net::OpenTimeout, Net::ReadTimeout, SocketError, Errno::ECONNREFUSED
      raise DeliveryError
    end
  end
end
