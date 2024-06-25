<script>
  import { periods, courseReasons } from "./data/document-data";
  import { documentTypes, generateDocument } from "./document-types";

  export let faggrupper
  export let probableFaggrupper
  export let documentTypeId
  export let student

  let displayAllFaggrupper = false
  let loading = false

  const otherFaggrupper = faggrupper.filter(gruppe => !probableFaggrupper.some(group => group.systemId === gruppe.systemId))
  
  const getProbableFaggrupper = (schoolNumber) => {
    return probableFaggrupper.filter(gruppe => gruppe.skole.skolenummer === schoolNumber)
  }
  const getTheRestOfFaggrupper = (schoolNumber) => {
    return otherFaggrupper.filter(gruppe => gruppe.skole.skolenummer === schoolNumber)
  }

  const documentType = documentTypes.find(docType => docType.id === documentTypeId)
  const availableSchools = student.availableDocumentTypes.find(docType => docType.id === documentTypeId).schools

  // Content data
  const varsel = {
    schoolNumber:  availableSchools.length > 1 ? "" : availableSchools[0].skolenummer,
    periodId: "",
    courses: [],
    reasons: []
  }

  const validate = () => {
    console.log(student)
    const formData = new FormData()
    formData.append('hei', "jhuhuhu")
    const document = generateDocument({ 
      documentTypeId,
      type: 'varsel',
      variant: 'fag',
      school: student.skoler.find(school => school.skolenummer === varsel.schoolNumber),
      user: "Halla",
      student,
      teacher: "Hijhi",
      formData
    })
    console.log(document)
  }

  $: if (varsel.courses && varsel.courses.length > 0) validate()

  // Faggrupper, kan de matches på fag i undervisninggrupper, ved navne-matching?? La oss teste
  // IDEEN - vi henter alle faggruppene til en elev - så matcher vi på navn (prefixen til undervisningsgrupep). Har vi en knapp for å vise alle fag - dersom faglærer ikke får opp sitt fag. MEN hva når vi skal vise sendte varsler.
  // Vi begynner med ideen over, og får ta det som det kommer.
</script>

<!--<pre>{JSON.stringify(faggrupper, null, 2)}</pre>-->
<pre>{JSON.stringify(varsel, null, 2)}</pre>

<form method="post" action="?/varsel-fag">
  {#if availableSchools.length > 1}
    <section>
      <h4>Velg skole</h4>
      {#each availableSchools as school}
        <input type="radio" id="school-{school.skolenummer}" name="school" bind:group={varsel.schoolNumber} value="{school.skolenummer}" required />
        <label for="school-{school.skolenummer}">{school.navn}</label><br>
      {/each}
    </section>
  {:else}
    <input type="hidden" name="school" value="{availableSchools[0].skolenummer}" />
  {/if}

  <!--Ikke noe poeng å vise resten før skole er valgt -->
  {#if varsel.schoolNumber}
    <section>
      <h4>Velg periode</h4>
      {#each periods as period}
        <input type="radio" id="period-{period.id}" bind:group={varsel.periodId} name="period" value="{period.id}" required />
        <label for="period-{period.id}">{period.value.nb}</label><br>
      {/each}
    </section>
    
    <section>
      <h4>Hvilke fag gjelder varselet?</h4>
      {#each getProbableFaggrupper(varsel.schoolNumber) as faggruppe}
        <input type="checkbox" id="{faggruppe.systemId}" bind:group={varsel.courses} name="courses" value="{faggruppe.systemId}" />
        <label for="{faggruppe.systemId}">{faggruppe.fag.navn} ({faggruppe.navn})</label><br>
      {/each}
      {#if displayAllFaggrupper}
        {#each getTheRestOfFaggrupper(varsel.schoolNumber) as faggruppe}
          <input type="checkbox" id="{faggruppe.systemId}" bind:group={varsel.courses} name="courses" value="{faggruppe.systemId}" />
          <label for="{faggruppe.systemId}">{faggruppe.fag.navn} ({faggruppe.navn})</label><br>
        {/each}
        <p><button on:click={() => displayAllFaggrupper = !displayAllFaggrupper} class="link">Vis kun dine fag for eleven</button></p>
      {:else}
        <p>Ser du ikke faget du er ute etter?<button on:click={() => displayAllFaggrupper = !displayAllFaggrupper} class="link">Vis alle fag for eleven</button></p>
      {/if}
    </section>

    <section>
      <h4>Hva er årsaken til varselet</h4>
      {#each courseReasons as reason}
        <input type="checkbox" id="reason-{reason.id}" bind:group={varsel.reasons} name="reasons" value="{reason.id}" />
        <label for="reason-{reason.id}">{reason.description.nb}</label><br>
      {/each}
    </section>
    <button type="submit" class="filled" on:click={(e) => { loading = true; e.preventDefault() }}>Send</button>
    <button on:click={(e) => {e.preventDefault()}}>Forhåndsvisning</button>
    {#if loading}
      LASTER
    {/if}
  {/if}
</form>

<style>

</style>