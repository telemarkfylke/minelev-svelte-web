<script>
  import axios from "axios"
  import PdfPreview from "../components/PDFPreview.svelte"
  import { periods, orderReasons } from "./data/document-data"
  import { documentTypes } from "./document-types"
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte"
  import { goto } from "$app/navigation"
  import { page } from "$app/stores";
  import { onMount } from "svelte";

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
  let showKompetansemaal = true

  let showData = false
  let errorMessage = ""

  let canClickSend = false

  // Tilbakemelding content data
  let content = ''

  // Tilgjengelige tilbakemeldinger
  let tilbakemeldinger = null
  let originalTilbakemeldinger = null
  let tilbakemeldingError = ""

  // Henter tilbakemeldinger med utplasseringsdata og mål
  onMount(async () => {
    tilbakemeldinger = ""
    try {
      const { data } = await axios.get(`/api/students/${$page.params.feidenavnPrefix}/yff/availabletilbakemeldinger`)
      originalTilbakemeldinger = data
      tilbakemeldinger = JSON.parse(JSON.stringify(originalTilbakemeldinger))
      const utplasseringid = $page.url.searchParams.get('utplasseringid')
      if (utplasseringid) {
        const selectedTilbakemelding = tilbakemeldinger.find(melding => melding.utplassering._id === utplasseringid)
        if (selectedTilbakemelding) content = selectedTilbakemelding
      }
      if (tilbakemeldinger.length === 1) {
        content = tilbakemeldinger[0]
      }
    } catch (error) {
      tilbakemeldinger = null
      originalTilbakemeldinger = null
      tilbakemeldingError = error.stack || error.toString()
    }
  })

  const resetTilbakemelding = () => {
    if (content?.utplassering?._id) {
      const correspondingOriginal = originalTilbakemeldinger.find(melding => melding.utplassering._id === content.utplassering._id)
      // For å ikke knekke objekt-referansen..
      for (const [key, value] of Object.entries(correspondingOriginal)) {
        content[key] = JSON.parse(JSON.stringify(value))
      }
    }
  }

  $: canClickSend = true // Vi prøver oss med innebygget form validation i browser i stedet :)

  let previewBase64
  const sendTilbakemelding = async (preview=false) => {
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
        variant: 'tilbakemelding',
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
  <!-- Utplassering tilbakemeldingen er knyttet til -->
  {#if isCompletedDocument}
    <div style="display: none;"></div>
  {:else if tilbakemeldingError}
    <section class="error">
      <h4>En feil har oppstått 😩</h4>
      <p>{tilbakemeldingError}</p>
    </section>
  {:else}
    <section>
      <h3>
        Utplasseringssted for tilbakemeldingen
      </h3>
      {#if !tilbakemeldinger}
        <LoadingSpinner width={"1.5"} />
      {:else if tilbakemeldinger.length === 0}
        <div>
          For å opprette en tilbakemelding må du først ha opprettet en bekreftelse på utplassering, og deretter en lokal læreplan for den samme utplasseringen.
          <br />
          <a href="/elever/{studentFeidenavnPrefix}"><span class="material-symbols-outlined">arrow_back</span>Gå tilbake til eleven</a>
        </div>
      {:else}
        <div class="label-select">
          <label for="utplassering">Utplasseringssted</label>
          <select bind:value={content} id="utplassering" on:change={resetTilbakemelding}>
            <option value="">--Velg utplasseringssted--</option>
            <hr />
            {#each tilbakemeldinger as tilbakemelding}
              <option value={tilbakemelding}>{tilbakemelding.utplassering.bedriftsData.navn}</option>
            {/each}
          </select>
        </div>
      {/if}
    </section>
  {/if}

  <!-- Utplasseringsted informasjon -->
  {#if isCompletedDocument}
    <section>
      <h4>Informasjon om utplasseringen</h4>
      <div><strong>Bedrift: </strong>{documentContent.utplassering.bedriftsData.navn}</div>
      <div><strong>Tidsom: </strong>{documentContent.utplassering.fraDato} - {documentContent.utplassering.tilDato} ({documentContent.utplassering.daysPerWeek} dager i uken)</div>
      <div><strong>Kontaktperson(er): </strong>
        {#each documentContent.utplassering.kontaktpersonData as kontaktperson}
          <div>
              - {kontaktperson.navn} {#if kontaktperson.avdeling}({kontaktperson.avdeling}){/if}, {kontaktperson.telefon || kontaktperson.epost || "Ingen kontaktinfo"}
          </div>
        {/each}
      </div>
    </section>
  {:else if content?.utplassering?._id}
    <section>
      <h3>
        Informasjon om utplasseringen
      </h3>
      <div><strong>Bedrift: </strong>{content.utplassering.bedriftsData.navn}</div>
      <div><strong>Tidsom: </strong>{content.utplassering.fraDato} - {content.utplassering.tilDato} ({content.utplassering.daysPerWeek} dager i uken)</div>
      <div><strong>Kontaktperson(er): </strong>
        {#each content.utplassering.kontaktpersonData as kontaktperson}
          <div>
             - {kontaktperson.navn} {#if kontaktperson.avdeling}({kontaktperson.avdeling}){/if}, {kontaktperson.telefon || kontaktperson.epost || "Ingen kontaktinfo"}
          </div>
        {/each}
      </div>
    </section>
  {/if}

  <!-- Kompetansemål og arbeidsoppgaver -->
  {#if isCompletedDocument}
    <section>
      <h4>
        Kompetansemål og arbeidsoppgaver
      </h4>
      {#each documentContent.kompetansemal as maal}
        <div class="maal">
          <div><strong>Mål: </strong>{maal.grep.tittel.nb}</div>
          {#if maal.arbeidsoppgaver}
            <div><strong>Arbeidsoppgaver: </strong>{maal.arbeidsoppgaver}</div>
          {/if}
          <div><strong>Måloppnåelse: </strong>{maal.tilbakemelding}</div>
        </div>
      {/each}
    </section>
  {:else if content?.utplassering?._id}
    <section>
      <h3>
        Kompetansemål og arbeidsoppgaver
      </h3>
      {#each content.kompetansemal as maal}
        <div class="maal">
          <div><strong>Mål: </strong>{maal.grep.tittel.nb}</div>
          {#if maal.arbeidsoppgaver}
            <div><strong>Arbeidsoppgaver: </strong>{maal.arbeidsoppgaver}</div>
          {/if}
          <div class="radioFlex">
            <div>
              <input type="radio" id="score-{maal.grep.kode}-lav" bind:group={maal.tilbakemelding} name="score-{maal.grep.kode}" value="Lav måloppnåelse" required />
              <label for="score-{maal.grep.kode}-lav">Lav måloppnåelse</label><br>
            </div>
            <div>
              <input type="radio" id="score-{maal.grep.kode}-middels" bind:group={maal.tilbakemelding} name="score-{maal.grep.kode}" value="Middels måloppnåelse" required />
              <label for="score-{maal.grep.kode}-middels">Middels måloppnåelse</label><br>
            </div>
            <div>
              <input type="radio" id="score-{maal.grep.kode}-hoy" bind:group={maal.tilbakemelding} name="score-{maal.grep.kode}" value="Høy måloppnåelse" required />
              <label for="score-{maal.grep.kode}-hoy">Høy måloppnåelse</label><br>
            </div>
          </div>
        </div>
      {/each}
    </section>
  {/if}

  <!-- Virksomhetens inntrykk av eleven -->
  {#if isCompletedDocument}
    <section>
      <h4>
        Virksomhetens inntrykk av eleven
      </h4>
      {#each Object.entries(documentContent.evalueringsdata) as evalueringspunkt}
        <div class="maal">
          <div><strong>{evalueringspunkt[1].title.nb}</strong></div>
          <div>{evalueringspunkt[1].score === '0' ? 'Ikke aktuelt' : evalueringspunkt[1].score}</div>
        </div>
      {/each}
    </section>
  {:else if content?.utplassering?._id}
    <section>
      <h3>
        Virksomhetens inntrykk av eleven
      </h3>
      {#each Object.entries(content.evalueringsdata) as evalueringspunkt, index}
        <div class="maal">
          <div><strong>{evalueringspunkt[1].title.nb}</strong></div>
          <div class="radioFlex">
            <div>
              <input type="radio" id="score-{evalueringspunkt[0]}-under" bind:group={content.evalueringsdata[evalueringspunkt[0]].score} name="score-{evalueringspunkt[0]}" value="Under forventet" required />
              <label for="score-{evalueringspunkt[0]}-under">Under forventet</label><br>
            </div>
            <div>
              <input type="radio" id="score-{evalueringspunkt[0]}-som" bind:group={content.evalueringsdata[evalueringspunkt[0]].score} name="score-{evalueringspunkt[0]}" value="Som forventet" required />
              <label for="score-{evalueringspunkt[0]}-som">Som forventet</label><br>
            </div>
            <div>
              <input type="radio" id="score-{evalueringspunkt[0]}-over" bind:group={content.evalueringsdata[evalueringspunkt[0]].score} name="score-{evalueringspunkt[0]}" value="Over forventet" required />
              <label for="score-{evalueringspunkt[0]}-over">Over forventet</label><br>
            </div>
            <div>
              <input type="radio" id="score-{evalueringspunkt[0]}-uaktuelt" bind:group={content.evalueringsdata[evalueringspunkt[0]].score} name="score-{evalueringspunkt[0]}" value="0" required /> <!--blank value?-->
              <label for="score-{evalueringspunkt[0]}-uaktuelt">Ikke aktuelt</label><br>
            </div>
          </div>
        </div>
      {/each}
    </section>
  {/if}

  <!-- Orden og atferd -->
  {#if isCompletedDocument}
    <section>
      <h4>
        Orden og atferd
      </h4>
      {#each Object.entries(documentContent.ordenatferd) as evalueringspunkt}
        <div class="maal">
          <div><strong>{evalueringspunkt[1].title}</strong></div>
          <div>{evalueringspunkt[1].score === '0' ? 'Ikke aktuelt' : evalueringspunkt[1].score}</div>
        </div>
      {/each}
    </section>
  {:else if content?.utplassering?._id}
    <section>
      <h3>
        Orden og atferd
      </h3>
      {#each Object.entries(content.ordenatferd) as evalueringspunkt, index}
        <div class="maal">
          <div><strong>{evalueringspunkt[1].title}</strong></div>
          <div class="radioFlex">
            <div>
              <input type="radio" id="score-{evalueringspunkt[0]}-under" bind:group={content.ordenatferd[evalueringspunkt[0]].score} name="score-{evalueringspunkt[0]}" value="Under forventet" required />
              <label for="score-{evalueringspunkt[0]}-under">Under forventet</label><br>
            </div>
            <div>
              <input type="radio" id="score-{evalueringspunkt[0]}-som" bind:group={content.ordenatferd[evalueringspunkt[0]].score} name="score-{evalueringspunkt[0]}" value="Som forventet" required />
              <label for="score-{evalueringspunkt[0]}-som">Som forventet</label><br>
            </div>
            <div>
              <input type="radio" id="score-{evalueringspunkt[0]}-over" bind:group={content.ordenatferd[evalueringspunkt[0]].score} name="score-{evalueringspunkt[0]}" value="Over forventet" required />
              <label for="score-{evalueringspunkt[0]}-over">Over forventet</label><br>
            </div>
          </div>
        </div>
      {/each}
    </section>
  {/if}

  <!-- Fravær -->
  {#if isCompletedDocument}
    <section>
      <h4>
        Fravær under utplasseringen
      </h4>
      <div><strong>Antall hele dager fravær: </strong>{documentContent.fravar.dager}</div>
      <div><strong>Antall timer fravær: </strong>{documentContent.fravar.timer}</div>
      <div><strong>Varslet eleven selv om fraværet? </strong>{documentContent.fravar.varslet.substring(0,1).toUpperCase()}{documentContent.fravar.varslet.substring(1)}</div>
    </section>
  {:else if content?.utplassering?._id}
    <section>
      <h3>
        Fravær under utplasseringen
      </h3>
      <div class="datetimeStuff">
        <div class="label-input required">
          <label for="fravardager">Antall hele dager fravær</label>
          <input required id="fravardager" type="number" bind:value={content.fravar.dager} placeholder="Antall hele dager fravær"  />
        </div>
        <div class="label-input required">
          <label for="fravartimer">Antall timer fravær</label>
          <input required id="fravartimer" type="number" bind:value={content.fravar.timer} placeholder="Antall timer fravær" />
        </div>
      </div>
      <div><strong>Varslet eleven selv om fraværet?</strong></div>
      <div class="radioFlex">
        <div>
          <input type="radio" id="fravar-varslet-ja" bind:group={content.fravar.varslet} name="fravar-varslet" value="ja" required />
          <label for="fravar-varslet-ja">Ja</label><br>
        </div>
        <div>
          <input type="radio" id="fravar-varslet-nei" bind:group={content.fravar.varslet} name="fravar-varslet" value="nei" required />
          <label for="fravar-varslet-nei">Nei</label><br>
        </div>
        <div>
          <input type="radio" id="fravar-varslet-avogtil" bind:group={content.fravar.varslet} name="fravar-varslet" value="av og til" required />
          <label for="fravar-varslet-avogtil">Av og til</label><br>
        </div>
        <div>
          <input type="radio" id="fravar-varslet-uaktuelt" bind:group={content.fravar.varslet} name="fravar-varslet" value="0" required />
          <label for="fravar-varslet-uaktuelt">Ikke aktuelt</label><br>
        </div>
      </div>

    </section>
  {/if}

  <!-- Hvis error -->
  {#if errorMessage}
    <section class="error">
      <h4>En feil har oppstått 😩</h4>
      <p>{JSON.stringify(errorMessage)}</p>
    </section>
  {/if}

  {#if !isCompletedDocument && content?.utplassering?._id}
    <div class="form-buttons">
      {#if canClickSend}
        {#if previewLoading}
          <button disabled><LoadingSpinner width={"1.5"} />Forhåndsvisning</button>
        {:else}
          <button type="submit" on:click={(e) => { e.preventDefault(); previewLoading=true; sendTilbakemelding(true); } }><span class="material-symbols-outlined">preview</span>Forhåndsvisning</button>
        {/if}
        {#if sendLoading}
          <button disabled><LoadingSpinner width={"1.5"} />Send</button>
        {:else}
          <button type="submit" class="filled" on:click={(e) => { e.preventDefault(); sendLoading=true; sendTilbakemelding(); } }><span class="material-symbols-outlined">send</span>Send</button>
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
  h3, h4 {
    border-bottom: 1px solid var(--primary-color);
  }
  .form-buttons {
    display: flex;
    gap: var(--spacing-small);
  }
  section {
    /* background-color: var(--primary-color-20); */
    padding-bottom: 0.5rem;
  }
  .maal {
    padding: 1rem;
  }
  .maal:nth-child(even) {
    background-color: var(--primary-color-20);
  }

  .radioFlex {
    display: flex;
    flex-wrap: wrap;
    gap: 0rem 0.8rem;
  }
  .error {
    color: var(--error-color);
    background-color: var(--error-background-color);
    padding: 0.5rem 1rem;
  }
  .datetimeStuff {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    padding-bottom: 0.5rem;
  }

</style>