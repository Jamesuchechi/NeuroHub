<script lang="ts">
	import { resolve } from '$app/paths';
	import { authStore } from '$lib/stores/authStore';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import AppShell from '$lib/components/layout/AppShell.svelte';

	let { children } = $props();

	onMount(() => {
		// Guard: If not logged in and not loading, redirect to login
		const unsubscribe = authStore.subscribe((state) => {
			if (!state.loading && !state.session) {
				goto(resolve('/login' as unknown as '/'));
			}
		});
		return unsubscribe;
	});
</script>

{#if $authStore.session}
	<AppShell>
		{@render children()}
	</AppShell>
{:else}
	<!-- Transition loading state while checking session -->
	<div class="flex min-h-screen items-center justify-center bg-black">
		<div
			class="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent"
		></div>
	</div>
{/if}
