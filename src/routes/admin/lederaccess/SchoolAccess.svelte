<script>
  import AddedUser from "./AddedUser.svelte";
  import AvailableUser from "./AvailableUser.svelte";

  export let school
  export let availableLeaders
  export let refreshFunction

  let isOpen = false
  let addMenuOpen = false

  let searchValue = ''

  const searchForLeader = (searchValue, leaderlist) => {
    // !school.accessEntries.some(entry => entry.principalId === leader.principalId) && 
    return leaderlist.filter(leader => leader.principalDisplayName.toLowerCase().startsWith(searchValue.toLowerCase())).slice(0, 10).map(leader => { return { ...leader, hasAccess: school.accessEntries.some(entry => entry.principalId === leader.principalId)} })
  }

</script>

<button class="blank school" on:click={() => isOpen = !isOpen}><span class="material-symbols-outlined">{isOpen ? 'arrow_drop_down' : 'arrow_right'}</span><span style="{isOpen ? 'font-weight: bold;' : ''}">{school.name}</span><span class="material-symbols-outlined">group</span>{school.accessEntries.length}</button>
{#if isOpen}
  <div class="accessEntries">
    <div class="addMenu">
      <div><strong>Legg til bruker for {school.name}</strong></div>
      <input style="width: 25rem;" bind:value={searchValue} type="text" placeholder="Søk etter bruker for å legge til" />
      {#if searchValue.length > 2}
        {#if searchForLeader(searchValue, availableLeaders).length === 0}
          <div><i>Ingen brukere funnet med det navnet...</i></div>
        {:else}
          {#each searchForLeader(searchValue, availableLeaders) as leader}
            <AvailableUser {leader} schoolNumber={school.schoolNumber} {refreshFunction} />
          {/each}
        {/if}
      {:else}
        <div><i>Skriv minst 3 tegn for å søke</i></div>
      {/if}
    </div>
    <div><strong>Brukere med tilgang til {school.name}</strong></div>
    {#if school.accessEntries.length === 0}
      <div>Ingen brukere her gitt...</div>
    {:else}
      {#each school.accessEntries as accessEntry}
        <AddedUser {accessEntry} schoolNumber={school.schoolNumber} {refreshFunction} />
      {/each}
    {/if}
  </div>
{/if}

<style>
  .school {
    font-size: 1.2rem;
  }
  .school:hover {
    font-weight: bold;
  }
  .addMenu {
    padding-bottom: 1rem;
  }
  .addUser {
    display: flex;
    align-items: center;
    padding: 0.2rem 0rem;
    gap: 0.5rem;
  }
  .accessEntries {
    padding: 0rem 0rem 2rem 2rem;
  }

</style>