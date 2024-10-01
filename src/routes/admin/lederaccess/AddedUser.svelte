<script>
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";
  import axios from "axios";
  
  /**
   * @type {import('../../../lib//minelev-api/leder-access').SchoolAccessEntry}
   */
  export let accessEntry
  export let schoolNumber
  export let refreshFunction

  let errorMessage = ''
  let isDisabling = false

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

  const removeLeader = async () => {
    try {
      errorMessage = ''
      isDisabling = true
      const { data } = await axios.post('/api/admin/disableschoolaccess', { lederPrincipalId: accessEntry.principalId, schoolNumber })
      await refreshFunction()
    } catch (error) {
      console.error(error)
      errorMessage = `Det skjedde en feil ved fjerning av tilgang: ${error.toString()}`
    }
    isDisabling = false
  }

</script>

<div class="user">
  {#if isDisabling}
    {accessEntry.principalName} ({accessEntry.principalId})
    <LoadingSpinner width="1" />
  {:else}
    {accessEntry.principalName} ({accessEntry.principalId})
    {#if !accessEntry.hasLeaderRole}
      <div style="display: flex; align-items: center; color: var(--warning-color);">
        <span class="material-symbols-outlined">warning</span><span>Brukeren mangler leder-rollen i EntraId og har ikke tilgang</span>
      </div>
    {/if}
    <button class="link" on:click={removeLeader}><span class="material-symbols-outlined">person_remove</span>Fjern tilgang</button>
    {#if errorMessage}
      <div class="error">{errorMessage}</div>
    {/if}
  {/if}
</div>

<style>
  .user {
    display: flex;
    align-items: center;
    padding: 0.2rem 0rem;
    gap: 0.5rem;
  }
  .error {
    color: var(--error-color);
  }
</style>