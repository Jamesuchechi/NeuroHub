<script lang="ts">
	import { sandboxPreload } from '$lib/stores/devToolsStore';
	import { slide } from 'svelte/transition';

	let settings = $state({
		autoRun: true,
		clearConsole: false,
		theme: 'dark'
	});
</script>

<div class="flex h-full flex-col space-y-6 bg-surface p-4">
	<div class="space-y-4">
		<h4 class="text-[10px] font-bold tracking-widest text-content-dim uppercase">Settings</h4>

		<div class="space-y-3">
			<label class="group flex cursor-pointer items-center justify-between">
				<span class="text-xs text-content-dim transition-colors group-hover:text-content"
					>Auto-run Code</span
				>
				<input
					type="checkbox"
					bind:checked={settings.autoRun}
					class="h-4 w-4 rounded border-stroke bg-surface-dim accent-orange-500"
				/>
			</label>

			<label class="group flex cursor-pointer items-center justify-between">
				<span class="text-xs text-content-dim transition-colors group-hover:text-content"
					>Clear on Run</span
				>
				<input
					type="checkbox"
					bind:checked={settings.clearConsole}
					class="h-4 w-4 rounded border-stroke bg-surface-dim accent-orange-500"
				/>
			</label>
		</div>
	</div>

	<div class="space-y-4">
		<h4 class="text-[10px] font-bold tracking-widest text-content-dim uppercase">Environment</h4>
		<div class="rounded-lg border border-stroke bg-surface-dim/30 p-4 text-center">
			<p class="text-[10px] leading-relaxed text-content-dim italic">
				Environment variables and secret management for sandbox execution will appear here.
			</p>
		</div>
	</div>

	{#if $sandboxPreload}
		<div class="mt-auto space-y-2" transition:slide>
			<div class="rounded-lg border border-orange-500/20 bg-orange-500/10 p-3">
				<p class="mb-1 text-[10px] font-bold text-orange-500 uppercase">Incoming Code</p>
				<p class="truncate text-[11px] text-content-dim">Source: Externally injected</p>
			</div>
		</div>
	{/if}
</div>
