<script>
  import { invalidateAll } from '$app/navigation';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import axios from 'axios';
  import { onMount } from 'svelte';

  /** @type {import('./$types').PageData} */
  export let data

  let errorMessage = ''

  let availableLeaders = null
  let availableTeachers = null
  let schoolAccess = null

  let isLoading

  onMount(async () => {
    try {
      const { data } = await axios.get(`/api/admin/getavailableusers`)
      console.log(data)
      availableLeaders = data.availableLeaders
      availableTeachers = data.availableTeachers
    } catch (error) {
      errorMessage = `Det skjedde en feil ved henting av brukere: ${error.toString()}`
    }
  })

  let teacherSearchValue = ''
  let leaderSearchValue = ''

  const searchForUser = (searchValue, userlist) => {
    // !school.accessEntries.some(entry => entry.principalId === leader.principalId) && 
    return userlist.filter(user => user.principalDisplayName.toLowerCase().startsWith(searchValue.toLowerCase())).slice(0, 10)
  }

  const setImpersonation = async (target, targetName, type) => {
    errorMessage = ''
    isLoading = true
    try {
      if (!target) throw new Error('Du må velge en bruker')
      console.log(target, type)
      const { data } = await axios.post('/api/admin/setimpersonation', { target, targetName, type })
      isLoading = false
      invalidateAll()
      return data
    } catch (error) {
      console.log(error.response?.data)
      errorMessage = error.response?.data || error.toString()
    }
    isLoading = false
  }

  const deleteImpersonation = async () => {
    isLoading = true
    errorMessage = ''
    try {
      const { data } = await axios.delete('/api/admin/deleteimpersonation')
      isLoading = false
      invalidateAll()
      return data
    } catch (error) {
      console.log(error)
      errorMessage = error.response?.data || error.toString()
    }
    isLoading = false
  }

</script>

{#if data.user.hasAdminRole}
  <h2>Administrator</h2>
  <h3>Logg inn som en annen bruker for feilsøking</h3>
  <p>Merk at dette logges</p>

  {#if data.user.impersonating}
    Du er logget inn som <strong>{data.user.impersonating.targetName || data.user.impersonating.target}</strong> med rollen <strong>{data.user.impersonating.type}</strong>
    <button on:click={deleteImpersonation}>Fjern innloggingen som {data.user.impersonating.targetName || data.user.impersonating.target}</button>
    <br>
  {/if}

  {#if errorMessage}
    <div class="error">{JSON.stringify(errorMessage)}</div>
  {:else if isLoading}
    <LoadingSpinner width="2" />
  {:else}
    {#if !Array.isArray(availableLeaders)}
      <LoadingSpinner width="2" />
    {:else}
      <div class="teacherImpersonate">
        <div><strong>Søk etter en lærer du trenger å logge inn som</strong></div>
        <input style="width: 25rem;" bind:value={teacherSearchValue} type="text" placeholder="Skriv inn et navn" />
        {#if teacherSearchValue.length >= 0}
          {#if searchForUser(teacherSearchValue, availableTeachers).length === 0}
            <div><i>Ingen brukere funnet med det navnet...</i></div>
          {:else}
            {#each searchForUser(teacherSearchValue, availableTeachers) as user}
              <div class="user">
                {user.principalDisplayName} ({user.principalId})
                <button class="link" on:click={() => { setImpersonation(user.principalId, user.principalDisplayName, 'larer') } }><span class="material-symbols-outlined">supervisor_account</span>Logg inn som</button>
              </div>
            {/each}
          {/if}
        {:else}
          <div><i>Skriv minst 0 tegn for å søke</i></div>
        {/if}
      </div>
    {/if}
  {/if}
{:else}
  Du har ikke tilgang på denne siden
{/if}

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