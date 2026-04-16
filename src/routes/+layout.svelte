<script lang="ts">
	import { onMount, setContext } from 'svelte';
	import './layout.css';
	import { authStore } from '$lib/stores/authStore';
	import { profileStore } from '$lib/stores/profileStore';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { uiStore } from '$lib/stores/uiStore';
	import ShortcutsModal from '$lib/components/layout/ShortcutsModal.svelte';
	import ToastContainer from '$lib/components/ui/ToastContainer.svelte';

	let { children } = $props();

	let shortcutsOpen = $state(false);
	let error = $state<Error | null>(null);

	// Provide stores to the entire application to avoid prop drilling
	setContext('auth', authStore);
	setContext('user', profileStore);
	setContext('workspace', workspaceStore);

	onMount(() => {
		const splash = document.getElementById('splash-screen');
		if (splash) {
			splash.classList.add('fade-out');
			setTimeout(() => {
				splash.remove();
			}, 500);
		}

		// Keyboard Shortcuts
		const handleKeydown = (e: KeyboardEvent) => {
			// Command Palette: cmd+K
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				e.preventDefault();
				uiStore.toggleCommandPalette();
			}

			// Shortcuts Modal: cmd+/
			if ((e.metaKey || e.ctrlKey) && e.key === '/') {
				e.preventDefault();
				shortcutsOpen = !shortcutsOpen;
			}
		};

		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});

	// Global Error Boundary - Simple implementation for Svelte 5
	function handleError(err: unknown) {
		console.error('Fatal Application Error:', err);
		error = err instanceof Error ? err : new Error(String(err));
	}
</script>

<svelte:head>
	<link rel="icon" href="/logo.png" />
</svelte:head>

<svelte:window onerror={handleError} />

{#if error}
	<div
		class="fixed inset-0 z-200 flex flex-col items-center justify-center bg-black p-8 text-center text-white"
	>
		<h1 class="mb-4 text-4xl font-black text-brand-orange">SYSTEM ERROR</h1>
		<p class="mb-8 max-w-md text-zinc-500">{error.message}</p>
		<button
			onclick={() => location.reload()}
			class="rounded-xl bg-white px-6 py-3 font-bold text-black transition-transform hover:scale-105"
		>
			Restart Session
		</button>
	</div>
{:else}
	{@render children()}
{/if}

<ToastContainer />
<ShortcutsModal isOpen={shortcutsOpen} onClose={() => (shortcutsOpen = false)} />
