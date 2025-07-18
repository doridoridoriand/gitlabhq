<script>
import { GlLink, GlSprintf, GlIcon, GlTooltipDirective, GlLabel } from '@gitlab/ui';
import ApprovalCount from 'ee_else_ce/merge_requests/components/approval_count.vue';
import { __, n__, sprintf } from '~/locale';
import isShowingLabelsQuery from '~/graphql_shared/client/is_showing_labels.query.graphql';
import { getIdFromGraphQLId } from '~/graphql_shared/utils';
import SafeHtml from '~/vue_shared/directives/safe_html';
import TimeAgoTooltip from '~/vue_shared/components/time_ago_tooltip.vue';
import CiIcon from '~/vue_shared/components/ci_icon/ci_icon.vue';
import UserAvatarImage from '~/vue_shared/components/user_avatar/user_avatar_image.vue';
import DiscussionsBadge from '~/merge_requests/list/components/discussions_badge.vue';
import { isScopedLabel } from '~/lib/utils/common_utils';
import AssignedUsers from './assigned_users.vue';
import StatusBadge from './status_badge.vue';

export default {
  apollo: {
    isShowingLabels: {
      query: isShowingLabelsQuery,
      update: (data) => data.isShowingLabels,
    },
  },
  components: {
    GlLink,
    GlSprintf,
    GlIcon,
    GlLabel,
    UserAvatarImage,
    CiIcon,
    TimeAgoTooltip,
    ApprovalCount,
    DiscussionsBadge,
    AssignedUsers,
    StatusBadge,
  },
  directives: {
    SafeHtml,
    GlTooltip: GlTooltipDirective,
  },
  props: {
    mergeRequest: {
      type: Object,
      required: true,
    },
    listId: {
      type: String,
      required: true,
    },
    newMergeRequestIds: {
      type: Array,
      required: false,
      default: () => [],
    },
  },
  data() {
    return {
      isShowingLabels: null,
    };
  },
  computed: {
    statsAriaLabel() {
      const fileAdditions = n__(
        '%d file addition',
        '%d file additions',
        this.mergeRequest.diffStatsSummary.additions,
      );
      const fileDeletions = n__(
        '%d file deletion',
        '%d file deletions',
        this.mergeRequest.diffStatsSummary.deletions,
      );

      return sprintf(__('%{filesChanged}, %{fileAdditions}, %{fileDeletions}'), {
        filesChanged: n__('%d file', '%d files', this.mergeRequest.diffStatsSummary.fileCount),
        fileAdditions,
        fileDeletions,
      });
    },
    isMergeRequestBroken() {
      return (
        this.mergeRequest.state === 'opened' &&
        (this.mergeRequest.commitCount === 0 ||
          !this.mergeRequest.sourceBranchExists ||
          !this.mergeRequest.targetBranchExists ||
          this.mergeRequest.conflicts)
      );
    },
    isNewlyAdded() {
      return this.newMergeRequestIds.includes(this.mergeRequest.id);
    },
    authorId() {
      return getIdFromGraphQLId(this.mergeRequest.author.id);
    },
  },
  methods: {
    isScopedLabel,
  },
};
</script>

<template>
  <div :class="{ 'gl-bg-green-50': isNewlyAdded }" role="row">
    <div role="cell">
      <status-badge :merge-request="mergeRequest" :list-id="listId" />
    </div>
    <div role="cell" class="gl-flex gl-flex-col gl-items-start gl-gap-2">
      <gl-link
        :href="mergeRequest.webUrl"
        class="gl-font-bold gl-text-default hover:gl-text-default"
      >
        {{ mergeRequest.title }}
      </gl-link>
      <div class="gl-text-sm gl-text-subtle">
        <gl-sprintf :message="__('%{reference} %{author} %{stats} %{milestone}')">
          <template #reference>{{ mergeRequest.reference }}</template>
          <template #author>
            <gl-link
              :href="mergeRequest.author.webUrl"
              :data-name="mergeRequest.author.name"
              :data-user-id="authorId"
              :data-username="mergeRequest.author.username"
              class="js-user-link gl-mx-2 gl-inline-flex gl-align-bottom gl-text-subtle"
            >
              <user-avatar-image
                :img-src="mergeRequest.author.avatarUrl"
                img-alt=""
                :size="16"
                lazy
              />
              <span class="gl-sr-only">{{ mergeRequest.author.name }}</span>
            </gl-link>
          </template>
          <template #milestone>
            <template v-if="mergeRequest.milestone">
              <gl-icon :size="16" name="milestone" />
              {{ mergeRequest.milestone.title }}
            </template>
          </template>
          <template #stats>
            <div
              v-if="mergeRequest.diffStatsSummary.fileCount"
              class="gl-mr-2 gl-inline-flex gl-gap-2"
              :aria-label="statsAriaLabel"
              :title="statsAriaLabel"
            >
              <div class="gl-whitespace-nowrap">
                <gl-icon name="doc-new" />
                <span>{{ mergeRequest.diffStatsSummary.fileCount }}</span>
              </div>
              <div class="gl-flex gl-items-center gl-text-success">
                <span>+</span>
                <span>{{ mergeRequest.diffStatsSummary.additions }}</span>
              </div>
              <div class="gl-flex gl-items-center gl-text-danger">
                <span>−</span>
                <span>{{ mergeRequest.diffStatsSummary.deletions }}</span>
              </div>
            </div>
          </template>
        </gl-sprintf>
      </div>
      <div
        v-if="isShowingLabels && mergeRequest.labels.nodes.length"
        class="gl-mt-3 gl-flex gl-flex-wrap gl-gap-2"
        data-testid="labels-container"
      >
        <gl-label
          v-for="label in mergeRequest.labels.nodes"
          :key="label.id"
          :background-color="label.color"
          :title="label.title"
          :description="label.description"
          size="sm"
          :scoped="isScopedLabel(label)"
        />
      </div>
    </div>
    <div role="cell">
      <assigned-users :users="mergeRequest.assignees.nodes" type="ASSIGNEES" />
    </div>
    <div role="cell">
      <assigned-users :users="mergeRequest.reviewers.nodes" type="REVIEWERS" />
    </div>
    <div class="gl-flex gl-flex-col gl-items-end gl-gap-2" role="cell">
      <div class="gl-flex gl-gap-3">
        <gl-icon
          v-if="isMergeRequestBroken"
          v-gl-tooltip
          :title="__('Cannot be merged automatically')"
          name="warning-solid"
          variant="subtle"
          class="gl-mt-1"
          data-testid="mr-broken-badge"
        />
        <discussions-badge
          v-if="mergeRequest.resolvableDiscussionsCount"
          :merge-request="mergeRequest"
        />
        <approval-count :merge-request="mergeRequest" />
        <ci-icon
          v-if="mergeRequest.headPipeline && mergeRequest.headPipeline.detailedStatus"
          :status="mergeRequest.headPipeline.detailedStatus"
          use-link
          show-tooltip
        />
      </div>
      <div class="gl-text-sm gl-text-subtle">
        <gl-sprintf :message="__('Updated %{updatedAt}')">
          <template #updatedAt>
            <time-ago-tooltip :time="mergeRequest.updatedAt" />
          </template>
        </gl-sprintf>
      </div>
    </div>
  </div>
</template>
