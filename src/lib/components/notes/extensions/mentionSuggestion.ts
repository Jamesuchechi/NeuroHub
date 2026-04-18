import { mount, unmount } from 'svelte';
import { get } from 'svelte/store';
import { workspaceStore } from '$lib/stores/workspaceStore';
import MentionList from './MentionList.svelte';
import tippy, { type Instance, type GetReferenceClientRect } from 'tippy.js';
import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';
import type { ComponentProps } from 'svelte';

type MentionListInstance = { onKeyDown: (props: SuggestionKeyDownProps) => boolean } & ReturnType<
	typeof mount
>;

export default {
	items: ({ query }: { query: string }) => {
		const workspace = get(workspaceStore);
		return workspace.members
			.filter((m) => m.profile?.username?.toLowerCase().startsWith(query.toLowerCase()))
			.slice(0, 10);
	},

	render: () => {
		let component: MentionListInstance;
		let popup: Instance[];

		return {
			onStart: (props: SuggestionProps) => {
				const container = document.createElement('div');

				component = mount(MentionList, {
					target: container,
					props: {
						items: props.items,
						command: props.command
					} as ComponentProps<typeof MentionList>
				}) as MentionListInstance;

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

			onUpdate(props: SuggestionProps) {
				if (popup && popup[0]) {
					popup[0].setProps({
						getReferenceClientRect: (props.clientRect as GetReferenceClientRect) || undefined
					});
				}
			},

			onKeyDown(props: SuggestionKeyDownProps) {
				if (props.event.key === 'Escape') {
					popup[0]?.hide();
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
