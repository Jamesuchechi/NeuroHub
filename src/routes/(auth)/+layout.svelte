<script lang="ts">
	import { resolve } from '$app/paths';
	import { authStore } from '$lib/stores/authStore';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import AuthShell from '$lib/components/auth/AuthShell.svelte';

	let { children } = $props();

	onMount(() => {
		const unsubscribe = authStore.subscribe((state) => {
			if (state.session && !state.loading) {
				goto(resolve('/dashboard'));
			}
		});
		return unsubscribe;
	});
</script>

<AuthShell>
	{@render children()}
</AuthShell>
