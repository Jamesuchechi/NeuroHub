<script lang="ts">
	import data from '@emoji-mart/data';
	import * as EmojiMart from 'emoji-mart';

	const Picker = (EmojiMart as unknown as { Picker: new (options: unknown) => HTMLElement }).Picker;

	interface EmojiData {
		id: string;
		name: string;
		native: string;
		unified: string;
		keywords: string[];
		shortcodes: string;
	}

	let { onSelect } = $props<{ onSelect: (emoji: string) => void }>();

	function mountPicker(node: HTMLElement) {
		const picker = new Picker({
			data,
			onEmojiSelect: (emoji: EmojiData) => {
				onSelect(emoji.native);
			},
			theme: 'dark',
			skinTonePosition: 'none',
			previewPosition: 'none',
			navPosition: 'bottom',
			perLine: 8
		});

		node.appendChild(picker);

		return {
			destroy() {
				if (node.contains(picker)) {
					node.removeChild(picker);
				}
			}
		};
	}
</script>

<div
	use:mountPicker
	class="emoji-picker-wrapper rounded-2xl border border-stroke bg-[#09090b] shadow-2xl"
></div>

<style>
	.emoji-picker-wrapper {
		width: 352px;
		min-height: 430px;
		display: flex;
		flex-direction: column;
		background-color: #09090b;

		/* Emoji-mart custom variables */
		--em-background: #09090b;
		--em-border: transparent;
		--em-color-border: #27272a;
		--em-rgb-background: 9, 9, 11;
		--em-rgb-input: 24, 24, 27;
	}

	:global(em-emoji-picker) {
		background: #09090b;
		border-radius: 1rem;
		height: 430px !important;
		width: 100% !important;
	}
</style>
