<script lang="ts">
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	const workspace = $derived($workspaceStore.currentWorkspace);
	const members = $derived($workspaceStore.members);
	const userRole = $derived($workspaceStore.userRole);

	// Mock stats for demonstration
	const stats = [
		{ name: 'Channels', value: '12', icon: 'chat' },
		{ name: 'Documents', value: '45', icon: 'book' },
		{ name: 'Snippets', value: '28', icon: 'code' },
		{ name: 'Active Members', value: '8', icon: 'users' }
	];
</script>

<div class="p-8 md:p-12">
	{#if workspace}
		<div
			in:fly={{ y: 20, duration: 800, easing: cubicOut }}
			class="mb-12 flex flex-col gap-8 md:flex-row md:items-center md:justify-between"
		>
			<div class="flex items-center gap-6">
				<div
					class="h-20 w-20 overflow-hidden rounded-3xl bg-linear-to-br from-orange-500 to-blue-600 shadow-2xl ring-4 ring-zinc-900/50"
				>
					{#if workspace.logo_url}
						<img src={workspace.logo_url} alt={workspace.name} class="h-full w-full object-cover" />
					{:else}
						<div
							class="flex h-full w-full items-center justify-center text-3xl font-black text-white"
						>
							{workspace.name[0]}
						</div>
					{/if}
				</div>
				<div>
					<h1 class="mb-2 text-4xl font-black tracking-tight text-white">{workspace.name}</h1>
					<div class="flex items-center gap-2">
						<span
							class="rounded-full bg-zinc-900 px-3 py-1 text-[10px] font-bold tracking-wider text-orange-500 uppercase ring-1 ring-zinc-800"
						>
							{userRole}
						</span>
						<span class="text-sm font-medium text-zinc-500">neurohub.io/{workspace.slug}</span>
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

		<!-- Stats Grid -->
		<div
			in:fly={{ y: 30, duration: 1000, easing: cubicOut, delay: 200 }}
			class="mb-12 grid grid-cols-2 gap-6 lg:grid-cols-4"
		>
			{#each stats as stat (stat.name)}
				<div
					class="group relative rounded-3xl border border-zinc-900 bg-zinc-950/50 p-6 transition-all hover:border-zinc-800 hover:bg-zinc-900/50"
				>
					<div
						class="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 transition-colors group-hover:bg-orange-500/10 group-hover:text-orange-500"
					>
						{#if stat.icon === 'chat'}
							<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="1.5"
									d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
								/>
							</svg>
						{:else if stat.icon === 'book'}
							<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="1.5"
									d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
								/>
							</svg>
						{:else if stat.icon === 'code'}
							<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="1.5"
									d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
								/>
							</svg>
						{:else if stat.icon === 'users'}
							<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="1.5"
									d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
								/>
							</svg>
						{/if}
					</div>
					<p class="text-3xl font-black text-white">{stat.value}</p>
					<p class="text-xs font-bold tracking-widest text-zinc-500 uppercase">{stat.name}</p>
				</div>
			{/each}
		</div>

		<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
			<!-- Recent Activity -->
			<div
				in:fly={{ y: 40, duration: 1200, easing: cubicOut, delay: 400 }}
				class="rounded-3xl border border-zinc-900 bg-zinc-950/50 p-8 lg:col-span-2"
			>
				<h3 class="mb-8 text-xl font-black text-white">Recent Activity</h3>
				<div class="space-y-6">
					{#each Array.from({ length: 4 }) as _, i (i)}
						<div class="flex gap-4 border-l-2 border-zinc-900 pb-6 pl-6 last:pb-0">
							<div class="h-10 w-10 shrink-0 rounded-full bg-zinc-900"></div>
							<div>
								<p class="text-sm font-bold text-white">
									James Uchechi <span class="font-normal text-zinc-500">updated the</span> Deployment
									Guide
								</p>
								<p class="text-[11px] font-medium tracking-tight text-zinc-600 uppercase">
									Today at 2:45 PM • in Knowledge Base
								</p>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Team Members -->
			<div
				in:fly={{ y: 40, duration: 1200, easing: cubicOut, delay: 600 }}
				class="rounded-3xl border border-zinc-900 bg-zinc-950/50 p-8"
			>
				<div class="mb-8 flex items-center justify-between">
					<h3 class="text-xl font-black text-white">Team</h3>
					<span class="text-xs font-bold text-zinc-500">{members.length} Online</span>
				</div>
				<div class="space-y-4">
					{#each members as member (member.user_id)}
						<div class="group flex items-center justify-between transition-all hover:translate-x-1">
							<div class="flex items-center gap-3">
								<Avatar
									name={member.profile.username || 'User'}
									src={member.profile.avatar_url}
									size="sm"
								/>
								<div>
									<p class="text-sm font-bold text-white">{member.profile.username}</p>
									<p class="text-[10px] font-bold text-zinc-600 uppercase">{member.role}</p>
								</div>
							</div>
							<div class="h-1.5 w-1.5 rounded-full bg-green-500"></div>
						</div>
					{/each}
				</div>
				<Button variant="secondary" class="mt-8 w-full">View All Members</Button>
			</div>
		</div>
	{:else}
		<div class="flex h-[60vh] items-center justify-center">
			<p class="animate-pulse text-zinc-500">Initializing workspace context...</p>
		</div>
	{/if}
</div>
