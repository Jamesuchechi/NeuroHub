<script lang="ts">
	import Avatar from '../ui/Avatar.svelte';
	import Button from '../ui/Button.svelte';
	import { profileStore } from '$lib/stores/profileStore';
	import { activityService, type Attachment } from '$lib/services/activity';
	import { cloudinaryService } from '$lib/services/cloudinary';
	import { fly, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	let { workspaceId = null, onPostCreated } = $props<{
		workspaceId?: string | null;
		onPostCreated?: () => void;
	}>();

	const profile = $derived($profileStore.profile);
	let content = $state('');
	let isFocused = $state(false);
	let isSubmitting = $state(false);
	let attachments = $state<Attachment[]>([]);
	let fileInput: HTMLInputElement;
	let isUploading = $state(false);

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
		if (!file) return;

		isUploading = true;
		try {
			const res = await cloudinaryService.uploadFile(file, { folder: 'posts' });
			attachments = [
				...attachments,
				{
					type: res.resource_type === 'video' ? 'video' : 'image',
					url: res.secure_url,
					thumbnail: res.secure_url.replace('/upload/', '/upload/w_200,c_fill/')
				}
			];
		} catch (err) {
			console.error('[PostComposer] Upload failed:', err);
		} finally {
			isUploading = false;
		}
	}

	async function handleSubmit() {
		if ((!content.trim() && attachments.length === 0) || !profile) return;

		isSubmitting = true;
		try {
			const detected = detectLinks(content);
			const allAttachments = [...attachments, ...detected];

			await activityService.createPost(profile.id, content, workspaceId, allAttachments, true);
			content = '';
			attachments = [];
			isFocused = false;
			if (onPostCreated) onPostCreated();
		} catch (err) {
			console.error('[PostComposer] Failed to post:', err);
		} finally {
			isSubmitting = false;
		}
	}

	function removeAttachment(index: number) {
		attachments = attachments.filter((_, i) => i !== index);
	}
</script>

<div
	class="relative overflow-hidden rounded-3xl border border-stroke bg-surface-dim/40 p-4 transition-all duration-500 {isFocused
		? 'bg-surface-dim/60 shadow-2xl ring-1 ring-brand-orange/20'
		: ''}"
>
	<div class="flex gap-4">
		<Avatar
			name={profile?.username || 'User'}
			src={profile?.avatar_url}
			size="sm"
			class="mt-1 ring-2 ring-stroke transition-transform duration-300 {isFocused
				? 'scale-110'
				: ''}"
		/>

		<div class="flex-1">
			<textarea
				bind:value={content}
				onfocus={() => (isFocused = true)}
				placeholder={workspaceId ? 'Update the project...' : 'Share your latest breakthrough...'}
				class="w-full resize-none bg-transparent py-2 text-sm text-content transition-all outline-none placeholder:text-content-dim/30 {isFocused
					? 'min-h-[100px]'
					: 'min-h-[40px]'}"
			></textarea>

			<!-- Attachment Previews -->
			{#if attachments.length > 0}
				<div class="mt-4 flex flex-wrap gap-2">
					{#each attachments as att, i (att.url + i)}
						<div
							class="group relative h-20 w-20 overflow-hidden rounded-xl border border-stroke bg-surface shadow-lg"
						>
							{#if att.type === 'image'}
								<img src={att.url} alt="Attachment" class="h-full w-full object-cover" />
							{:else}
								<div class="flex h-full w-full items-center justify-center bg-zinc-800">
									<svg class="h-6 w-6 text-brand-orange" fill="currentColor" viewBox="0 0 20 20">
										<path
											d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"
										/>
									</svg>
								</div>
							{/if}
							<button
								onclick={() => removeAttachment(i)}
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

			{#if isFocused || content.length > 0 || attachments.length > 0}
				<div
					in:fly={{ y: -10, duration: 400, easing: cubicOut }}
					class="mt-4 flex items-center justify-between border-t border-stroke pt-4"
				>
					<div class="flex gap-2">
						<button
							class="flex h-8 w-8 items-center justify-center rounded-full text-content-dim transition-colors hover:bg-surface hover:text-brand-orange"
							title="Add Media"
							onclick={() => fileInput.click()}
							disabled={isUploading}
						>
							{#if isUploading}
								<div
									class="h-4 w-4 animate-spin rounded-full border-2 border-brand-orange border-t-transparent"
								></div>
							{:else}
								<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
							class="flex h-8 w-8 items-center justify-center rounded-full text-content-dim transition-colors hover:bg-surface hover:text-brand-orange"
							title="Add Snippet"
						>
							<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
								/>
							</svg>
						</button>
					</div>

					<div class="flex items-center gap-4">
						{#if content.length > 0}
							<span
								in:fade
								class="text-[10px] font-bold tracking-widest text-content-dim uppercase"
							>
								{content.length} / 500
							</span>
						{/if}
						<div class="flex gap-2">
							<button
								onclick={() => {
									isFocused = false;
									if (!content && attachments.length === 0) isFocused = false;
								}}
								class="rounded-xl px-4 py-2 text-xs font-bold text-content-dim transition-colors hover:text-content"
							>
								Cancel
							</button>
							<Button
								variant="primary"
								size="sm"
								width="auto"
								disabled={(!content.trim() && attachments.length === 0) || isUploading}
								loading={isSubmitting}
								onclick={handleSubmit}
							>
								Broadcast
							</Button>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>

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
			class="absolute -right-20 -bottom-20 h-40 w-40 rounded-full bg-brand-orange/5 blur-3xl"
		></div>
	{/if}
</div>
