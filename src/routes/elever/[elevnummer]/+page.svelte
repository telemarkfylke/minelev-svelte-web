<script>
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  /** @type {import('./$types').PageData} */
  export let data

  let student = data.students.find(stud => stud.elevnummer === $page.params.elevnummer)
</script>

{#if !student}
  Du har ikke tilgang på denne eleven
{:else}
  <div class="studentBox">
    <div class="studentIcon">
      <md-icon>school</md-icon>
    </div>
    <div class="studentInfo">
      {#if student.kontaktlarer}
        <div title="Du er kontaktlærer for denne eleven" class="studentId md-typescale-label-large"><strong>Kontaktlærer</strong></div>
      {/if}
      <h1 class="studentTitle md-typescale-headline-medium">{student.navn}</h1>
      <p class="subinfo">{student.feidenavn.substring(0, student.feidenavn.indexOf('@'))}</p>
      <div class="classes">
        {#each student.klasser as classgroup}
          <a href="/klasser/{classgroup.systemId}">{classgroup.skole.kortkortnavn}:{classgroup.navn}</a>
        {/each}
      </div>
    </div>
  </div>
  <div class="actionBar">
    <md-outlined-button on:click={() => goto(`${$page.url.pathname}/dokumenter/nytt`)}><md-icon slot="icon">add</md-icon>Nytt dokument</md-outlined-button>
    <md-outlined-button on:click={() => goto(`${$page.url.pathname}/dokumenter/nytt`)}><md-icon slot="icon">add</md-icon>Nytt notat</md-outlined-button>
  </div>
  {#if student.yff || true}
    <div class="documentsBox yff">
      <h3 class="boxTitle md-typescale-title-large"><md-icon>list</md-icon>Yrkesfaglig fordypning</h3>
      <div class="boxContent">
        Denne eleven har yrkesfaglig fordypning
      </div>
      <div class="boxAction">
        <md-filled-button on:click={() => goto(`${$page.url.pathname}/dokumenter/nytt`)}><md-icon slot="icon">add</md-icon>Ny læreplan</md-filled-button>
        <md-filled-button on:click={() => goto(`${$page.url.pathname}/dokumenter/nytt`)}><md-icon slot="icon">add</md-icon>Ny vurdering ellerno</md-filled-button>
        <md-filled-button on:click={() => goto(`${$page.url.pathname}/dokumenter/nytt`)}><md-icon slot="icon">add</md-icon>???</md-filled-button>
      </div>
    </div>
  {/if}
  <div class="documentsBox">
    <h3 class="boxTitle md-typescale-title-large"><md-icon>list</md-icon>Varselbrev</h3>
    <div class="boxContent">
      Blabala her kommer varsler
    </div>
    <div class="boxAction">
      <md-filled-button on:click={() => goto(`${$page.url.pathname}/dokumenter/nytt`)}><md-icon slot="icon">add</md-icon>Nytt varsel</md-filled-button>
    </div>
  </div>
  <div class="documentsBox">
    <h3 class="boxTitle md-typescale-title-large"><md-icon>list</md-icon>Elevsamtaler</h3>
    <div class="boxContent">
      Blabala her kommer elevsamtaler
    </div>
    <div class="boxAction">
      <md-filled-button on:click={() => goto(`${$page.url.pathname}/dokumenter/nytt`)}><md-icon slot="icon">add</md-icon>Ny elevsamtale</md-filled-button>
    </div>
  </div>
  <div class="documentsBox">
    <h3 class="boxTitle md-typescale-title-large"><md-icon>list</md-icon>Notater</h3>
    <div class="boxContent">
      Blabala her kommer notater
    </div>
    <div class="boxAction">
      <md-filled-button on:click={() => goto(`${$page.url.pathname}/dokumenter/nytt`)}><md-icon slot="icon">add</md-icon>Nytt notat</md-filled-button>
    </div>
  </div>
{/if}

<style>
  .studentBox {
    display: flex;
    align-items: center;
    gap: 24px;
  }
  .studentIcon {
    --md-icon-size: 64px;
    color: var(--md-sys-color-on-secondary);
    width: 64px;
    height: 64px;
    padding: 16px;
    border-radius: 100%;
    background-color: var(--md-sys-color-secondary);
  }
  .studentTitle {
    padding: 0px;
    margin: 0px;
  }
  .subinfo {
    padding: 0px;
    margin: 0px;
  }
  .classes {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .actionBar {
    margin: 24px 0px;
  }
  .documentsBox {
    padding: 40px 32px;
    background-color: var(--md-sys-color-secondary-container);
    color: var(--md-sys-color-on-secondary-container);
    margin-bottom: 32px;
  }
  .documentsBox.yff {
    background-color: var(--md-sys-color-tertiary-container);
    color: var(--md-sys-color-on-tertiary-container);
  }
  .boxTitle {
    margin: 0px 0px 32px 0px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .boxAction {
    display: flex;
    gap: 8px;
    margin: 32px 0px 0px 0px;
    flex-wrap: wrap;
  }
</style>
