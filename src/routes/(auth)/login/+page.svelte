<script lang="ts">
	import { resolve } from '$app/paths';
	import { supabase } from '$lib/services/supabase';
	import { authStore } from '$lib/stores/authStore';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import SocialButton from '$lib/components/ui/SocialButton.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state('');

	async function handleLogin(e: SubmitEvent) {
		e.preventDefault();
		loading = true;
		error = '';

		const { data, error: err } = await supabase.auth.signInWithPassword({
			email,
			password
		});

		if (err) {
			if (err.message.toLowerCase().includes('email not confirmed')) {
				goto(resolve(`/verify-email?email=${encodeURIComponent(email)}` as unknown as '/'));
			} else {
				error = err.message;
				loading = false;
			}
		} else {
			authStore.setSession(data.session);
			goto(resolve('/dashboard' as unknown as '/'));
		}
	}

	async function handleOAuth(provider: 'google' | 'github') {
		await supabase.auth.signInWithOAuth({
			provider,
			options: {
				redirectTo: window.location.origin
			}
		});
	}

	onMount(() => {
		const unsubscribe = authStore.subscribe((state) => {
			if (state.session && !state.loading) {
				goto(resolve('/dashboard' as unknown as '/'));
			}
		});
		return unsubscribe;
	});
</script>

<div class="brand mb-8 flex items-center">
	<img src="/logo.png" alt="NeuroHub" class="h-16 w-auto" />
</div>

<h2 class="mb-1 text-3xl font-extrabold text-white">Welcome back.</h2>
<p class="mb-8 text-sm text-zinc-500">Sign in to your developer workspace</p>

<div class="flex flex-col gap-2.5">
	<SocialButton icon="google" onclick={() => handleOAuth('google')}>
		Sign in with Google
	</SocialButton>
	<SocialButton icon="github" onclick={() => handleOAuth('github')}>
		Sign in with GitHub
	</SocialButton>
</div>

<div
	class="my-6 flex items-center gap-3 text-[10px] font-bold tracking-widest text-zinc-500 uppercase"
>
	<div class="h-px flex-1 bg-zinc-800"></div>
	or
	<div class="h-px flex-1 bg-zinc-800"></div>
</div>

<form onsubmit={handleLogin}>
	<Input
		label="Email address"
		type="email"
		bind:value={email}
		placeholder="you@example.com"
		required
	/>
	<div class="mb-1 flex justify-between">
		<label class="text-[10px] font-bold tracking-[1px] text-zinc-500 uppercase" for="password"
			>Password</label
		>
		<a
			href={resolve('/forgot-password' as unknown as '/')}
			class="text-[10px] font-bold text-orange-500 hover:underline">Forgot password?</a
		>
	</div>
	<Input type="password" bind:value={password} placeholder="••••••••" required />

	{#if error}
		<p class="mb-4 text-xs font-medium text-red-500">{error}</p>
	{/if}

	<Button type="submit" {loading}>Sign In</Button>
</form>

<div
	class="my-6 flex items-center gap-3 text-[10px] font-bold tracking-widest text-zinc-500 uppercase"
>
	<div class="h-px flex-1 bg-zinc-800"></div>
	new here?
	<div class="h-px flex-1 bg-zinc-800"></div>
</div>

<Button variant="secondary" onclick={() => goto(resolve('/register' as unknown as '/'))}
	>Create an account</Button
>

<p class="mt-6 text-center text-[11px] leading-relaxed text-zinc-500">
	By signing in, you agree to our <a
		href={resolve('/terms' as unknown as '/')}
		class="text-orange-500 hover:underline">Terms of Service</a
	>
	and
	<a href={resolve('/privacy' as unknown as '/')} class="text-orange-500 hover:underline"
		>Privacy Policy</a
	>.
</p>
