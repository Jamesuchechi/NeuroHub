<script lang="ts">
	interface MentionItem {
		user_id: string;
		role: string;
		profile: {
			username: string;
			avatar_url: string | null;
		};
	}

	let { items, command } = $props<{
		items: MentionItem[];
		command: (item: { id: string; label: string }) => void;
	}>();

	let selectedIndex = $state(0);

	export function onKeyDown({ event }: { event: KeyboardEvent }) {
		if (event.key === 'ArrowUp') {
			selectedIndex = (selectedIndex + items.length - 1) % items.length;
			return true;
		}

		if (event.key === 'ArrowDown') {
			selectedIndex = (selectedIndex + 1) % items.length;
			return true;
		}

		if (event.key === 'Enter') {
			selectItem(selectedIndex);
			return true;
		}

		return false;
	}

	function selectItem(index: number) {
		const item = items[index];
		if (item) {
			command({ id: item.user_id, label: item.profile.username });
		}
	}
</script>

<div
	class="flex max-h-[300px] w-64 flex-col overflow-y-auto rounded-xl border border-stroke bg-surface p-1 shadow-2xl backdrop-blur-xl"
>
	{#if items.length === 0}
		<div class="px-3 py-2 text-xs text-content-dim/40">No members found</div>
	{:else}
		{#each items as item, index (item.user_id)}
			<button
				class="flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-all {index ===
				selectedIndex
					? 'bg-brand-orange text-white'
					: 'text-content hover:bg-surface-dim'}"
				onclick={() => selectItem(index)}
			>
				{#if item.profile.avatar_url}
					<img src={item.profile.avatar_url} alt="" class="h-6 w-6 rounded-full object-cover" />
				{:else}
					<div
						class="flex h-6 w-6 items-center justify-center rounded-full bg-surface-dim text-[10px] font-bold"
					>
						{item.profile.username.slice(0, 2).toUpperCase()}
					</div>
				{/if}
				<div class="flex flex-col">
					<span class="text-xs leading-none font-bold">{item.profile.username}</span>
					<span
						class="text-[10px] leading-none {index === selectedIndex
							? 'text-white/60'
							: 'text-content-dim'}"
					>
						{item.role}
					</span>
				</div>
			</button>
		{/each}
	{/if}
</div>
