<script lang="ts">
	import { resolve } from '$app/paths';
	import { authStore } from '$lib/stores/authStore';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import AuthShell from '$lib/components/auth/AuthShell.svelte';

	let { children } = $props();

	// Disable split visually on register page for an independent feel
	let isRegister = $derived(page.url.pathname === '/register');

	onMount(() => {
		const unsubscribe = authStore.subscribe((state) => {
			if (state.session && !state.loading) {
				goto(resolve('/dashboard'));
			}
		});
		return unsubscribe;
	});
</script>

<AuthShell split={!isRegister}>
	{@render children()}
</AuthShell>
