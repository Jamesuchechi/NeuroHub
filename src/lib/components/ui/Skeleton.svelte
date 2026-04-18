<script lang="ts">
	interface Props {
		type?: 'text' | 'avatar' | 'rectangle' | 'circle' | 'list' | 'chat' | 'card';
		width?: string;
		height?: string;
		count?: number;
		className?: string;
	}

	let {
		type = 'rectangle',
		width = '100%',
		height = '1rem',
		count = 1,
		className = ''
	}: Props = $props();

	const items = $derived(Array.from({ length: count }, (_, i) => i));
</script>

<div class="flex flex-col gap-2 {className}" aria-hidden="true">
	{#each items as i (i)}
		{#if type === 'chat'}
			<div class="flex animate-pulse items-start gap-4 p-4">
				<div class="h-10 w-10 shrink-0 rounded-full bg-surface-dim"></div>
				<div class="flex flex-1 flex-col gap-2">
					<div class="h-3 w-24 rounded bg-surface-dim"></div>
					<div class="h-4 w-full rounded bg-surface-dim/50"></div>
					<div class="h-4 w-3/4 rounded bg-surface-dim/50"></div>
				</div>
			</div>
		{:else if type === 'card'}
			<div class="animate-pulse rounded-2xl border border-stroke bg-surface-dim/30 p-5">
				<div class="mb-4 flex items-center gap-3">
					<div class="h-12 w-12 rounded-xl bg-surface-dim"></div>
					<div class="flex flex-1 flex-col gap-2">
						<div class="h-4 w-1/2 rounded bg-surface-dim"></div>
						<div class="h-3 w-1/4 rounded bg-surface-dim/50"></div>
					</div>
				</div>
				<div class="mb-2 h-4 w-full rounded bg-surface-dim/30"></div>
				<div class="h-4 w-3/4 rounded bg-surface-dim/30"></div>
			</div>
		{:else if type === 'avatar'}
			<div class="animate-pulse rounded-full bg-surface-dim" style:width style:height></div>
		{:else if type === 'circle'}
			<div class="animate-pulse rounded-full bg-surface-dim" style:width style:height></div>
		{:else if type === 'list'}
			<div class="flex animate-pulse items-center gap-3 py-2">
				<div class="h-8 w-8 rounded-lg bg-surface-dim"></div>
				<div class="h-4 flex-1 rounded bg-surface-dim/50"></div>
			</div>
		{:else}
			<div class="animate-pulse rounded bg-surface-dim" style:width style:height></div>
		{/if}
	{/each}
</div>

<style>
	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}
	.animate-pulse {
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}
</style>
