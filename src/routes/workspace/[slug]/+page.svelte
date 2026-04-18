<script lang="ts">
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import StoriesBar from '$lib/components/social/StoriesBar.svelte';
	import PostComposer from '$lib/components/social/PostComposer.svelte';
	import ActivityItem from '$lib/components/dashboard/ActivityItem.svelte';
	import { activityService } from '$lib/services/activity';
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/authStore';
	import { profileStore } from '$lib/stores/profileStore';
	import { uiStore } from '$lib/stores/uiStore';

	const workspace = $derived($workspaceStore.currentWorkspace);
	const members = $derived($workspaceStore.members);
	const userRole = $derived($workspaceStore.userRole);
	const { user } = $derived($authStore);
	const { dashboardTeamCollapsed } = $derived($uiStore);

	// Contextual stats
	const stats = $derived([
		{ name: 'Channels', value: '0', icon: 'chat' },
		{ name: 'Documents', value: '0', icon: 'book' },
		{ name: 'Snippets', value: '0', icon: 'code' },
		{ name: 'Team Size', value: members.length.toString(), icon: 'users' }
	]);

	const activities = $derived($activityService);

	onMount(() => {
		if (user) {
			profileStore.fetchProfile(user.id);
		}

		if (workspace?.id) {
			activityService.fetchActivities(workspace.id);
			return activityService.subscribeToActivities(workspace.id);
		}
	});
</script>

<div class="p-6 md:p-8 lg:p-10">
	{#if workspace}
		<div
			in:fly={{ y: 20, duration: 800, easing: cubicOut }}
			class="mb-10 flex flex-col gap-8 md:flex-row md:items-center md:justify-between"
		>
			<div class="flex items-center gap-6">
				<div
					class="h-16 w-16 overflow-hidden rounded-2xl bg-linear-to-br from-brand-orange to-brand-blue shadow-2xl ring-1 ring-stroke"
				>
					{#if workspace.logo_url}
						<img src={workspace.logo_url} alt={workspace.name} class="h-full w-full object-cover" />
					{:else}
						<div
							class="flex h-full w-full items-center justify-center text-2xl font-black text-white"
						>
							{workspace.name[0]}
						</div>
					{/if}
				</div>
				<div>
					<h1 class="mb-1 text-3xl font-black tracking-tight text-content">{workspace.name}</h1>
					<div class="flex items-center gap-3">
						<span
							class="rounded-md bg-surface-dim px-2.5 py-1 text-[9px] font-bold tracking-wider text-brand-orange uppercase ring-1 ring-stroke"
						>
							{userRole}
						</span>
						<span class="text-xs font-medium text-content-dim"
							>neurohub.io/workspace/{workspace.slug}</span
						>
					</div>
				</div>
			</div>

			<div class="flex items-center gap-3">
				<Button
					variant="secondary"
					onclick={() => window.open(`/workspace/${workspace.slug}/settings`, '_self')}
				>
					<div class="flex items-center gap-2">
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
							/>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
							/>
						</svg>
						Settings
					</div>
				</Button>
				<Button variant="primary">Invite Team</Button>
			</div>
		</div>

		<!-- Workspace Stories -->
		<div
			in:fly={{ y: 20, duration: 800, easing: cubicOut, delay: 100 }}
			class="mb-12 border-y border-stroke py-6"
		>
			<StoriesBar workspaceId={workspace.id} />
		</div>

		<!-- Stats Grid -->
		<div
			in:fly={{ y: 30, duration: 1000, easing: cubicOut, delay: 200 }}
			class="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4"
		>
			{#each stats as stat (stat.name)}
				<div
					class="group relative rounded-2xl border border-stroke bg-surface-dim/30 p-6 transition-all hover:bg-surface-dim/60"
				>
					<div
						class="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-surface transition-colors group-hover:text-brand-orange"
					>
						{#if stat.icon === 'chat'}
							<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="1.5"
									d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
								/>
							</svg>
						{:else if stat.icon === 'book'}
							<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="1.5"
									d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
								/>
							</svg>
						{:else if stat.icon === 'code'}
							<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="1.5"
									d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
								/>
							</svg>
						{:else if stat.icon === 'users'}
							<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="1.5"
									d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
								/>
							</svg>
						{/if}
					</div>
					<p class="text-2xl font-black text-content">{stat.value}</p>
					<p class="text-[10px] font-bold tracking-widest text-content-dim uppercase">
						{stat.name}
					</p>
				</div>
			{/each}
		</div>

		<div class="flex flex-col gap-8 lg:flex-row">
			<!-- Recent Activity -->
			<div
				in:fly={{ y: 40, duration: 1200, easing: cubicOut, delay: 400 }}
				class="flex-1 rounded-3xl border border-stroke bg-surface-dim/20 p-8"
			>
				<h3 class="mb-8 text-xl font-black text-content">Recent Activity</h3>

				<!-- Team Post Composer -->
				<div class="mb-10">
					<PostComposer
						workspaceId={workspace.id}
						onPostCreated={() => activityService.fetchActivities(workspace.id)}
					/>
				</div>

				<div class="space-y-6">
					{#if activities.length === 0}
						<p class="py-12 text-center text-xs text-content-dim italic">
							No team activity yet. Start the conversation!
						</p>
					{:else}
						{#each activities as activity (activity.id)}
							<ActivityItem {activity} />
						{/each}
					{/if}
				</div>
			</div>

			<!-- Team Members -->
			{#if !dashboardTeamCollapsed}
				<div
					in:fly={{ x: 20, duration: 800, easing: cubicOut }}
					class="w-full rounded-3xl border border-stroke bg-surface-dim/20 p-8 lg:w-[320px] xl:w-[380px]"
				>
					<div class="mb-8 flex items-center justify-between">
						<div class="flex items-center gap-2">
							<h3 class="text-xl font-black text-content">Team</h3>
							<span class="text-xs font-bold text-content-dim">{members.length} Online</span>
						</div>
						<button
							onclick={() => uiStore.setDashboardTeamCollapsed(true)}
							class="rounded-lg p-1.5 text-content-dim transition-all hover:bg-surface hover:text-content"
							title="Collapse Team"
						>
							<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13 5H19V11M11 19H5V13"
								/>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 5L13 11M5 19L11 13"
								/>
							</svg>
						</button>
					</div>
					<div class="space-y-4">
						{#each members as member (member.user_id)}
							<div
								class="group flex items-center justify-between transition-all hover:translate-x-1"
							>
								<div class="flex items-center gap-3">
									<Avatar
										name={member.profile.username || 'User'}
										src={member.profile.avatar_url}
										size="sm"
									/>
									<div>
										<p class="text-sm font-bold text-content">{member.profile.username}</p>
										<p class="text-[10px] font-bold text-content-dim uppercase">{member.role}</p>
									</div>
								</div>
								<div class="h-1.5 w-1.5 rounded-full bg-brand-green"></div>
							</div>
						{/each}
					</div>
					<Button variant="secondary" class="mt-8 w-full">View All Members</Button>
				</div>
			{:else}
				<button
					onclick={() => uiStore.setDashboardTeamCollapsed(false)}
					class="group relative hidden w-12 flex-col items-center rounded-3xl border border-stroke bg-surface-dim/20 py-8 transition-all hover:bg-surface-dim/40 lg:flex"
					title="Expand Team"
				>
					<div class="mb-10 text-content-dim transition-colors group-hover:text-brand-orange">
						<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
							/>
						</svg>
					</div>
					<div class="flex flex-1 items-center">
						<span
							class="rotate-180 text-[10px] font-black tracking-[4px] text-content-dim uppercase opacity-30 transition-all group-hover:opacity-100"
							style="writing-mode: vertical-rl;">Team Panel</span
						>
					</div>
					<div class="mt-10 text-content-dim transition-colors group-hover:text-brand-orange">
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 19l-7-7 7-7"
							/>
						</svg>
					</div>
				</button>
			{/if}
		</div>
	{:else}
		<div class="flex h-[60vh] items-center justify-center">
			<p class="animate-pulse text-zinc-500">Initializing workspace context...</p>
		</div>
	{/if}
</div>
