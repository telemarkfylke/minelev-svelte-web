<script>
  import { invalidateAll } from '$app/navigation';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import axios from 'axios';
  import { onMount } from 'svelte';
    import SchoolAccess from './SchoolAccess.svelte';

  /** @type {import('./$types').PageData} */
  export let data

  let errorMessage = ''

  let availableLeaders = 'hei'
  let schoolAccess = null

  onMount(async () => {
    try {
      const { data } = await axios.get(`/api/admin/getschoolaccessandleaders`)
      availableLeaders = data.availableLeaders
      schoolAccess = data.schoolAccess
    } catch (error) {
      errorMessage = `Det skjedde en feil ved henting av tilganger: ${error.toString()}`
    }
  })

  const refresh = async () => {
    try {
      const { data } = await axios.get(`/api/admin/getschoolaccessandleaders`)
      availableLeaders = data.availableLeaders
      schoolAccess = data.schoolAccess
    } catch (error) {
      errorMessage = `Det skjedde en feil ved henting av tilganger: ${error.toString()}`
    }
  }

</script>

{#if data.user.hasAdminRole}
  <h2>Administrator</h2>
  <h3>Leder/Rådgiver-tilganger til skoler</h3>
  <p>Her kan du se og endre tilganger til ledere og rådgivere på skoler</p>
  {#if !Array.isArray(schoolAccess)}
    <LoadingSpinner width="2" />
  {:else}
    <div class="schools">
      {#each schoolAccess as school}
        <SchoolAccess {school} {availableLeaders} refreshFunction={refresh} />
      {/each}
    </div>
  {/if}
{:else}
  Du har ikke tilgang på denne siden
{/if}

<style>

</style>