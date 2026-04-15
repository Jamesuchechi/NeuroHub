<script lang="ts">
	import { resolve } from '$app/paths';
	import { supabase } from '$lib/services/supabase';
	import Input from '$lib/components/ui/Input.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	let email = $state('');
	let loading = $state(false);
	let message = $state('');
	let error = $state('');

	async function handleResetRequest(e: SubmitEvent) {
		e.preventDefault();
		loading = true;
		message = '';
		error = '';

		const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo: `${window.location.origin}/reset-password`
		});

		if (err) {
			error = err.message;
		} else {
			message = 'Check your email for the reset link.';
		}
		loading = false;
	}
</script>

<div class="mb-10 text-center md:text-left">
	<h2 class="mb-2 text-3xl font-extrabold text-white">Reset password.</h2>
	<p class="text-sm text-zinc-500">Enter your email to receive a recovery link</p>
</div>

{#if message}
	<div class="mb-6 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-400">
		{message}
	</div>
	<Button variant="ghost" onclick={() => (message = '')}>Send again</Button>
{:else}
	<form onsubmit={handleResetRequest}>
		<Input
			label="Email address"
			type="email"
			bind:value={email}
			placeholder="you@example.com"
			required
		/>

		{#if error}
			<p class="mb-4 text-xs font-medium text-red-500">{error}</p>
		{/if}

		<Button type="submit" {loading}>Send Link</Button>
	</form>
{/if}

<p class="mt-6 text-center text-[13px] text-zinc-500">
	Remembered your password? <a
		href={resolve('/' as unknown as '/')}
		class="font-bold text-orange-500 hover:underline">Sign in</a
	>
</p>
