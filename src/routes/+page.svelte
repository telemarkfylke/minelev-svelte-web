<script>
    import { goto } from "$app/navigation"
    import axios from "axios";
    
    const apicall = async () => {
        try {
            const { data } = await axios.get('/api/elever/hahah', { withCredentials: true })
            console.log(data)
            return data
        } catch (error) {
            console.log(error)
            return error.response?.data || error.stack || error.toString()   
        }
    }
    const hallois = async () => {
        return "Hallo alle sammen!"
    }

</script>

<div>
    {#await hallois()}
        <p>Laster...</p>
    {:then result}
        <pre>{JSON.stringify(result)}</pre>
    {:catch error}
        {error.toString()}
    {/await}
</div>

<div>
    {#await apicall()}
        Laster...
    {:then response}
        {JSON.stringify(response)}
    {:catch apierror}
        {apierror.toString()}
    {/await}
</div>

<p>Her er hovedsiden</p>
<div class="color1"></div>
<div class="color2"></div>
<div class="color3"></div>


<p>Hvordan blir dette her seesnenene ut da</p>
<button on:click={() => goto('/tull')}>Klikk på meg for tull</button>
<button on:click={() => goto('/tull')}>Klikk på meg for tull</button>

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

