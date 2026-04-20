<script lang="ts">
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { chatStore } from '$lib/stores/chatStore.svelte';
	import { profileStore } from '$lib/stores/profileStore';
	import { chatService } from '$lib/services/chatService';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { fly } from 'svelte/transition';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { uiStore } from '$lib/stores/uiStore';

	const currentWorkspace = $derived($workspaceStore.currentWorkspace);
	const members = $derived($workspaceStore.members);
	const userRole = $derived($workspaceStore.userRole);
	const profile = $derived($profileStore.profile);

	let searchQuery = $state('');
	let roleFilter = $state('all');
	let processingId = $state<string | null>(null);

	const filteredMembers = $derived(
		members.filter((m) => {
			const matchesSearch =
				(m.profile.username?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
				(m.profile.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase());
			const matchesRole = roleFilter === 'all' || m.role === roleFilter;
			return matchesSearch && matchesRole;
		})
	);

	function isOnline(userId: string) {
		return !!chatStore.presence[userId];
	}

	async function handleMessage(memberId: string) {
		if (!currentWorkspace || !profile || memberId === profile.id) return;
		processingId = memberId;
		try {
			const channel = await chatService.getOrCreateDMChannel(
				currentWorkspace.id,
				profile.id,
				memberId
			);
			// Re-init chat store to ensure the channel is in the list
			await chatStore.init(currentWorkspace.id);
			goto(resolve(`/workspace/${currentWorkspace.slug}/chat/${channel.id}`));
		} catch (err) {
			console.error('[MembersPage] DM initialization failed:', err);
			import('$lib/stores/toastStore').then((m) =>
				m.toast.show('Failed to start conversation', 'error')
			);
		} finally {
			processingId = null;
		}
	}

	async function handleRoleChange(userId: string, newRole: 'owner' | 'member' | 'guest') {
		try {
			await workspaceStore.updateMemberRole(userId, newRole);
			import('$lib/stores/toastStore').then((m) => m.toast.show('Member role updated', 'success'));
		} catch (err) {
			console.error(err);
			import('$lib/stores/toastStore').then((m) => m.toast.show('Failed to update role', 'error'));
		}
	}

	async function handleRemoveMember(userId: string) {
		if (!confirm('Are you sure you want to remove this member?')) return;
		try {
			await workspaceStore.removeMember(userId);
			import('$lib/stores/toastStore').then((m) =>
				m.toast.show('Member removed from workspace', 'success')
			);
		} catch (err) {
			console.error(err);
			import('$lib/stores/toastStore').then((m) =>
				m.toast.show('Failed to remove member', 'error')
			);
		}
	}
</script>

<div class="scrollbar-none h-full overflow-y-auto bg-surface p-6 md:p-12">
	<div class="mx-auto max-w-6xl">
		<!-- Header -->
		<header class="mb-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
			<div>
				<h1 class="text-4xl font-black tracking-tighter text-content">Team Members</h1>
				<p class="mt-2 text-sm text-content-dim">
					Find and collaborate with everyone in <span class="font-bold text-content"
						>{currentWorkspace?.name}</span
					>.
				</p>
			</div>
			<div class="flex items-center gap-3">
				<Button variant="primary" size="sm" onclick={() => uiStore.setInviteModalOpen(true)}>
					Invite New Member
				</Button>
			</div>
		</header>

		<!-- Filters -->
		<div class="mb-8 flex flex-col gap-4 md:flex-row md:items-center">
			<div class="relative flex-1">
				<div
					class="pointer-events-none absolute inset-y-0 left-4 flex items-center text-content-dim"
				>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
						/>
					</svg>
				</div>
				<input
					type="text"
					placeholder="Search members by name or username..."
					bind:value={searchQuery}
					class="w-full rounded-2xl border border-stroke bg-surface-dim px-11 py-3 text-sm text-content transition-all outline-none focus:border-brand-orange/50"
				/>
			</div>
			<select
				bind:value={roleFilter}
				class="rounded-2xl border border-stroke bg-surface-dim px-4 py-3 text-sm text-content transition-all outline-none focus:border-brand-orange/50"
			>
				<option value="all">All Roles</option>
				<option value="owner">Owners</option>
				<option value="member">Members</option>
				<option value="guest">Guests</option>
			</select>
		</div>

		<!-- Members Grid -->
		<div class="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
			{#each filteredMembers as member (member.user_id)}
				<div
					in:fly={{ y: 20, duration: 300 }}
					class="group relative flex flex-col overflow-hidden rounded-3xl border border-stroke bg-surface-dim/50 p-6 transition-all hover:border-brand-orange/30 hover:bg-surface-dim"
				>
					<div class="flex items-start gap-4">
						<div class="relative">
							<Avatar
								name={member.profile.username || 'User'}
								src={member.profile.avatar_url}
								size="xl"
								class="rounded-3xl shadow-2xl"
							/>
							{#if isOnline(member.user_id)}
								<div
									class="shadow-neon-green absolute -right-1 -bottom-1 h-4 w-4 rounded-full border-2 border-surface bg-brand-green"
									title="Online"
								></div>
							{/if}
						</div>
						<div class="flex-1 overflow-hidden">
							<h3 class="truncate text-lg font-bold text-content">
								{member.profile.full_name || member.profile.username || 'Anonymous'}
							</h3>
							<p class="truncate text-xs text-content-dim">
								@{member.profile.username || 'unknown'}
							</p>
							<div class="mt-2 flex items-center gap-2">
								<span
									class="rounded-full bg-zinc-900 px-2 py-0.5 text-[9px] font-black tracking-widest text-white uppercase shadow-sm"
								>
									{member.role}
								</span>
								{#if member.user_id === profile?.id}
									<span
										class="rounded-full bg-brand-orange/10 px-2 py-0.5 text-[9px] font-bold text-brand-orange uppercase"
									>
										You
									</span>
								{/if}
							</div>
						</div>
					</div>

					<div class="mt-8 flex items-center gap-2">
						{#if member.user_id !== profile?.id}
							<Button
								variant="primary"
								size="sm"
								class="flex-1 shadow-neon-orange"
								onclick={() => handleMessage(member.user_id)}
								loading={processingId === member.user_id}
							>
								Message
							</Button>
						{:else}
							<Button
								variant="secondary"
								size="sm"
								class="flex-1"
								onclick={() => goto(resolve('/profile'))}
							>
								Edit Profile
							</Button>
						{/if}

						{#if userRole === 'owner' && member.user_id !== profile?.id}
							<div class="flex gap-2">
								<select
									value={member.role}
									onchange={(e) =>
										handleRoleChange(
											member.user_id,
											e.currentTarget.value as 'owner' | 'member' | 'guest'
										)}
									class="rounded-xl border border-stroke bg-surface-dim px-2 text-[10px] font-bold text-content outline-none focus:border-brand-orange"
								>
									<option value="owner">Owner</option>
									<option value="member">Member</option>
									<option value="guest">Guest</option>
								</select>

								<button
									onclick={() => handleRemoveMember(member.user_id)}
									class="flex h-9 w-9 items-center justify-center rounded-xl border border-stroke bg-surface-dim text-content-dim transition-all hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-500"
									title="Remove from workspace"
								>
									<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
										/>
									</svg>
								</button>
							</div>
						{/if}
					</div>
				</div>
			{:else}
				<div
					class="col-span-full flex flex-col items-center justify-center rounded-3xl border border-dashed border-stroke py-20 text-center"
				>
					<div
						class="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-dim text-content-dim"
					>
						<svg class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="1.5"
								d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
							/>
						</svg>
					</div>
					<h3 class="text-xl font-bold text-content">No teammates found</h3>
					<p class="mt-2 text-sm text-content-dim">
						Try adjusting your search or filters to find who you're looking for.
					</p>
					<Button variant="secondary" size="sm" class="mt-6" onclick={() => (searchQuery = '')}>
						Clear search
					</Button>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.scrollbar-none::-webkit-scrollbar {
		display: none;
	}
	.scrollbar-none {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>
