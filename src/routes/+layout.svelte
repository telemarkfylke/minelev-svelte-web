<script>
  import '../app.css' // Add global css (and make it hot reload)
  import { goto } from "$app/navigation"
</script>

<!--Material web is accessible Svelte does not understand it-->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->



<h1>Halla</h1>
<md-filled-button on:click={() => goto('/')}>Klikk på meg for hjem</md-filled-button>

<h1>Velkommen!</h1>
<div class="content">
  <slot></slot>
</div>