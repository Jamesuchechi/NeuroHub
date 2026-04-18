<script lang="ts">
	let { value = $bindable(''), label = 'Birthday' } = $props();

	const months = [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December'
	];

	const currentYear = new Date().getFullYear();
	const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
	const days = Array.from({ length: 31 }, (_, i) => i + 1);

	let selectedMonth = $state(0);
	let selectedDay = $state(1);
	let selectedYear = $state(currentYear);

	$effect(() => {
		const monthStr = (selectedMonth + 1).toString().padStart(2, '0');
		const dayStr = selectedDay.toString().padStart(2, '0');
		const dateString = `${selectedYear}-${monthStr}-${dayStr}`;

		if (value !== dateString) {
			value = dateString;
		}
	});
	const monthId = `month-${Math.random().toString(36).substring(2, 9)}`;
</script>

<div class="space-y-2">
	<label for={monthId} class="block text-[10px] font-black tracking-widest text-zinc-500 uppercase"
		>{label}</label
	>
	<div class="grid grid-cols-3 gap-3">
		<select
			id={monthId}
			bind:value={selectedMonth}
			aria-label="Month"
			class="w-full rounded-2xl border border-white/5 bg-white/3 px-4 py-4 text-sm text-white transition-all outline-none focus:border-brand-orange focus:bg-white/5"
		>
			{#each months as month, i (i)}
				<option value={i} class="bg-zinc-950">{month}</option>
			{/each}
		</select>

		<select
			bind:value={selectedDay}
			aria-label="Day"
			class="w-full rounded-2xl border border-white/5 bg-white/3 px-4 py-4 text-sm text-white transition-all outline-none focus:border-brand-orange focus:bg-white/5"
		>
			{#each days as day, i (i)}
				<option value={day} class="bg-zinc-950">{day}</option>
			{/each}
		</select>

		<select
			bind:value={selectedYear}
			aria-label="Year"
			class="w-full rounded-2xl border border-white/5 bg-white/3 px-4 py-4 text-sm text-white transition-all outline-none focus:border-brand-orange focus:bg-white/5"
		>
			{#each years as year, i (i)}
				<option value={year} class="bg-zinc-950">{year}</option>
			{/each}
		</select>
	</div>
	<p class="text-[10px] text-zinc-600">
		This helps us personalize your experience. Your birthday won't be public.
	</p>
</div>
