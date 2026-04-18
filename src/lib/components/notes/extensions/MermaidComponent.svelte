<script lang="ts">
	import { onMount } from 'svelte';
	import type { NodeViewProps } from '@tiptap/core';
	import mermaid from 'mermaid';
	import DOMPurify from 'dompurify';

	let { node, updateAttributes, selected }: NodeViewProps = $props();

	let container = $state<HTMLElement | null>(null);
	let svgContent = $state('');
	let isEditing = $state(false);
	let error = $state<string | null>(null);

	async function renderDiagram() {
		if (!container) return;
		try {
			error = null;
			const { svg } = await mermaid.render(
				`mermaid-${node.attrs.id || Math.random()}`,
				node.attrs.content
			);

			svgContent = DOMPurify.sanitize(svg, {
				USE_PROFILES: { svg: true, svgFilters: true },
				RETURN_TRUSTED_TYPE: false
			});
		} catch (err) {
			const e = err as Error;
			error = e.message;
			console.error('[Mermaid] render error:', e);
		}
	}

	function renderSafeHtml(node: HTMLElement, html: string) {
		node.innerHTML = html;
		return {
			update(newHtml: string) {
				node.innerHTML = newHtml;
			}
		};
	}

	onMount(() => {
		mermaid.initialize({
			startOnLoad: false,
			theme: 'dark',
			securityLevel: 'loose',
			fontFamily: 'Inter, system-ui, sans-serif'
		});
		renderDiagram();
	});

	$effect(() => {
		if (node.attrs.content) {
			renderDiagram();
		}
	});
</script>

<div
	class="mermaid-node-view my-6 rounded-2xl border transition-all {selected
		? 'border-brand-orange ring-1 ring-brand-orange'
		: 'border-stroke'} overflow-hidden bg-surface-dim/20"
>
	<header class="flex h-10 items-center justify-between bg-surface-dim/40 px-4">
		<div class="flex items-center gap-2">
			<svg class="h-4 w-4 text-brand-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
				/>
			</svg>
			<span class="text-[10px] font-bold tracking-widest text-content-dim uppercase"
				>Mermaid Diagram</span
			>
		</div>
		<button
			onclick={() => (isEditing = !isEditing)}
			class="rounded px-2 py-1 text-[10px] font-bold text-brand-orange transition-colors hover:bg-brand-orange/10"
		>
			{isEditing ? 'Preview' : 'Edit Source'}
		</button>
	</header>

	<div class="relative flex min-h-[100px] flex-col items-center justify-center p-6">
		{#if isEditing}
			<textarea
				class="min-h-[200px] w-full rounded-xl border border-stroke bg-surface p-4 font-mono text-xs text-content outline-none"
				value={node.attrs.content}
				oninput={(e) => {
					updateAttributes({ content: e.currentTarget.value });
				}}
			></textarea>
		{:else if error}
			<div class="flex flex-col items-center gap-2 text-center text-red-400">
				<svg class="h-8 w-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
					/>
				</svg>
				<p class="text-[10px] font-bold tracking-widest uppercase">Render Error</p>
				<p class="max-w-sm font-mono text-[10px] opacity-60">{error.slice(0, 100)}...</p>
			</div>
		{:else}
			<div
				bind:this={container}
				use:renderSafeHtml={svgContent}
				class="flex h-full w-full items-center justify-center"
			></div>
		{/if}
	</div>
</div>

<style>
	:global(.mermaid-node-view svg) {
		max-width: 100%;
		height: auto;
	}
</style>
