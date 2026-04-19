<script lang="ts">
	import JsonViewer from './JsonViewer.svelte';
	import { toast } from '$lib/stores/toastStore';
	import { isBase64, isJWT, isUnixTimestamp } from '$lib/utils/jsonUtils';
	import { slide, fade } from 'svelte/transition';

	let {
		data,
		depth = 0,
		path = '$',
		searchQuery = ''
	} = $props<{
		data: unknown;
		depth?: number;
		path?: string;
		searchQuery?: string;
	}>();

	let expanded = $state(false);
	let isHovered = $state(false);

	// Sync expanded state with depth and search
	$effect(() => {
		if (depth < 2 || searchQuery) expanded = true;
	});

	// Check if this node or any children match the search
	function matchesSearch(val: unknown, query: string): boolean {
		if (!query) return true;
		const q = query.toLowerCase();

		// Match current key/value
		if (String(val).toLowerCase().includes(q)) return true;

		// If object, search children
		if (isObject(val)) {
			return Object.entries(val as object).some(
				([k, v]) => k.toLowerCase().includes(q) || matchesSearch(v, query)
			);
		}

		return false;
	}

	const isVisible = $derived(matchesSearch(data, searchQuery));

	function toggle() {
		expanded = !expanded;
	}

	async function copyToClipboard(text: string, label: string) {
		await navigator.clipboard.writeText(text);
		toast.show(`${label} copied`, 'success');
	}

	const isObject = (val: unknown) => typeof val === 'object' && val !== null;
	const isArray = (val: unknown) => Array.isArray(val);

	// Smart Tooltip Detection
	function getSmartTooltip(val: unknown): string | null {
		if (typeof val === 'string') {
			if (isJWT(val)) return 'JWT (Payload detected)';
			if (isBase64(val)) return 'Base64 Encoded';
		}
		if (typeof val === 'number' && isUnixTimestamp(val)) {
			const date = new Date(val > 4102444800 ? val : val * 1000);
			return `Date: ${date.toLocaleString()}`;
		}
		return null;
	}

	const tooltip = $derived(getSmartTooltip(data));
</script>

<div
	class="json-node font-mono text-sm leading-relaxed {!isVisible ? 'hidden' : ''}"
	role="presentation"
	onmouseenter={() => (isHovered = true)}
	onmouseleave={() => (isHovered = false)}
>
	{#if isObject(data)}
		<div class="flex items-start gap-1">
			<button
				class="mt-1 rounded p-0.5 text-content-dim/50 transition-colors hover:bg-brand-orange/10"
				onclick={toggle}
				aria-label={expanded ? 'Collapse' : 'Expand'}
			>
				<svg
					class="h-3 w-3 transition-transform {expanded ? 'rotate-90' : ''}"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 5l7 7-7 7" />
				</svg>
			</button>

			<div class="flex-1">
				<div class="group/header flex items-center gap-2">
					<span
						class="cursor-pointer text-content/60 transition-colors select-none hover:text-content"
						onclick={toggle}
						role="button"
						tabindex="0"
						onkeydown={(e) => e.key === 'Enter' && toggle()}
					>
						{isArray(data) ? '[' : '{'}
						{#if !expanded}
							<span
								class="mx-1 rounded border border-stroke/50 bg-surface-dim px-1.5 py-0.5 text-[10px] text-content-dim"
							>
								{isArray(data) ? (data as unknown[]).length : Object.keys(data as object).length} items
							</span>
							{isArray(data) ? ']' : '}'}
						{/if}
					</span>

					{#if isHovered && depth > 0}
						<div
							class="flex items-center gap-1 opacity-100 transition-opacity"
							in:fade={{ duration: 100 }}
						>
							<button
								class="rounded border border-stroke bg-surface-dim px-1.5 py-0.5 text-[9px] text-content-dim transition-all hover:bg-brand-orange/10 hover:text-brand-orange"
								onclick={() => copyToClipboard(path, 'Path')}
								title="Copy Path"
							>
								Copy Path
							</button>
						</div>
					{/if}
				</div>

				{#if expanded}
					<div
						class="indent-guide my-1 ml-1.5 border-l-2 border-stroke/30 pl-4 transition-all"
						transition:slide|local={{ duration: 200 }}
					>
						{#each Object.entries(data as object) as [key, value] (key)}
							{@const childPath = isArray(data) ? `${path}[${key}]` : `${path}.${key}`}
							<div class="group/line relative py-0.5">
								<span class="font-bold text-brand-blue">"{key}"</span>:
								{#if isObject(value)}
									<JsonViewer data={value} depth={depth + 1} path={childPath} {searchQuery} />
								{:else}
									<span class="inline-flex items-center gap-2">
										<span
											class="
											{value === null ? 'text-content-dim italic' : ''}
											{typeof value === 'boolean' ? 'text-purple-500' : ''}
											{typeof value === 'number' ? 'text-amber-500' : ''}
											{typeof value === 'string' ? 'text-brand-green' : ''}
										"
										>
											{JSON.stringify(value)}
										</span>

										{#if tooltip && !isObject(value)}
											<span
												class="animate-in fade-in zoom-in rounded border border-brand-orange/20 bg-brand-orange/10 px-1.5 py-0.5 text-[10px] text-brand-orange duration-200"
											>
												{getSmartTooltip(value)}
											</span>
										{/if}

										<button
											class="text-[10px] text-content-dim/50 opacity-0 transition-opacity group-hover/line:opacity-100 hover:text-brand-orange"
											onclick={() => copyToClipboard(JSON.stringify(value), 'Value')}
											title="Copy Value"
											aria-label="Copy Value"
										>
											<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
												/>
											</svg>
										</button>
									</span>
								{/if}
							</div>
						{/each}
					</div>
					<span class="text-content/60 select-none">{isArray(data) ? ']' : '}'}</span>
				{/if}
			</div>
		</div>
	{:else}
		<span class="inline-flex items-center gap-2">
			<span
				class="
				{data === null ? 'font-light text-content-dim italic' : ''}
				{typeof data === 'boolean' ? 'font-bold text-purple-500' : ''}
				{typeof data === 'number' ? 'text-amber-500' : ''}
				{typeof data === 'string' ? 'text-brand-green' : ''}
			"
			>
				{JSON.stringify(data)}
			</span>

			{#if tooltip}
				<span
					class="rounded border border-brand-orange/20 bg-brand-orange/10 px-1.5 py-0.5 text-[10px] font-bold text-brand-orange"
				>
					{tooltip}
				</span>
			{/if}
		</span>
	{/if}
</div>

<style>
	.indent-guide {
		position: relative;
	}
	.indent-guide:hover {
		border-left-color: var(--color-brand-orange);
	}
	.json-node {
		animation: fadeIn 0.2s ease-out;
	}
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(2px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
