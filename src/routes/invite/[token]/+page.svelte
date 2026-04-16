<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { authStore } from '$lib/stores/authStore';
	import { workspacesService } from '$lib/services/workspaces';
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import type { AppDatabase } from '$lib/types/db';

	type InviteData = AppDatabase['public']['Tables']['workspace_invites']['Row'] & {
		workspace: AppDatabase['public']['Tables']['workspaces']['Row'];
	};

	let invite = $state<InviteData | null>(null);
	let loading = $state(true);
	let error = $state('');
	let accepting = $state(false);

	const { user } = $derived($authStore);

	async function loadInvite() {
		const token = page.params.token;
		if (!token) {
			error = 'Invalid invitation link.';
			loading = false;
			return;
		}

		try {
			invite = (await workspacesService.getInvite(token)) as InviteData;
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Invalid or expired invitation link.';
			error = message;
		} finally {
			loading = false;
		}
	}

	async function handleAccept() {
		const token = page.params.token;
		if (!token || !user) {
			goto(resolve(`/?redirect=/invite/${token || ''}`));
			return;
		}

		accepting = true;
		try {
			const workspace = await workspacesService.acceptInvite(token, user.id);
			goto(resolve(`/workspace/${workspace.slug}`));
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to accept invitation.';
			error = message;
		} finally {
			accepting = false;
		}
	}

	onMount(loadInvite);
</script>

<div class="flex min-h-screen items-center justify-center bg-black p-6 text-white">
	<div
		class="w-full max-w-md rounded-3xl border border-zinc-900 bg-zinc-950 p-8 text-center shadow-2xl md:p-12"
	>
		{#if loading}
			<div class="flex flex-col items-center">
				<div class="mb-6 h-16 w-16 animate-pulse rounded-2xl bg-zinc-900"></div>
				<div class="mb-4 h-6 w-48 animate-pulse rounded bg-zinc-900"></div>
				<div class="h-4 w-32 animate-pulse rounded bg-zinc-900"></div>
			</div>
		{:else if error}
			<div class="flex flex-col items-center">
				<div
					class="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500"
				>
					<svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
				</div>
				<h2 class="mb-2 text-xl font-bold">Invitation Error</h2>
				<p class="mb-8 text-zinc-500">{error}</p>
				<Button variant="secondary" onclick={() => goto(resolve('/'))}>Go back home</Button>
			</div>
		{:else if invite}
			<div class="flex flex-col items-center">
				<Avatar
					name={invite.workspace.name}
					src={invite.workspace.logo_url}
					size="xl"
					class="mb-8 rounded-2xl shadow-xl"
				/>

				<h2 class="mb-2 text-2xl font-black">You're invited!</h2>
				<p class="mb-10 leading-relaxed text-zinc-500">
					You have been invited to join the <span class="font-bold text-white"
						>{invite.workspace.name}</span
					>
					workspace as a
					<span class="text-xs font-bold tracking-wider text-orange-500 uppercase"
						>{invite.role}</span
					>.
				</p>

				{#if !user}
					<div class="w-full space-y-4">
						<Button onclick={handleAccept}>Sign in to accept</Button>
						<p class="text-[11px] text-zinc-600 italic">You'll need a NeuroHub account to join.</p>
					</div>
				{:else}
					<Button onclick={handleAccept} loading={accepting}>Accept Invitation</Button>
				{/if}
			</div>
		{/if}
	</div>
</div>
