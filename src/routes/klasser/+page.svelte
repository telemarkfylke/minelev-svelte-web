<script>
	/** @type {import('./$types').PageData} */
	export let data
	import Pagination from '$lib/components/Pagination.svelte';

	let classesPerPage = 10
	let currentPage = 0 // zero-indexed
	let classes = data.classes
	let originalClasses = JSON.parse(JSON.stringify(data.classes))
	let searchValue

	const nextPage = () => {
		currentPage++
	}
	const previousPage = () => {
		currentPage--
	}
	const gotoPage = (pageNumber) => {
		currentPage = pageNumber
	}

	const search = (searchValue) => {
		const filterFunc = (classgroup) => {
			const sv = searchValue.toLowerCase()
			const classSuffix = classgroup.navn.indexOf('/') ? classgroup.navn.substring(classgroup.navn.indexOf('/')+1, classgroup.navn.length) : ''
			return (classgroup.navn.toLowerCase().startsWith(sv) || classgroup.skole.toLowerCase().startsWith(sv) || classSuffix.toLowerCase().startsWith(sv))
		}
		classes = originalClasses.filter(filterFunc)
		currentPage = 0
	}
</script>

<h1>Dine klasser</h1>
<div class="icon-input" style="width: 16rem;">
	<span class="material-symbols-outlined">search</span>
	<input type="text" bind:value={searchValue} on:input={() => { search(searchValue) }} placeholder="Søk etter klasse" />
</div>
<div class="classList">
	{#if originalClasses.length === 0}
		<br />
		Du har ikke tilgang på noen klasser 🤷‍♂️
	{:else if classes.length === 0}
		<br />	
		Fant ingen klasser med søket 🤷‍♂️
	{:else}
			<div class="classRow header">
				<div class="classInfo">Klasse</div>
				<div>Fag</div>
			</div>
			{#each classes.slice(currentPage * classesPerPage, (currentPage * classesPerPage) + classesPerPage) as classgroup}
				<div class=classRow>
					<div class="classInfo">
						<a href="/klasser/{classgroup.systemId}" style="position: relative;">
							<div class="className">{classgroup.navn}</div>
						</a>
						<div class="classSchool">{classgroup.skole}</div>
					</div>
					<div>
						{#each classgroup.fag as fag}
							<div class="classGroup">
								{fag}
							</div>
						{/each}
					</div>
				</div>
			{/each}
			<Pagination {currentPage} elementName={'klasser'} elementsPerPage={classesPerPage} maxPageNumbers={11} {gotoPage} {nextPage} {previousPage} numberOfElements={classes.length} />
		{/if}
</div>

<style>
	.classRow {
		display: flex;
		align-items: center;
		padding: 1rem 2rem;
		gap: 0.5rem;
	}
	.classRow.header {
		padding: 1rem 2rem 0rem 2rem;
	}
	.classInfo {
		max-width: 15rem;
		flex-grow: 1;
	}
	.classRow:nth-child(even) {
		background-color: var(--primary-color-10);
	}
	.classSchool {
		font-size: var(--font-size-small);
	}
</style>