<script>
import { GlCollapsibleListbox, GlIcon, GlTooltipDirective, GlButton } from '@gitlab/ui';

import { isString } from 'lodash';
import { isValidDate, localeDateFormat } from '~/lib/utils/datetime_utility';
import {
  DATE_RANGE_CUSTOM_VALUE,
  DEFAULT_DROPDOWN_DATE_RANGES,
  NUMBER_OF_DAYS_SELECTED,
} from '~/analytics/shared/constants';
import { s__, sprintf } from '~/locale';

export default {
  name: 'DateRangesDropdown',
  components: {
    GlCollapsibleListbox,
    GlIcon,
    GlButton,
  },
  directives: {
    GlTooltip: GlTooltipDirective,
  },
  props: {
    dateRangeOptions: {
      type: Array,
      required: false,
      default: () => DEFAULT_DROPDOWN_DATE_RANGES,
      validator: (options) =>
        options.length &&
        options.every(
          ({ text, value, startDate, endDate }) =>
            isString(text) &&
            isString(value) &&
            isValidDate(startDate) &&
            isValidDate(endDate) &&
            endDate >= startDate,
        ),
    },
    selected: {
      type: String,
      required: false,
      default: '',
    },
    tooltip: {
      type: String,
      required: false,
      default: '',
    },
    includeCustomDateRangeOption: {
      type: Boolean,
      required: false,
      default: true,
    },
    disableDateRangeString: {
      type: Boolean,
      required: false,
      default: false,
    },
  },
  data() {
    return {
      selectedValue: this.selected || this.dateRangeOptions[0].value,
    };
  },
  computed: {
    items() {
      const dateRangeOptions = this.dateRangeOptions.map(({ text, value }) => ({ text, value }));

      if (!this.includeCustomDateRangeOption) return dateRangeOptions;

      return [...dateRangeOptions, this.$options.customDateRangeItem];
    },
    isCustomDateRangeSelected() {
      return this.selectedValue === DATE_RANGE_CUSTOM_VALUE;
    },
    groupedDateRangeOptionsByValue() {
      return this.dateRangeOptions.reduce((acc, { value, startDate, endDate }) => {
        acc[value] = { startDate, endDate };

        return acc;
      }, {});
    },
    selectedDateRange() {
      if (this.isCustomDateRangeSelected) return null;

      return this.groupedDateRangeOptionsByValue[this.selectedValue];
    },
    showDateRangeString() {
      return (
        !this.disableDateRangeString && !this.isCustomDateRangeSelected && this.dateRangeString
      );
    },
    showTooltip() {
      return !this.isCustomDateRangeSelected && this.tooltip;
    },
    dateRangeString() {
      const { selectedDateRange } = this;

      if (!selectedDateRange) return '';

      const { startDate, endDate } = selectedDateRange;

      return this.formatDateRangeString(startDate, endDate);
    },
  },
  methods: {
    onSelect(value) {
      this.selectedValue = value;

      if (this.isCustomDateRangeSelected) {
        this.$emit('customDateRangeSelected');
      } else {
        this.$emit('selected', { value, ...this.selectedDateRange });
      }
    },
    formatDateRangeString(startDate, endDate) {
      return localeDateFormat.asDate.formatRange(startDate, endDate);
    },
  },
  customDateRangeItem: {
    text: s__('Analytics|Custom'),
    value: DATE_RANGE_CUSTOM_VALUE,
  },
  i18n: {
    daysSelected: NUMBER_OF_DAYS_SELECTED,
    label: s__('Analytics|Date range'),
    ariaLabel: (selected) => sprintf(s__('Analytics|Date range %{selected}'), { selected }),
  },
};
</script>

<template>
  <div class="gl-flex gl-items-center gl-gap-3">
    <gl-collapsible-listbox
      :selected="selectedValue"
      :items="items"
      :header-text="$options.i18n.label"
      @select="onSelect"
    >
      <template #toggle>
        <gl-button
          v-gl-tooltip="$options.i18n.label"
          data-testid="selected-date-range"
          :aria-label="$options.i18n.ariaLabel(selectedValue)"
          :title="$options.i18n.label"
          button-text-classes="gl-mr-[-4px]"
          >{{ $options.i18n.label }}
          <gl-icon
            aria-hidden="true"
            name="chevron-down"
            :size="16"
            variant="current"
            data-testid="dropdown-icon"
        /></gl-button>
      </template>
    </gl-collapsible-listbox>
    <div v-if="showDateRangeString || showTooltip" class="gl-text-subtle">
      <span v-if="showDateRangeString" data-testid="predefined-date-range-string">{{
        dateRangeString
      }}</span>
      <gl-icon
        v-if="showTooltip"
        v-gl-tooltip
        class="gl-ml-2"
        name="information-o"
        :title="tooltip"
      />
    </div>
  </div>
</template>
