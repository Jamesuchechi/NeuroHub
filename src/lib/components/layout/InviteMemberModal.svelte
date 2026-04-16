<script lang="ts">
	import { workspacesService } from '$lib/services/workspaces';
	import Modal from '../ui/Modal.svelte';
	import Input from '../ui/Input.svelte';
	import Button from '../ui/Button.svelte';

	import { uiStore } from '$lib/stores/uiStore';

	let { workspaceId } = $props<{
		workspaceId: string;
	}>();

	const { inviteModalOpen } = $derived($uiStore);

	function close() {
		uiStore.setInviteModalOpen(false);
	}

	let email = $state('');
	let role = $state<'owner' | 'member' | 'guest'>('member');
	let loading = $state(false);
	let error = $state('');
	let inviteLink = $state('');

	async function handleInvite(e: SubmitEvent) {
		e.preventDefault();
		loading = true;
		error = '';
		inviteLink = '';

		try {
			const invite = await workspacesService.createInvite(workspaceId, email, role);
			const origin = window.location.origin;
			inviteLink = `${origin}/invite/${invite.token}`;
			email = '';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create invite';
		} finally {
			loading = false;
		}
	}

	function copyToClipboard() {
		navigator.clipboard.writeText(inviteLink);
	}
</script>

<Modal show={inviteModalOpen} onclose={close} title="Invite Member">
	<div class="space-y-6">
		{#if inviteLink}
			<div class="rounded-xl border border-green-500/20 bg-green-500/10 p-6 text-center">
				<p class="mb-4 text-sm font-medium text-green-500">Invite generated successfully!</p>
				<div
					class="flex items-center gap-2 rounded-lg border border-stroke bg-surface px-3 py-2 text-xs"
				>
					<span class="truncate pr-2 text-content-dim">{inviteLink}</span>
					<button
						onclick={copyToClipboard}
						class="ml-auto shrink-0 font-bold text-orange-500 hover:text-orange-400"
					>
						Copy
					</button>
				</div>
				<p class="mt-4 text-[10px] tracking-wider text-zinc-500 uppercase">
					Share this link with {email || 'the user'} to join
				</p>
				<button
					onclick={() => (inviteLink = '')}
					class="mt-6 text-xs text-zinc-400 underline hover:text-white"
				>
					Invite someone else
				</button>
			</div>
		{:else}
			<p class="text-sm leading-relaxed text-zinc-500">
				Invite a new member to collaborate in this workspace. They will receive access based on the
				role you assign.
			</p>

			<form onsubmit={handleInvite} class="space-y-6">
				<Input
					label="Email Address"
					type="email"
					bind:value={email}
					placeholder="colleague@example.com"
					required
				/>

				<div class="space-y-2">
					<label
						for="invite-role"
						class="block text-[10px] font-bold tracking-[1px] text-zinc-500 uppercase"
					>
						Role
					</label>
					<select
						id="invite-role"
						bind:value={role}
						class="w-full rounded-xl border border-stroke bg-surface-dim px-4 py-3.5 text-sm text-content transition-all outline-none focus:border-orange-500"
					>
						<option value="owner">Owner (Full Control)</option>
						<option value="member">Member (Read/Write)</option>
						<option value="guest">Guest (Read Only)</option>
					</select>
				</div>

				{#if error}
					<p class="text-xs font-medium text-red-500">{error}</p>
				{/if}

				<div class="flex gap-3 pt-2">
					<Button variant="secondary" type="button" onclick={close} class="flex-1">Cancel</Button>
					<Button variant="primary" type="submit" {loading} class="flex-1">Generate Link</Button>
				</div>
			</form>
		{/if}
	</div>
</Modal>
