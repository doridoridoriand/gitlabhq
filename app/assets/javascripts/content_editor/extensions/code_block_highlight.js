import { lowlight } from 'lowlight/lib/core';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { Fragment } from '@tiptap/pm/model';
import { mergeAttributes, textblockTypeInputRule } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-2';
import { __ } from '~/locale';
import languageLoader from '../services/code_block_language_loader';
import CodeBlockWrapper from '../components/wrappers/code_block.vue';

const DEFAULT_GLQL_VIEW_CONTENT = `query: assignee = currentUser()\nfields: title, createdAt, milestone, assignee\ntitle: ${__('Issues assigned to current user')}`;

const extractLanguage = (element) => element.dataset.canonicalLang ?? element.getAttribute('lang');

export const backtickInputRegex = /^```([a-z]+)?[\s\n]$/;
export const tildeInputRegex = /^~~~([a-z]+)?[\s\n]$/;

export default CodeBlockLowlight.extend({
  isolating: true,
  exitOnArrowDown: false,

  addOptions() {
    return {
      ...this.parent?.(),
      HTMLAttributes: {
        dir: 'auto',
      },
    };
  },

  addAttributes() {
    return {
      language: {
        default: null,
        parseHTML: (element) => extractLanguage(element),
      },
      class: {
        // eslint-disable-next-line @gitlab/require-i18n-strings
        default: 'code highlight',
      },
      langParams: {
        default: null,
        parseHTML: (element) => element.dataset.langParams,
      },
    };
  },
  addInputRules() {
    const getAttributes = (match) => languageLoader?.loadLanguageFromInputRule(match) || {};

    return [
      textblockTypeInputRule({
        find: backtickInputRegex,
        type: this.type,
        getAttributes,
      }),
      textblockTypeInputRule({
        find: tildeInputRegex,
        type: this.type,
        getAttributes,
      }),
    ];
  },
  addCommands() {
    return {
      ...this.parent?.(),
      insertGLQLView:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.type.name,
            attrs: {
              language: 'glql',
            },
            content: [
              {
                type: 'text',
                text: DEFAULT_GLQL_VIEW_CONTENT,
              },
            ],
          });
        },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'div.markdown-code-block',
        skip: true,
      },
      // Matches HTML generated by Banzai::Filter::SyntaxHighlightFilter,
      // Banzai::Filter::MathFilter, Banzai::Filter::MermaidFilter,
      // or Banzai::Filter::SuggestionFilter
      {
        tag: 'pre.code.highlight',
        preserveWhitespace: 'full',
        getContent(element, schema) {
          return element.textContent
            ? Fragment.from(schema.text(element.textContent))
            : Fragment.empty;
        },
      },
      // Matches HTML generated by Banzai::Filter::MathFilter,
      // after being transformed by ~/behaviors/markdown/render_math.js
      {
        tag: 'span.katex-display',
        preserveWhitespace: 'full',
        contentElement: 'annotation[encoding="application/x-tex"]',
        attrs: { language: 'math' },
      },
      // Matches HTML generated by Banzai::Filter::MermaidFilter,
      // after being transformed by ~/behaviors/markdown/render_sandboxed_mermaid.js
      {
        tag: 'svg.mermaid',
        preserveWhitespace: 'full',
        contentElement: 'text.source',
        attrs: { language: 'mermaid' },
      },
      // Matches HTML generated by Banzai::Filter::SuggestionFilter,
      // after being transformed by ~/vue_shared/components/markdown/suggestions.vue
      {
        tag: '.md-suggestion',
        skip: true,
      },
      {
        tag: '.md-suggestion-header',
        ignore: true,
      },
      {
        tag: '.md-suggestion-diff',
        preserveWhitespace: 'full',
        getContent: (el, schema) =>
          [...el.querySelectorAll('.line_content.new span')].map((span) =>
            schema.text(span.innerText),
          ),
        attrs: { language: 'suggestion' },
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'pre',
      {
        ...mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
        class: `content-editor-code-block ${gon.user_color_scheme} ${HTMLAttributes.class}`,
      },
      ['code', {}, 0],
    ];
  },

  addNodeView() {
    return new VueNodeViewRenderer(CodeBlockWrapper);
  },

  addProseMirrorPlugins() {
    const parentPlugins = this.parent?.() ?? [];
    // We don't want TipTap's VSCode paste plugin to be loaded since
    // it conflicts with our CopyPaste plugin.
    const i = parentPlugins.findIndex((plugin) => plugin.key.includes('VSCode'));
    if (i >= 0) parentPlugins.splice(i, 1);
    return parentPlugins;
  },
}).configure({ lowlight });
