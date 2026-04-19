<script lang="ts">
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { chatStore } from '$lib/stores/chatStore.svelte';
	import { slide } from 'svelte/transition';

	/**
	 * SearchFilters component
	 * Provides a UI for narrowing down search results by type, author, channel, and date.
	 */
	let {
		onFilterChange = () => {},
		activeFilters = $bindable({
			type: 'all',
			authorId: '',
			channelId: '',
			dateRange: 'all'
		})
	} = $props<{
		onFilterChange?: (filters: {
			type: string;
			authorId: string;
			channelId: string;
			dateRange: string;
		}) => void;
		activeFilters?: {
			type: string;
			authorId: string;
			channelId: string;
			dateRange: string;
		};
	}>();

	const members = $derived($workspaceStore.members);
	const channels = $derived(chatStore.channels);

	const types = [
		{ id: 'all', label: 'All Types' },
		{ id: 'message', label: 'Messages' },
		{ id: 'note', label: 'Notes' },
		{ id: 'snippet', label: 'Snippets' }
	];

	const dateRanges = [
		{ id: 'all', label: 'Anytime' },
		{ id: 'today', label: 'Today' },
		{ id: 'week', label: 'Last 7 days' },
		{ id: 'month', label: 'Last 30 days' }
	];

	function updateFilter(key: string, value: string) {
		activeFilters[key] = value;
		onFilterChange(activeFilters);
	}
</script>

<div class="space-y-8">
	<!-- Type Filter -->
	<div>
		<p class="mb-4 text-[10px] font-bold tracking-widest text-content-dim uppercase">
			Resource Type
		</p>
		<div class="grid grid-cols-2 gap-2">
			{#each types as type (type.id)}
				<button
					onclick={() => updateFilter('type', type.id)}
					class="rounded-xl border px-3 py-2.5 text-xs font-semibold whitespace-nowrap transition-all
						{activeFilters.type === type.id
						? 'border-brand-orange bg-brand-orange/10 text-brand-orange shadow-[0_0_15px_rgba(249,115,22,0.1)]'
						: 'border-stroke bg-surface-dim/40 text-content-dim hover:border-stroke hover:text-content'}"
				>
					{type.label}
				</button>
			{/each}
		</div>
	</div>

	<!-- Author Filter -->
	<div>
		<p class="mb-4 text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Author</p>
		<select
			value={activeFilters.authorId}
			onchange={(e) => updateFilter('authorId', e.currentTarget.value)}
			class="w-full cursor-pointer rounded-xl border border-stroke bg-surface-dim/40 px-4 py-3 text-xs text-content transition-all outline-none hover:border-stroke hover:text-content focus:border-brand-orange/50 focus:bg-surface-dim"
		>
			<option value="">Everyone in Workspace</option>
			{#each members as member (member.user_id)}
				<option value={member.user_id}>{member.profile.username}</option>
			{/each}
		</select>
	</div>

	<!-- Channel Filter (Only for messages) -->
	{#if activeFilters.type === 'all' || activeFilters.type === 'message'}
		<div transition:slide={{ duration: 300 }}>
			<p class="mb-4 text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Channel</p>
			<select
				value={activeFilters.channelId}
				onchange={(e) => updateFilter('channelId', e.currentTarget.value)}
				class="w-full cursor-pointer rounded-xl border border-stroke bg-surface-dim/40 px-4 py-3 text-xs text-content transition-all outline-none hover:border-stroke hover:text-content focus:border-brand-orange/50 focus:bg-surface-dim"
			>
				<option value="">All Channels</option>
				{#each channels as channel (channel.id)}
					<option value={channel.id}>#{channel.name}</option>
				{/each}
			</select>
		</div>
	{/if}

	<!-- Date Filter -->
	<div>
		<p class="mb-4 text-[10px] font-bold tracking-widest text-content-dim uppercase">Date Range</p>
		<div class="space-y-1">
			{#each dateRanges as range (range.id)}
				<button
					onclick={() => updateFilter('dateRange', range.id)}
					class="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs transition-all
						{activeFilters.dateRange === range.id
						? 'bg-surface-dim font-bold text-brand-orange'
						: 'text-content-dim hover:bg-surface-dim/40 hover:text-content'}"
				>
					<div
						class="h-1.5 w-1.5 rounded-full transition-all {activeFilters.dateRange === range.id
							? 'scale-125 bg-brand-orange shadow-neon-orange'
							: 'bg-stroke group-hover:bg-zinc-600'}"
					></div>
					{range.label}
				</button>
			{/each}
		</div>
	</div>
</div>
