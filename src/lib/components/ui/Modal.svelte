<script lang="ts">
	import { fade, scale } from 'svelte/transition';

	let { show = $bindable(false), title = '', children, onclose = () => {} } = $props();

	function close() {
		show = false;
		onclose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}
</script>

{#if show}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
		transition:fade={{ duration: 200 }}
		onmousedown={close}
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
		tabindex="-1"
	>
		<div
			class="relative w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-900 bg-zinc-950 shadow-2xl"
			transition:scale={{ duration: 200, start: 0.95 }}
			onmousedown={(e) => e.stopPropagation()}
			role="none"
		>
			<div class="flex items-center justify-between border-b border-zinc-900 px-6 py-4">
				<h3 id="modal-title" class="text-lg font-bold text-white">{title}</h3>
				<button
					class="text-zinc-500 transition-colors hover:text-white"
					onclick={close}
					aria-label="Close modal"
				>
					<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			<div class="p-6">
				{@render children()}
			</div>
		</div>
	</div>
{/if}

<svelte:window onkeydown={handleKeydown} />
