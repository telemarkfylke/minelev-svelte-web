<script>
	/** @type {import('./$types').PageData} */
	export let data

	let classes = data.classes
	let originalClasses = JSON.parse(JSON.stringify(data.classes))
	let searchField

	const search = (searchValue) => {
		const filterFunc = (classgroup) => {
			const sv = searchValue.toLowerCase()
			const classSuffix = classgroup.navn.indexOf('/') ? classgroup.navn.substring(classgroup.navn.indexOf('/')+1, classgroup.navn.length) : ''
			return (classgroup.navn.toLowerCase().startsWith(sv) || classgroup.skole.toLowerCase().startsWith(sv) || classSuffix.toLowerCase().startsWith(sv))
		}
		classes = originalClasses.filter(filterFunc)
	}
</script>

<h1>Dine klasser</h1>
<md-filled-text-field bind:this={searchField} on:input={() => { search(searchField.value) }} style="width: 300px" placeholder="Søk etter klasse eller skole">
  <md-icon slot="leading-icon">search</md-icon>
</md-filled-text-field>
<div class="classList">
	<div class="classRow md-typescale-title-medium header">
		<div class="classInfo">Klasse</div>
		<div>Fag</div>
	</div>
	{#each classes as classgroup}
		<div class=classRow>
			<div class="classInfo">
				<a href="/klasser/{classgroup.systemId}" style="position: relative;">
					<md-focus-ring style="--md-focus-ring-shape: 8px"></md-focus-ring>
					<div class="studentName">{classgroup.navn}</div>
				</a>
				<div class="studentId md-typescale-label-large">{classgroup.skole}</div>
			</div>
			<div>
				{#each classgroup.fag as fag}
					<div class="md-typescale-label-medium">
						{fag}
					</div>
				{/each}
			</div>
		</div>
	{/each}
</div>

<style>
	.classRow {
		display: flex;
		align-items: center;
		padding: 16px 32px;
		gap: 8px;
	}
	.classRow.header {
		padding: 16px 32px 0px 32px;
	}
	.classInfo {
		max-width: 180px;
		flex-grow: 1;
	}
	.classRow:nth-child(even) {
		background-color: var(--md-sys-color-surface-container);
		color: var(--md-sys-color-on-surface-container);
	}
</style>