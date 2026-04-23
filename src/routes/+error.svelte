<script lang="ts">
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import { fly } from 'svelte/transition';

	const error = $derived($page.error);
	const status = $derived($page.status);
</script>

<div class="flex min-h-screen items-center justify-center bg-surface p-6 text-center">
	<div class="max-w-md" in:fly={{ y: 20, duration: 600 }}>
		<div class="mb-6 flex justify-center">
			<div
				class="flex h-20 w-20 items-center justify-center rounded-3xl bg-red-500/10 text-red-500"
			>
				<svg class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
					/>
				</svg>
			</div>
		</div>

		<h1 class="mb-2 text-4xl font-black tracking-tighter text-content italic">
			{status} <span class="text-red-500">Error</span>
		</h1>
		<p class="mb-8 text-content-dim">
			{error?.message || 'Something went wrong in the matrix. Our engineers have been notified.'}
		</p>

		<div class="flex flex-col gap-3">
			<a
				href={resolve('/' as unknown as '/')}
				class="rounded-xl bg-orange-500 px-6 py-3 font-bold text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-600 active:scale-95"
			>
				Back to Workspace
			</a>
			<button
				onclick={() => window.location.reload()}
				class="rounded-xl border border-stroke bg-surface-dim px-6 py-3 font-bold text-content transition-all hover:bg-surface active:scale-95"
			>
				Try Reloading
			</button>
		</div>

		<div class="mt-12 text-[10px] font-bold tracking-widest text-content-dim/30 uppercase">
			NeuroHub System Diagnostics · Phase 11
		</div>
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		background: #09090b;
	}
</style>
