<script>
import { GlCollapsibleListbox } from '@gitlab/ui';
import { isEqual, debounce } from 'lodash';
import EMPTY_VARIABLES_SVG from '@gitlab/svgs/dist/illustrations/variables-sm.svg';
import { s__ } from '~/locale';
import { createAlert } from '~/alert';
import { reportToSentry } from '~/ci/utils';
import CrudComponent from '~/vue_shared/components/crud_component.vue';
import { DEFAULT_DEBOUNCE_AND_THROTTLE_MS } from '~/lib/utils/constants';
import InputsTableSkeletonLoader from './pipeline_inputs_table/inputs_table_skeleton_loader.vue';
import PipelineInputsTable from './pipeline_inputs_table/pipeline_inputs_table.vue';
import getPipelineInputsQuery from './graphql/queries/pipeline_creation_inputs.query.graphql';

const ARRAY_TYPE = 'ARRAY';

export default {
  name: 'PipelineInputsForm',
  components: {
    CrudComponent,
    InputsTableSkeletonLoader,
    PipelineInputsTable,
    GlCollapsibleListbox,
  },
  inject: ['projectPath'],
  props: {
    emitModifiedOnly: {
      type: Boolean,
      required: false,
      default: false,
    },
    queryRef: {
      type: String,
      required: true,
    },
    emptySelectionText: {
      type: String,
      required: true,
    },
    savedInputs: {
      type: Array,
      required: false,
      default: () => [],
    },
  },
  emits: ['update-inputs', 'update-inputs-metadata'],
  data() {
    return {
      inputs: [],
      selectedInputNames: [],
      searchTerm: '',
    };
  },
  apollo: {
    inputs: {
      query: getPipelineInputsQuery,
      variables() {
        return {
          fullPath: this.projectPath,
          ref: this.queryRef,
        };
      },
      skip() {
        return !this.projectPath;
      },
      update({ project }) {
        const queryInputs = project?.ciPipelineCreationInputs || [];

        // if there are any saved inputs, overwrite the values
        const savedInputsMap = Object.fromEntries(
          this.savedInputs.map(({ name, value }) => [name, value]),
        );

        const processedInputs = queryInputs.map((input) => {
          const savedValue = savedInputsMap[input.name];
          const hasSavedValue = savedValue !== undefined;

          return {
            ...input,
            savedValue,
            value: hasSavedValue ? savedValue : input.default,
            isSelected: hasSavedValue,
          };
        });

        this.selectedInputNames = processedInputs
          .filter((input) => input.isSelected)
          .map((input) => input.name);

        this.$emit('update-inputs-metadata', {
          totalAvailable: processedInputs.length,
          totalModified: this.modifiedInputs.length,
        });

        return processedInputs;
      },
      error(error) {
        this.createErrorAlert(error);
        reportToSentry(this.$options.name, error);
      },
    },
  },
  computed: {
    hasInputs() {
      return Boolean(this.inputs.length);
    },
    inputsToEmit() {
      return this.emitModifiedOnly ? this.modifiedInputs : this.inputs;
    },
    isLoading() {
      return this.$apollo.queries.inputs.loading;
    },
    modifiedInputs() {
      return this.inputs.filter((input) => !isEqual(input.value, input.default));
    },
    newlyModifiedInputs() {
      return this.inputs.filter((input) => {
        if (input.savedValue === undefined) return false;

        return !isEqual(input.value, input.savedValue) && !isEqual(input.value, input.default);
      });
    },
    nameValuePairs() {
      return this.inputsToEmit.map((input) => ({
        name: input.name,
        value: this.formatInputValue(input),
      }));
    },
    inputsList() {
      return this.inputs.map((input) => ({ text: input.name, value: input.name }));
    },
    selectedInputsList() {
      return this.selectedInputNames.map((name) => ({ text: name, value: name }));
    },
    availableInputsList() {
      return this.inputsList.filter((input) => !this.selectedInputNames.includes(input.value));
    },
    searchFilteredInputs() {
      return this.inputsList.filter((input) =>
        input.text.toLowerCase().includes(this.searchTerm.toLowerCase()),
      );
    },
    filteredInputsList() {
      if (this.searchTerm) {
        return this.searchFilteredInputs;
      }

      if (this.selectedInputNames.length === 0) {
        return this.inputsList;
      }

      const items = [
        {
          text: s__('Pipelines|Selected'),
          options: this.selectedInputsList,
        },
      ];

      if (this.availableInputsList.length) {
        items.push({
          textSrOnly: true,
          text: s__('Pipelines|Available'),
          options: this.availableInputsList,
        });
      }

      return items;
    },
  },
  created() {
    this.debouncedSearch = debounce((searchTerm) => {
      this.searchTerm = searchTerm;
    }, DEFAULT_DEBOUNCE_AND_THROTTLE_MS);
  },
  methods: {
    createErrorAlert(error) {
      const graphQLErrors = error?.graphQLErrors?.map((err) => err.message) || [];
      const message = graphQLErrors.length
        ? graphQLErrors.join(', ')
        : s__('Pipelines|There was a problem fetching the pipeline inputs. Please try again.');

      createAlert({ message });
    },
    formatInputValue(input) {
      let { value } = input;

      // Convert string to array for ARRAY type inputs
      if (input.type === ARRAY_TYPE && typeof value === 'string' && value) {
        try {
          value = JSON.parse(value);
          if (!Array.isArray(value)) value = [value];
        } catch (e) {
          value = value.split(',').map((item) => item.trim());
        }
      }

      return value;
    },
    handleInputsUpdated(updatedInput) {
      this.updateInputs(updatedInput);
      this.emitEvents();
    },
    updateInputs(updatedInput) {
      this.inputs = this.inputs.map((input) =>
        input.name === updatedInput.name ? updatedInput : input,
      );
    },
    emitEvents() {
      this.$emit('update-inputs-metadata', {
        totalModified: this.modifiedInputs.length,
        newlyModified: this.newlyModifiedInputs.length,
      });
      this.$emit('update-inputs', this.nameValuePairs);
    },
    selectInputs(items) {
      const changedInputs = [];

      this.inputs = this.inputs.map((input) => {
        const oldValue = input.value;
        const isSelected = items.includes(input.name);
        const newValue = isSelected ? input.value : input.default;

        if (newValue !== oldValue) {
          changedInputs.push(input.name);
        }

        return {
          ...input,
          isSelected,
          value: newValue,
        };
      });

      this.selectedInputNames = items;

      // Note: we need to emit an event from here as the input value of deselected input changed
      if (changedInputs.length > 0) {
        this.emitEvents();
      }
    },
    deselectAll() {
      this.inputs = this.inputs.map((input) => ({
        ...input,
        isSelected: false,
        value: input.default,
      }));

      this.selectedInputNames = [];
      this.emitEvents();
    },
    handleSearch(searchTerm) {
      this.debouncedSearch(searchTerm);
    },
  },

  EMPTY_VARIABLES_SVG,
};
</script>

<template>
  <crud-component
    :description="
      __(
        'Specify the input values to use in this pipeline. Any inputs left unselected will use their default values.',
      )
    "
    :title="s__('Pipelines|Inputs')"
  >
    <template #actions>
      <gl-collapsible-listbox
        v-model="selectedInputNames"
        :items="filteredInputsList"
        :toggle-text="s__('Pipelines|Select inputs')"
        :header-text="s__('Pipelines|Inputs')"
        :search-placeholder="s__('Pipelines|Search input name')"
        :reset-button-label="__('Clear')"
        :disabled="!hasInputs"
        searchable
        multiple
        placement="bottom-end"
        variant="confirm"
        size="small"
        @reset="deselectAll"
        @select="selectInputs"
        @search="handleSearch"
      />
    </template>
    <inputs-table-skeleton-loader v-if="isLoading" />
    <template v-else>
      <pipeline-inputs-table
        v-if="selectedInputNames.length"
        :inputs="inputs"
        @update="handleInputsUpdated"
      />

      <div
        v-else-if="hasInputs"
        class="gl-flex gl-flex-col gl-items-center gl-justify-center gl-p-4 gl-text-subtle"
        data-testid="empty-selection-state"
      >
        <img
          :alt="s__('Pipelines|Pipeline inputs empty state image')"
          :src="$options.EMPTY_VARIABLES_SVG"
          class="gl-mb-3"
        />
        {{ emptySelectionText }}
      </div>
      <div v-else class="gl-flex gl-justify-center gl-text-subtle">
        {{ s__('Pipelines|There are no inputs for this configuration.') }}
      </div>
    </template>
  </crud-component>
</template>
