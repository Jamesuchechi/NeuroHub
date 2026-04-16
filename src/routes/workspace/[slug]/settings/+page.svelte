<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { authStore } from '$lib/stores/authStore';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { uiStore } from '$lib/stores/uiStore';
	import { goto } from '$app/navigation';
	import { workspacesService } from '$lib/services/workspaces';
	import { slugify } from '$lib/utils/slugify';
	import Input from '$lib/components/ui/Input.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';

	let activeTab = $state('general');
	let loading = $state(true);
	let saving = $state(false);

	// Form State
	let name = $state('');
	let slug = $state('');
	let description = $state('');
	let deleteConfirm = $state('');
	let showDeleteModal = $state(false);

	const { currentWorkspace, members, userRole } = $derived($workspaceStore);
	const session = $derived($authStore.session);

	async function loadWorkspace() {
		const slugParam = page.params.slug;
		if (!session?.user || !slugParam) return;

		loading = true;
		try {
			await workspaceStore.setWorkspace(slugParam, session.user.id);
			if (currentWorkspace) {
				name = currentWorkspace.name;
				slug = currentWorkspace.slug;
				description = currentWorkspace.description || '';
			}
		} catch (err) {
			console.error(err);
			goto(resolve('/dashboard'));
		} finally {
			loading = false;
		}
	}

	async function handleLogoUpload(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file || !currentWorkspace) return;

		saving = true;
		try {
			const logoUrl = await workspacesService.uploadLogo(currentWorkspace.id, file);
			await workspaceStore.updateWorkspace({ logo_url: logoUrl });
		} catch (err) {
			console.error(err);
		} finally {
			saving = false;
		}
	}

	async function handleUpdateGeneral() {
		saving = true;
		try {
			const finalSlug = slugify(slug);
			await workspaceStore.updateWorkspace({
				name,
				slug: finalSlug,
				description
			});
			if (finalSlug !== page.params.slug) {
				goto(resolve(`/workspace/${finalSlug}/settings`));
			}
		} catch (err) {
			console.error(err);
		} finally {
			saving = false;
		}
	}

	async function handleRoleChange(userId: string, newRole: 'owner' | 'member' | 'guest') {
		try {
			await workspaceStore.updateMemberRole(userId, newRole);
		} catch (err) {
			console.error(err);
		}
	}

	async function handleRemoveMember(userId: string) {
		if (!confirm('Are you sure you want to remove this member?')) return;
		try {
			await workspaceStore.removeMember(userId);
		} catch (err) {
			console.error(err);
		}
	}

	async function handleDeleteWorkspace() {
		if (deleteConfirm !== currentWorkspace?.name) return;
		try {
			await workspaceStore.deleteWorkspace();
			goto(resolve('/dashboard'));
		} catch (err) {
			console.error(err);
		}
	}

	onMount(loadWorkspace);
</script>

<div class="min-h-screen bg-black p-8 text-white md:p-16">
	<div class="mx-auto max-w-4xl">
		<button
			onclick={() => goto(resolve(`/workspace/${page.params.slug}`))}
			class="mb-8 flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-white"
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M10 19l-7-7m0 0l7-7m-7 7h18"
				/>
			</svg>
			Back to Workspace
		</button>

		<div class="mb-12 flex items-center gap-6">
			<Avatar
				name={currentWorkspace?.name}
				src={currentWorkspace?.logo_url}
				size="xl"
				class="rounded-2xl"
			/>
			<div>
				<h1 class="mb-1 text-3xl font-black">{currentWorkspace?.name}</h1>
				<p class="text-sm text-zinc-500">Manage your workspace settings, members, and privacy.</p>
			</div>
		</div>

		<!-- Tabs -->
		<div class="mb-10 flex gap-8 border-b border-zinc-900">
			<button
				onclick={() => (activeTab = 'general')}
				class="relative pb-4 text-sm font-bold transition-all {activeTab === 'general'
					? 'text-white'
					: 'text-zinc-500 hover:text-zinc-300'}"
			>
				General
				{#if activeTab === 'general'}
					<div class="absolute bottom-0 left-0 h-0.5 w-full bg-orange-500"></div>
				{/if}
			</button>
			<button
				onclick={() => (activeTab = 'members')}
				class="relative pb-4 text-sm font-bold transition-all {activeTab === 'members'
					? 'text-white'
					: 'text-zinc-500 hover:text-zinc-300'}"
			>
				Members ({members.length})
				{#if activeTab === 'members'}
					<div class="absolute bottom-0 left-0 h-0.5 w-full bg-orange-500"></div>
				{/if}
			</button>
		</div>

		{#if loading}
			<div class="space-y-6">
				<div class="h-12 animate-pulse rounded-xl bg-zinc-950"></div>
				<div class="h-32 animate-pulse rounded-xl bg-zinc-950"></div>
			</div>
		{:else if activeTab === 'general'}
			<div class="space-y-10">
				<section class="max-w-xl">
					<h3 class="mb-6 text-lg font-bold">Workspace Details</h3>
					<form onsubmit={handleUpdateGeneral} class="space-y-6">
						<div class="flex items-center gap-6 pb-6">
							<Avatar
								name={currentWorkspace?.name}
								src={currentWorkspace?.logo_url}
								size="xl"
								class="rounded-2xl"
							/>
							<div class="space-y-2">
								<p class="text-xs font-bold tracking-wider text-white uppercase">Workspace Logo</p>
								<label
									class="inline-block cursor-pointer rounded-lg bg-zinc-900 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-zinc-800"
								>
									{saving ? 'Uploading...' : 'Upload New Logo'}
									<input
										type="file"
										class="hidden"
										accept="image/*"
										onchange={handleLogoUpload}
										disabled={saving}
									/>
								</label>
								<p class="text-[10px] text-zinc-500">JPG, PNG or SVG. Max 2MB.</p>
							</div>
						</div>

						<Input label="Workspace Name" bind:value={name} required />
						<Input label="Workspace Slug" bind:value={slug} required />
						<div class="space-y-2">
							<label
								for="ws-description"
								class="block text-[10px] font-bold tracking-[1px] text-zinc-500 uppercase"
								>Description</label
							>
							<textarea
								id="ws-description"
								bind:value={description}
								class="h-32 w-full resize-none rounded-xl border border-zinc-900 bg-zinc-950 px-4 py-3 text-sm text-white transition-all outline-none focus:border-orange-500"
							></textarea>
						</div>
						<Button type="submit" loading={saving}>Save Changes</Button>
					</form>
				</section>

				{#if userRole === 'owner'}
					<section class="rounded-2xl border border-red-900/50 bg-red-950/5 p-8">
						<h3 class="mb-2 text-lg font-bold text-red-500">Danger Zone</h3>
						<p class="mb-6 text-sm text-zinc-500">
							Once you delete a workspace, there is no going back. Please be certain.
						</p>
						<Button variant="secondary" onclick={() => (showDeleteModal = true)}>
							<span class="text-red-500">Delete this workspace</span>
						</Button>
					</section>
				{/if}
			</div>
		{:else if activeTab === 'members'}
			<div class="space-y-6">
				<div class="mb-4 flex items-center justify-between">
					<h3 class="text-lg font-bold">Manage Members</h3>
					<Button variant="primary" size="sm" onclick={() => uiStore.setInviteModalOpen(true)}
						>Invite Member</Button
					>
				</div>

				<div class="overflow-hidden rounded-2xl border border-zinc-900">
					{#each members as member (member.user_id)}
						<div
							class="flex items-center justify-between border-b border-zinc-900 bg-zinc-950/50 p-4 last:border-0"
						>
							<div class="flex items-center gap-4">
								<Avatar name={member.profile.username || 'User'} src={member.profile.avatar_url} />
								<div>
									<p class="text-sm font-bold text-white">{member.profile.username}</p>
									<p class="text-xs text-zinc-500 lowercase italic">{member.role}</p>
								</div>
							</div>

							{#if userRole === 'owner' && member.user_id !== session?.user.id}
								<div class="flex items-center gap-2">
									<select
										value={member.role}
										onchange={(e) =>
											handleRoleChange(
												member.user_id,
												e.currentTarget.value as 'owner' | 'member' | 'guest'
											)}
										class="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-white outline-none focus:border-orange-500"
									>
										<option value="owner">Owner</option>
										<option value="member">Member</option>
										<option value="guest">Guest</option>
									</select>
									<button
										onclick={() => handleRemoveMember(member.user_id)}
										class="p-2 text-zinc-500 transition-colors hover:text-red-500"
										title="Remove member"
									>
										<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>

<Modal bind:show={showDeleteModal} title="Delete Workspace">
	<div class="space-y-6">
		<div class="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500">
			This action is permanent and will delete all channels, messages, and files associated with
			this workspace.
		</div>

		<div class="space-y-4">
			<p class="text-sm text-zinc-400">
				Please type <span class="font-bold text-white">{currentWorkspace?.name}</span> to confirm.
			</p>
			<Input label={undefined} bind:value={deleteConfirm} placeholder={currentWorkspace?.name} />
		</div>

		<div class="flex gap-4">
			<Button variant="secondary" onclick={() => (showDeleteModal = false)}>Cancel</Button>
			<Button
				variant="danger"
				disabled={deleteConfirm !== currentWorkspace?.name}
				onclick={handleDeleteWorkspace}
			>
				Delete Workspace
			</Button>
		</div>
	</div>
</Modal>
