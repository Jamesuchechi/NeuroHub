<script lang="ts">
	import JsonViewer from './JsonViewer.svelte';
	let { data, depth = 0 } = $props<{ data: unknown; depth?: number }>();

	let expanded = $state(false);

	// Initialize and sync expanded state with depth prop
	$effect(() => {
		expanded = depth < 2;
	});

	function toggle() {
		expanded = !expanded;
	}

	const isObject = (val: unknown) => typeof val === 'object' && val !== null;
	const isArray = (val: unknown) => Array.isArray(val);
</script>

<div class="font-mono text-sm">
	{#if isObject(data)}
		<div class="flex items-start gap-1">
			<button
				class="hover:bg-muted text-muted-foreground mt-1 rounded p-0.5 transition"
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
				<span
					class="text-muted-foreground"
					onclick={toggle}
					role="button"
					tabindex="0"
					onkeydown={(e) => e.key === 'Enter' && toggle()}
				>
					{isArray(data) ? '[' : '{'}
					{#if !expanded}
						<span class="bg-muted mx-1 rounded px-1 text-[10px]">
							{isArray(data) ? data.length : Object.keys(data).length} items
						</span>
						{isArray(data) ? ']' : '}'}
					{/if}
				</span>

				{#if expanded}
					<div class="border-border/50 my-1 ml-4 border-l pl-2">
						{#each Object.entries(data) as [key, value] (key)}
							<div class="py-0.5">
								<span class="text-blue-500 dark:text-blue-400">"{key}"</span>:
								{#if isObject(value)}
									<JsonViewer data={value} depth={depth + 1} />
								{:else}
									<span class={typeof value === 'string' ? 'text-green-500' : 'text-amber-500'}>
										{JSON.stringify(value)}
									</span>
								{/if}
							</div>
						{/each}
					</div>
					<span class="text-muted-foreground">{isArray(data) ? ']' : '}'}</span>
				{/if}
			</div>
		</div>
	{:else}
		<span class={typeof data === 'string' ? 'text-green-500' : 'text-amber-500'}>
			{JSON.stringify(data)}
		</span>
	{/if}
</div>
