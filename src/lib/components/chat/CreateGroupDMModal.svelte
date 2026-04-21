<script lang="ts">
	import { uiStore } from '$lib/stores/uiStore';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { chatStore } from '$lib/stores/chatStore.svelte';
	import { chatService } from '$lib/services/chatService';
	import { authStore } from '$lib/stores/authStore';
	import Modal from '../ui/Modal.svelte';
	import Input from '../ui/Input.svelte';
	import Button from '../ui/Button.svelte';
	import Avatar from '../ui/Avatar.svelte';
	import EmojiPicker from './EmojiPicker.svelte';
	import { fly, fade } from 'svelte/transition';

	const { createGroupDMModalOpen } = $derived($uiStore);
	const members = $derived($workspaceStore.members);
	const currentUser = $derived($authStore.user);

	let selectedUserIds = $state<string[]>([]);
	let groupName = $state('');
	let groupIcon = $state('👥');
	let showEmojiPicker = $state(false);
	let isSubmitting = $state(false);
	let searchQuery = $state('');

	const filteredMembers = $derived(
		members.filter(
			(m) =>
				m.user_id !== currentUser?.id &&
				(m.profile.username?.toLowerCase().includes(searchQuery.toLowerCase()) || false)
		)
	);

	function toggleUser(userId: string) {
		if (selectedUserIds.includes(userId)) {
			selectedUserIds = selectedUserIds.filter((id) => id !== userId);
		} else {
			if (selectedUserIds.length < 8) {
				selectedUserIds = [...selectedUserIds, userId];
			}
		}
	}

	async function handleCreate() {
		const workspaceId = $workspaceStore.currentWorkspace?.id;
		if (!workspaceId || !currentUser || selectedUserIds.length < 2) return;

		isSubmitting = true;
		try {
			const channel = await chatService.createGroupDM(
				workspaceId,
				currentUser.id,
				selectedUserIds,
				groupName || undefined,
				groupIcon
			);

			// Update local store
			chatStore.channels = [...chatStore.channels, channel];
			chatStore.selectChannel(channel.id);

			close();
		} catch (err) {
			console.error('[CreateGroupDM] Failed:', err);
		} finally {
			isSubmitting = false;
		}
	}

	function close() {
		uiStore.setCreateGroupDMModalOpen(false);
		selectedUserIds = [];
		groupName = '';
		groupIcon = '👥';
		searchQuery = '';
	}
</script>

<Modal show={createGroupDMModalOpen} title="Create Group DM" onclose={close}>
	<div class="space-y-6">
		<div class="space-y-4">
			<div class="flex items-end gap-3">
				<div class="relative">
					<button
						onclick={() => (showEmojiPicker = !showEmojiPicker)}
						class="flex h-12 w-12 items-center justify-center rounded-2xl border border-stroke bg-surface-dim/40 text-2xl transition-all hover:bg-surface-dim"
						title="Pick group icon"
					>
						{groupIcon}
					</button>
					{#if showEmojiPicker}
						<div class="absolute top-full left-0 z-50 mt-2 shadow-2xl" transition:fade>
							<EmojiPicker
								onSelect={(emoji: string) => {
									groupIcon = emoji;
									showEmojiPicker = false;
								}}
							/>
						</div>
					{/if}
				</div>
				<div class="flex-1">
					<Input
						label="Group Name (Optional)"
						placeholder="e.g. Project Phoenix, Fun Lunch..."
						bind:value={groupName}
						disabled={isSubmitting}
					/>
				</div>
			</div>

			<div class="space-y-2">
				<label
					for="user-search"
					class="text-[10px] font-black tracking-widest text-content-dim uppercase"
					>Select Members (2-8 required)</label
				>
				<div class="relative">
					<input
						id="user-search"
						type="text"
						placeholder="Search members..."
						bind:value={searchQuery}
						class="w-full rounded-xl border border-stroke bg-surface-dim/40 px-4 py-2 text-sm text-content transition-all outline-none focus:border-brand-orange/40 focus:ring-1 focus:ring-brand-orange/20"
					/>
				</div>
			</div>

			<div class="scrollbar-hide max-h-60 space-y-1 overflow-y-auto pr-2">
				{#each filteredMembers as member (member.user_id)}
					{@const isSelected = selectedUserIds.includes(member.user_id)}
					<button
						onclick={() => toggleUser(member.user_id)}
						class="flex w-full items-center gap-3 rounded-xl p-2 transition-all {isSelected
							? 'bg-brand-orange/10 ring-1 ring-brand-orange/30'
							: 'hover:bg-surface-dim/60'}"
					>
						<Avatar
							src={member.profile.avatar_url}
							name={member.profile.username || 'User'}
							size="sm"
						/>
						<div class="flex-1 text-left">
							<p class="text-xs font-bold text-content">{member.profile.username}</p>
							<p class="text-[10px] text-content-dim">Member</p>
						</div>
						<div
							class="flex h-5 w-5 items-center justify-center rounded-full border border-stroke {isSelected
								? 'border-brand-orange bg-brand-orange'
								: 'bg-transparent'}"
						>
							{#if isSelected}
								<svg class="h-3 w-3 text-zinc-950" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clip-rule="evenodd"
									/>
								</svg>
							{/if}
						</div>
					</button>
				{:else}
					<div class="py-8 text-center text-xs text-content-dim">
						No members found matching "{searchQuery}"
					</div>
				{/each}
			</div>
		</div>

		{#if selectedUserIds.length > 0}
			<div class="flex flex-wrap gap-2 pt-2" in:fade>
				{#each selectedUserIds as userId (userId)}
					{@const member = members.find((m) => m.user_id === userId)}
					<div
						class="flex items-center gap-1.5 rounded-full border border-brand-orange/20 bg-brand-orange/5 py-1 pr-2 pl-1"
						transition:fly={{ y: 5 }}
					>
						<Avatar src={member?.profile.avatar_url} size="xs" />
						<span class="text-[10px] font-bold text-brand-orange">{member?.profile.username}</span>
						<button
							onclick={() => toggleUser(userId)}
							class="text-brand-orange/50 hover:text-brand-orange"
							aria-label="Remove member"
							title="Remove member"
						>
							<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
								<path
									fill-rule="evenodd"
									d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
									clip-rule="evenodd"
								/>
							</svg>
						</button>
					</div>
				{/each}
			</div>
		{/if}

		<div class="flex items-center justify-between border-t border-stroke pt-6">
			<p class="text-[10px] text-content-dim">
				{selectedUserIds.length} users selected (max 8)
			</p>
			<Button
				variant="primary"
				onclick={handleCreate}
				loading={isSubmitting}
				disabled={selectedUserIds.length < 2 || isSubmitting}
			>
				Create Group
			</Button>
		</div>
	</div>
</Modal>
