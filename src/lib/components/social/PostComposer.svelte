<script lang="ts">
	import Avatar from '../ui/Avatar.svelte';
	import Button from '../ui/Button.svelte';
	import { profileStore } from '$lib/stores/profileStore';
	import { activityService, type Attachment } from '$lib/services/activity';
	import { cloudinaryService } from '$lib/services/cloudinary';
	import { fly, fade, slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { type PostBlock } from '$lib/types/social';
	import { workspacesService } from '$lib/services/workspaces';
	import type { Database } from '$lib/types/db';

	type Workspace = Database['public']['Tables']['workspaces']['Row'];

	let {
		workspaceId = null,
		onPostCreated,
		placeholder = '',
		options = { parentId: null },
		showActions = true
	} = $props<{
		workspaceId?: string | null;
		onPostCreated?: () => void;
		placeholder?: string;
		options?: { parentId?: string | null };
		showActions?: boolean;
	}>();

	const profile = $derived($profileStore.profile);
	let posts = $state<PostBlock[]>([createEmptyBlock()]);
	let isFocused = $state(false);
	let isSubmitting = $state(false);
	let fileInput: HTMLInputElement;
	let isUploading = $state(false);
	let activeUploadIndex = $state<number | null>(null);

	let userWorkspaces = $state<Workspace[]>([]);
	let selectedWorkspaceId = $state<string | null>(null);
	let isPublic = $state(true);

	// Sync local state with prop changes
	$effect(() => {
		selectedWorkspaceId = workspaceId;
		isPublic = workspaceId === null;
	});

	$effect(() => {
		if (!workspaceId && profile?.id && userWorkspaces.length === 0) {
			workspacesService
				.getUserWorkspaces(profile.id)
				.then((ws) => {
					userWorkspaces = ws;
					// Default to first workspace if available and we're in the global hub
					if (ws.length > 0 && selectedWorkspaceId === null) {
						selectedWorkspaceId = ws[0].id;
					}
				})
				.catch((err) => {
					console.error('[PostComposer] Failed to fetch workspaces:', err);
				});
		}
	});

	function createEmptyBlock(): PostBlock {
		return {
			id: crypto.randomUUID(),
			content: '',
			attachments: [],
			showPollCreator: false,
			pollQuestion: '',
			pollOptions: ['', '']
		};
	}

	function addPostBlock() {
		posts = [...posts, createEmptyBlock()];
	}

	function removePostBlock(index: number) {
		if (posts.length > 1) {
			posts = posts.filter((_, i) => i !== index);
		}
	}

	// URL Detection Regex
	const URL_REGEX = /(https?:\/\/[^\s]+)/g;

	function detectLinks(text: string): Attachment[] {
		const links = text.match(URL_REGEX) || [];
		return links.map((url) => {
			let type: Attachment['type'] = 'link';
			let provider = '';

			if (url.includes('youtube.com') || url.includes('youtu.be')) {
				provider = 'youtube';
			} else if (url.includes('zoom.us')) {
				provider = 'zoom';
			}

			return { type, url, provider };
		});
	}

	async function handleFileSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file || activeUploadIndex === null) return;

		isUploading = true;
		try {
			const res = await cloudinaryService.uploadFile(file, { folder: 'posts' });
			const newAttachment: Attachment = {
				type: res.resource_type === 'video' ? 'video' : 'image',
				url: res.secure_url,
				thumbnail: res.secure_url.replace('/upload/', '/upload/w_200,c_fill/')
			};

			posts[activeUploadIndex].attachments = [
				...posts[activeUploadIndex].attachments,
				newAttachment
			];
		} catch (err) {
			console.error('[PostComposer] Upload failed:', err);
		} finally {
			isUploading = false;
			activeUploadIndex = null;
		}
	}

	async function handleSubmit() {
		const hasContent = posts.some(
			(p) => p.content.trim() || p.attachments.length > 0 || p.showPollCreator
		);
		if (!hasContent || !profile) return;

		isSubmitting = true;
		try {
			let lastParentId = options.parentId;

			for (const block of posts) {
				if (!block.content.trim() && block.attachments.length === 0 && !block.showPollCreator)
					continue;

				const detected = detectLinks(block.content);
				const allAttachments = [...block.attachments, ...detected];

				const pollData = block.showPollCreator
					? {
							question: block.pollQuestion || block.content || 'Poll',
							options: block.pollOptions.filter((o) => o.trim().length > 0)
						}
					: undefined;

				const res = await activityService.createPost(profile.id, block.content, {
					workspaceId: selectedWorkspaceId,
					attachments: allAttachments,
					isPublic: isPublic,
					parentId: lastParentId,
					poll: pollData
				});

				// Chain the thread
				lastParentId = res.id;
			}

			// Reset
			posts = [createEmptyBlock()];
			isFocused = false;
			if (onPostCreated) onPostCreated();
		} catch (err) {
			console.error('[PostComposer] Failed to post thread:', err);
		} finally {
			isSubmitting = false;
		}
	}

	function removeAttachment(postIndex: number, attIndex: number) {
		posts[postIndex].attachments = posts[postIndex].attachments.filter((_, i) => i !== attIndex);
	}

	function addPollOption(postIndex: number) {
		if (posts[postIndex].pollOptions.length < 4) {
			posts[postIndex].pollOptions = [...posts[postIndex].pollOptions, ''];
		}
	}

	function removePollOption(postIndex: number, optIndex: number) {
		if (posts[postIndex].pollOptions.length > 2) {
			posts[postIndex].pollOptions = posts[postIndex].pollOptions.filter((_, i) => i !== optIndex);
		}
	}
</script>

<div
	class="relative overflow-hidden rounded-3xl border border-stroke bg-surface-dim/40 p-4 transition-all duration-500 {isFocused
		? 'bg-surface-dim/60 shadow-2xl ring-1 ring-brand-orange/20'
		: ''}"
>
	<div class="space-y-6">
		{#each posts as post, i (post.id)}
			<div class="group/post relative flex gap-4">
				<!-- Avatar & Thread Line -->
				<div class="flex flex-col items-center">
					<Avatar
						name={profile?.username || 'User'}
						src={profile?.avatar_url}
						size="sm"
						class="z-10 ring-2 ring-stroke transition-transform duration-300 {isFocused
							? 'scale-110'
							: ''}"
					/>
					{#if i < posts.length - 1}
						<div class="my-1 w-0.5 flex-1 bg-stroke/30"></div>
					{/if}
				</div>

				<div class="min-w-0 flex-1">
					<div class="flex items-start justify-between gap-4">
						<textarea
							bind:value={post.content}
							onfocus={() => (isFocused = true)}
							placeholder={i === 0
								? placeholder ||
									(workspaceId ? 'Update the project...' : 'Share your latest breakthrough...')
								: 'Add another post...'}
							class="w-full resize-none bg-transparent py-2 text-sm text-content transition-all outline-none placeholder:text-content-dim/30 {isFocused ||
							post.content.length > 0 ||
							post.attachments.length > 0
								? 'min-h-[80px]'
								: 'min-h-[40px]'}"
						></textarea>

						{#if posts.length > 1}
							<button
								onclick={() => removePostBlock(i)}
								class="p-1 text-content-dim/40 transition-colors hover:text-red-500"
								title="Remove post"
							>
								<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						{/if}
					</div>

					<!-- Poll Creator -->
					{#if post.showPollCreator}
						<div
							transition:slide={{ duration: 300 }}
							class="mt-4 space-y-3 rounded-2xl border border-stroke bg-surface p-4 shadow-inner"
						>
							<div class="flex items-center justify-between">
								<span class="text-[10px] font-black tracking-widest text-zinc-500 uppercase"
									>Poll Options</span
								>
								<button
									onclick={() => (post.showPollCreator = false)}
									class="text-[10px] font-black text-red-500 uppercase hover:text-red-400"
								>
									Remove Poll
								</button>
							</div>

							<div class="space-y-2">
								{#each post.pollOptions as _opt, oi (oi)}
									<div class="flex gap-2">
										<input
											type="text"
											bind:value={post.pollOptions[oi]}
											placeholder="Option {oi + 1}"
											class="flex-1 rounded-xl border border-stroke bg-surface-dim px-4 py-2 text-xs text-content transition-all outline-none focus:border-brand-orange/50"
										/>
										{#if post.pollOptions.length > 2}
											<button
												onclick={() => removePollOption(i, oi)}
												class="text-content-dim transition-colors hover:text-red-500"
												title="Remove option"
												aria-label="Remove poll option"
											>
												<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M6 18L18 6M6 6l12 12"
													/>
												</svg>
											</button>
										{/if}
									</div>
								{/each}
							</div>

							{#if post.pollOptions.length < 4}
								<button
									onclick={() => addPollOption(i)}
									class="w-full border-t border-stroke pt-2 text-center text-[10px] font-bold text-brand-orange transition-colors hover:text-brand-orange/80"
								>
									+ Add Option
								</button>
							{/if}
						</div>
					{/if}

					<!-- Attachment Previews -->
					{#if post.attachments.length > 0}
						<div class="mt-4 flex flex-wrap gap-2">
							{#each post.attachments as att, ai (att.url + ai)}
								<div
									class="group relative h-20 w-20 overflow-hidden rounded-xl border border-stroke bg-surface shadow-lg"
								>
									{#if att.type === 'image'}
										<img src={att.url} alt="Attachment" class="h-full w-full object-cover" />
									{:else}
										<div class="flex h-full w-full items-center justify-center bg-zinc-800">
											<svg
												class="h-6 w-6 text-brand-orange"
												fill="currentColor"
												viewBox="0 0 20 20"
											>
												<path
													d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"
												/>
											</svg>
										</div>
									{/if}
									<button
										onclick={() => removeAttachment(i, ai)}
										class="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-md transition-all group-hover:opacity-100 hover:bg-red-500"
										aria-label="Remove attachment"
										title="Remove attachment"
									>
										<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M6 18L18 6M6 6l12 12"
											/>
										</svg>
									</button>
								</div>
							{/each}
						</div>
					{/if}

					<!-- Block Actions -->
					{#if isFocused || post.content.length > 0 || post.attachments.length > 0 || post.showPollCreator}
						<div
							in:fly={{ y: -10, duration: 400, easing: cubicOut }}
							class="mt-4 flex items-center justify-between border-t border-stroke/30 pt-3"
						>
							{#if showActions}
								<div class="flex gap-1">
									<button
										class="flex h-7 w-7 items-center justify-center rounded-full text-content-dim transition-colors hover:bg-surface hover:text-brand-orange"
										title="Add Media"
										aria-label="Add media attachment"
										onclick={() => {
											activeUploadIndex = i;
											fileInput.click();
										}}
										disabled={isUploading || post.showPollCreator}
									>
										{#if isUploading && activeUploadIndex === i}
											<div
												class="h-3 w-3 animate-spin rounded-full border-2 border-brand-orange border-t-transparent"
											></div>
										{:else}
											<svg
												class="h-3.5 w-3.5"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
												/>
											</svg>
										{/if}
									</button>
									<button
										class="flex h-7 w-7 items-center justify-center rounded-full text-content-dim transition-colors hover:bg-surface hover:text-brand-orange {post.showPollCreator
											? 'bg-surface text-brand-orange'
											: ''}"
										title="Create Poll"
										aria-label="Toggle poll creator"
										onclick={() => (post.showPollCreator = !post.showPollCreator)}
										disabled={post.attachments.length > 0}
									>
										<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
											/>
										</svg>
									</button>
								</div>
							{:else}
								<div></div>
							{/if}

							<div class="flex items-center gap-3">
								{#if post.content.length > 0}
									<span class="text-[9px] font-bold text-content-dim uppercase">
										{post.content.length} / 500
									</span>
								{/if}
								{#if i === posts.length - 1}
									<button
										onclick={addPostBlock}
										class="flex h-7 w-7 transform items-center justify-center rounded-full border border-stroke bg-surface text-brand-orange shadow-sm transition-all hover:scale-110 hover:bg-brand-orange hover:text-white"
										title="Add to thread"
									>
										<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M12 4v16m8-8H4"
											/>
										</svg>
									</button>
								{/if}
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	<!-- Global Submit -->
	{#if isFocused || posts.some((p) => p.content.length > 0)}
		<div
			in:fly={{ y: 20, duration: 400 }}
			class="mt-6 flex items-center justify-between border-t border-stroke pt-4"
		>
			<div class="flex items-center gap-2">
				{#if !workspaceId && userWorkspaces.length > 0}
					<select
						bind:value={selectedWorkspaceId}
						onchange={() => (isPublic = selectedWorkspaceId === null)}
						class="rounded-lg border border-stroke bg-surface-dim px-3 py-1.5 text-[10px] font-bold text-content-dim transition-all outline-none focus:border-brand-orange"
					>
						<option value={null}>Global Hub</option>
						{#each userWorkspaces as ws (ws.id)}
							<option value={ws.id}>{ws.name}</option>
						{/each}
					</select>
				{/if}

				{#if selectedWorkspaceId !== null}
					<label class="flex cursor-pointer items-center gap-2 px-2">
						<input
							type="checkbox"
							bind:checked={isPublic}
							class="h-3 w-3 rounded border-stroke bg-surface-dim text-brand-orange transition-all focus:ring-0 focus:ring-offset-0"
						/>
						<span class="text-[10px] font-bold text-content-dim uppercase">Public</span>
					</label>
				{/if}
			</div>
			<div class="flex gap-2">
				<button
					onclick={() => {
						posts = [createEmptyBlock()];
						isFocused = false;
					}}
					class="rounded-xl px-4 py-2 text-xs font-bold text-content-dim transition-colors hover:text-content"
				>
					Cancel
				</button>
				<Button
					variant="primary"
					size="sm"
					width="auto"
					disabled={!posts.some((p) => p.content.trim() || p.attachments.length > 0) ||
						isUploading ||
						!profile}
					loading={isSubmitting}
					onclick={handleSubmit}
				>
					{options.parentId ? 'Reply' : 'Broadcast'}
				</Button>
			</div>
		</div>
	{/if}

	<input
		type="file"
		class="hidden"
		accept="image/*,video/*"
		bind:this={fileInput}
		onchange={handleFileSelect}
	/>

	<!-- Premium Decoration -->
	{#if isFocused}
		<div
			in:fade={{ duration: 1000 }}
			class="pointer-events-none absolute -right-20 -bottom-20 h-40 w-40 rounded-full bg-brand-orange/5 blur-3xl"
		></div>
	{/if}
</div>
