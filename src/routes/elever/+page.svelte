<script>
	import { clickOutside } from '$lib/helpers/click-outside'
	import { goto } from '$app/navigation'
  import Pagination from '$lib/components/Pagination.svelte';
	

	/** @type {import('./$types').PageData} */
	export let data

	let studentsPerPage = 10
	let currentPage = 0 // zero-indexed
	let students = data.students
	let studentMenus = {}
	students.forEach(student => {
		studentMenus[student.elevnummer] = false
	})
	let originalStudents = JSON.parse(JSON.stringify(data.students))
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
		const filterFunc = (student) => {
			const sv = searchValue.toLowerCase()
			return (student.navn.toLowerCase().startsWith(sv) || student.etternavn.toLowerCase().startsWith(sv) || student.klasser.some(group => group.navn.toLowerCase().includes(sv)))
		}
		students = originalStudents.filter(filterFunc)
		currentPage = 0
	}
</script>

<h1>Dine elever</h1>
<div class="icon-input" style="width: 16rem;">
	<span class="material-symbols-outlined">search</span>
	<input type="text" bind:value={searchValue} on:input={() => { search(searchValue) }} placeholder="Søk etter elev eller klasse" />
</div>
<div class="studentList">
	{#if originalStudents.length === 0}
		<br />
		Du har ikke tilgang på noen elever 🤷‍♂️
	{:else if students.length === 0}
		<br />	
		Fant ingen elever med søket 🤷‍♂️
	{:else}
	<div class="studentRow header">
		<div class="studentInfo">Navn</div>
		<div class="classes">Skole / Klasse</div>
		{#if data.user.canCreateDocuments}
			<div class="studentAction">Handling</div>
		{/if}
	</div>
		{#each students.slice(currentPage * studentsPerPage, (currentPage * studentsPerPage) + studentsPerPage) as student}
			<div class=studentRow>
				<div class="studentInfo">
					{#if data.systemInfo.FAGSKOLEN_ENABLED && student.skoler.find(school => school.skolenummer === data.systemInfo.FAGSKOLEN_SKOLENUMMER)}
						<div class="contactTeacher" title="Dette er en student ved Fagskolen"><strong>Student</strong></div>
					{:else if student.kontaktlarer}
						<div class="contactTeacher" title="Du er kontaktlærer for denne eleven"><strong>Kontaktlærer</strong></div>
					{/if}
					<div class="studentName">
						<a href="/elever/{student.feidenavnPrefix}">{student.navn}</a>
					</div>
					<div class="studentId">{student.feidenavnPrefix}</div>
				</div>
				<div class="classes">
					{#each student.klasser as group}
						<div class="classGroup">
							<a href="/klasser/{group.systemId}">{`${group.skole.kortkortnavn}:${group.navn}`}</a>
						</div>
					{/each}
				</div>
				{#if data.user.canCreateDocuments}
					<div class="studentAction" use:clickOutside on:click_outside={() => {studentMenus[student.elevnummer] = false}}>
						<button class="action studentButton{studentMenus[student.elevnummer] ? ' cheatActive' : ''}" on:click={() => {studentMenus[student.elevnummer] = !studentMenus[student.elevnummer]}}>
							<span class="material-symbols-outlined">more_vert</span>
						</button>
						{#if studentMenus[student.elevnummer]}
							<div class="studentMenu">
								{#if student.availableDocumentTypes.some(docType => docType.id !== 'notat' && !docType.readOnly)}
									<button class="blank studentMenuOption inward-focus-within" on:click={() => {goto(`/elever/${student.feidenavnPrefix}/nyttdokument`)}}>Nytt dokument</button>
								{/if}
								{#if student.availableDocumentTypes.some(docType => docType.id === 'notat' && !docType.readOnly)}
									<button class="blank studentMenuOption inward-focus-within" on:click={() => {goto(`/elever/${student.feidenavnPrefix}/nyttdokument?document_type=notat`)}}>Nytt notat</button>
								{/if}
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/each}
		<Pagination {currentPage} elementName={'elever'} elementsPerPage={studentsPerPage} maxPageNumbers={11} {gotoPage} {nextPage} {previousPage} numberOfElements={students.length} />
	{/if}
</div>

<style>
	.studentRow {
		display: flex;
		align-items: center;
		padding: 1rem 2rem;
		gap: 0.5rem;
	}
	.studentRow.header {
		padding: 1rem 2rem 0rem 2rem;
	}
	.studentInfo {
		width: 15rem;
	}
	.contactTeacher {
		font-size: var(--font-size-extra-small);
	}
	.studentId {
		font-size: var(--font-size-small);
	}
	.classGroup {
		font-size: var(--font-size-small);
	}
	.studentAction {
		position: relative;
		margin-left: auto;
	}
	.studentName {
		font-weight: bold;
	}
	.studentName a {
		text-decoration: none;
	}
	.studentRow:nth-child(even) {
		background-color: var(--primary-color-10);
	}
  .cheatActive {
    background-color: rgba(0,0,0,0.1);
  }

  .studentMenu {
    position: absolute;
    display: flex;
    flex-direction: column;
		min-width: 8rem;
    right: 0.125rem;
    top: 3rem;
    border: 2px solid var(--primary-color);
		z-index: 2; /* ? */
  }
  .studentMenuOption {
    flex-grow: 1;
    padding: 1rem;
    background-color: var(--primary-background-color);
  }
  .studentMenuOption:hover {
    padding: 1rem;
    background-color: var(--primary-color-10);
  }

	@media only screen and (max-width: 768px) {
      .classes {
				display: none;
			}
			.studentInfo {
				width: 8rem;
			}
    }
</style>