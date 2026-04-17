<script lang="ts">
	import { uiStore } from '$lib/stores/uiStore';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { authStore } from '$lib/stores/authStore';
	import { chatService } from '$lib/services/chatService';
	import { chatStore } from '$lib/stores/chatStore.svelte';
	import Modal from '../ui/Modal.svelte';
	import Avatar from '../ui/Avatar.svelte';
	import Button from '../ui/Button.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	const { startChatModalOpen } = $derived($uiStore);
	const { members, currentWorkspace } = $derived($workspaceStore);
	const { user } = $derived($authStore);

	let query = $state('');
	let isSubmitting = $state(false);

	const filteredMembers = $derived(
		members.filter((m) => {
			if (m.user_id === user?.id) return false; // Don't DM yourself
			const searchStr = (m.profile.username || '').toLowerCase();
			return searchStr.includes(query.toLowerCase());
		})
	);

	async function startConversation(memberId: string) {
		if (!currentWorkspace || !user) return;

		isSubmitting = true;
		try {
			const channel = await chatService.getOrCreateDMChannel(
				currentWorkspace.id,
				user.id,
				memberId
			);

			await chatStore.init(currentWorkspace.id);
			close();
			goto(resolve(`/workspace/${currentWorkspace.slug}/chat/${channel.id}` as unknown as '/'));
		} catch (err) {
			console.error('[StartChatModal] Failed to start chat:', err);
		} finally {
			isSubmitting = false;
		}
	}

	function close() {
		uiStore.setStartChatModalOpen(false);
		query = '';
	}
</script>

<Modal show={startChatModalOpen} title="New Message" onclose={close}>
	<div class="space-y-4">
		<div class="relative">
			<input
				bind:value={query}
				type="text"
				placeholder="Search for a team member..."
				class="w-full rounded-xl border border-stroke bg-zinc-900 px-4 py-3 text-sm text-content transition-all outline-none focus:border-brand-orange/50 focus:ring-1 focus:ring-brand-orange/30"
			/>
		</div>

		<div class="scrollbar-none max-h-[300px] space-y-1 overflow-y-auto">
			{#if filteredMembers.length > 0}
				{#each filteredMembers as member (member.user_id)}
					<button
						onclick={() => startConversation(member.user_id)}
						disabled={isSubmitting}
						class="group flex w-full items-center gap-3 rounded-xl p-2 text-left transition-all hover:bg-surface-dim"
					>
						<Avatar
							name={member.profile.username || 'User'}
							src={member.profile.avatar_url}
							size="sm"
						/>
						<div class="flex-1 overflow-hidden">
							<p class="truncate text-sm font-bold text-content group-hover:text-brand-orange">
								{member.profile.username}
							</p>
							<p class="truncate text-[10px] text-content-dim">
								{member.role === 'owner' ? 'Workspace Owner' : 'Team Member'}
							</p>
						</div>
						<div
							class="shadow-neon-green h-1.5 w-1.5 rounded-full bg-brand-green opacity-0 transition-opacity group-hover:opacity-100"
						></div>
					</button>
				{/each}
			{:else}
				<div class="py-8 text-center text-zinc-600">
					<p class="text-xs italic">No members found matching "{query}"</p>
				</div>
			{/if}
		</div>

		<div class="flex justify-end pt-2">
			<Button variant="ghost" onclick={close} disabled={isSubmitting}>Cancel</Button>
		</div>
	</div>
</Modal>
