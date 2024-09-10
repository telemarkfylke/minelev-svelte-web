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

  // Kan man hente litt data på onmount mon tro? Lage en funksjon for å hente spesifikk laereplan sitt content, og bruke det. Må sendes til elevene hver gang man vil gjøre endring.
  // MEEEN Lager vi da en ny læreplan hver gang vi sender den? Eller skal vi lage versjoner? Og kun ta den nyeste versjonen kanskje? nyttDokument endepunktet lager vel uansett en ny. Må ha en eller annen felles-nevner da..
  // Hvis man kan ta utgangspunkt i en utplassering - og deretter hente den nyeste læreplanen for den utplasseringen! Må da gjøre litt mikkmakk med utplasseringssted da, siden det både kan være elevbedrift og skole i tillegg til bedrift.
  // Hva med loggen over dokumenter? Kan vel da kanskje vise alle sendte læreplaner - men også vise den gjeldende? JA! Kan ha EN gjeldende per utplassering? Det er også den man kan redigere.
  // Når en evt tilbakemelding på utplasseringen er sendt inn - så låses læreplanen.
  /*
  Hvordan ordner vi da flyten på nytt dokument??
  Trenger vi legge til noe data? Har ikke USER ellerno drit i content-creation. Må muligens legge en ekstra valideringssjekk i new-document...
  Lols kan faktisk bare lage eget endepunkt for yff - basert på new-document? Det var jo poenget med at hver dokumenttype håndterer seg selv. Evt bare slenge på en egen funksjon akkurat for YFF? Skal jo gjøre omtrent det samme.
  Vi prøver ideen med nyeste læreplan for en utplassering er gjeldende

  Hvis vi henter både tilgjengelige utplasseringer og alle nyeste tilgjengelige læreplaner i samma slengen, og genererer opp content for alle sammen (ny læreplan for de utplasseringene som ikke har læreplan allerede) - så kan man bare swappe on the fly? Tar en kopi JSON.stringify bare? - ei litta let content?
  Alle har en egen id - som vi kan sende med i query params i pageurl? Om den er med - så setter vi den som valgt i utgangspunktet. Eget endepunkt for å hente yfffene. En læreplan per skole-utplassering. En læreplan for en ungdomsbedrift
  */

  let formElement
  let showPreview = false
  let sendLoading = false
  let previewLoading = false

  let showData = true
  let errorMessage = ""

  let canClickSend = false

  // Utplasseringer
  let utplasseringer = null
  let utplasseringsError = ""

  // Hent utplasseringene til eleven - Kjøres i onMount - henter alle tilgjengelige yff-bedrifter (basert på bekreftelser), samt tidligere læreplaner per bedrift, og slår sammen til et utvalg brukeren kan velge fra. Enten ny læreplan eller basert på en tidligere.
  // Hele content settes så basert på hvilken utplassering man velger. Mulig vi må ta en reactive kopi til content basert på id, slik at man ikke redigerer i originalobjektet
  const getAvailableUtplasseringer = async () => {
    return [
      {
        id: '1',
        name: 'Ein bedrift',
        maal: []
      }
    ]
  }

  const getUtplasseringName = (utplasseringsId) => {
    if (!utplasseringer) return null
    const utplassering = utplasseringer.find(u => u.id === utplasseringsId)
    if (!utplassering) {
      utplasseringsError = `Fant ingen utplassering med id: ${utplasseringsId}`
      return null
    }
    return utplassering.name
  }

  onMount(async () => {
    utplasseringsError = ""
    try {
      console.log("henter utplasseringer")
      utplasseringer = await getUtplasseringer()
    } catch (error) {
      utplasseringer = null
      utplasseringsError = error.stack || error.toString()
    }
  })

  const getStudentUtdanningsprogram = (schoolNumber) => {
    if (isCompletedDocument) return []
    return studentData.utdanningsprogram.filter(program => program.skole.skolenummer === schoolNumber)
  }

  const getStudentLevels = (schoolNumber) => {
    if (isCompletedDocument) return []
    return studentData.basisgrupper.filter(gruppe => gruppe.skole.skolenummer === schoolNumber).map(gruppe => gruppe.trinn)
  }

  // Hent gjeldende læreplan for en utplassering (hvis det finnes en)
  const getLatestLaereplan = async () => {
    return {
      _id: '01',
      content: {
        utplassering: {
          id: '1',
          name: 'En bedrift',
          maal: [
            {
              grep: {
                kode: 'K3703',
                'url-data': 'https://data.udir.no/kl06/v201906/kompetansemaal/K3703',
                tittel: {
                  nb: 'mestre tre ulike typer masseflyttingsmaskiner',
                  nn: 'mestre tre ulike typer masseflyttingsmaskiner',
                  en: 'mestre tre ulike typer masseflyttingsmaskiner'
                }
              },
              arbeidsoppgaver: 'lede morgentrimmen'
            }
          ]
        }
      }
    }
  }

  // Laereplan content data
  const content = {
    utplassering: {
      id: "",
      name: 'Norges røde kors',
      maal: [
        {
          grep: {
            kode: 'K3703',
            'url-data': 'https://data.udir.no/kl06/v201906/kompetansemaal/K3703',
            tittel: {
              nb: 'mestre tre ulike typer masseflyttingsmaskiner',
              nn: 'mestre tre ulike typer masseflyttingsmaskiner',
              en: 'mestre tre ulike typer masseflyttingsmaskiner'
            }
          },
          arbeidsoppgaver: 'lede morgentrimmen'
        },
        {
          grep: {
            kode: 'K3703',
            'url-data': 'https://data.udir.no/kl06/v201906/kompetansemaal/K3703',
            tittel: {
              nb: 'bruke relevant måleutstyr',
              nn: 'bruke relevant måleutstyr',
              en: 'bruke relevant måleutstyr'
            }
          },
          arbeidsoppgaver: 'lede morgentrimmen'
        },
        {
          grep: {
            kode: 'K3703',
            'url-data': 'https://data.udir.no/kl06/v201906/kompetansemaal/K3703',
            tittel: {
              nb: 'utføre fundamentering, oppbygging og komprimering i henhold til tegninger og beskrivelser',
              nn: 'utføre fundamentering, oppbygging og komprimering i henhold til tegninger og beskrivelser',
              en: 'utføre fundamentering, oppbygging og komprimering i henhold til tegninger og beskrivelser'
            }
          },
          arbeidsoppgaver: 'lede morgentrimmen'
        },
        {
          grep: {
            kode: 'K3703',
            'url-data': 'https://data.udir.no/kl06/v201906/kompetansemaal/K3703',
            tittel: {
              nb: 'gjøre rede for innholdet i relevant nasjonalt og internasjonalt regelverk som gjelder kundens rettigheter og plikter, herunder regler om klageadgang',
              nn: 'gjøre rede for innholdet i relevant nasjonalt og internasjonalt regelverk som gjelder kundens rettigheter og plikter, herunder regler om klageadgang',
              en: 'gjøre rede for innholdet i relevant nasjonalt og internasjonalt regelverk som gjelder kundens rettigheter og plikter, herunder regler om klageadgang'
            }
          },
          arbeidsoppgaver: 'lede morgentrimmen'
        },
        {
          grep: {
            kode: 'K3703',
            'url-data': 'https://data.udir.no/kl06/v201906/kompetansemaal/K3703',
            tittel: {
              nb: 'mestre tre ulike typer masseflyttingsmaskiner',
              nn: 'mestre tre ulike typer masseflyttingsmaskiner',
              en: 'mestre tre ulike typer masseflyttingsmaskiner'
            }
          },
          arbeidsoppgaver: 'lede morgentrimmen'
        }
      ]
    },
    year: '2020/2021'
  }

  // Reactive statements
  // Statement to set utplasseringsname, simpelt and greit
  $: content.utplassering.name = getUtplasseringName(content.utplassering.id)

  $: canClickSend = true // Vi prøver oss med innebygget form validation i browser i stedet :)
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
{utplasseringer}
{console.log(utplasseringer)}
<form bind:this={formElement}>
  <!-- Utplassering læreplanen er knyttet til -->
  {#if isCompletedDocument}
    <!-- TODO -->
  {:else if utplasseringsError}
    <section class="error">
      <h4>En feil har oppstått 😩</h4>
      <p>{utplasseringsError}</p>
    </section>
  {:else}
    <section>
      <h3>
        Utplassering for den lokale læreplanen
      </h3>
      {#if !utplasseringer}
        <LoadingSpinner width={"1.5"} />
      {:else}
        <div class="label-select">
          <label for="utplassering">Utplasseringssted</label>
          <select bind:value={content.utplassering.id} id="utplassering">
            <option value="">--Velg utplasseringssted--</option>
            <hr />
            {#each utplasseringer as utplassering}
              <option value="{utplassering.id}">{utplassering.name}</option>
            {/each}
          </select>
        </div>
      {/if}
    </section>
  {/if}

  <!-- Læreplan - dersom det finnes en for utplasseringen allerede, må vi hente den nyeste - har vi den allerede mon tro? Hva om flere lærere gjør det samtidig? Nyeste trumfer uansett -->
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