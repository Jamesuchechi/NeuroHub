<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/services/supabase';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';

	let loading = $state(true);
	let factorId = $state('');
	let qrCode = $state('');
	let verifyCode = $state('');
	let step = $state<'initial' | 'verify'>('initial');
	let error = $state('');
	let enrolled = $state(false);

	async function checkMFAStatus() {
		const { data, error: err } = await supabase.auth.mfa.listFactors();
		if (err) {
			console.error(err);
			return;
		}
		enrolled = data.all.length > 0;
		loading = false;
	}

	async function enroll() {
		error = '';
		const { data, error: err } = await supabase.auth.mfa.enroll({
			factorType: 'totp',
			issuer: 'NeuroHub',
			friendlyName: 'NeuroHub Account'
		});

		if (err) {
			error = err.message;
			return;
		}

		factorId = data.id;
		qrCode = data.totp.qr_code;
		step = 'verify';
	}

	async function verify() {
		error = '';
		const { error: err } = await supabase.auth.mfa.challengeAndVerify({
			factorId,
			code: verifyCode
		});

		if (err) {
			error = err.message;
			return;
		}

		enrolled = true;
		step = 'initial';
		alert('MFA enrolled successfully!');
	}

	async function unenroll() {
		if (!confirm('Are you sure you want to disable MFA?')) return;

		const { data: factors } = await supabase.auth.mfa.listFactors();
		for (const factor of factors.all) {
			await supabase.auth.mfa.unenroll({ factorId: factor.id });
		}
		enrolled = false;
	}

	onMount(checkMFAStatus);
</script>

<div class="min-h-screen bg-black p-8 text-white md:p-16">
	<div class="mx-auto max-w-xl">
		<h1 class="mb-2 text-3xl font-black">Security Settings</h1>
		<p class="mb-10 text-sm text-zinc-500">
			Manage your multi-factor authentication and account security.
		</p>

		<div class="rounded-2xl border border-zinc-900 bg-zinc-950 p-8">
			<div class="mb-8 flex items-start justify-between">
				<div>
					<h3 class="mb-1 text-lg font-bold">Two-Factor Authentication (MFA)</h3>
					<p class="text-sm leading-relaxed text-zinc-500">
						Add an extra layer of security to your account by requiring a code from an authenticator
						app.
					</p>
				</div>
				<div
					class="rounded bg-zinc-900 px-2 py-1 text-[10px] font-bold tracking-wider uppercase {enrolled
						? 'text-green-500'
						: 'text-zinc-600'}"
				>
					{enrolled ? 'Enabled' : 'Disabled'}
				</div>
			</div>

			{#if loading}
				<div class="h-12 animate-pulse rounded-xl bg-zinc-900"></div>
			{:else if step === 'initial'}
				{#if enrolled}
					<Button variant="secondary" onclick={unenroll}>Disable 2FA</Button>
				{:else}
					<div class="space-y-6">
						<div
							class="rounded-xl border border-orange-500/20 bg-orange-500/10 p-4 text-sm text-orange-500 italic"
						>
							MFA significantly improves your account security. We recommend all users enable it.
						</div>
						<Button onclick={enroll}>Enable 2FA</Button>
					</div>
				{/if}
			{:else if step === 'verify'}
				<div class="space-y-8">
					<div class="flex flex-col items-center">
						<div class="mb-6 rounded-2xl bg-white p-4">
							<img src={qrCode} alt="MFA QR Code" class="h-48 w-48" />
						</div>
						<p class="max-w-sm text-center text-sm text-zinc-400">
							Scan this QR code with your authenticator app (like Google Authenticator, Authy, or
							1Password).
						</p>
					</div>

					<div class="space-y-4">
						<Input label="Verification Code" bind:value={verifyCode} placeholder="123456" />
						{#if error}
							<p class="text-xs text-red-500">{error}</p>
						{/if}
						<div class="flex gap-4">
							<Button variant="secondary" onclick={() => (step = 'initial')}>Cancel</Button>
							<Button onclick={verify}>Verify and Enable</Button>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
