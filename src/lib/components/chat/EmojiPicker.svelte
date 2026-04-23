<script lang="ts">
	import { uiStore } from '$lib/stores/uiStore';

	let { onSelect } = $props<{ onSelect: (emoji: string) => void }>();

	const theme = $derived($uiStore.theme === 'system' ? 'auto' : $uiStore.theme);
	let loading = $state(true);

	interface EmojiData {
		native: string;
		[key: string]: unknown;
	}

	// This is a Svelte Action. It handles the DOM manipulation safely.
	function setupPicker(node: HTMLElement) {
		let pickerInstance: HTMLElement | null = null;

		async function init() {
			try {
				const [data, EmojiMart] = await Promise.all([
					import('@emoji-mart/data').then((m) => m.default),
					import('emoji-mart')
				]);

				interface EmojiMartModule {
					Picker: new (options: unknown) => HTMLElement;
				}
				const PickerClass = (EmojiMart as unknown as EmojiMartModule).Picker || EmojiMart;

				pickerInstance = new PickerClass({
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

				loading = false;
				node.appendChild(pickerInstance);
			} catch (err) {
				console.error('Failed to load Emoji Mart:', err);
			}
		}

		init();

		return {
			destroy() {
				if (pickerInstance && node.contains(pickerInstance)) {
					node.removeChild(pickerInstance);
				}
			}
		};
	}
</script>

<div
	use:setupPicker
	class="emoji-picker-container overflow-hidden rounded-2xl border border-stroke bg-surface shadow-2xl"
	role="region"
	aria-label="Emoji Picker"
>
	{#if loading}
		<div class="flex flex-1 flex-col items-center justify-center gap-3">
			<div
				class="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent"
			></div>
			<span class="text-[10px] font-bold tracking-widest text-content-dim uppercase"
				>Loading Emojis...</span
			>
		</div>
	{/if}
</div>

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
		height: 430px !important;
		width: 100% !important;
		border: none !important;
		background: var(--color-surface) !important;
	}
</style>
