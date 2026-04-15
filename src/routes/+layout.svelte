<script lang="ts">
	import { onMount } from 'svelte';
	import './layout.css';
	import { setContext } from 'svelte';
	import { authStore } from '$lib/stores/authStore';
	import { userStore } from '$lib/stores/userStore';
	import { workspaceStore } from '$lib/stores/workspaceStore';

	let { children } = $props();

	// Provide stores to the entire application to avoid prop drilling
	setContext('auth', authStore);
	setContext('user', userStore);
	setContext('workspace', workspaceStore);

	onMount(() => {
		const splash = document.getElementById('splash-screen');
		if (splash) {
			splash.classList.add('fade-out');
			setTimeout(() => {
				splash.remove();
			}, 500);
		}
	});
</script>

<svelte:head>
	<link rel="icon" href="/logo.png" />
</svelte:head>

{@render children()}
