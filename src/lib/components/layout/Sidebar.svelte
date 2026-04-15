<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	import { userStore } from '$lib/stores/userStore';
	import { authStore } from '$lib/stores/authStore';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { workspacesService } from '$lib/services/workspaces';
	import { supabase } from '$lib/services/supabase';
	import { goto } from '$app/navigation';
	import { fly, slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import Avatar from '../ui/Avatar.svelte';
	import { onMount } from 'svelte';

	import type { Database } from '$lib/types/db';

	type Workspace = Database['public']['Tables']['workspaces']['Row'];

	const profile = $derived($userStore.profile);
	const user = $derived($authStore.user);
	const currentWorkspace = $derived($workspaceStore.currentWorkspace);

	let workspaces = $state<Workspace[]>([]);
	let showSwitcher = $state(false);

	interface NavLink {
		name: string;
		href: string;
		icon: string;
		isWorkspace?: boolean;
	}

	// Dynamic links based on current workspace
	const workspaceLinks = $derived<NavLink[]>(
		currentWorkspace
			? [
					{ name: 'Dashboard', href: `/workspace/${currentWorkspace.slug}`, icon: 'dashboard' },
					{ name: 'Channels', href: `/workspace/${currentWorkspace.slug}/chat`, icon: 'chat' },
					{
						name: 'Knowledge Base',
						href: `/workspace/${currentWorkspace.slug}/notes`,
						icon: 'book'
					},
					{
						name: 'Code Snippets',
						href: `/workspace/${currentWorkspace.slug}/snippets`,
						icon: 'code'
					},
					{
						name: 'Team Members',
						href: `/workspace/${currentWorkspace.slug}/settings`,
						icon: 'users'
					}
				]
			: []
	);

	const dashboardLinks: NavLink[] = [
		{ name: 'Activity Hub', href: '/dashboard', icon: 'pulse' },
		{ name: 'My Workspaces', href: '/dashboard', icon: 'grid' }
	];

	const bottomLinks = $derived<NavLink[]>(
		currentWorkspace
			? [
					{
						name: 'Settings',
						href: `/workspace/${currentWorkspace.slug}/settings`,
						icon: 'settings'
					}
				]
			: [{ name: 'Settings', href: '/dashboard/settings', icon: 'settings' }]
	);

	async function loadWorkspaces() {
		if (!user) return;
		try {
			workspaces = await workspacesService.getUserWorkspaces(user.id);
		} catch (err) {
			console.error('Failed to load workspaces for switcher:', err);
		}
	}

	async function switchWorkspace(slug: string) {
		if (!user) return;
		await workspaceStore.setWorkspace(slug, user.id);
		showSwitcher = false;
		goto(resolve(`/workspace/${slug}` as unknown as '/'));
	}

	async function handleLogout() {
		try {
			await supabase.auth.signOut();
			goto(resolve('/login' as unknown as '/'));
		} catch (err) {
			console.error('Logout failed:', err);
		}
	}

	onMount(() => {
		loadWorkspaces();
	});
</script>

<aside
	in:fly={{ x: -280, duration: 800, easing: cubicOut }}
	class="flex h-screen w-72 flex-col border-r border-zinc-900 bg-black text-zinc-400 transition-all"
>
	<!-- Workspace Switcher -->
	<div class="relative p-6">
		<button
			onclick={() => (showSwitcher = !showSwitcher)}
			class="flex w-full items-center gap-3 rounded-xl border border-zinc-900 bg-zinc-950/50 p-3 text-left transition-all hover:border-zinc-800 hover:bg-zinc-900/50 {showSwitcher
				? 'border-orange-500/50 bg-zinc-900'
				: ''}"
		>
			<div
				class="flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br from-orange-500 to-blue-600 p-2 shadow-lg"
			>
				{#if currentWorkspace?.logo_url}
					<img src={currentWorkspace.logo_url} alt="Logo" class="h-full w-full object-contain" />
				{:else if currentWorkspace}
					<span class="text-lg font-black text-white">{currentWorkspace.name[0]}</span>
				{:else}
					<img src="/logo.png" alt="Logo" class="h-full w-full object-contain" />
				{/if}
			</div>
			<div class="flex-1 overflow-hidden">
				<p class="truncate text-sm font-bold whitespace-nowrap text-white">
					{currentWorkspace?.name || 'Select Workspace'}
				</p>
				<p class="truncate text-[10px] tracking-tight text-zinc-500 uppercase">
					{currentWorkspace
						? currentWorkspace.slug.includes('personal')
							? 'Personal'
							: 'Team Workspace'
						: 'Quick Switcher'}
				</p>
			</div>
			<svg
				class="h-4 w-4 text-zinc-600 transition-transform duration-300 {showSwitcher
					? 'rotate-180'
					: ''}"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>

		{#if showSwitcher}
			<div
				transition:slide={{ duration: 300, easing: cubicOut }}
				class="absolute top-[calc(100%-8px)] right-6 left-6 z-50 mt-2 space-y-1 rounded-xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl backdrop-blur-xl"
			>
				<div class="mb-1 px-2 py-1.5">
					<p class="text-[10px] font-bold tracking-wider text-zinc-600 uppercase">
						Your Workspaces
					</p>
				</div>
				{#each workspaces as ws (ws.id)}
					<button
						onclick={() => switchWorkspace(ws.slug)}
						class="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-all hover:bg-zinc-900 {currentWorkspace?.id ===
						ws.id
							? 'bg-zinc-900/50'
							: ''}"
					>
						<div
							class="flex h-8 w-8 items-center justify-center rounded bg-zinc-900 text-xs font-bold text-zinc-400"
						>
							{ws.name[0]}
						</div>
						<div class="flex-1 overflow-hidden">
							<p class="truncate text-xs font-bold text-white">{ws.name}</p>
							<p class="truncate text-[9px] text-zinc-500">neurohub.io/{ws.slug}</p>
						</div>
						{#if currentWorkspace?.id === ws.id}
							<div
								class="h-1.5 w-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]"
							></div>
						{/if}
					</button>
				{/each}

				<div class="my-2 border-t border-zinc-900 pt-2">
					<button
						onclick={() => {
							showSwitcher = false;
							goto(resolve('/dashboard' as unknown as '/'));
						}}
						class="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-zinc-500 transition-all hover:bg-zinc-900 hover:text-white"
					>
						<div
							class="flex h-8 w-8 items-center justify-center rounded border border-dashed border-zinc-800 text-lg"
						>
							+
						</div>
						<p class="text-xs font-medium">Create New Workspace</p>
					</button>
				</div>
			</div>
		{/if}
	</div>

	<!-- Search Trigger -->
	<div class="mb-6 px-6">
		<button
			class="flex w-full items-center gap-3 rounded-xl border border-zinc-900 bg-zinc-950 px-4 py-2.5 text-zinc-500 transition-all hover:border-zinc-800 hover:bg-zinc-950"
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
				/>
			</svg>
			<span class="text-xs font-medium">Search...</span>
			<span class="ml-auto rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600"
				>⌘K</span
			>
		</button>
	</div>

	<!-- Global Hub Navigation -->
	<div class="mb-4 px-6">
		<p class="mb-2 px-3 text-[10px] font-bold tracking-[2px] text-zinc-600 uppercase">Global Hub</p>
		<nav class="space-y-1">
			{#each dashboardLinks as link (link.name)}
				<a
					href={resolve(link.href as unknown as '/')}
					class="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all {page
						.url.pathname === link.href
						? 'bg-zinc-900 text-white'
						: 'hover:bg-zinc-950 hover:text-white'}"
				>
					<div class="flex h-5 w-5 items-center justify-center">
						{#if link.icon === 'pulse'}
							<svg class="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="1.5"
									d="M13 10V3L4 14h7v7l9-11h-7z"
								/>
							</svg>
						{:else if link.icon === 'grid'}
							<svg class="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="1.5"
									d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
								/>
							</svg>
						{/if}
					</div>
					{link.name}
				</a>
			{/each}
		</nav>
	</div>

	<!-- Workspace Navigation -->
	{#if currentWorkspace}
		<div class="flex-1 overflow-y-auto px-6">
			<p class="mb-2 px-3 text-[10px] font-bold tracking-[2px] text-zinc-600 uppercase">
				Workspace
			</p>
			<nav class="space-y-1">
				{#each workspaceLinks as link (link.name)}
					<a
						href={resolve(link.href as unknown as '/')}
						class="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all {page.url.pathname.startsWith(
							link.href
						)
							? 'bg-zinc-900 text-white'
							: 'hover:bg-zinc-950 hover:text-white'}"
					>
						<div class="flex h-5 w-5 items-center justify-center">
							{#if link.icon === 'dashboard'}
								<svg class="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="1.5"
										d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
									/>
								</svg>
							{:else if link.icon === 'chat'}
								<svg class="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="1.5"
										d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
									/>
								</svg>
							{:else if link.icon === 'book'}
								<svg class="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="1.5"
										d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
									/>
								</svg>
							{:else if link.icon === 'code'}
								<svg class="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="1.5"
										d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
									/>
								</svg>
							{:else if link.icon === 'users'}
								<svg class="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="1.5"
										d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
									/>
								</svg>
							{/if}
						</div>
						{link.name}
					</a>
				{/each}
			</nav>
		</div>
	{/if}

	<!-- Footer Links -->
	<div class="space-y-1 border-t border-zinc-900 p-4">
		{#each bottomLinks as link (link.href)}
			<a
				href={resolve(link.href as unknown as '/')}
				class="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all {page
					.url.pathname === link.href
					? 'text-white'
					: 'hover:text-white'}"
			>
				<div class="flex h-5 w-5 items-center justify-center">
					{#if link.icon === 'settings'}
						<svg class="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="1.5"
								d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
							/>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="1.5"
								d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
							/>
						</svg>
					{/if}
				</div>
				{link.name}
			</a>
		{/each}

		<div class="mt-4 flex items-center gap-3 border-t border-zinc-900 px-3 py-4">
			<Avatar name={profile?.username || 'User'} size="sm" src={profile?.avatar_url} />
			<div class="flex-1 overflow-hidden text-left">
				<p class="truncate text-xs font-bold text-white">{profile?.username || 'Developer'}</p>
				<p class="truncate text-[10px] text-zinc-500 lowercase">Free Plan</p>
			</div>
			<button
				onclick={handleLogout}
				class="text-zinc-600 transition-colors hover:text-white"
				aria-label="Log out"
				title="Log out"
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
					/>
				</svg>
			</button>
		</div>
	</div>
</aside>
