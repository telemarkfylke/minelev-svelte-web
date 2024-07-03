<script>
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  /** @type {import('./$types').PageData} */
  export let data

  let student = data.students.find(stud => stud.feidenavnPrefix === $page.params.feidenavnPrefix)
  const accessTo = {
    yff: student.availableDocumentTypes.some(docType => docType.id === 'yff'),
    varsel: student.availableDocumentTypes.some(docType => docType.id.startsWith('varsel')),
    elevsamtale: student.availableDocumentTypes.some(docType => docType.id === 'elevsamtale'),
    notat: student.availableDocumentTypes.some(docType => docType.id === 'notat')
  }
</script>

<div class="actionBar">
  <a class="button" href="{$page.url.pathname}/nyttdokument"><span class="material-symbols-outlined">add</span>Nytt dokument</a>
  <button on:click={() => goto(`${$page.url.pathname}/nyttdokument`)}><span class="material-symbols-outlined">add</span>Nytt dokument</button>
  <button on:click={() => goto(`${$page.url.pathname}/nyttdokument?type=notat`)}><span class="material-symbols-outlined">add</span>Nytt notat</button>
</div>

{#if accessTo.yff || true}
  <div class="documentsBox yff">
    <h3 class="boxTitle"><span class="material-symbols-outlined">list</span>Yrkesfaglig fordypning</h3>
    <div class="boxContent">
      Denne eleven har yrkesfaglig fordypning
    </div>
    <div class="boxAction">
      <button class="filled" on:click={() => goto(`${$page.url.pathname}/nyttdokument`)}><span class="material-symbols-outlined">add</span>Ny læreplan</button>
      <button class="filled" on:click={() => goto(`${$page.url.pathname}/nyttdokument`)}><span class="material-symbols-outlined">add</span>Ny vurdering ellerno</button>
      <button class="filled" on:click={() => goto(`${$page.url.pathname}/nyttdokument`)}><span class="material-symbols-outlined">add</span>???</button>
    </div>
  </div>
{/if}
{#if accessTo.varsel}
  <div class="documentsBox">
    <h3 class="boxTitle"><span class="material-symbols-outlined">list</span>Varselbrev</h3>
    <div class="boxContent">
      Blabala her kommer varsler
    </div>
    <div class="boxAction">
      <button class="filled" on:click={() => goto(`${$page.url.pathname}/nyttdokument`)}><span class="material-symbols-outlined">add</span>Nytt varsel</button>
    </div>
  </div>
{/if}
{#if accessTo.elevsamtale}
  <div class="documentsBox">
    <h3 class="boxTitle"><span class="material-symbols-outlined">list</span>Elevsamtaler</h3>
    <div class="boxContent">
      Blabala her kommer elevsamtaler
    </div>
    <div class="boxAction">
      <button class="filled" on:click={() => goto(`${$page.url.pathname}/nyttdokument`)}><span class="material-symbols-outlined">add</span>Ny elevsamtale</button>
    </div>
  </div>
{/if}
{#if accessTo.notat}
  <div class="documentsBox">
    <h3 class="boxTitle"><span class="material-symbols-outlined">list</span>Notater</h3>
    <div class="boxContent">
      Blabala her kommer notater
    </div>
    <div class="boxAction">
      <button class="filled" on:click={() => goto(`${$page.url.pathname}/nyttdokument`)}><span class="material-symbols-outlined">add</span>Nytt notat</button>
    </div>
  </div>
{/if}

<style>
  .actionBar {
    margin: 1.5rem 0rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .documentsBox {
    padding: 2.5rem 2rem;
    background-color: var(--primary-color-20);
    margin-bottom: 2rem;
  }
  .documentsBox.yff {
    background-color: var(--secondary-color-20);
  }
  .boxTitle {
    margin: 0rem 0rem 2rem 0rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .boxAction {
    display: flex;
    gap: 0.5rem;
    margin: 2rem 0rem 0rem 0rem;
    flex-wrap: wrap;
  }
</style>
