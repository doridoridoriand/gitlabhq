<script>
import { GlIcon, GlLink, GlBadge } from '@gitlab/ui';
import timeagoMixin from '~/vue_shared/mixins/timeago';
import * as Sentry from '~/sentry/sentry_browser_wrapper';
import mergeRequestsWidgetMetadataQuery from '../graphql/queries/merge_requests_widget_metadata.query.graphql';

export default {
  name: 'MergeRequestsWidget',
  components: {
    GlIcon,
    GlLink,
    GlBadge,
  },
  mixins: [timeagoMixin],
  inject: ['duoCodeReviewBotUsername'],
  props: {
    reviewRequestedPath: {
      type: String,
      required: true,
    },
    assignedToYouPath: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      metadata: {},
    };
  },
  apollo: {
    metadata: {
      query: mergeRequestsWidgetMetadataQuery,
      variables() {
        return {
          duoCodeReviewBotUsername: this.duoCodeReviewBotUsername,
        };
      },
      update({ currentUser }) {
        return currentUser;
      },
      error(error) {
        this.$emit('fetch-metadata-error');
        Sentry.captureException(error);
      },
    },
  },
  computed: {
    isLoadingMetadata() {
      return this.$apollo.queries.metadata.loading;
    },
    reviewRequestedCount() {
      return this.metadata.reviewRequestedMergeRequests?.count ?? '-';
    },
    reviewRequestedLastUpdatedAt() {
      return this.metadata?.reviewRequestedMergeRequests?.nodes?.[0]?.updatedAt ?? null;
    },
    assignedCount() {
      return this.metadata.assignedMergeRequests?.count ?? '-';
    },
    assignedLastUpdatedAt() {
      return this.metadata?.assignedMergeRequests?.nodes?.[0]?.updatedAt ?? null;
    },
  },
};
</script>

<template>
  <div class="gl-border gl-rounded-lg gl-px-4 gl-py-1">
    <h4 class="gl-flex gl-items-center gl-gap-2">
      <gl-icon name="merge-request" :size="16" />{{ __('Merge requests') }}
    </h4>
    <ul class="gl-list-none gl-p-0">
      <li>
        <gl-link
          class="gl-flex gl-items-center gl-gap-3 gl-rounded-small gl-px-1 gl-py-1 !gl-no-underline hover:gl-bg-gray-10 dark:hover:gl-bg-alpha-light-8"
          variant="meta"
          :href="reviewRequestedPath"
        >
          {{ __('Review requested') }}
          <gl-badge data-testid="review-requested-count">{{ reviewRequestedCount }}</gl-badge>
          <template v-if="!isLoadingMetadata">
            <span
              v-if="reviewRequestedLastUpdatedAt"
              data-testid="review-requested-last-updated-at"
              class="gl-ml-auto gl-text-sm gl-text-subtle"
              >{{ timeFormatted(reviewRequestedLastUpdatedAt) }}</span
            >
          </template>
        </gl-link>
      </li>
      <li>
        <gl-link
          class="gl-flex gl-items-center gl-gap-3 gl-rounded-small gl-px-1 gl-py-1 !gl-no-underline hover:gl-bg-gray-10 dark:hover:gl-bg-alpha-light-8"
          variant="meta"
          :href="assignedToYouPath"
        >
          {{ __('Assigned to you') }}
          <gl-badge data-testid="assigned-count">{{ assignedCount }}</gl-badge>
          <template v-if="!isLoadingMetadata">
            <span
              v-if="assignedLastUpdatedAt"
              data-testid="assigned-last-updated-at"
              class="gl-ml-auto gl-text-sm gl-text-subtle"
              >{{ timeFormatted(assignedLastUpdatedAt) }}</span
            >
          </template>
        </gl-link>
      </li>
    </ul>
  </div>
</template>
