<script>
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";
  import axios from "axios";
  
  export let leader
  export let schoolNumber
  export let refreshFunction

  let errorMessage = ''
  let isAdding = false

  const addLeader = async () => {
    try {
      errorMessage = ''
      isAdding = true
      const { data } = await axios.post('/api/admin/setschoolaccess', { lederPrincipalId: leader.principalId, schoolNumber })
      await refreshFunction()
    } catch (error) {
      console.error(error)
      errorMessage = `Det skjedde en feil ved lagring av tilgang: ${error.toString()}`
    }
    isAdding = false
  }

</script>

<div class="addUser">
  {leader.principalDisplayName} ({leader.principalId})
  {#if isAdding}
    <LoadingSpinner width="1" />
  {:else if leader.hasAccess}
    <div>
      <span style="vertical-align: text-bottom;" class="material-symbols-outlined">check_circle</span>Har tilgang
    </div>
  {:else}
    <button class="link" on:click={addLeader}><span class="material-symbols-outlined">person_add</span>Legg til</button>
  {/if}
  {#if errorMessage}
    <div class="error">{errorMessage}</div>
  {/if}
</div>

<style>
  .addUser {
    display: flex;
    align-items: center;
    padding: 0.2rem 0rem;
    gap: 0.5rem;
  }
  .error {
    color: var(--error-color);
  }
</style>