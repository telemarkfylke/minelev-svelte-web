<script>
    import { page } from "$app/stores";
    /** @type {import('./$types').PageData} */
    export let data
</script>


<h3>Dette er dokumentene til eleven</h3>
<p>Elevnummer: {$page.params.dokumentid}</p>
Her er dokumentet til eleveineenenene
Hallo
{JSON.stringify(data)}