<script lang="ts">
	import { onMount } from 'svelte';
	import type { Database } from '$lib/types/db';
	import { authStore } from '$lib/stores/authStore';
	import { profileStore } from '$lib/stores/profileStore';
	import { workspacesService } from '$lib/services/workspaces';
	import { slugify } from '$lib/utils/slugify';
	import WorkspaceCard from '$lib/components/ui/WorkspaceCard.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ActivityItem from '$lib/components/dashboard/ActivityItem.svelte';
	import { activityService } from '$lib/services/activity';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import StoriesBar from '$lib/components/social/StoriesBar.svelte';
	import PostComposer from '$lib/components/social/PostComposer.svelte';
	import UserProfileCard from '$lib/components/dashboard/UserProfileCard.svelte';
	import PopularWorkspaces from '$lib/components/dashboard/PopularWorkspaces.svelte';
	import PopularDevelopers from '$lib/components/dashboard/PopularDevelopers.svelte';

	type Workspace = Database['public']['Tables']['workspaces']['Row'];

	let workspaces = $state<Workspace[]>([]);
	let loading = $state(true);
	let showCreateModal = $state(false);

	// Create Form State
	let name = $state('');
	let slug = $state('');
	let description = $state('');
	let creating = $state(false);
	let slugError = $state('');
	let createError = $state('');
	let slugValidating = $state(false);
	let isSlugDirty = $state(false);
	let logoFile = $state<File | null>(null);
	let logoPreview = $state('');
	let debounceTimer: ReturnType<typeof setTimeout>;

	const { user } = $derived($authStore);
	const { profile } = $derived($profileStore);

	const displayName = $derived(
		profile?.username || (user?.email ? user.email.split('@')[0] : 'Developer')
	);

	const activities = $derived($activityService);

	async function loadWorkspaces() {
		if (!user) return;
		loading = true;
		try {
			workspaces = await workspacesService.getUserWorkspaces(user.id);
		} catch (err) {
			console.error(err instanceof Error ? err.message : err);
		} finally {
			loading = false;
		}
	}

	function onNameInput() {
		if (!isSlugDirty) {
			slug = slugify(name);
			validateSlug(slug);
		}
	}

	async function validateSlug(s: string) {
		if (!s) return;
		slugValidating = true;
		slugError = '';
		try {
			const result = await workspacesService.checkSlugUnique(s);
			if (result.error) {
				slugError = 'Could not validate slug.';
			} else if (!result.unique) {
				slugError = 'Slug taken';
			}
		} finally {
			slugValidating = false;
		}
	}

	function onSlugInput() {
		isSlugDirty = true;
		slug = slugify(slug);
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => validateSlug(slug), 500);
	}

	async function handleCreateWorkspace() {
		if (!user || slugError || slugValidating) return;
		creating = true;
		try {
			let logo_url = null;

			// 1. Upload logo if selected
			if (logoFile) {
				// Temporary UUID for logo path before WS is created
				const tempId = crypto.randomUUID();
				logo_url = await workspacesService.uploadLogo(tempId, logoFile);
			}

			// 2. Create workspace
			await workspacesService.createWorkspace(user.id, {
				name,
				slug,
				description,
				logo_url,
				owner_id: user.id
			});

			showCreateModal = false;
			name = '';
			slug = '';
			description = '';
			logoFile = null;
			logoPreview = '';
			await loadWorkspaces();
		} catch (err) {
			createError = err instanceof Error ? err.message : 'Failed to create workspace.';
		} finally {
			creating = false;
		}
	}

	function handleLogoChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			logoFile = file;
			logoPreview = URL.createObjectURL(file);
		}
	}

	onMount(() => {
		if (user) {
			profileStore.fetchProfile(user.id);
			loadWorkspaces();

			activityService.fetchActivities(null, user.id);
			return activityService.subscribeToActivities(null);
		}
	});
</script>

<div class="min-h-full bg-surface p-8 text-content md:p-12">
	<div class="mx-auto max-w-6xl">
		<!-- Hub Header -->
		<div
			in:fly={{ y: 30, duration: 1000, easing: cubicOut }}
			class="mb-16 flex flex-col justify-between gap-8 md:flex-row md:items-end"
		>
			<div class="max-w-2xl">
				<h1 class="mb-4 text-5xl leading-tight font-black tracking-tight">
					Global <span
						class="bg-linear-to-r from-orange-500 to-blue-500 bg-clip-text text-transparent"
						>Activity Hub</span
					>
				</h1>
				<p class="text-lg leading-relaxed font-medium text-content-dim">
					Welcome back, {displayName}. Here's what's happening across your collaborative network.
				</p>
			</div>

			<div class="flex items-center gap-4">
				<div class="hidden text-right md:block">
					<p class="mb-1 text-[10px] font-bold tracking-[2px] text-content-dim uppercase">Status</p>
					<p class="flex items-center justify-end gap-1.5 text-xs font-bold text-green-500">
						<span class="h-1.5 w-1.5 rounded-full bg-green-500"></span>
						Systems Online
					</p>
				</div>
			</div>
		</div>

		<!-- Global Stories -->
		<div
			in:fly={{ y: 20, duration: 800, easing: cubicOut, delay: 100 }}
			class="mb-12 border-y border-stroke py-6"
		>
			<StoriesBar />
		</div>

		<!-- Summary Grid -->
		<div
			in:fly={{ y: 40, duration: 1200, easing: cubicOut, delay: 200 }}
			class="mb-16 grid grid-cols-1 gap-8 md:grid-cols-3"
		>
			<!-- Activity Feed Card -->
			<div
				class="rounded-3xl border border-stroke bg-surface-dim/50 p-8 shadow-2xl backdrop-blur-sm md:col-span-2"
			>
				<div class="mb-8 flex items-center justify-between">
					<h3 class="text-xl font-black">Recent Activity</h3>
					<button class="text-xs font-bold text-content-dim transition-colors hover:text-orange-500"
						>See Detailed Feed →</button
					>
				</div>

				<!-- Broadcast Section -->
				<div class="mb-10">
					<PostComposer onPostCreated={() => activityService.fetchActivities(null, user?.id)} />
				</div>

				<div class="space-y-8">
					{#if activities.length === 0}
						<p class="py-8 text-center text-xs text-content-dim italic">
							No recent activity found.
						</p>
					{:else}
						{#each activities as activity (activity.id)}
							<ActivityItem {activity} />
						{/each}
					{/if}
				</div>
			</div>

			<!-- Sidebar: Profile & Stories -->
			<div class="space-y-8">
				{#if profile}
					<UserProfileCard {profile} />
				{/if}

				<PopularWorkspaces />
				<PopularDevelopers />
			</div>
		</div>

		<!-- Workspaces Grid Section -->
		<div in:fly={{ y: 40, duration: 1200, easing: cubicOut, delay: 400 }}>
			<div class="mb-8 flex items-center justify-between">
				<div>
					<h2 class="mb-1 text-2xl font-black tracking-tight text-content">Your Workspaces</h2>
					<p class="text-sm font-medium text-content-dim">Jump back into your active projects.</p>
				</div>
				<Button variant="primary" size="sm" onclick={() => (showCreateModal = true)}>
					<div class="flex items-center gap-2">
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 4v16m8-8H4"
							/>
						</svg>
						Initialize New
					</div>
				</Button>
			</div>

			{#if loading}
				<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{#each Array.from({ length: 3 }) as _, i (i)}
						<div class="h-64 animate-pulse rounded-3xl border border-zinc-900 bg-zinc-950/20"></div>
					{/each}
				</div>
			{:else if workspaces.length === 0}
				<!-- Empty State (keeping previous logic) -->
				<div
					class="flex flex-col items-center justify-center rounded-3xl border border-stroke bg-surface-dim/50 py-24 text-center"
				>
					<h2 class="mb-3 text-2xl font-black tracking-tight text-content">No workspaces found</h2>
					<Button variant="primary" onclick={() => (showCreateModal = true)}
						>Create Entry Point</Button
					>
				</div>
			{:else}
				<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{#each workspaces as workspace (workspace.id)}
						<WorkspaceCard {workspace} />
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

<Modal bind:show={showCreateModal} title="Create Workspace">
	<form onsubmit={handleCreateWorkspace} class="space-y-6">
		<Input
			label="Workspace Name"
			bind:value={name}
			oninput={onNameInput}
			placeholder="Acme Corp"
			required
		/>

		<div class="space-y-2">
			<label
				for="create-slug"
				class="block text-[10px] font-bold tracking-[1px] text-zinc-500 uppercase">Slug</label
			>
			<div class="relative">
				<input
					id="create-slug"
					type="text"
					bind:value={slug}
					oninput={onSlugInput}
					placeholder="acme-corp"
					required
					class="w-full rounded-xl border bg-surface px-4 py-3.5 text-sm text-content transition-all outline-none placeholder:text-content-dim/30 {slugError
						? 'border-red-500'
						: 'border-stroke focus:border-brand-orange'}"
				/>
				{#if slugValidating}
					<div class="absolute top-1/2 right-4 -translate-y-1/2">
						<div
							class="h-4 w-4 animate-spin rounded-full border-2 border-orange-500 border-t-transparent"
						></div>
					</div>
				{/if}
			</div>
			{#if slugError}
				<p class="text-xs text-red-500">{slugError}</p>
			{:else}
				<p class="text-[11px] text-content-dim">neurohub.io/workspace/{slug || '...'}</p>
			{/if}
		</div>

		<div class="space-y-2">
			<label
				for="create-description"
				class="block text-[10px] font-bold tracking-[1px] text-zinc-500 uppercase"
				>Description</label
			>
			<textarea
				id="create-description"
				bind:value={description}
				placeholder="Engineering team's shared brain."
				class="h-24 w-full resize-none rounded-xl border border-stroke bg-surface px-4 py-3 text-sm text-content transition-all outline-none placeholder:text-content-dim/30 focus:border-brand-orange"
			></textarea>
		</div>

		<div class="space-y-4">
			<label
				for="logo-upload"
				class="block text-[10px] font-bold tracking-[1px] text-zinc-500 uppercase"
				>Workspace Logo</label
			>
			<div class="flex items-center gap-4">
				{#if logoPreview}
					<div class="h-16 w-16 overflow-hidden rounded-xl border border-stroke bg-surface">
						<img src={logoPreview} alt="Preview" class="h-full w-full object-cover" />
					</div>
				{:else}
					<div
						class="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-dashed border-stroke bg-surface text-xs font-bold text-zinc-600"
					>
						No Logo
					</div>
				{/if}
				<input
					type="file"
					id="logo-upload"
					accept="image/*"
					class="hidden"
					onchange={handleLogoChange}
				/>
				<label
					for="logo-upload"
					class="cursor-pointer rounded-lg border border-stroke bg-surface-dim px-4 py-2 text-xs font-bold text-content transition-all hover:border-brand-orange/50 hover:bg-surface"
				>
					{logoFile ? 'Change Logo' : 'Upload Image'}
				</label>
			</div>
		</div>

		{#if createError}
			<div class="rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-xs text-red-400">
				{createError}
			</div>
		{/if}

		<Button type="submit" loading={creating} disabled={!!slugError || slugValidating}>
			Create Workspace
		</Button>
	</form>
</Modal>
