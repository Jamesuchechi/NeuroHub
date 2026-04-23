<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { tick } from 'svelte';

	let { show = $bindable(false), title = '', children, onclose = () => {} } = $props();

	let modalContent = $state<HTMLElement | null>(null);
	let previousActiveElement = $state<HTMLElement | null>(null);

	function close() {
		show = false;
		onclose();
		if (previousActiveElement) {
			previousActiveElement.focus();
		}
	}

	$effect(() => {
		if (show) {
			previousActiveElement = document.activeElement as HTMLElement;
			tick().then(() => {
				const focusable = getFocusableElements();
				if (focusable.length > 0) {
					focusable[0].focus();
				}
			});
		}
	});

	function getFocusableElements() {
		if (!modalContent) return [];
		return Array.from(
			modalContent.querySelectorAll(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
			)
		) as HTMLElement[];
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();

		if (e.key === 'Tab') {
			const focusable = getFocusableElements();
			if (focusable.length === 0) return;

			const first = focusable[0];
			const last = focusable[focusable.length - 1];

			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		}
	}
</script>

{#if show}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
		transition:fade={{ duration: 200 }}
		onmousedown={close}
		onkeydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
		tabindex="-1"
	>
		<div
			bind:this={modalContent}
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
