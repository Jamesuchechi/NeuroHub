<script lang="ts">
	import { resolve } from '$app/paths';
	import { supabase } from '$lib/services/supabase';
	import { authStore } from '$lib/stores/authStore';
	import { goto } from '$app/navigation';
	import Input from '$lib/components/ui/Input.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	let email = $state('');
	let username = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state('');
	let usernameError = $state('');
	let usernameValidating = $state(false);

	let debounceTimer: ReturnType<typeof setTimeout>;

	async function checkUsername(name: string) {
		if (name.length < 3) {
			usernameError = 'Minimum 3 characters';
			return;
		}

		usernameValidating = true;
		usernameError = '';

		const { data, error: err } = await supabase
			.from('profiles')
			.select('username')
			.eq('username', name)
			.single();

		if (data) {
			usernameError = 'Username already taken';
		} else if (err && err.code !== 'PGRST116') {
			// PGRST116 is "not found", which is what we want
			console.error(err);
		}

		usernameValidating = false;
	}

	function onUsernameInput(e: Event) {
		const target = e.target as HTMLInputElement;
		username = target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');

		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			if (username) checkUsername(username);
		}, 500);
	}

	async function handleRegister(e: SubmitEvent) {
		e.preventDefault();
		if (usernameError || usernameValidating) return;

		loading = true;
		error = '';

		const { data, error: err } = await supabase.auth.signUp({
			email,
			password,
			options: {
				data: {
					username: username
				}
			}
		});

		if (err) {
			error = err.message;
			loading = false;
		} else {
			// Success - redirect or show verification message
			authStore.setSession(data.session);
			goto(resolve('/dashboard' as unknown as '/'));
		}
	}
</script>

<div class="mb-10 text-center md:text-left">
	<div class="brand mb-8 flex items-center">
		<img src="/logo.png" alt="NeuroHub" class="h-16 w-auto" />
	</div>
	<h2 class="mb-2 text-3xl font-extrabold text-white">Create account.</h2>
	<p class="text-sm text-zinc-500">Pick a unique username for the workspace</p>
</div>

<form onsubmit={handleRegister}>
	<div class="field-group mb-4.5">
		<label
			for="username"
			class="mb-2 block text-[10px] font-bold tracking-[1px] text-zinc-500 uppercase"
			>Username</label
		>
		<div class="relative">
			<input
				id="username"
				type="text"
				value={username}
				oninput={onUsernameInput}
				placeholder="johndoe"
				required
				class="w-full rounded-xl border border-zinc-900 bg-zinc-950 px-4 py-3.5 text-sm text-white transition-all outline-none placeholder:text-zinc-700 focus:border-orange-500 {usernameError
					? 'border-red-500'
					: ''}"
			/>
			{#if usernameValidating}
				<div class="absolute top-1/2 right-4 -translate-y-1/2">
					<div
						class="h-4 w-4 animate-spin rounded-full border-2 border-orange-500 border-t-transparent"
					></div>
				</div>
			{:else if username && !usernameError}
				<div class="absolute top-1/2 right-4 -translate-y-1/2 text-green-500">
					<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="3"
							d="M5 13l4 4L19 7"
						/>
					</svg>
				</div>
			{/if}
		</div>
		{#if usernameError}
			<p class="mt-1.5 text-xs text-red-500">{usernameError}</p>
		{/if}
	</div>

	<Input
		label="Email address"
		type="email"
		bind:value={email}
		placeholder="you@example.com"
		required
	/>
	<Input
		label="Password"
		type="password"
		bind:value={password}
		placeholder="Minimum 6 characters"
		required
	/>

	{#if error}
		<p class="mb-4 text-xs font-medium text-red-500">{error}</p>
	{/if}

	<Button type="submit" {loading} disabled={!!usernameError || usernameValidating}>
		Create Account
	</Button>
</form>

<p class="mt-6 text-center text-[13px] text-zinc-500">
	Already have an account? <a
		href={resolve('/login' as unknown as '/')}
		class="font-bold text-orange-500 hover:underline">Sign in</a
	>
</p>
