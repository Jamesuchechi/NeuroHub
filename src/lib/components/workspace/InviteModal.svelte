<script lang="ts">
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { uiStore } from '$lib/stores/uiStore';
	import { workspacesService } from '$lib/services/workspaces';
	import { notificationService } from '$lib/services/notificationService';
	import { authStore } from '$lib/stores/authStore';
	import Modal from '../ui/Modal.svelte';
	import Avatar from '../ui/Avatar.svelte';
	import Button from '../ui/Button.svelte';
	import { fade, slide } from 'svelte/transition';

	const workspace = $derived($workspaceStore.currentWorkspace);
	const user = $derived($authStore.user);

	interface SearchResult {
		id: string;
		username: string | null;
		avatar_url: string | null;
		full_name: string | null;
	}

	let searchQuery = $state('');
	let searching = $state(false);
	let results = $state<SearchResult[]>([]);
	let selectedRole = $state<'member' | 'guest' | 'owner'>('member');
	let invitingId = $state<string | null>(null);

	const isEmail = $derived(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(searchQuery));

	let debounceTimer: ReturnType<typeof setTimeout>;

	async function handleSearch() {
		if (searchQuery.length < 2) {
			results = [];
			return;
		}

		searching = true;
		try {
			results = await workspacesService.searchProfiles(searchQuery);
			// Filter out current members and the user themselves
			const memberIds = new Set($workspaceStore.members.map((m) => m.user_id));
			results = results.filter((r) => r.id !== user?.id && !memberIds.has(r.id));
		} catch (err) {
			console.error('[InviteModal] Search failed:', err);
		} finally {
			searching = false;
		}
	}

	function onInput() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(handleSearch, 300);
	}

	async function sendInvite(profile: SearchResult) {
		if (!workspace || !user) return;
		invitingId = profile.id;

		try {
			// 1. Create a workspace invite record (reuse token logic for acceptance)
			const invite = await workspacesService.createInvite(
				workspace.id,
				'in-app-invite',
				selectedRole
			);

			// 2. Create a notification for the recipient
			await notificationService.createNotification(
				profile.id,
				workspace.id,
				'workspace_invite',
				user.id,
				{
					workspace_name: workspace.name,
					workspace_slug: workspace.slug,
					invite_token: invite.token,
					role: selectedRole
				}
			);

			import('$lib/stores/toastStore').then((m) =>
				m.toast.show(`Invite sent to @${profile.username}`, 'success')
			);

			// Remove from results
			results = results.filter((r) => r.id !== profile.id);
		} catch (err) {
			console.error('[InviteModal] Failed to send invite:', err);
			import('$lib/stores/toastStore').then((m) => m.toast.show('Failed to send invite', 'error'));
		} finally {
			invitingId = null;
		}
	}

	async function sendEmailInvite() {
		if (!workspace || !user || !isEmail) return;
		invitingId = searchQuery;

		try {
			const invite = await workspacesService.createInvite(workspace.id, searchQuery, selectedRole);
			const origin = window.location.origin;
			const inviteLink = `${origin}/invite/${invite.token}`;

			import('$lib/stores/toastStore').then((m) =>
				m.toast.show(`Invite link generated for ${searchQuery}`, 'success')
			);

			// Copy to clipboard automatically for convenience
			await navigator.clipboard.writeText(inviteLink);
			import('$lib/stores/toastStore').then((m) =>
				m.toast.show('Invite link copied to clipboard', 'info')
			);

			searchQuery = '';
			results = [];
		} catch (err) {
			console.error('[InviteModal] Failed to send email invite:', err);
			import('$lib/stores/toastStore').then((m) =>
				m.toast.show('Failed to generate invite', 'error')
			);
		} finally {
			invitingId = null;
		}
	}
</script>

<Modal
	show={$uiStore.inviteModalOpen}
	title="Invite to Workspace"
	onclose={() => uiStore.setInviteModalOpen(false)}
>
	<div class="space-y-6">
		<div class="space-y-2">
			<label
				for="user-search"
				class="text-[10px] font-bold tracking-widest text-zinc-500 uppercase"
			>
				Find Teammates
			</label>
			<div class="relative">
				<input
					id="user-search"
					type="text"
					bind:value={searchQuery}
					oninput={onInput}
					placeholder="Search by username or name..."
					class="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-3 text-sm text-white transition-all outline-none focus:border-brand-orange"
				/>
				{#if searching}
					<div class="absolute top-1/2 right-4 -translate-y-1/2">
						<div
							class="h-4 w-4 animate-spin rounded-full border-2 border-brand-orange border-t-transparent"
						></div>
					</div>
				{/if}
			</div>
		</div>

		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<span class="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Results</span>
				<div class="flex items-center gap-2">
					<span class="text-[10px] text-zinc-600">Assign Role:</span>
					<select
						bind:value={selectedRole}
						class="bg-transparent text-[10px] font-bold text-brand-orange uppercase outline-none"
					>
						<option value="member">Member</option>
						<option value="guest">Guest</option>
						{#if $workspaceStore.userRole === 'owner'}
							<option value="owner">Owner</option>
						{/if}
					</select>
				</div>
			</div>

			<div class="max-h-60 space-y-2 overflow-y-auto pr-2">
				{#each results as profile (profile.id)}
					<div
						in:slide={{ duration: 200 }}
						class="flex items-center justify-between rounded-xl border border-white/5 bg-white/2 p-3 transition-colors hover:bg-white/5"
					>
						<div class="flex items-center gap-3 overflow-hidden">
							<Avatar name={profile.username || 'User'} src={profile.avatar_url} size="sm" />
							<div class="overflow-hidden">
								<p class="truncate text-sm font-bold text-white">
									{profile.full_name || profile.username}
								</p>
								<p class="truncate text-[10px] text-zinc-500">@{profile.username}</p>
							</div>
						</div>
						<Button
							size="sm"
							variant="secondary"
							class="w-auto px-4 py-1.5 text-[10px] shadow-neon-orange"
							onclick={() => sendInvite(profile)}
							loading={invitingId === profile.id}
						>
							Invite
						</Button>
					</div>
				{:else}
					{#if isEmail && !searching}
						<div
							in:slide
							class="flex items-center justify-between rounded-xl border border-brand-orange/20 bg-brand-orange/5 p-4"
						>
							<div class="flex items-center gap-3">
								<div
									class="flex h-10 w-10 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange"
								>
									<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
										/>
									</svg>
								</div>
								<div>
									<p class="text-xs font-bold text-white">Invite via Link</p>
									<p class="text-[10px] text-zinc-500 line-clamp-1">{searchQuery}</p>
								</div>
							</div>
							<Button
								size="sm"
								variant="primary"
								class="w-auto px-4 py-1.5 text-[10px] shadow-neon-orange"
								onclick={sendEmailInvite}
								loading={invitingId === searchQuery}
							>
								Invite
							</Button>
						</div>
					{:else if searchQuery.length >= 2 && !searching}
						<div class="py-8 text-center" in:fade>
							<p class="text-xs text-zinc-600 italic">No users found matching "{searchQuery}"</p>
						</div>
					{:else if !searching}
						<div class="py-8 text-center">
							<p class="text-xs text-zinc-600">Search by name, username, or email...</p>
						</div>
					{/if}
				{/each}
			</div>
		</div>

		<div class="rounded-xl border border-white/5 bg-zinc-900/50 p-4">
			<p class="text-[10px] leading-relaxed text-zinc-500">
				Invited users will receive a notification to join <span class="font-bold text-white"
					>{workspace?.name || 'this workspace'}</span
				>. Once they accept, they will have immediate access to all non-private channels.
			</p>
		</div>
	</div>
</Modal>
