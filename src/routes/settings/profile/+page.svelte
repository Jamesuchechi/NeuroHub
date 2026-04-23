<script lang="ts">
	import { profileStore } from '$lib/stores/profileStore';
	import { resolve } from '$app/paths';
	import { cloudinaryService } from '$lib/services/cloudinary';
	import Input from '$lib/components/ui/Input.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import BirthdaySelector from '$lib/components/ui/BirthdaySelector.svelte';
	import TagSelector from '$lib/components/ui/TagSelector.svelte';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	const { profile, loading, error } = $derived($profileStore);

	let formData = $state({
		full_name: '',
		username: '',
		bio: '',
		location: '',
		website: '',
		avatar_url: '',
		header_url: '',
		birthday: '',
		title: '',
		skills: [] as string[]
	});

	let uploadStates = $state({
		avatar: false,
		header: false
	});

	let successMessage = $state('');

	// Initialize form data when profile is available
	$effect(() => {
		if (profile) {
			formData.full_name = profile.full_name || '';
			formData.username = profile.username || '';
			formData.bio = profile.bio || '';
			formData.location = profile.location || '';
			formData.website = profile.website || '';
			formData.avatar_url = profile.avatar_url || '';
			formData.header_url = profile.header_url || '';
			formData.birthday = profile.birthday || '';
			formData.title = profile.title || '';
			formData.skills = profile.skills || [];
		}
	});

	async function handleImageUpload(e: Event, type: 'avatar' | 'header') {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		uploadStates[type] = true;
		try {
			const res = await cloudinaryService.uploadFile(file, {
				folder: `neurohub/profiles/${type}`,
				tags: ['profile', type]
			});
			formData[`${type}_url`] = res.secure_url;
		} catch (err) {
			console.error(`Upload error (${type}):`, err);
		} finally {
			uploadStates[type] = false;
		}
	}

	async function handleSave() {
		if (!profile) return;

		successMessage = '';
		await profileStore.updateProfile(profile.id, $state.snapshot(formData));

		if (!$profileStore.error) {
			successMessage = 'Profile updated successfully!';
			setTimeout(() => (successMessage = ''), 3000);
		}
	}
</script>

<div in:fly={{ y: 20, duration: 800, easing: cubicOut }}>
	<div class="mb-10">
		<h1 class="text-3xl font-black text-white">Public Profile</h1>
		<p class="text-sm text-content-dim">Manage your presence on the NeuroHub social layer.</p>
	</div>

	<form
		onsubmit={(e) => {
			e.preventDefault();
			handleSave();
		}}
		class="space-y-12 pb-20"
	>
		<!-- Profile Identity -->
		<section class="space-y-8">
			<div
				class="flex items-center gap-2 text-[10px] font-bold tracking-widest text-brand-orange uppercase"
			>
				<div class="h-1 w-1 rounded-full bg-brand-orange"></div>
				Identity
			</div>

			<!-- Media Assets -->
			<div class="grid gap-8 lg:grid-cols-2">
				<!-- Avatar Upload -->
				<div
					class="group relative flex flex-col items-center justify-center rounded-3xl border border-stroke bg-surface-dim/20 p-8 transition-all hover:bg-surface-dim/40"
				>
					<div class="relative mb-6">
						<div
							class="h-32 w-32 overflow-hidden rounded-full ring-4 ring-stroke transition-all group-hover:ring-brand-orange/50"
						>
							<Avatar
								name={formData.username}
								src={formData.avatar_url}
								class="h-full w-full object-cover"
							/>
						</div>
						{#if uploadStates.avatar}
							<div
								class="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-xs"
							>
								<div
									class="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent"
								></div>
							</div>
						{/if}
						<label
							class="absolute -right-2 -bottom-2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white text-black shadow-xl transition-transform hover:scale-110"
						>
							<input
								type="file"
								accept="image/*"
								class="hidden"
								onchange={(e) => handleImageUpload(e, 'avatar')}
							/>
							<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
								/>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
								/>
							</svg>
						</label>
					</div>
					<div class="text-center">
						<p class="text-xs font-bold text-white">Profile Picture</p>
						<p class="text-[10px] text-content-dim">SVG, PNG, or JPG (max. 1MB)</p>
					</div>
				</div>

				<!-- Header Upload -->
				<div
					class="group relative flex flex-col items-center justify-center rounded-3xl border border-stroke bg-surface-dim/20 p-8 transition-all hover:bg-surface-dim/40"
				>
					<div
						class="relative mb-6 h-32 w-full overflow-hidden rounded-2xl border border-stroke bg-surface-dim transition-all group-hover:border-brand-orange/50"
					>
						{#if formData.header_url}
							<img src={formData.header_url} alt="Header" class="h-full w-full object-cover" />
						{:else}
							<div
								class="flex h-full w-full items-center justify-center bg-linear-to-br from-brand-orange/10 to-brand-blue/10"
							>
								<svg
									class="h-8 w-8 text-zinc-700"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="1.5"
										d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
									/>
								</svg>
							</div>
						{/if}
						{#if uploadStates.header}
							<div
								class="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-xs"
							>
								<div
									class="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent"
								></div>
							</div>
						{/if}
						<label
							class="absolute right-4 bottom-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white text-black shadow-xl transition-transform hover:scale-110"
						>
							<input
								type="file"
								accept="image/*"
								class="hidden"
								onchange={(e) => handleImageUpload(e, 'header')}
							/>
							<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 4v16m8-8H4"
								/>
							</svg>
						</label>
					</div>
					<div class="text-center">
						<p class="text-xs font-bold text-white">Header Image</p>
						<p class="text-[10px] text-content-dim">Recommended 1500x500</p>
					</div>
				</div>
			</div>

			<div class="grid gap-6 md:grid-cols-2">
				<Input label="Full Name" placeholder="James Uche" bind:value={formData.full_name} />
				<Input label="Username" placeholder="james_dev" bind:value={formData.username} />
				<Input
					label="Professional Title"
					placeholder="e.g. Senior Software Engineer"
					bind:value={formData.title}
				/>
				<BirthdaySelector bind:value={formData.birthday} label="Birthday" />
			</div>

			<TagSelector
				bind:value={formData.skills}
				label="Skills & Expertise"
				placeholder="Add a skill (e.g. Svelte, Rust, AI)..."
			/>
		</section>

		<!-- Bio & Social -->
		<section class="space-y-8">
			<div
				class="flex items-center gap-2 text-[10px] font-bold tracking-widest text-brand-orange uppercase"
			>
				<div class="h-1 w-1 rounded-full bg-brand-orange"></div>
				About & Social
			</div>

			<Textarea
				label="Bio"
				placeholder="Tell the world about what you're building..."
				bind:value={formData.bio}
				rows={3}
			/>

			<div class="grid gap-6 md:grid-cols-2">
				<Input label="Location" placeholder="San Francisco, CA" bind:value={formData.location} />
				<Input
					label="Website"
					placeholder="https://neurohub.dev"
					type="url"
					bind:value={formData.website}
				/>
			</div>
		</section>

		<!-- Save Actions -->
		<div
			class="sticky bottom-8 z-20 flex items-center justify-between rounded-3xl border border-stroke bg-surface/80 p-6 backdrop-blur-md"
		>
			<div class="flex flex-col">
				{#if successMessage}
					<p in:fly={{ y: 10 }} class="text-xs font-bold text-green-500">{successMessage}</p>
				{:else if error}
					<p in:fly={{ y: 10 }} class="text-xs font-bold text-red-500">{error}</p>
				{:else}
					<p class="text-[10px] font-bold text-content-dim uppercase">
						Carefully review your changes
					</p>
				{/if}
			</div>

			<div class="flex gap-4">
				<Button type="submit" {loading} class="w-auto px-8">Save Changes</Button>
			</div>
		</div>
	</form>

	<!-- Privacy & Data -->
	<section class="mt-12 space-y-8 pb-20">
		<div
			class="flex items-center gap-2 text-[10px] font-bold tracking-widest text-red-500 uppercase"
		>
			<div class="h-1 w-1 rounded-full bg-red-500"></div>
			Privacy & Data
		</div>

		<div class="grid gap-6 lg:grid-cols-2">
			<div class="rounded-3xl border border-stroke bg-surface-dim/20 p-6">
				<h3 class="mb-1 text-sm font-bold text-white">Export Your Data</h3>
				<p class="mb-4 text-xs text-content-dim">
					Download a JSON archive of your profile, notes, snippets, and chat history.
				</p>
				<a
					href={resolve('/api/account/export' as unknown as '/')}
					download
					class="inline-flex w-auto cursor-pointer items-center justify-center rounded-lg border border-stroke bg-white/5 px-3 py-2 text-xs font-bold text-content transition-all hover:bg-white/10"
				>
					Download JSON
				</a>
			</div>

			<div class="rounded-3xl border border-red-500/20 bg-red-500/5 p-6">
				<h3 class="mb-1 text-sm font-bold text-red-500">Danger Zone</h3>
				<p class="mb-4 text-xs text-content-dim">
					Permanently delete your account and all associated data. This action is irreversible.
				</p>
				<form
					action="?/deleteAccount"
					method="POST"
					onsubmit={(e) => {
						if (
							!confirm(
								'Are you absolutely sure? All your notes, snippets, and messages will be permanently deleted.'
							)
						) {
							e.preventDefault();
						}
					}}
				>
					<Button
						variant="secondary"
						size="sm"
						type="submit"
						class="w-auto border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white"
					>
						Delete My Account
					</Button>
				</form>
			</div>
		</div>
	</section>
</div>
