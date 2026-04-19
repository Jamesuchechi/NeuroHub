<script lang="ts">
	import { parseMarkdown, type InlineToken } from '$lib/utils/markdown';
	import CodeBlock from '$lib/components/ai/CodeBlock.svelte';
	import { fade } from 'svelte/transition';

	let { content } = $props<{ content: string }>();
	let tokens = $derived(parseMarkdown(content));
</script>

{#snippet renderInline(inlineTokens: InlineToken[])}
	{#each inlineTokens as token, inlineIdx (inlineIdx)}
		{#if token.type === 'text'}
			{token.content}
		{:else if token.type === 'bold'}
			<strong class="font-bold text-white">{token.content}</strong>
		{:else if token.type === 'italic'}
			<em class="italic opacity-90">{token.content}</em>
		{:else if token.type === 'code'}
			<code class="rounded bg-surface-dim px-1 font-mono text-[0.9em] text-orange-400"
				>{token.content}</code
			>
		{/if}
	{/each}
{/snippet}

<div class="safe-markdown space-y-4" in:fade>
	{#each tokens as token, blockIdx (blockIdx)}
		{#if token.type === 'paragraph'}
			<p class="leading-relaxed">
				{@render renderInline(token.children)}
			</p>
		{:else if token.type === 'heading'}
			{#if token.level === 1}
				<h1 class="mt-6 mb-4 text-2xl leading-tight font-bold text-white">
					{@render renderInline(token.children)}
				</h1>
			{:else if token.level === 2}
				<h2
					class="mt-5 mb-3 border-b border-white/5 pb-1 text-xl leading-tight font-bold text-white"
				>
					{@render renderInline(token.children)}
				</h2>
			{:else if token.level === 3}
				<h3 class="mt-4 mb-2 text-lg leading-tight font-semibold text-white">
					{@render renderInline(token.children)}
				</h3>
			{:else}
				<h4 class="mt-3 mb-2 text-base leading-tight font-semibold text-white/90">
					{@render renderInline(token.children)}
				</h4>
			{/if}
		{:else if token.type === 'list'}
			{#if token.ordered}
				<ol class="my-4 list-decimal space-y-2 pl-6">
					{#each token.items as item, itemIdx (itemIdx)}
						<li class="pl-1">
							{@render renderInline(item)}
						</li>
					{/each}
				</ol>
			{:else}
				<ul class="my-4 list-disc space-y-2 pl-6">
					{#each token.items as item, itemIdx (itemIdx)}
						<li class="pl-1">
							{@render renderInline(item)}
						</li>
					{/each}
				</ul>
			{/if}
		{:else if token.type === 'code-block'}
			<div class="my-6">
				<CodeBlock code={token.content} lang={token.lang} />
			</div>
		{:else if token.type === 'blockquote'}
			<blockquote
				class="my-4 border-l-4 border-orange-500/50 bg-white/5 py-3 pr-3 pl-4 text-content-dim italic"
			>
				{@render renderInline(token.children)}
			</blockquote>
		{:else if token.type === 'hr'}
			<hr class="my-8 border-t border-white/10" />
		{/if}
	{/each}
</div>

<style>
	/* Custom overrides for the safe-markdown container */
	.safe-markdown :global(p + p) {
		margin-top: 1rem;
	}

	/* Ensure light mode visibility for headers */
	:global(.safe-markdown h1, .safe-markdown h2, .safe-markdown h3) {
		color: var(--ai-text);
	}

	:global(.safe-markdown strong) {
		color: var(--ai-text);
	}
</style>
