import { Node, mergeAttributes } from '@tiptap/core';

export interface MermaidOptions {
	HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		mermaid: {
			/**
			 * Add a mermaid diagram
			 */
			setMermaid: (content?: string) => ReturnType;
		};
	}
}

export const Mermaid = Node.create<MermaidOptions>({
	name: 'mermaid',
	group: 'block',
	atom: true,
	draggable: true,

	addAttributes() {
		return {
			content: {
				default:
					'graph TD\n  A[Start] --> B(Process)\n  B --> C{Decision}\n  C -->|Yes| D[Result 1]\n  C -->|No| E[Result 2]'
			}
		};
	},

	parseHTML() {
		return [
			{
				tag: 'div[data-type="mermaid"]'
			}
		];
	},

	renderHTML({ HTMLAttributes }) {
		return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'mermaid' }), 0];
	},

	addCommands() {
		return {
			setMermaid:
				(content) =>
				({ commands }) => {
					return commands.insertContent({
						type: this.name,
						attrs: { content }
					});
				}
		};
	}
});
