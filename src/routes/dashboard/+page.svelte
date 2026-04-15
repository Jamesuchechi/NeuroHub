<script lang="ts">
	import { onMount } from 'svelte';
	import type { Database } from '$lib/types/db';
	import { authStore } from '$lib/stores/authStore';
	import { userStore } from '$lib/stores/userStore';
	import { workspacesService } from '$lib/services/workspaces';
	import { slugify } from '$lib/utils/slugify';
	import WorkspaceCard from '$lib/components/ui/WorkspaceCard.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

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
	let debounceTimer: ReturnType<typeof setTimeout>;

	const { user } = $derived($authStore);
	const { profile } = $derived($userStore);

	const displayName = $derived(
		profile?.username || (user?.email ? user.email.split('@')[0] : 'Developer')
	);

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
			await workspacesService.createWorkspace(user.id, {
				name,
				slug,
				description,
				owner_id: user.id
			});
			showCreateModal = false;
			name = '';
			slug = '';
			description = '';
			await loadWorkspaces();
		} catch (err) {
			createError = err instanceof Error ? err.message : 'Failed to create workspace.';
		} finally {
			creating = false;
		}
	}

	onMount(() => {
		if (user) {
			userStore.fetchProfile(user.id);
			loadWorkspaces();
		}
	});
</script>

<div class="min-h-screen bg-black p-8 text-white md:p-12">
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
				<p class="text-lg leading-relaxed font-medium text-zinc-500">
					Welcome back, {displayName}. Here's what's happening across your collaborative network.
				</p>
			</div>

			<div class="flex items-center gap-4">
				<div class="hidden text-right md:block">
					<p class="mb-1 text-[10px] font-bold tracking-[2px] text-zinc-600 uppercase">Status</p>
					<p class="flex items-center justify-end gap-1.5 text-xs font-bold text-green-500">
						<span class="h-1.5 w-1.5 rounded-full bg-green-500"></span>
						Systems Online
					</p>
				</div>
			</div>
		</div>

		<!-- Summary Grid -->
		<div
			in:fly={{ y: 40, duration: 1200, easing: cubicOut, delay: 200 }}
			class="mb-16 grid grid-cols-1 gap-8 md:grid-cols-3"
		>
			<!-- Activity Feed Card -->
			<div
				class="rounded-3xl border border-zinc-900 bg-zinc-950/50 p-8 shadow-2xl backdrop-blur-sm md:col-span-2"
			>
				<div class="mb-8 flex items-center justify-between">
					<h3 class="text-xl font-black">Recent Activity</h3>
					<button class="text-xs font-bold text-zinc-500 transition-colors hover:text-orange-500"
						>See Detailed Feed →</button
					>
				</div>

				<div class="space-y-8">
					{#each Array.from({ length: 3 }) as _, i (i)}
						<div class="group flex cursor-pointer gap-6">
							<div
								class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 transition-all group-hover:bg-orange-500 group-hover:text-black"
							>
								<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="1.5"
										d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
									/>
								</svg>
							</div>
							<div class="flex-1 border-b border-zinc-900 pb-8 last:border-0">
								<p class="mb-1 text-sm font-bold text-white">
									Document Updated <span class="font-medium text-zinc-500">in</span> Project Phoenix
								</p>
								<p class="mb-2 line-clamp-1 text-xs text-zinc-500 italic">
									"We have finalized the core architecture and moved into Phase 2..."
								</p>
								<p class="text-[10px] font-black text-zinc-700 uppercase">
									2 hours ago • By Alex Chen
								</p>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Quick Stats / User Profile -->
			<div class="space-y-8">
				<div
					class="rounded-3xl border border-zinc-900 bg-linear-to-br from-zinc-950 to-black p-8 shadow-2xl"
				>
					<p class="mb-6 text-[10px] font-black tracking-[2px] text-zinc-600 uppercase">
						Your Profile
					</p>
					<div class="mb-8 flex items-center gap-4">
						<div
							class="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500 text-3xl font-black text-black"
						>
							{displayName[0]}
						</div>
						<div>
							<p class="text-xl font-black text-white">{displayName}</p>
							<p class="text-xs text-zinc-500">Senior Developer</p>
						</div>
					</div>
					<div class="grid grid-cols-2 gap-4">
						<div class="rounded-2xl bg-zinc-900 p-4">
							<p class="mb-1 text-[10px] font-bold text-zinc-600 uppercase">Commits</p>
							<p class="text-xl font-black text-white">124</p>
						</div>
						<div class="rounded-2xl bg-zinc-900 p-4">
							<p class="mb-1 text-[10px] font-bold text-zinc-600 uppercase">Messages</p>
							<p class="text-xl font-black text-white">8.2k</p>
						</div>
					</div>
				</div>

				<div class="rounded-3xl border border-zinc-900 bg-zinc-950/50 p-8">
					<h4 class="mb-4 text-sm font-bold text-white">Account Storage</h4>
					<div class="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-900">
						<div class="h-full w-1/3 bg-linear-to-r from-orange-500 to-orange-300"></div>
					</div>
					<p class="text-[10px] font-bold text-zinc-500 uppercase">3.2 GB of 10 GB used</p>
				</div>
			</div>
		</div>

		<!-- Workspaces Grid Section -->
		<div in:fly={{ y: 40, duration: 1200, easing: cubicOut, delay: 400 }}>
			<div class="mb-8 flex items-center justify-between">
				<div>
					<h2 class="mb-1 text-2xl font-black tracking-tight text-white">Your Workspaces</h2>
					<p class="text-sm font-medium text-zinc-500">Jump back into your active projects.</p>
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
					class="flex flex-col items-center justify-center rounded-3xl border border-zinc-900 bg-zinc-950/50 py-24 text-center"
				>
					<h2 class="mb-3 text-2xl font-black tracking-tight text-white">No workspaces found</h2>
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
					class="w-full rounded-xl border bg-zinc-950 px-4 py-3.5 text-sm text-white transition-all outline-none placeholder:text-zinc-700 {slugError
						? 'border-red-500'
						: 'border-zinc-900 focus:border-orange-500'}"
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
				<p class="text-[11px] text-zinc-600">neurohub.io/workspace/{slug || '...'}</p>
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
				class="h-24 w-full resize-none rounded-xl border border-zinc-900 bg-zinc-950 px-4 py-3 text-sm text-white transition-all outline-none placeholder:text-zinc-700 focus:border-orange-500"
			></textarea>
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
