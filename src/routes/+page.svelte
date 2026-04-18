<script lang="ts">
	import { resolve } from '$app/paths';
	import { supabase } from '$lib/services/supabase';
	import { authStore } from '$lib/stores/authStore';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import AuthShell from '$lib/components/auth/AuthShell.svelte';
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
			error = err.message;
			loading = false;
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

<AuthShell>
	<div class="mb-10 text-center md:text-left">
		<h2 class="mb-2 text-3xl font-black text-white">Log in.</h2>
		<p class="text-sm text-zinc-500">Welcome back to your workspace</p>
	</div>

	<div class="flex flex-col gap-3">
		<SocialButton icon="google" onclick={() => handleOAuth('google')}>
			Log in with Google
		</SocialButton>
		<SocialButton icon="github" onclick={() => handleOAuth('github')}>
			Log in with GitHub
		</SocialButton>
	</div>

	<div
		class="my-8 flex items-center gap-3 text-[10px] font-bold tracking-[2px] text-zinc-600 uppercase"
	>
		<div class="h-px flex-1 bg-zinc-900"></div>
		or email login
		<div class="h-px flex-1 bg-zinc-900"></div>
	</div>

	<form onsubmit={handleLogin} class="space-y-4">
		<Input
			label="Email address"
			type="email"
			bind:value={email}
			placeholder="you@work.com"
			required
		/>

		<div class="space-y-1.5">
			<div class="flex items-center justify-between px-1">
				<label for="password" class="text-[10px] font-black tracking-widest text-zinc-500 uppercase"
					>Password</label
				>
				<a
					href={resolve('/forgot-password' as unknown as '/')}
					class="text-[10px] font-bold text-brand-orange transition-all hover:underline">Forgot?</a
				>
			</div>
			<Input id="password" type="password" bind:value={password} placeholder="••••••••" required />
		</div>

		{#if error}
			<p class="animate-pulse text-center text-xs font-semibold text-red-500">{error}</p>
		{/if}

		<div class="pt-4">
			<Button type="submit" {loading} width="full">Continue to Hub</Button>
		</div>
	</form>

	<div class="mt-12 rounded-2xl border border-white/5 bg-white/2 p-6 text-center">
		<p class="text-sm text-zinc-500">
			Don't have an account?
			<a
				href={resolve('/register' as unknown as '/')}
				class="font-black text-brand-orange transition-all hover:underline"
			>
				Sign Up
			</a>
		</p>
	</div>

	<p class="mt-12 text-center text-[10px] leading-relaxed text-zinc-600">
		By continuing, you agree to our
		<a href={resolve('/terms' as unknown as '/')} class="transition-colors hover:text-white"
			>Terms</a
		>
		&
		<a href={resolve('/privacy' as unknown as '/')} class="transition-colors hover:text-white"
			>Privacy</a
		>.
	</p>
</AuthShell>
