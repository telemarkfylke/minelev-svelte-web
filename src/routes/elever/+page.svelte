<script>
	/** @type {import('./$types').PageData} */
	export let data

	let students = data.students
	let originalStudents = JSON.parse(JSON.stringify(data.students))
	let userMenus = {}
	let searchField

	const search = (searchValue) => {
		const filterFunc = (student) => {
			const sv = searchValue.toLowerCase()
			return (student.navn.toLowerCase().startsWith(sv) || student.etternavn.toLowerCase().startsWith(sv) || student.klasser.some(group => group.navn.toLowerCase().includes(sv)))
		}
		students = originalStudents.filter(filterFunc)
	}
</script>

<h1>Dine elever</h1>
<input type="text" />
<md-filled-text-field bind:this={searchField} on:input={() => { search(searchField.value) }} style="width: 300px" placeholder="Søk etter elev eller klasse">
  <md-icon slot="leading-icon">search</md-icon>
</md-filled-text-field>
<div class="studentList">
	<div class="studentRow md-typescale-title-medium header">
		<div class="studentInfo">Navn</div>
		<div>Skole / Klasse</div>
		<div class="studentAction">Handling</div>
	</div>
	{#each students as student}
		<div class=studentRow>
			<div class="studentInfo">
				{#if student.kontaktlarer}
					<div title="Du er kontaktlærer for denne eleven" class="studentId md-typescale-label-medium"><strong>Kontaktlærer</strong></div>
				{/if}
				<a href="/elever/{student.elevnummer}" style="position: relative;">
					<md-focus-ring style="--md-focus-ring-shape: 8px"></md-focus-ring>
					<div class="studentName">{student.navn}</div>
				</a>
				<div class="studentId md-typescale-label-large">{student.feidenavn.substring(0, student.feidenavn.indexOf('@'))}</div>
			</div>
			<div>
				{#each student.klasser as group}
					<a href="/klasser/{group.systemId}" style="position: relative;">
						<md-focus-ring style="--md-focus-ring-shape: 8px"></md-focus-ring>
						<div class="md-typescale-label-medium">
							{`${group.skole.kortkortnavn}:${group.navn}`}
						</div>
					</a>
				{/each}
			</div>
			<div class="studentAction">
				<span style="position: relative;">
          <md-icon-button on:click={() => { userMenus[student.elevnummer].open = !userMenus[student.elevnummer].open;}} id="usage-anchor-{student.elevnummer}"><md-icon>more_vert</md-icon></md-icon-button>
          <md-menu bind:this={userMenus[student.elevnummer]} id="usage-menu" yOffset="-20px" anchor="usage-anchor-{student.elevnummer}">
            <md-menu-item href='/elever/{student.elevnummer}/dokumenter/nytt?type=document'>
              <div slot="headline">Nytt dokument</div>
            </md-menu-item>
            <md-menu-item href='/elever/{student.elevnummer}/dokumenter/nytt?type=notat'>
              <div slot="headline">Nytt notat</div>
            </md-menu-item>
          </md-menu>
        </span>
			</div>
		</div>
	{/each}
</div>

<style>
	.studentRow {
		display: flex;
		align-items: center;
		padding: 16px 32px;
	}
	.studentRow.header {
		padding: 16px 32px 0px 32px;
	}
	.studentInfo {
		max-width: 180px;
		flex-grow: 1;
	}
	.studentAction {
		margin-left: auto;
	}
	.studentRow:nth-child(even) {
		background-color: var(--md-sys-color-surface-container);
		color: var(--md-sys-color-on-surface-container);
	}
</style>