<script lang="ts">
	import { onMount } from 'svelte';
	import { profileStore } from '$lib/stores/profileStore';
	import { authStore } from '$lib/stores/authStore';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	onMount(() => {
		const unsubscribe = profileStore.subscribe((state) => {
			if (state.profile?.username) {
				goto(resolve(`/profile/${state.profile.username}` as unknown as '/'));
			} else if (!state.loading && !$authStore.loading && !$authStore.session) {
				goto(resolve('/login' as unknown as '/'));
			}
		});

		return unsubscribe;
	});
</script>

<div class="flex h-screen w-full items-center justify-center bg-surface">
	<div class="flex flex-col items-center gap-4">
		<div
			class="h-10 w-10 animate-spin rounded-full border-4 border-brand-orange border-t-transparent"
		></div>
		<p class="animate-pulse text-sm font-medium text-content-dim">Locating your profile...</p>
	</div>
</div>
