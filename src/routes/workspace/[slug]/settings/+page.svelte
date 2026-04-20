<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { authStore } from '$lib/stores/authStore';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { goto } from '$app/navigation';
	import { workspacesService } from '$lib/services/workspaces';
	import { slugify } from '$lib/utils/slugify';
	import Input from '$lib/components/ui/Input.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import { supabase } from '$lib/services/supabase';
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

	// Notification Preferences State
	let preferences = $state({
		mentions_enabled: true,
		replies_enabled: true,
		invites_enabled: true,
		ai_completions_enabled: true
	});
	let loadingPrefs = $state(true);
	let savingPrefs = $state(false);

	const { currentWorkspace, userRole } = $derived($workspaceStore);
	const session = $derived($authStore.session);

	async function loadSettings() {
		const slugParam = page.params.slug;
		if (!session?.user || !slugParam) return;

		loading = true;
		try {
			await workspaceStore.setWorkspace(slugParam, session.user.id);
			if (currentWorkspace) {
				name = currentWorkspace.name;
				slug = currentWorkspace.slug;
				description = currentWorkspace.description || '';
				await fetchNotificationPreferences();
			}
		} catch (err) {
			console.error(err);
			goto(resolve('/dashboard'));
		} finally {
			loading = false;
		}
	}

	async function fetchNotificationPreferences() {
		if (!currentWorkspace || !session?.user) return;
		loadingPrefs = true;
		try {
			const { data } = await supabase
				.from('notification_preferences')
				.select('*')
				.eq('user_id', session.user.id)
				.eq('workspace_id', currentWorkspace.id)
				.single();

			if (data) {
				preferences = {
					mentions_enabled: data.mentions_enabled,
					replies_enabled: data.replies_enabled,
					invites_enabled: data.invites_enabled,
					ai_completions_enabled: data.ai_completions_enabled
				};
			}
		} catch (_err) {
			console.warn('Notification preferences not found, using defaults.');
		} finally {
			loadingPrefs = false;
		}
	}

	async function saveNotificationPreferences() {
		if (!currentWorkspace || !session?.user) return;
		savingPrefs = true;
		try {
			const { error } = await supabase.from('notification_preferences').upsert({
				user_id: session.user.id,
				workspace_id: currentWorkspace.id,
				...preferences
			});
			if (error) throw error;
			import('$lib/stores/toastStore').then((m) => m.toast.show('Preferences updated', 'success'));
		} catch (err) {
			console.error(err);
			import('$lib/stores/toastStore').then((m) =>
				m.toast.show('Failed to save preferences', 'error')
			);
		} finally {
			savingPrefs = false;
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

	async function handleDeleteWorkspace() {
		if (deleteConfirm !== currentWorkspace?.name) return;
		try {
			await workspaceStore.deleteWorkspace();
			goto(resolve('/dashboard'));
		} catch (err) {
			console.error(err);
		}
	}

	onMount(loadSettings);
</script>

<div class="min-h-screen bg-surface p-8 text-content md:p-16">
	<div class="mx-auto max-w-4xl">
		<button
			onclick={() => goto(resolve(`/workspace/${page.params.slug}`))}
			class="mb-8 flex items-center gap-2 text-sm font-medium text-content-dim transition-colors hover:text-content"
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
				<h1 class="mb-1 text-3xl font-black text-content">{currentWorkspace?.name}</h1>
				<p class="text-sm text-content-dim">
					Manage your workspace settings, members, and privacy.
				</p>
			</div>
		</div>

		<!-- Tabs -->
		<div class="mb-10 flex gap-8 border-b border-stroke">
			<button
				onclick={() => (activeTab = 'general')}
				class="relative pb-4 text-sm font-bold transition-all {activeTab === 'general'
					? 'text-content'
					: 'text-content-dim hover:text-content'}"
			>
				General
				{#if activeTab === 'general'}
					<div class="absolute bottom-0 left-0 h-0.5 w-full bg-brand-orange"></div>
				{/if}
			</button>
			<button
				onclick={() => (activeTab = 'notifications')}
				class="relative pb-4 text-sm font-bold transition-all {activeTab === 'notifications'
					? 'text-content'
					: 'text-content-dim hover:text-content'}"
			>
				Notifications
				{#if activeTab === 'notifications'}
					<div class="absolute bottom-0 left-0 h-0.5 w-full bg-brand-orange"></div>
				{/if}
			</button>
		</div>

		{#if loading}
			<div class="space-y-6">
				<div class="h-12 animate-pulse rounded-xl bg-surface-dim"></div>
				<div class="h-32 animate-pulse rounded-xl bg-surface-dim"></div>
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
								<p class="text-xs font-bold tracking-wider text-content uppercase">
									Workspace Logo
								</p>
								<label
									class="inline-block cursor-pointer rounded-lg bg-surface-dim px-4 py-2 text-xs font-bold text-content transition-colors hover:bg-stroke"
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
								class="block text-[10px] font-bold tracking-[1px] text-content-dim uppercase"
								>Description</label
							>
							<textarea
								id="ws-description"
								bind:value={description}
								class="h-32 w-full resize-none rounded-xl border border-stroke bg-surface-dim px-4 py-3 text-sm text-content transition-all outline-none focus:border-brand-orange"
							></textarea>
						</div>
						<Button type="submit" loading={saving}>Save Changes</Button>
					</form>
				</section>

				{#if userRole === 'owner'}
					<section class="rounded-2xl border border-red-500/20 bg-red-500/5 p-8">
						<h3 class="mb-2 text-lg font-bold text-red-500">Danger Zone</h3>
						<p class="mb-6 text-sm text-content-dim">
							Once you delete a workspace, there is no going back. Please be certain.
						</p>
						<Button variant="secondary" onclick={() => (showDeleteModal = true)}>
							<span class="text-red-500">Delete this workspace</span>
						</Button>
					</section>
				{/if}
			</div>
		{:else if activeTab === 'notifications'}
			<div class="space-y-10">
				<section class="max-w-2xl">
					<h3 class="mb-2 text-lg font-bold text-content">Notification Preferences</h3>
					<p class="mb-8 text-sm text-content-dim">
						Configure how you want to be alerted for activity within {currentWorkspace?.name}.
					</p>

					<div class="space-y-4 rounded-2xl border border-stroke bg-surface-dim/50 p-6">
						{#if loadingPrefs}
							<div class="space-y-6">
								{#each Array(4) as _, i (i)}
									<div class="flex items-center justify-between">
										<div class="space-y-2">
											<div class="h-4 w-24 animate-pulse rounded bg-surface"></div>
											<div class="h-3 w-48 animate-pulse rounded bg-surface"></div>
										</div>
										<div class="h-6 w-11 animate-pulse rounded-full bg-surface"></div>
									</div>
								{/each}
							</div>
						{:else}
							<!-- Mentions -->
							<div class="flex items-center justify-between">
								<div>
									<p class="text-sm font-bold text-content">Mentions</p>
									<p class="text-xs text-content-dim">
										Notify me when someone types my @username in messages or notes.
									</p>
								</div>
								<label class="relative inline-flex cursor-pointer items-center">
									<input
										type="checkbox"
										bind:checked={preferences.mentions_enabled}
										class="peer sr-only"
									/>
									<div
										class="peer h-6 w-11 rounded-full bg-stroke transition-all peer-checked:bg-brand-orange after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full"
									></div>
								</label>
							</div>

							<!-- Replies -->
							<div class="flex items-center justify-between">
								<div>
									<p class="text-sm font-bold text-content">Replies</p>
									<p class="text-xs text-content-dim">
										Notify me when someone replies to one of my messages.
									</p>
								</div>
								<label class="relative inline-flex cursor-pointer items-center">
									<input
										type="checkbox"
										bind:checked={preferences.replies_enabled}
										class="peer sr-only"
									/>
									<div
										class="peer h-6 w-11 rounded-full bg-stroke transition-all peer-checked:bg-brand-orange after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full"
									></div>
								</label>
							</div>

							<!-- Invites -->
							<div class="flex items-center justify-between">
								<div>
									<p class="text-sm font-bold text-content">Workspace Activity</p>
									<p class="text-xs text-content-dim">
										Notify me when invites are accepted or new members join.
									</p>
								</div>
								<label class="relative inline-flex cursor-pointer items-center">
									<input
										type="checkbox"
										bind:checked={preferences.invites_enabled}
										class="peer sr-only"
									/>
									<div
										class="peer h-6 w-11 rounded-full bg-stroke transition-all peer-checked:bg-brand-orange after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full"
									></div>
								</label>
							</div>

							<!-- AI -->
							<div class="flex items-center justify-between">
								<div>
									<p class="text-sm font-bold text-content">AI Task Completions</p>
									<p class="text-xs text-content-dim">
										Notify me when long-running AI operations are finished.
									</p>
								</div>
								<label class="relative inline-flex cursor-pointer items-center">
									<input
										type="checkbox"
										bind:checked={preferences.ai_completions_enabled}
										class="peer sr-only"
									/>
									<div
										class="peer h-6 w-11 rounded-full bg-stroke transition-all peer-checked:bg-brand-orange after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full"
									></div>
								</label>
							</div>
						{/if}
					</div>

					<div class="mt-8">
						<Button onclick={saveNotificationPreferences} loading={savingPrefs}
							>Save Preferences</Button
						>
					</div>
				</section>
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
			<p class="text-sm text-content-dim">
				Please type <span class="font-bold text-content">{currentWorkspace?.name}</span> to confirm.
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
