<script lang="ts">
	import data from '@emoji-mart/data';
	import * as EmojiMart from 'emoji-mart';
	interface EmojiMartModule {
		Picker: new (options: unknown) => HTMLElement;
	}
	const Picker = (EmojiMart as unknown as EmojiMartModule).Picker || EmojiMart;
	import { uiStore } from '$lib/stores/uiStore';

	let { onSelect } = $props<{ onSelect: (emoji: string) => void }>();

	const theme = $derived($uiStore.theme === 'system' ? 'auto' : $uiStore.theme);

	interface EmojiData {
		native: string;
		[key: string]: unknown;
	}

	function mountPicker(node: HTMLElement) {
		const picker = new Picker({
			data,
			onEmojiSelect: (emoji: EmojiData) => {
				onSelect(emoji.native);
			},
			theme,
			skinTonePosition: 'none',
			previewPosition: 'none',
			navPosition: 'bottom',
			perLine: 8
		});

		// In v5, Picker constructor returns the custom element instance
		node.appendChild(picker as unknown as Node);

		return {
			destroy() {
				if (node.contains(picker as unknown as Node)) {
					node.removeChild(picker as unknown as Node);
				}
			}
		};
	}
</script>

<div
	use:mountPicker
	class="emoji-picker-container overflow-hidden rounded-2xl border border-stroke bg-surface shadow-2xl"
></div>

<style>
	.emoji-picker-container {
		width: 352px;
		height: 430px;
		display: flex;
		flex-direction: column;
	}

	:global(em-emoji-picker) {
		--em-background: var(--color-surface);
		--em-color-border: var(--color-stroke);
		/* Note: emoji-mart uses its own internal theme for most things, 
		   but we can override some basics */
		height: 430px !important;
		width: 100% !important;
		border: none !important;
		background: var(--color-surface) !important;
	}
</style>
