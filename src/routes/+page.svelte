<script>
    import { goto } from "$app/navigation"
</script>

<!--Material web is accessible Svelte does not understand it-->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<md-outlined-button on:click={() => goto('/tull')}>Klikk på meg for tull</md-outlined-button>
