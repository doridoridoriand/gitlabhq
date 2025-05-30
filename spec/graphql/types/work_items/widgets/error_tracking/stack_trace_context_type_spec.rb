# frozen_string_literal: true

require 'spec_helper'

RSpec.describe Types::WorkItems::Widgets::ErrorTracking::StackTraceContextType, feature_category: :team_planning do
  it 'exposes the expected fields' do
    expected_fields = %i[line_number line]

    expect(described_class).to have_graphql_fields(*expected_fields)
  end
end
