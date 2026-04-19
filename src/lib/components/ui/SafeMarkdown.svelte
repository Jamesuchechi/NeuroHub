<script lang="ts">
	import { parseMarkdown, type InlineToken } from '$lib/utils/markdown';

	let { content } = $props<{ content: string }>();
	let tokens = $derived(parseMarkdown(content));
</script>

{#snippet renderInline(inlineTokens: InlineToken[])}
	{#each inlineTokens as token, inlineIdx (inlineIdx)}
		{#if token.type === 'text'}
			{token.content}
		{:else if token.type === 'bold'}
			<strong class="font-bold text-white">{token.content}</strong>
		{:else if token.type === 'code'}
			<code class="rounded bg-surface-dim px-1 font-mono text-[0.9em] text-orange-400"
				>{token.content}</code
			>
		{/if}
	{/each}
{/snippet}

<div class="safe-markdown space-y-4">
	{#each tokens as token, blockIdx (blockIdx)}
		{#if token.type === 'paragraph'}
			<p class="leading-relaxed">
				{@render renderInline(token.children)}
			</p>
		{:else if token.type === 'list'}
			<ul class="my-4 list-disc space-y-1 pl-5">
				{#each token.items as item, itemIdx (itemIdx)}
					<li>
						{@render renderInline(item)}
					</li>
				{/each}
			</ul>
		{:else if token.type === 'code-block'}
			<pre
				class="my-4 overflow-x-auto rounded-lg border border-stroke bg-zinc-950 p-3 text-[0.85em]">
                <code class="text-zinc-300">{token.content}</code>
            </pre>
		{/if}
	{/each}
</div>
