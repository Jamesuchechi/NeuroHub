<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { supabase } from '$lib/services/supabase';
	import Button from '$lib/components/ui/Button.svelte';
	import { goto } from '$app/navigation';

	const email = $derived(page.url.searchParams.get('email') || '');
	let loading = $state(false);
	let resendSent = $state(false);
	let error = $state('');

	async function handleResend() {
		if (!email) {
			error = 'No email address found to resend verification to.';
			return;
		}

		loading = true;
		error = '';

		const { error: err } = await supabase.auth.resend({
			type: 'signup',
			email,
			options: {
				emailRedirectTo: `${window.location.origin}/auth/callback`
			}
		});

		if (err) {
			error = err.message;
		} else {
			resendSent = true;
		}
		loading = false;
	}
</script>

<div class="mb-10 text-center md:text-left">
	<div class="mb-6 flex justify-center md:justify-start">
		<div
			class="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-orange/10 text-brand-orange shadow-neon-orange"
		>
			<svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="1.5"
					d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
				/>
			</svg>
		</div>
	</div>
	<h2 class="mb-2 text-3xl font-black text-white">Check your email.</h2>
	<p class="text-sm text-zinc-500">
		We've sent a verification link to <span class="font-bold text-white"
			>{email || 'your email'}</span
		>.
	</p>
</div>

<div class="space-y-6">
	<div
		class="rounded-2xl border border-white/5 bg-white/2 p-6 text-sm leading-relaxed text-zinc-400"
	>
		<p>
			Please click the link in the email to confirm your account. If you don't see it, check your
			<span class="text-white italic">spam folder</span>.
		</p>
	</div>

	{#if error}
		<p class="text-center text-xs font-semibold text-red-500">{error}</p>
	{/if}

	{#if resendSent}
		<div class="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-center">
			<p class="text-xs font-bold text-green-500">Verification link resent successfully!</p>
		</div>
	{:else}
		<Button variant="primary" onclick={handleResend} {loading}>Resend Verification Link</Button>
	{/if}

	<div class="pt-4 text-center">
		<button
			onclick={() => goto(resolve('/' as unknown as '/'))}
			class="text-xs font-bold text-zinc-500 transition-colors hover:text-brand-orange"
		>
			Back to Login
		</button>
	</div>
</div>

<p class="mt-12 text-center text-[10px] leading-relaxed text-zinc-600">
	Need help? Contact our support at
	<a href="mailto:support@neurohub.io" class="transition-colors hover:text-white"
		>support@neurohub.io</a
	>
</p>
