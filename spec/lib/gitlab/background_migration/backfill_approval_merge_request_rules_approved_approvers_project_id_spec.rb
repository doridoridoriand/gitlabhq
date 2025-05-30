# frozen_string_literal: true

require 'spec_helper'

RSpec.describe Gitlab::BackgroundMigration::BackfillApprovalMergeRequestRulesApprovedApproversProjectId,
  feature_category: :code_review_workflow,
  schema: 20250304131257 do
  include_examples 'desired sharding key backfill job' do
    let(:batch_table) { :approval_merge_request_rules_approved_approvers }
    let(:backfill_column) { :project_id }
    let(:backfill_via_table) { :approval_merge_request_rules }
    let(:backfill_via_column) { :project_id }
    let(:backfill_via_foreign_key) { :approval_merge_request_rule_id }
  end
end
