<script>
	import { clickOutside } from '$lib/helpers/click-outside'
	import { goto } from '$app/navigation'
	

	/** @type {import('./$types').PageData} */
	export let data

	let students = data.students
	let originalStudents = JSON.parse(JSON.stringify(data.students))
	let studentMenus = {}
	students.forEach(student => {
		studentMenus[student.elevnummer] = false
	})
	let searchValue

	const search = (searchValue) => {
		const filterFunc = (student) => {
			const sv = searchValue.toLowerCase()
			return (student.navn.toLowerCase().startsWith(sv) || student.etternavn.toLowerCase().startsWith(sv) || student.klasser.some(group => group.navn.toLowerCase().includes(sv)))
		}
		students = originalStudents.filter(filterFunc)
	}
</script>

<h1>Dine elever</h1>
<div class="icon-input" style="width: 16rem;">
	<span class="material-symbols-outlined">search</span>
	<input type="text" bind:value={searchValue} on:input={() => { search(searchValue) }} placeholder="Søk etter elev eller klasse" />
</div>
<div class="studentList">
	<div class="studentRow header">
		<div class="studentInfo">Navn</div>
		<div>Skole / Klasse</div>
		<div class="studentAction">Handling</div>
	</div>
	{#each students as student}
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
			<div>
				{#each student.klasser as group}
					<div class="classGroup">
						<a href="/klasser/{group.systemId}">{`${group.skole.kortkortnavn}:${group.navn}`}</a>
					</div>
				{/each}
			</div>
			<div class="studentAction">
				<button class="action studentButton{studentMenus[student.elevnummer] ? ' cheatActive' : ''}" on:click={() => {studentMenus[student.elevnummer] = !studentMenus[student.elevnummer]}} use:clickOutside on:click_outside={() => {studentMenus[student.elevnummer] = false}}>
          <span class="material-symbols-outlined">more_vert</span>
          {#if studentMenus[student.elevnummer]}
            <div class="studentMenu">
              <button class="blank studentMenuOption inward-focus-within" on:click={() => {goto(`/elever/${student.feidenavnPrefix}/nyttdokument`)}}>Nytt dokument</button>
              <button class="blank studentMenuOption inward-focus-within" on:click={() => {goto(`/elever/${student.feidenavnPrefix}/nyttdokument?type=notat`)}}>Nytt notat</button>
            </div>
          {/if}
        </button>
			</div>
		</div>
	{/each}
</div>

<style>
	.studentRow {
		display: flex;
		align-items: center;
		padding: 1rem 2rem;
	}
	.studentRow.header {
		padding: 1rem 2rem 0rem 2rem;
	}
	.studentInfo {
		max-width: 11rem;
		flex-grow: 1;
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
		margin-left: auto;
	}
	.studentRow:nth-child(even) {
		background-color: var(--primary-color-10);
	}
  .cheatActive {
    background-color: rgba(0,0,0,0.1);
  }

	.studentButton {
		position: relative;
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
</style>