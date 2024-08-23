<script>
  import { page } from "$app/stores";
  /** @type {import('./$types').PageData} */
  export let data

  let student = data.students.find(stud => stud.feidenavnPrefix === $page.params.feidenavnPrefix)
</script>

{#if !student}
  Du har ikke tilgang på denne eleven
{:else}
  <div class="studentBox">
    <div class="studentIcon">
      <span class="material-symbols-outlined">school</span>
    </div>
    <div class="studentInfo">
      {#if student.kontaktlarer}
        <div title="Du er kontaktlærer for denne eleven" class="studentId"><strong>Kontaktlærer</strong></div>
      {/if}
      <h1 class="studentTitle">{student.navn}</h1>
      <p class="subinfo">{student.feidenavnPrefix}</p>
      <div class="classes">
        {#each student.klasser as classgroup}
          <a href="/klasser/{classgroup.systemId}">{classgroup.skole.kortkortnavn}:{classgroup.navn}</a>
        {/each}
      </div>
    </div>
  </div>
  <slot></slot>
{/if}

<style>
  .studentBox {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }
  .studentIcon {
    width: 4rem;
    height: 4rem;
    padding: 1rem;
    border-radius: 100%;
    background-color: var(--primary-color-40);
  }
  .studentIcon span {
    font-size: 4rem;
  }
  .studentTitle {
    padding: 0rem;
    margin: 0rem;
  }
  .subinfo {
    padding: 0rem;
    margin: 0rem;
  }
  .classes {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  @media only screen and (max-width: 768px) {
    .studentIcon {
      width: 2rem;
      height: 2rem;
      padding: 0.5rem;
    }
    .studentIcon span {
      font-size: 2rem;
    }
    .classes {
      display: none;
    }
  }
</style>