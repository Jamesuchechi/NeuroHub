<script lang="ts">
	import { resolve } from '$app/paths';
	import { supabase } from '$lib/services/supabase';
	import { authStore } from '$lib/stores/authStore';
	import { goto } from '$app/navigation';
	import Input from '$lib/components/ui/Input.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	let password = $state('');
	let loading = $state(false);
	let error = $state('');

	async function handleReset(e: SubmitEvent) {
		e.preventDefault();
		loading = true;
		error = '';

		const { error: err } = await supabase.auth.updateUser({
			password
		});

		if (err) {
			error = err.message;
			loading = false;
		} else {
			const { data } = await supabase.auth.getSession();
			authStore.setSession(data.session);
			goto(resolve('/dashboard' as unknown as '/'));
		}
	}
</script>

<div class="mb-10 text-center md:text-left">
	<h2 class="mb-2 text-3xl font-extrabold text-white">Update password.</h2>
	<p class="text-sm text-zinc-500">Enter a new secure password for your account</p>
</div>

<form onsubmit={handleReset}>
	<Input
		label="New Password"
		type="password"
		bind:value={password}
		placeholder="Minimum 6 characters"
		required
	/>

	{#if error}
		<p class="mb-4 text-xs font-medium text-red-500">{error}</p>
	{/if}

	<Button type="submit" {loading}>Update Password</Button>
</form>
