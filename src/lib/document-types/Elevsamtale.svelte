<script>
  import { conversationStatuses } from "./data/document-data";
  import { documentTypes, generateDocument } from "./document-types";

  export let documentTypeId
  export let teacherStudent
  export let studentData

  let loading = false

  const documentType = documentTypes.find(docType => docType.id === documentTypeId)
  const availableSchools = teacherStudent.availableDocumentTypes.find(docType => docType.id === documentTypeId).schools

  // Content data
  const elevsamtale = {
    schoolNumber:  availableSchools.length > 1 ? "" : availableSchools[0].skolenummer,
    conversationStatus: ""
  }

  const validate = () => {
    console.log(teacherStudent)
    const formData = new FormData()
    formData.append('hei', "jhuhuhu")
    const document = generateDocument({ 
      documentTypeId,
      type: 'elevsamtale',
      variant: elevsamtale.conversationStatus,
      school: teacherStudent.skoler.find(school => school.skolenummer === elevsamtale.schoolNumber),
      user: "Halla",
      teacherStudent,
      studentData,
      teacher: "Hijhi",
      formData
    })
    console.log(document)
  }

  $: if (elevsamtale.conversationStatus && elevsamtale.conversationStatus.length > 0) validate()

  // Faggrupper, kan de matches på fag i undervisninggrupper, ved navne-matching?? La oss teste
  // IDEEN - vi henter alle faggruppene til en elev - så matcher vi på navn (prefixen til undervisningsgrupep). Har vi en knapp for å vise alle fag - dersom faglærer ikke får opp sitt fag. MEN hva når vi skal vise sendte varsler.
  // Vi begynner med ideen over, og får ta det som det kommer.
</script>

<!--<pre>{JSON.stringify(faggrupper, null, 2)}</pre>-->
<pre>{JSON.stringify(elevsamtale, null, 2)}</pre>

<form method="post" action="?/varsel-fag">
  {#if availableSchools.length > 1}
    <section>
      <h4>Velg skole</h4>
      {#each availableSchools as school}
        <input type="radio" id="school-{school.skolenummer}" name="school" bind:group={elevsamtale.schoolNumber} value="{school.skolenummer}" required />
        <label for="school-{school.skolenummer}">{school.navn}</label><br>
      {/each}
    </section>
  {:else}
    <input type="hidden" name="school" value="{availableSchools[0].skolenummer}" />
  {/if}

  <!--Ikke noe poeng å vise resten før skole er valgt -->
  {#if elevsamtale.schoolNumber}
    <section>
      <h4>Er det gjennomført en elevsamtale?</h4>
      {#each conversationStatuses as conversationStatus}
        <input type="radio" id="conversation-{conversationStatus.id}" bind:group={elevsamtale.conversationStatus} name="conversationStatus" value="{conversationStatus.id}" required />
        <label for="conversation-{conversationStatus.id}">{conversationStatus.value.nb}</label><br>
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