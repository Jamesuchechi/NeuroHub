<script lang="ts">
	import type { MessageReaction } from '$lib/services/chatService';
	import { profileStore } from '$lib/stores/profileStore';
	import { chatService } from '$lib/services/chatService';

	let { reactions = [], messageId } = $props<{
		reactions: MessageReaction[];
		messageId: string;
	}>();

	const profile = $derived($profileStore.profile);

	// Group reactions by emoji
	const groupedReactions = $derived(
		reactions.reduce(
			(acc: Record<string, string[]>, curr: MessageReaction) => {
				if (!acc[curr.emoji]) acc[curr.emoji] = [];
				acc[curr.emoji].push(curr.user_id);
				return acc;
			},
			{} as Record<string, string[]>
		)
	);

	async function toggleReaction(emoji: string) {
		if (!profile) return;

		const hasReacted = groupedReactions[emoji]?.includes(profile.id);
		try {
			if (hasReacted) {
				await chatService.removeReaction(messageId, profile.id, emoji);
			} else {
				await chatService.addReaction(messageId, profile.id, emoji);
			}
		} catch (err) {
			console.error('[ReactionBar] Toggle failed:', err);
		}
	}
</script>

<div class="flex flex-wrap gap-1">
	{#each Object.keys(groupedReactions) as emoji (emoji)}
		{@const userIds = groupedReactions[emoji]}
		{@const hasReacted = profile && userIds.includes(profile.id)}
		<button
			onclick={() => toggleReaction(emoji)}
			class="flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-xs transition-all {hasReacted
				? 'border-brand-orange/30 bg-brand-orange/10 text-brand-orange'
				: 'hover:border-stroke-strong border-stroke bg-surface text-content-dim'}"
		>
			<span>{emoji}</span>
			<span class="font-bold">{userIds.length}</span>
		</button>
	{/each}
</div>
