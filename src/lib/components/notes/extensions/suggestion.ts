import { mount, unmount } from 'svelte';
import { notesStore } from '$lib/stores/notesStore.svelte';
import WikilinkList from './WikilinkList.svelte';
import tippy, { type Instance, type GetReferenceClientRect } from 'tippy.js';
import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';
import type { ComponentProps } from 'svelte';
import type { NotesTable } from '$lib/types/db';

type WikilinkListItem = NotesTable['Row'];
type WikilinkListInstance = { onKeyDown: (props: SuggestionKeyDownProps) => boolean } & ReturnType<
	typeof mount
>;

export default {
	items: ({ query }: { query: string }): WikilinkListItem[] => {
		return notesStore.notes
			.filter((item) => item.title.toLowerCase().startsWith(query.toLowerCase()))
			.slice(0, 10);
	},

	render: () => {
		let component: WikilinkListInstance;
		let popup: Instance[];

		return {
			onStart: (props: SuggestionProps<WikilinkListItem>) => {
				const container = document.createElement('div');

				component = mount(WikilinkList, {
					target: container,
					props: {
						items: props.items,
						command: props.command
					} as ComponentProps<typeof WikilinkList>
				}) as WikilinkListInstance;

				if (!props.clientRect) {
					return;
				}

				popup = tippy('body', {
					getReferenceClientRect: props.clientRect as GetReferenceClientRect,
					appendTo: () => document.body,
					content: container,
					showOnCreate: true,
					interactive: true,
					trigger: 'manual',
					placement: 'bottom-start'
				});
			},

			onUpdate(props: SuggestionProps<WikilinkListItem>) {
				if (component) {
					// Svelte 5 instance handles updates via state inside props
				}

				if (popup && popup[0]) {
					popup[0].setProps({
						getReferenceClientRect: (props.clientRect as GetReferenceClientRect) || undefined
					});
				}
			},

			onKeyDown(props: SuggestionKeyDownProps) {
				if (props.event.key === 'Escape') {
					popup[0].hide();
					return true;
				}

				return component?.onKeyDown(props);
			},

			onExit() {
				if (popup && popup[0]) {
					popup[0].destroy();
				}
				if (component) {
					unmount(component);
				}
			}
		};
	}
};
