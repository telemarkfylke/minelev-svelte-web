<script>
	import { clickOutside } from '$lib/helpers/click-outside'
	import { goto } from '$app/navigation'
  import Pagination from '$lib/components/Pagination.svelte';
  import { page } from "$app/stores";
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import { prettyPrintDate } from '$lib/helpers/pretty-date';
  import { onMount } from 'svelte';
  import axios from 'axios';

	/** @type {import('./$types').PageData} */
	export let data

  let currentClass = data.classes.find(group => group.systemId === $page.params.klasseid)

	const studentTitle = data.systemInfo.FAGSKOLEN_ENABLED && currentClass.skolenummer === data.systemInfo.FAGSKOLEN_SKOLENUMMER ? 'Studenter' : 'Elever'

	let studentsPerPage = 10
	let currentPage = 0 // zero-indexed
	let students = data.students.filter(student => student.klasser.some(group => group.systemId === currentClass.systemId))
	let studentMenus = {}
	students.forEach(student => {
		studentMenus[student.elevnummer] = false
	})
	let originalStudents = JSON.parse(JSON.stringify(students))
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

	let documents = []
	let loadingDocuments = true
	let documentErrorMessage = ""

	const getDocumentSubtitle = (document) => {
		if (document.documentTypeId === 'varsel-fag') {
			const courses = document.content.classes.map(course => course.nb)
			if (courses.length > 1) return 'Flere fag'
			return courses[0]
		}
		return null
  }

	onMount(async () => {
		if (currentClass.type === 'basisgruppe') {
			try {
				const documentResult = await axios.get(`/api/basisgruppedocuments?system_id=${$page.params.klasseid}`);
				documents = documentResult.data;
			} catch (error) {
				documentErrorMessage = `Det skjedde en feil ved henting av dokumenter for klassen: ${error.toString()}`;
			}
			loadingDocuments = false;
		}
	})
</script>

<h1>{studentTitle} i klassen</h1>
<div class="icon-input" style="width: 16rem;">
	<span class="material-symbols-outlined">search</span>
	<input type="text" bind:value={searchValue} on:input={() => { search(searchValue) }} placeholder="Søk etter elev eller klasse" />
</div>
<div class="studentList">
	{#if originalStudents.length === 0}
		<br />
		Fant ingen {studentTitle.toLowerCase()} i klassen 🤷‍♂️
	{:else if students.length === 0}
		<br />	
		Fant ingen {studentTitle.toLowerCase()} i klassen med søket 🤷‍♂️
	{:else}
	<div class="studentRow header">
		<div class="studentInfo">Navn</div>
		{#if data.user.canCreateDocuments}
			<div class="studentAction">Handling</div>
		{/if}
	</div>
		{#each students.slice(currentPage * studentsPerPage, (currentPage * studentsPerPage) + studentsPerPage) as student}
			<div class=studentRow>
				<div class="studentInfo">
					{#if student.kontaktlarer}
						<div class="contactTeacher" title="Du er kontaktlærer for denne eleven"><strong>Kontaktlærer</strong></div>
					{/if}
					<div class="studentName">
						<a href="/elever/{student.feidenavnPrefix}">{student.navn}</a>
					</div>
					<div class="studentId">{student.feidenavnPrefix}</div>
				</div>
				{#if data.user.canCreateDocuments}
					<div class="studentAction" use:clickOutside on:click_outside={() => {studentMenus[student.elevnummer] = false}}>
						<button class="action studentButton{studentMenus[student.elevnummer] ? ' cheatActive' : ''}" on:click={() => {studentMenus[student.elevnummer] = !studentMenus[student.elevnummer]}}>
							<span class="material-symbols-outlined">more_vert</span>
						</button>
						{#if studentMenus[student.elevnummer]}
							<div class="studentMenu">
								<button class="blank studentMenuOption inward-focus-within" on:click={() => {goto(`/elever/${student.feidenavnPrefix}/nyttdokument`)}}>Nytt dokument</button>
								<button class="blank studentMenuOption inward-focus-within" on:click={() => {goto(`/elever/${student.feidenavnPrefix}/nyttdokument?type=notat`)}}>Nytt notat</button>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/each}
		<Pagination {currentPage} elementName={'elever'} elementsPerPage={studentsPerPage} maxPageNumbers={11} {gotoPage} {nextPage} {previousPage} numberOfElements={students.length} />
	{/if}
</div>

{#if currentClass.type === 'basisgruppe'}
	<h2 class="documentsTitle">
		<span class="material-symbols-outlined">list</span>
		Dokumenter for klassen
	</h2>
	<div>
		{#if documentErrorMessage}
		<div class="error-box">
				<h4>En feil har oppstått 😩</h4>
				<p>{documentErrorMessage}</p>
		</div>
		{:else}
				{#if loadingDocuments}
				<LoadingSpinner width="3" />
				{:else if documents.length > 0}
						{documents.length} dokumenter
						{#each documents as document}
								<div class="documentContainer">
										<div class="documentInfo">
												<div class="documentDate">{prettyPrintDate(document.created.timestamp, { shortMonth: true })}</div>
												<div class="documentTitle"><a href="/elever/{document.student.feidenavnPrefix}/dokumenter/{document._id}">{document.title}</a></div>
												{#if getDocumentSubtitle(document)}
														<div class="documentSubtitle">{getDocumentSubtitle(document)}</div>
												{/if}
												<div class="createdBy">Opprettet av: {document.created.createdBy.name}</div>
										</div>
										<div class="documentStudent">
												<span class="material-symbols-outlined">school</span>
												<a href="/elever/{document.student.feidenavnPrefix}">{document.student.name}</a>
										</div>
								</div>
						{/each}
				{:else}
						Det har ikke skjedd stort enda...
				{/if}
		{/if}
	</div>
{/if}

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
		max-width: 11rem;
		flex-grow: 1;
	}
	.studentName {
		font-weight: bold;
	}
	.studentName a {
		text-decoration: none;
	}
	.contactTeacher {
		font-size: var(--font-size-extra-small);
	}
	.studentId {
		font-size: var(--font-size-small);
	}
	.studentAction {
		position: relative;
		margin-left: auto;
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
	.documentsTitle {
		padding-top: 2rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.documentContainer {
		display: flex;
		padding: 1rem 2rem;
		align-items: center;
		gap: 2rem;
		flex-wrap: wrap;
	}
	.documentContainer:nth-child(odd) {
		background-color: var(--primary-color-10);
	}
	.documentDate, .createdBy {
		font-size: var(--font-size-small);
	}
	.documentTitle {
		font-size: 1.1rem;
		font-weight: bold;
	}
	.documentTitle a, .documentStudent a {
		text-decoration: none;
	}
	.documentStudent {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		width: 16rem;
	}

	@media only screen and (max-width: 768px) {
		.documentContainer {
				gap: 0.5rem;
		}
	}
</style>