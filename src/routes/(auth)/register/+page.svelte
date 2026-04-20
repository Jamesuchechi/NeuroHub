<script lang="ts">
	import { resolve } from '$app/paths';
	import { supabase } from '$lib/services/supabase';
	import { goto } from '$app/navigation';
	import Input from '$lib/components/ui/Input.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import BirthdaySelector from '$lib/components/ui/BirthdaySelector.svelte';
	import TagSelector from '$lib/components/ui/TagSelector.svelte';

	let email = $state('');
	let username = $state('');
	let password = $state('');
	let birthday = $state('');
	let title = $state('');
	let skills = $state<string[]>([]);

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

		const { error: err } = await supabase.auth.signUp({
			email,
			password,
			options: {
				emailRedirectTo: `${window.location.origin}/auth/callback`,
				data: {
					username,
					birthday,
					title,
					skills
				}
			}
		});

		if (err) {
			error = err.message;
			loading = false;
		} else {
			// Redirect to verification page instead of dashboard
			goto(resolve(`/verify-email?email=${encodeURIComponent(email)}` as unknown as '/'));
		}
	}
</script>

<div class="mb-10 text-center md:text-left">
	<h2 class="mb-2 text-3xl font-black text-white">Join the Hub.</h2>
	<p class="text-sm text-zinc-500">Sign up to build and collaborate with developers.</p>
</div>

<form onsubmit={handleRegister} class="space-y-8">
	<!-- Account Basics -->
	<section class="space-y-4">
		<div
			class="flex items-center gap-2 text-[10px] font-bold tracking-widest text-brand-orange uppercase"
		>
			<div class="h-1 w-1 rounded-full bg-brand-orange"></div>
			Account Basics
		</div>

		<div class="field-group">
			<label
				for="username"
				class="mb-2.5 block text-[10px] font-black tracking-widest text-zinc-500 uppercase"
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
					class="w-full rounded-2xl border border-white/5 bg-white/3 px-5 py-4 text-sm text-white transition-all outline-none placeholder:text-zinc-700 focus:border-brand-orange focus:bg-white/5 {usernameError
						? 'border-red-500'
						: ''}"
				/>
				{#if usernameValidating}
					<div class="absolute top-1/2 right-4 -translate-y-1/2">
						<div
							class="h-4 w-4 animate-spin rounded-full border-2 border-brand-orange border-t-transparent"
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
				<div class="mt-2 px-1">
					<p class="text-xs font-semibold text-red-500">{usernameError}</p>
				</div>
			{/if}
		</div>

		<Input
			label="Email address"
			type="email"
			bind:value={email}
			placeholder="you@work.com"
			required
		/>
		<Input
			label="Password"
			type="password"
			bind:value={password}
			placeholder="Minimum 6 characters"
			required
		/>
	</section>

	<div class="h-px w-full bg-white/5"></div>

	<!-- Developer Profile -->
	<section class="space-y-6 text-left">
		<div
			class="flex items-center gap-2 text-[10px] font-bold tracking-widest text-brand-blue uppercase"
		>
			<div class="h-1 w-1 rounded-full bg-brand-blue"></div>
			Developer Profile
		</div>

		<BirthdaySelector bind:value={birthday} />

		<Input
			label="Professional Title"
			placeholder="e.g. Senior Software Engineer"
			bind:value={title}
		/>

		<TagSelector bind:value={skills} label="Skills" placeholder="Add skills (Go, AI, Svelte...)" />
	</section>

	{#if error}
		<p class="animate-pulse text-center text-xs font-semibold text-red-500">{error}</p>
	{/if}

	<div class="pt-6">
		<Button type="submit" {loading} disabled={!!usernameError || usernameValidating} width="full">
			Complete Registration
		</Button>
	</div>
</form>

<div class="mt-12 rounded-2xl border border-white/5 bg-white/2 p-10 text-center">
	<p class="text-sm text-zinc-500">
		Already part of NeuroHub?
		<a
			href={resolve('/' as unknown as '/')}
			class="font-black text-brand-orange transition-all hover:underline"
		>
			Log In
		</a>
	</p>
</div>

<p class="mt-12 text-center text-[10px] leading-relaxed text-zinc-600">
	By creating an account, you agree to our
	<a href={resolve('/terms' as unknown as '/')} class="transition-colors hover:text-white">Terms</a>
	&
	<a href={resolve('/privacy' as unknown as '/')} class="transition-colors hover:text-white"
		>Privacy</a
	>.
</p>
