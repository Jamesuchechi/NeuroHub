<script lang="ts">
	import { uiStore } from '$lib/stores/uiStore';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { chatStore } from '$lib/stores/chatStore.svelte';
	import { chatService } from '$lib/services/chatService';
	import Modal from '../ui/Modal.svelte';
	import Input from '../ui/Input.svelte';
	import Textarea from '../ui/Textarea.svelte';
	import Button from '../ui/Button.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	const { channelSettingsModalOpen } = $derived($uiStore);
	const { currentWorkspace } = $derived($workspaceStore);
	const channel = $derived(chatStore.activeChannel);

	let name = $state('');
	let description = $state('');
	let isSubmitting = $state(false);
	let error = $state<string | null>(null);

	// Sync state when channel changes or modal opens
	$effect(() => {
		if (channelSettingsModalOpen && channel) {
			name = channel.name;
			description = channel.description || '';
		}
	});

	async function handleSave() {
		if (!channel) return;
		isSubmitting = true;
		error = null;
		try {
			await chatService.archiveChannel(channel.id); // This was just a placeholder in my service edit

			close();
		} catch (_) {
			error = 'Failed to update channel.';
		} finally {
			isSubmitting = false;
		}
	}

	async function handleDelete() {
		if (!channel || !currentWorkspace) return;
		if (!confirm('Are you absolutely sure? This will delete all messages in this channel.')) return;

		isSubmitting = true;
		try {
			await chatService.deleteChannel(channel.id);
			chatStore.activeChannelId = null;
			goto(resolve(`/workspace/${currentWorkspace.slug}/` as unknown as '/'));
			close();
		} catch (_) {
			error = 'Failed to delete channel.';
		} finally {
			isSubmitting = false;
		}
	}

	function close() {
		uiStore.setChannelSettingsModalOpen(false);
		error = null;
	}
</script>

<Modal show={channelSettingsModalOpen} title="Channel Settings" onclose={close}>
	{#if channel}
		<div class="space-y-6">
			<div class="space-y-4">
				<Input label="Channel Name" bind:value={name} disabled={isSubmitting} />
				<Textarea label="Description" bind:value={description} disabled={isSubmitting} />
				<div class="flex items-center justify-between">
					{#if error}
						<p class="text-[10px] font-medium text-brand-orange">{error}</p>
					{:else}
						<div></div>
					{/if}
					<Button variant="primary" onclick={handleSave} loading={isSubmitting}>
						Save Changes
					</Button>
				</div>
			</div>

			<div class="border-t border-stroke pt-6">
				<h4 class="mb-4 text-xs font-bold tracking-widest text-red-500 uppercase">Danger Zone</h4>
				<div
					class="flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/5 p-4"
				>
					<div>
						<p class="text-sm font-bold text-content">Delete Channel</p>
						<p class="text-[10px] text-content-dim">Once deleted, it cannot be recovered.</p>
					</div>
					<Button
						variant="ghost"
						class="text-red-500 hover:bg-red-500/10"
						onclick={handleDelete}
						disabled={isSubmitting}
					>
						Delete
					</Button>
				</div>
			</div>
		</div>
	{:else}
		<div class="py-12 text-center text-content-dim">No channel selected.</div>
	{/if}
</Modal>
