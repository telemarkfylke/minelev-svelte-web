<script>
    import { goto } from "$app/navigation"
    
</script>

<!--Material web is accessible Svelte does not understand it-->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<p>Her er hovedsiden</p>
<div class="color1"></div>
<div class="color2"></div>
<div class="color3"></div>


<p>Hvordan blir dette her seesnenene ut da</p>
<md-outlined-button on:click={() => goto('/tull')}>Klikk på meg for tull</md-outlined-button>
<md-filled-button on:click={() => goto('/tull')}>Klikk på meg for tull</md-filled-button>

<style>
    .color1 {
        background-color: rgb(25, 99, 112);
        width: 100px;
        height: 100px;
    }
    .color2 {
        background-color: rgb(26, 51, 112);
        width: 100px;
        height: 100px;
    }
    .color3 {
        background-color: rgb(0, 82, 96);
        width: 100px;
        height: 100px;
    }
</style>

