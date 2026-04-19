<script lang="ts">
	import { fade } from 'svelte/transition';
	import { aiStore } from '$lib/stores/aiStore.svelte';
	import Button from '../ui/Button.svelte';

	import DOMPurify from 'dompurify';

	let { onAccept = () => {}, onCancel = () => {} } = $props<{
		onAccept?: (content: string) => void;
		onCancel?: () => void;
	}>();

	const content = $derived(aiStore.currentGeneration);
	const sanitizedContent = $derived.by(() => {
		if (!content) return '';
		return typeof window !== 'undefined' ? DOMPurify.sanitize(content) : '';
	});
</script>

<div
	class="ai-response-bubble group relative my-4 flex flex-col gap-3 rounded-2xl border border-brand-orange/20 bg-brand-orange/5 p-4 shadow-sm backdrop-blur-sm transition-all hover:border-brand-orange/40 hover:bg-brand-orange/10"
	in:fade
>
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2">
			<div
				class="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-orange text-white shadow-lg"
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2.5"
						d="M13 10V3L4 14h7v7l9-11h-7z"
					/>
				</svg>
			</div>
			<span class="text-[10px] font-black tracking-widest text-brand-orange uppercase"
				>NeuroAI Response</span
			>
		</div>

		{#if aiStore.isGenerating}
			<div class="flex gap-1">
				<span class="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-orange"></span>
				<span class="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-orange [animation-delay:0.2s]"
				></span>
				<span class="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-orange [animation-delay:0.4s]"
				></span>
			</div>
		{/if}
	</div>

	<div class="prose max-w-none text-sm leading-relaxed text-content/90 prose-invert prose-orange">
		{#if sanitizedContent}
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html sanitizedContent}
		{:else if aiStore.isGenerating}
			<span class="text-content-dim italic">NeuroAI is thinking...</span>
		{:else}
			<span class="text-content-dim italic">No content generated.</span>
		{/if}
	</div>

	{#if !aiStore.isGenerating && content}
		<div class="flex items-center gap-2 border-t border-brand-orange/10 pt-2" in:fade>
			<Button
				variant="primary"
				size="sm"
				width="auto"
				onclick={() => onAccept(content)}
				class="h-7 px-3 text-[10px] font-bold uppercase"
			>
				Accept Result
			</Button>
			<button
				onclick={onCancel}
				class="text-[10px] font-bold text-content-dim uppercase transition-colors hover:text-white"
			>
				Dismiss
			</button>
		</div>
	{/if}
</div>

<style>
	.ai-response-bubble::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 1rem;
		padding: 1px;
		background: linear-gradient(to bottom right, rgba(245, 158, 11, 0.3), transparent);
		mask:
			linear-gradient(#fff 0 0) content-box,
			linear-gradient(#fff 0 0);
		-webkit-mask-composite: xor;
		mask-composite: exclude;
		pointer-events: none;
	}
</style>
