import { Node, mergeAttributes, type Editor, type Range } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';

interface WikilinkItem {
	id: string;
	label: string;
}

const WikilinkSuggestionKey = new PluginKey('wikilinkSuggestion');

export const Wikilink = Node.create({
	name: 'wikilink',
	group: 'inline',
	inline: true,
	selectable: false,
	atom: true,

	addAttributes() {
		return {
			id: {
				default: null,
				parseHTML: (element) => element.getAttribute('data-id'),
				renderHTML: (attributes) => ({
					'data-id': attributes.id
				})
			},
			label: {
				default: null,
				parseHTML: (element) => element.getAttribute('data-label'),
				renderHTML: (attributes) => ({
					'data-label': attributes.label
				})
			}
		};
	},

	parseHTML() {
		return [
			{
				tag: 'span[data-wikilink]'
			}
		];
	},

	renderHTML({ node, HTMLAttributes }) {
		return [
			'span',
			mergeAttributes(HTMLAttributes, {
				'data-wikilink': '',
				class:
					'inline-flex items-center rounded-md bg-brand-orange/10 px-1.5 py-0.5 text-sm font-medium text-brand-orange hover:bg-brand-orange/20 cursor-pointer transition-colors border border-brand-orange/20'
			}),
			`[[${node.attrs.label}]]`
		];
	},

	renderText({ node }) {
		return `[[${node.attrs.label}]]`;
	},

	addOptions() {
		return {
			suggestion: {
				char: '[[',
				allowSpaces: true,
				pluginKey: WikilinkSuggestionKey,
				command: ({
					editor,
					range,
					props
				}: {
					editor: Editor;
					range: Range;
					props: WikilinkItem;
				}) => {
					// Increase range to include finishing brackets
					editor
						.chain()
						.focus()
						.insertContentAt(range, [
							{
								type: this.name,
								attrs: props
							},
							{
								type: 'text',
								text: ' '
							}
						])
						.run();

					window.getSelection()?.collapseToEnd();
				}
			}
		};
	},

	addProseMirrorPlugins() {
		return [
			Suggestion({
				editor: this.editor,
				...this.options.suggestion
			})
		];
	}
});
