<script>
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  /** @type {import('./$types').PageData} */
  export let data

  // Some bug in MD-web with animation or something forces us to wait for md-select until onmount
  let ready = false

  const chooseTitle = (docType) => {
    console.log("jeg trigga")
    if (!docType) return "Nytt dokument"
    if (docType === "varsel") return 'Nytt varselbrev'
    if (docType === 'elevsamtale') return 'Ny elevsamtale'
    if (docType === 'notat') return 'Nytt notat'
    if (docType === 'yff') return 'Hohiuuui YFF'
  }

  let documentTypeSelect
  let documentType = $page.url.searchParams.get('type') || undefined
  let student = data.students.find(stud => stud.elevnummer === $page.params.elevnummer)

  onMount(() => {
    ready = true
    if (documentType) documentTypeSelect.value = documentType
  }, console.log("jeg ble ødelagt..."))


</script>
  {#if ready}
    <md-outlined-select id="docSelect" label="Velg dokumenttype" bind:this={documentTypeSelect} on:change={() => { documentType = documentTypeSelect.value }}>
      <md-select-option value="varsel">
        <div slot="headline">Varselbrev</div>
      </md-select-option>
      <md-select-option value="elevsamtale">
        <div slot="headline">Elevsamtale</div>
      </md-select-option>
      <md-select-option value="notat">
        <div slot="headline">Notat</div>
      </md-select-option>
    </md-outlined-select>
  {/if}
  <h1 class="md-typescale-headline-medium">{chooseTitle(documentType)}</h1>
  <select>
    <option>
      Hall
    </option>
    <option>
      Ball
    </option>
    <option>
      Hall jijij - jiofjdfd fjdsfkndskpo dsaoijd
    </option>
  </select>

<style>
select {
  font: inherit;
}
</style>