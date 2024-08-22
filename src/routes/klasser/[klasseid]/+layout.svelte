<script>
    import { page } from "$app/stores";
    /** @type {import('./$types').PageData} */
    export let data

    let currentClass = data.classes.find(group => group.systemId === $page.params.klasseid)
  
    let student = data.students.find(stud => stud.feidenavnPrefix === $page.params.feidenavnPrefix)
  </script>
  
  {#if !currentClass}
    Du har ikke tilgang på denne klassen
  {:else}
    <div class="classBox">
      <div class="classIcon">
        <span class="material-symbols-outlined">group</span>
      </div>
      <div class="classInfo">
        <h1 class="classTitle">{currentClass.navn}</h1>
        <div class="classes">
          {currentClass.skole}
        </div>
      </div>
    </div>
    <slot></slot>
  {/if}
  
  <style>
    .classBox {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }
    .classIcon {
      width: 4rem;
      height: 4rem;
      padding: 1rem;
      border-radius: 100%;
      background-color: var(--primary-color-40);
    }
    .classIcon span {
      font-size: 4rem;
    }
    .classTitle {
      padding: 0rem;
      margin: 0rem;
    }
    .classes {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
  
    @media only screen and (max-width: 768px) {
      .classIcon {
        width: 2rem;
        height: 2rem;
        padding: 0.5rem;
      }
      .classIcon span {
        font-size: 2rem;
      }
    }
  </style>