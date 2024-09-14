<script>
  import axios from "axios"
  import PdfPreview from "../components/PDFPreview.svelte"
  import { periods, orderReasons } from "./data/document-data"
  import { documentTypes } from "./document-types"
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte"
  import { goto } from "$app/navigation"

  export let documentTypeId = null
  export let studentFeidenavnPrefix = null
  export let selectedSchoolNumber = null
  export let studentData = null
  export let isCompletedDocument = false
  export let documentContent = null

  let formElement
  let showPreview = false
  let sendLoading = false
  let previewLoading = false

  let showData = false
  let errorMessage = ""

  let canClickSend = false

  // Brreg
  let brregLoading = false
  let brregResult = []
  let brregError = ''
  let brregQuery = ''

  const brregSearch = async () => {
    try {
      brregError = ''
      brregLoading = true
      if (!brregQuery) throw new Error('Du må søke på noe')
      if (brregQuery.length < 3) throw new Error('Skriv minst 3 tegn for å søke')
      const { data } = await axios.get(`/api/brreg/search?query=${brregQuery}`)
      brregResult = data
    } catch (error) {
      brregResult = []
      brregError = error.toString()
    }
    brregLoading = false
  }

  const getStudentUtdanningsprogram = (schoolNumber) => {
    if (isCompletedDocument) return []
    return studentData.yffSchools.find(school => school.skolenummer === schoolNumber).utdanningsprogrammer
  }

  const getStudentLevels = (schoolNumber) => {
    if (isCompletedDocument) return []
    return studentData.basisgrupper.filter(gruppe => gruppe.skole.skolenummer === schoolNumber).map(gruppe => gruppe.trinn)
  }

  // Bekreftelse content data
  const content = {
    bekreftelse: {
      oppmotested: '',
      kopiPrEpost: [],
      fraDato: null,
      tilDato: null,
      daysPerWeek: null,
      startTid: '08:00',
      sluttTid: '16:00',
      kontaktpersonData: [
        {
          navn: '',
          telefon: '',
          epost: '',
          avdeling: ''
        }
      ],
      parorendeData: [
        {
          navn: '',
          telefon: ''
        }
      ],
      bedriftsData: null
    },
    utdanningsprogramId: getStudentUtdanningsprogram(selectedSchoolNumber).length === 1 ? getStudentUtdanningsprogram(selectedSchoolNumber)[0].uri : '',
    level: getStudentLevels(selectedSchoolNumber).length === 1 ? getStudentLevels(selectedSchoolNumber)[0] : ''
  }

  $: content.utdanningsprogramId = getStudentUtdanningsprogram(selectedSchoolNumber).length === 1 ? getStudentUtdanningsprogram(selectedSchoolNumber)[0].uri : '' // In case of change of selectedSchoolNumber
  $: content.level = getStudentLevels(selectedSchoolNumber).length === 1 ? getStudentLevels(selectedSchoolNumber)[0] : '' // In case of change of selectedSchoolNumber

  const addContactPerson = () => {
    const contactPerson = {
      navn: '',
      telefon: '',
      epost: '',
      avdeling: ''
    }
    content.bekreftelse.kontaktpersonData = [...content.bekreftelse.kontaktpersonData, contactPerson] // Want it reactive, so we assign it instead of push
  }
  const removeContactPerson = (index) => {
    if (index === 0) throw new Error('Du må ha minst en kontaktperson ved bedriften')
    content.bekreftelse.kontaktpersonData = content.bekreftelse.kontaktpersonData.filter((person, personIndex) => {
      return index !== personIndex
    })
  }
  const addKopimottaker = () => {
    const kopimottaker = ''
    content.bekreftelse.kopiPrEpost = [...content.bekreftelse.kopiPrEpost, kopimottaker] // Want it reactive, so we assign it instead of push
  }
  const removeKopimottaker = (index) => {
    content.bekreftelse.kopiPrEpost = content.bekreftelse.kopiPrEpost.filter((mottaker, mottakerIndex) => {
      return index !== mottakerIndex
    })
  }
  const addParorende = () => {
    const parorende = {
      navn: '',
      telefon: ''
    }
    content.bekreftelse.parorendeData = [...content.bekreftelse.parorendeData, parorende] // Want it reactive, so we assign it instead of push
  }
  const removeParorende = (index) => {
    if (index === 0) throw new Error('Du må ha minst en pårørende for eleven')
    content.bekreftelse.parorendeData = content.bekreftelse.parorendeData.filter((person, personIndex) => {
      return index !== personIndex
    })
  }

  // Reactive statements
  $: canClickSend = Boolean(content.bekreftelse.bedriftsData) // Vi prøver oss med innebygget form validation i browser i stedet :)
  //$: canClickSend = Boolean(content.bekreftelse.bedriftsData && content.bekreftelse.oppmotested && (Array.isArray(content.bekreftelse.kontaktpersonData) && content.bekreftelse.kontaktpersonData.length > 0 && content.bekreftelse.kontaktpersonData.every(person => person.navn)) && content.bekreftelse.fraDato && content.bekreftelse.tilDato && content.bekreftelse.daysPerWeek && content.bekreftelse.startTid && content.bekreftelse.tilDato && (Array.isArray(content.bekreftelse.parorendeData) && content.bekreftelse.parorendeData.length > 0 && content.bekreftelse.parorendeData.every(person => (person.navn && person.telefon))))

  let previewBase64
  const sendBekreftelse = async (preview=false) => {
    const validData = formElement.reportValidity()
    if (!validData) {
      previewLoading = false
      sendLoading = false
      return
    }
    errorMessage = ""
    try {
      const payload = {
        documentTypeId,
        type: 'yff',
        variant: 'bekreftelse',
        schoolNumber: selectedSchoolNumber,
        documentData: content,
        preview
      }
      const { data } = await axios.post(`/api/students/${studentFeidenavnPrefix}/newDocument`, payload)
      // If ok then do something
      if (preview) {
        previewBase64 = data
        previewLoading = false
        showPreview = true
      } else {
        sendLoading = false
        goto(`/elever/${studentFeidenavnPrefix}/dokumenter/${data.insertedId}`)
      }
    } catch (error) {
      previewLoading = false
      sendLoading = false
      errorMessage = error.response?.data || error.stack || error.toString()
    }
  }
</script>

{#if showData}
  <pre>{JSON.stringify(content, null, 2)}</pre>
{/if}
<form bind:this={formElement}>
  <!--Elevens utdanningsprogram og trinn-->
  {#if isCompletedDocument}
    <section>
      <h3>
        Elevens utdanningsprogram
      </h3>
      <div>
        {documentContent.utdanningsprogram.tittel.nb} - {documentContent.level}
      </div>
    </section>
  {:else}
    <!--Hvis læreren har eleven ved flere utdanningsprogram må hen velge-->
    <section>
      <h3>
        Elevens utdanningsprogram
      </h3>
      <div class="label-select">
        <label for="utdanningsprogramid">Utdanningsprogram</label>
        <select bind:value={content.utdanningsprogramId} id="utdanningsprogramid">
          {#if getStudentUtdanningsprogram(selectedSchoolNumber).length === 1} <!-- Hvis det bare er et utdanningsprogram, så bruker vi bare det -->
            <option value="{getStudentUtdanningsprogram(selectedSchoolNumber)[0].uri}">{getStudentUtdanningsprogram(selectedSchoolNumber)[0].tittel.nb}</option>
          {:else}
            <option value="">--Velg utdanningsprogram--</option>
            <hr />
            {#each getStudentUtdanningsprogram(selectedSchoolNumber) as program}
              <option value="{program.uri}">{program.tittel.nb}</option>
            {/each}
          {/if}
          </select>
      </div>
      <div class="label-select">
        <label for="trinn">Trinn</label>
        <select bind:value={content.level} id="trinn">
          {#if getStudentLevels(selectedSchoolNumber).length === 1} <!-- Hvis det bare er et trinn, så bruker vi bare det -->
            <option value="{getStudentLevels(selectedSchoolNumber)[0]}">{getStudentLevels(selectedSchoolNumber)[0]}</option>
          {:else}
            <option value="">--Velg trinn--</option>
            <hr />
            {#each getStudentLevels(selectedSchoolNumber) as level}
              <option value="{level}">{level}</option>
            {/each}
          {/if}
        </select>
      </div>
    </section>
  {/if}

  <!--Bedriftsinformasjon-->
  {#if isCompletedDocument}
    <section>
      <h3>
        Bedriftsinformasjon
      </h3>
      <div class="selectedBrregUnit">
        <div class="unitTitle">{documentContent.bekreftelse.bedriftsData.navn}</div>
        <div>{documentContent.bekreftelse.bedriftsData.organisasjonsNummer}</div>
        <div>{documentContent.bekreftelse.bedriftsData.adresse}</div>
        <div>{documentContent.bekreftelse.bedriftsData.postnummer} {documentContent.bekreftelse.bedriftsData.poststed}</div>
      </div>
      {#if documentContent.bekreftelse.bedriftsData.avdeling}
        <div class="label-input disabled">
          <label for="avdeling">Avdeling</label>
          <input disabled id="avdeling" type="text" value={documentContent.bekreftelse.bedriftsData.avdeling} />
        </div>
      {/if}
      <div class="label-input disabled">
        <label for="motested">Oppmøtested</label>
        <input disabled id="motested" type="text" value={documentContent.bekreftelse.oppmotested} />
      </div>
    </section>
  {:else if content.utdanningsprogramId && content.level}
    <section>
      <h3>
        Bedriftsinformasjon
      </h3>
      {#if !content.bekreftelse.bedriftsData}
        <form>
          <div class="button-input">
            <input id="brregsearch" type="text" bind:value={brregQuery}  placeholder="Søk etter navn eller orgnr" />
            <button class="squared" on:click={(e) => { e.preventDefault(); brregSearch(brregQuery) }}>
              <span class="material-symbols-outlined">search</span>
            </button>
          </div>
        </form>
        {#if brregLoading}
          <LoadingSpinner width="4" />
        {:else if brregError}
          {brregError}
        {:else}
          {#each brregResult as unit}
            <button class="brregUnit" title="Velg enhet" on:click={() => {content.bekreftelse.bedriftsData = unit; window.scrollTo(0, 0);}}>
                <div>{unit.organisasjonsNummer}</div>
                <div style="text-align: left;">
                  {#if unit.type === 'underenhet'}
                    <div style="font-size: var(--font-size-small);">Underenhet</div>
                  {/if}
                  <div>{unit.navn}</div>
                </div>
            </button>
          {/each}
        {/if}
      {:else} <!-- Da har vi bedrift -->
        <div class="selectedBrregUnit">
          <div class="unitTitle">{content.bekreftelse.bedriftsData.navn}</div>
          <div>{content.bekreftelse.bedriftsData.organisasjonsNummer}</div>
          <div>{content.bekreftelse.bedriftsData.adresse}</div>
          <div>{content.bekreftelse.bedriftsData.postnummer} {content.bekreftelse.bedriftsData.poststed}</div>
          <div class="icon-link">
            <span class="material-symbols-outlined">arrow_back</span><button on:click={() => { content.bekreftelse.bedriftsData = null }} class="link">Velg en annen bedrift</button>
          </div>
        </div>
        <div class="label-input">
          <label for="avdeling">Avdeling (valgfritt)</label>
          <input id="avdeling" type="text" bind:value={content.bekreftelse.bedriftsData.avdeling} placeholder="Avdeling ved bedriften" />
        </div>
        <div class="label-input required">
          <label for="motested">Oppmøtested</label>
          <input required id="motested" type="text" bind:value={content.bekreftelse.oppmotested} placeholder="Hvor skal eleven møte opp" />
        </div>
      {/if}
    </section>
  {/if}

  <!--Kontaktpersoner-->
  {#if isCompletedDocument}
    <section>
      <h3>Kontaktperson(er) ved bedriften</h3>
      {#each documentContent.bekreftelse.kontaktpersonData as kontaktperson, index}
        <div class="contactPerson">
          <h4>Kontaktperson{index > 0 ? ` ${index + 1}` : ''}</h4>
          <div class="label-input disabled">
            <label for="kontaktperson-{index}-navn">Navn</label>
            <input disabled id="kontaktperson-{index}-navn" type="text" value={kontaktperson.navn} />
          </div>
          {#if kontaktperson.telefon}
            <div class="label-input disabled">
              <label for="kontaktperson-{index}-tlf">Telefon</label>
              <input disabled id="kontaktperson-{index}-tlf" type="number" value={kontaktperson.telefon} />
            </div>
          {/if}
          {#if kontaktperson.epost}
            <div class="label-input disabled">
              <label for="kontaktperson-{index}-epost">E-post</label>
              <input disabled id="kontaktperson-{index}-epost" type="email" value={kontaktperson.epost} />
            </div>
          {/if}
          {#if kontaktperson.avdeling}
            <div class="label-input disabled">
              <label for="kontaktperson-{index}-avdeling">Avdeling</label>
              <input disabled id="kontaktperson-{index}-avdeling" type="text" value={kontaktperson.avdeling} />
            </div>
          {/if}
        </div>
        <br />
      {/each}
    </section>
  {:else if content.bekreftelse.bedriftsData}
    <section>
      <h3>Kontaktperson(er) ved bedriften</h3>
      {#each content.bekreftelse.kontaktpersonData as kontaktperson, index}
        <div class="contactPerson">
          <h4>Kontaktperson{index > 0 ? ` ${index + 1}` : ''}</h4>
          <div class="label-input required">
            <label for="kontaktperson-{index}-navn">Navn</label>
            <input required id="kontaktperson-{index}-navn" type="text" bind:value={content.bekreftelse.kontaktpersonData[index].navn} placeholder="Navn på kontaktperson" />
          </div>
          <div class="label-input">
            <label for="kontaktperson-{index}-tlf">Telefon (valgfritt)</label>
            <input id="kontaktperson-{index}-tlf" type="number" bind:value={content.bekreftelse.kontaktpersonData[index].telefon} placeholder="Telefonnummer til kontaktperson" />
          </div>
          <div class="label-input">
            <label for="kontaktperson-{index}-epost">E-post (valgfritt)</label>
            <input id="kontaktperson-{index}-epost" type="email" bind:value={content.bekreftelse.kontaktpersonData[index].epost} placeholder="E-post til kontaktperson" />
          </div>
          <div class="label-input">
            <label for="kontaktperson-{index}-avdeling">Avdeling (valgfritt)</label>
            <input id="kontaktperson-{index}-avdeling" type="text" bind:value={content.bekreftelse.kontaktpersonData[index].avdeling} placeholder="Kontaktpersonens avdeling i bedriften" />
          </div>
          {#if index > 0}
            <div class="icon-link" style="padding-top: 1rem;">
              <span class="material-symbols-outlined">delete</span><button class="link" on:click={() => {removeContactPerson(index)}}>Fjern kontaktperson</button>
            </div>
          {/if}
        </div>
        <br />
      {/each}
      <button class="icon-button filled" on:click={addContactPerson}><span class="material-symbols-outlined">add</span>Legg til enda en kontaktperson</button>
    </section>
  {/if}

  <!--Kopimottakere-->
  {#if isCompletedDocument}
    <section>
      <h3>Kopimottakere</h3>
      {#if documentContent.bekreftelse.kopiPrEpost.length === 0}
        <p>Ingen kopimottakere</p>
      {/if}
      {#each documentContent.bekreftelse.kopiPrEpost as mottaker, index}
        <div class="contactPerson">
          <h4>Kopimottaker{index > 0 ? ` ${index + 1}` : ''}</h4>
          <div class="label-input disabled">
            <label for="kopimottaker-{index}">E-post</label>
            <input disabled id="kopimottaker-{index}" type="email" value={mottaker} />
          </div>
        </div>
        <br />
      {/each}
    </section>
  {:else if content.bekreftelse.bedriftsData}
    <section>
      <h3>Kopimottakere</h3>
      <p>Noen ganger er det enklere sagt enn gjort at korrekt mottaker hos utplasseringsbedriften mottar brevene som sendes, i de tilfellene kan man legge kontaktpersonen(e) som kopimottaker, og de vil få tilsendt kopi av dokumentene på e-post i tillegg.</p>
      {#each content.bekreftelse.kopiPrEpost as mottaker, index}
        <div class="contactPerson">
          <h4>Kopimottaker{index > 0 ? ` ${index + 1}` : ''}</h4>
          <div class="label-input">
            <label for="kopimottaker-{index}">E-post</label>
            <input id="kopimottaker-{index}" type="email" bind:value={content.bekreftelse.kopiPrEpost[index]} placeholder="E-post til kopimottaker" />
          </div>
          <div class="icon-link" style="padding-top: 1rem;">
            <span class="material-symbols-outlined">delete</span><button class="link" on:click={() => {removeKopimottaker(index)}}>Fjern kopimottaker</button>
          </div>
        </div>
        <br />
      {/each}
      <button class="icon-button filled" on:click={addKopimottaker}><span class="material-symbols-outlined">add</span>Legg til kopimottaker</button>
    </section>
  {/if}

  <!--Tidsrom-->
  {#if isCompletedDocument}
    <section>
      <h3>Tidsrom for utplassering</h3>
      <div class="label-input disabled">
        <label for="fraogmed">Fra og med</label>
        <input disabled id="fraogmed" type="text" value={documentContent.bekreftelse.fraDato} />
      </div>
      <div class="label-input disabled">
        <label for="tilogmed">Til og med</label>
        <input disabled id="tilogmed" type="text" value={documentContent.bekreftelse.tilDato} />
      </div>
      <div class="label-input disabled">
        <label for="daysperweek">Antall dager i uken</label>
        <input disabled id="daysperweek" type="number" value={documentContent.bekreftelse.daysPerWeek} />
      </div>
      <div class="label-input disabled">
        <label for="fraklokken">Fra klokken</label>
        <input disabled id="fraklokken" type="time" value={documentContent.bekreftelse.startTid} />
      </div>
      <div class="label-input disabled">
        <label for="tilklokken">Til klokken</label>
        <input disabled id="tilklokken" type="time" value={documentContent.bekreftelse.sluttTid} />
      </div>
    </section>
  {:else if content.bekreftelse.bedriftsData}
    <section>
      <h3>Tidsrom for utplassering</h3>
      <div class="label-input required">
        <label for="fraogmed">Fra og med</label>
        <input required id="fraogmed" type="date" bind:value={content.bekreftelse.fraDato} />
      </div>
      <div class="label-input required">
        <label for="tilogmed">Til og med</label>
        <input required id="tilogmed" type="date" bind:value={content.bekreftelse.tilDato} />
      </div>
      <div class="label-input required">
        <label for="daysperweek">Antall dager i uken</label>
        <input required id="daysperweek" type="number" bind:value={content.bekreftelse.daysPerWeek} placeholder="Antall dager i uken" />
      </div>
      <div class="label-input required">
        <label for="fraklokken">Fra klokken</label>
        <input required id="fraklokken" type="time" bind:value={content.bekreftelse.startTid} />
      </div>
      <div class="label-input required">
        <label for="tilklokken">Til klokken</label>
        <input required id="tilklokken" type="time" bind:value={content.bekreftelse.sluttTid} />
      </div>
    </section>
  {/if}

  <!--Pårørerende for eleven-->
  {#if isCompletedDocument}
  <section>
    <h3>Pårørende for eleven</h3>
      {#each documentContent.bekreftelse.parorendeData as parorende, index}
        <div class="contactPerson">
          <h4>Pårørende{index > 0 ? ` ${index + 1}` : ''}</h4>
          <div class="label-input disabled">
            <label for="parorende-{index}-navn">Navn</label>
            <input disabled id="parorende-{index}-navn" type="text" value={parorende.navn} />
          </div>
          <div class="label-input disabled">
            <label for="parorende-{index}-tlf">Telefon</label>
            <input disabled id="parorende-{index}-tlf" type="number" value={parorende.telefon} />
          </div>
        </div>
        <br />
      {/each}
  </section>
  {:else if content.bekreftelse.bedriftsData}
    <section>
      <h3>Pårørende for eleven</h3>
        {#each content.bekreftelse.parorendeData as parorende, index}
          <div class="contactPerson">
            <h4>Pårørende{index > 0 ? ` ${index + 1}` : ''}</h4>
            <div class="label-input required">
              <label for="parorende-{index}-navn">Navn</label>
              <input required id="parorende-{index}-navn" type="text" bind:value={content.bekreftelse.parorendeData[index].navn} placeholder="Navn på pårørende" />
            </div>
            <div class="label-input required">
              <label for="parorende-{index}-tlf">Telefon</label>
              <input required id="parorende-{index}-tlf" type="number" bind:value={content.bekreftelse.parorendeData[index].telefon} placeholder="Telefonnummer til pårørende" />
            </div>
            {#if index > 0}
              <div class="icon-link" style="padding-top: 1rem;">
                <span class="material-symbols-outlined">delete</span><button class="link" on:click={() => {removeParorende(index)}}>Fjern pårørende</button>
              </div>
            {/if}
          </div>
          <br />
        {/each}
        <button class="icon-button filled" on:click={addParorende}><span class="material-symbols-outlined">add</span>Legg til enda en pårørende</button>
    </section>
  {/if}

  <!-- Hvis error -->
  {#if errorMessage}
    <section class="error">
      <h4>En feil har oppstått 😩</h4>
      <p>{JSON.stringify(errorMessage)}</p>
    </section>
  {/if}

  {#if !isCompletedDocument}
    <div class="form-buttons">
      {#if canClickSend}
        {#if previewLoading}
          <button disabled><LoadingSpinner width={"1.5"} />Forhåndsvisning</button>
        {:else}
          <button type="submit" on:click={(e) => {e.preventDefault(); previewLoading=true; sendBekreftelse(true);}}><span class="material-symbols-outlined">preview</span>Forhåndsvisning</button>
        {/if}
        {#if sendLoading}
          <button disabled><LoadingSpinner width={"1.5"} />Send</button>
        {:else}
          <button type="submit" class="filled" on:click={(e) => {e.preventDefault(); sendLoading=true; sendBekreftelse();}}><span class="material-symbols-outlined">send</span>Send</button>
        {/if}
      {:else}
        <button disabled><span class="material-symbols-outlined">preview</span>Forhåndsvisning</button>
        <button disabled><span class="material-symbols-outlined">send</span>Send</button>
      {/if}
    </div>
    <PdfPreview {showPreview} base64Data={previewBase64} closePreview={() => {showPreview = false}} />
  {/if}
</form>

<style>
  h3 {
    border-bottom: 1px solid var(--primary-color);
  }
  h4 {
    margin: 0rem;
  }
  .form-buttons {
    display: flex;
    gap: var(--spacing-small);
  }
  section {
    /* background-color: var(--primary-color-20); */
    padding-bottom: 0.5rem;
  }
  .error {
    color: var(--error-color);
    background-color: var(--error-background-color);
    padding: 0.5rem 1rem;
  }
  .brregUnit:hover, .brregUnit:nth-child(odd):hover {
    background-color: var(--primary-color-30);
  }
  .brregUnit {
    padding: 0.5rem 1rem;
    gap: 1rem;
    width: 100%;
    border: 0px;
    border-radius: 0rem;
  }
  .brregUnit:nth-child(odd) {
    background-color: var(--primary-color-20);
  }
  .selectedBrregUnit {
    padding: 0.5rem 1rem;
    background-color: var(--primary-color-20);
    border-radius: 0.4rem;
    border: 2px solid var(--primary-color);
  }
  .unitTitle {
    font-weight: bold;
  }
  .icon-link {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  .contactPerson {
    padding: 1rem 1rem;
    background-color: var(--primary-color-20);
    border-radius: 0.4rem;
    border: 2px solid var(--primary-color);
  }
</style>