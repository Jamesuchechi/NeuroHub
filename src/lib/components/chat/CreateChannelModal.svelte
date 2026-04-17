<script lang="ts">
	import { uiStore } from '$lib/stores/uiStore';
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { authStore } from '$lib/stores/authStore';
	import { chatService } from '$lib/services/chatService';
	import { chatStore } from '$lib/stores/chatStore.svelte';
	import Modal from '../ui/Modal.svelte';
	import Input from '../ui/Input.svelte';
	import Textarea from '../ui/Textarea.svelte';
	import Button from '../ui/Button.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	let name = $state('');
	let description = $state('');
	let type = $state<'text' | 'announcement' | 'private'>('text');
	let isSubmitting = $state(false);
	let error = $state<string | null>(null);

	const { createChannelModalOpen } = $derived($uiStore);
	const { currentWorkspace } = $derived($workspaceStore);
	const { user } = $derived($authStore);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!currentWorkspace || !user || !name.trim()) return;

		isSubmitting = true;
		error = null;

		try {
			const channel = await chatService.createChannel(
				currentWorkspace.id,
				user.id,
				name.trim(),
				description.trim(),
				type
			);

			// Refresh channels in store
			await chatStore.init(currentWorkspace.id);

			// Close modal and navigate
			close();
			goto(resolve(`/workspace/${currentWorkspace.slug}/chat/${channel.id}` as unknown as '/'));
		} catch (err) {
			console.error('[CreateChannelModal] Failed to create channel:', err);
			error = 'Failed to create channel. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}

	function close() {
		uiStore.setCreateChannelModalOpen(false);
		name = '';
		description = '';
		type = 'text';
		error = null;
	}
</script>

<Modal show={createChannelModalOpen} title="Create Channel" onclose={close}>
	<form onsubmit={handleSubmit} class="space-y-6">
		<div class="space-y-2">
			<p class="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Channel Name</p>
			<Input
				bind:value={name}
				placeholder="e.g. engineering-updates"
				required
				disabled={isSubmitting}
			/>
			<p class="text-[10px] text-zinc-500">
				Channels are where your team communicates. Use lowercase and hyphens.
			</p>
		</div>

		<div class="space-y-2">
			<p class="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
				Description (Optional)
			</p>
			<Textarea
				bind:value={description}
				placeholder="What is this channel about?"
				disabled={isSubmitting}
			/>
		</div>

		<div class="space-y-2">
			<p class="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Channel Type</p>
			<select
				bind:value={type}
				disabled={isSubmitting}
				class="w-full rounded-xl border border-stroke bg-zinc-900 px-4 py-3 text-sm text-content transition-all outline-none focus:border-brand-orange/50 focus:ring-1 focus:ring-brand-orange/30"
			>
				<option value="text">Public — Anyone in the workspace</option>
				<option value="private">Private — Selected members only</option>
				<option value="announcement">Announcement — Only owners can post</option>
			</select>
		</div>

		{#if error}
			<p class="text-xs font-medium text-brand-orange">{error}</p>
		{/if}

		<div class="flex items-center justify-end gap-3 pt-2">
			<Button variant="ghost" onclick={close} disabled={isSubmitting}>Cancel</Button>
			<Button variant="primary" type="submit" loading={isSubmitting} disabled={!name.trim()}>
				Create Channel
			</Button>
		</div>
	</form>
</Modal>
