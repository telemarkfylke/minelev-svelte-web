<script>
    import { goto } from "$app/navigation"
    import axios from "axios";
    import { onMount } from "svelte";
    
    const apicall = async () => {
        try {
            const { data } = await axios.get('/api/elever/hahah')
            console.log(data)
            return data
        } catch (error) {
            console.log('EORROROROROROROROROROR')
            console.log(error.toString())

            return error.response?.data || error.stack || error.toString()   
        }
    }
    const hallois = async () => {
        return "Hallo alle sammen!"
    }

    let someButtonData

    const updateButtonData = async () => {
        try {
            const { data } = await axios.get('/api/elever/hahah')
            someButtonData = data.user?.principalName
        } catch (error) {
            console.log(error)
            someButtonData = error.response?.data || error.stack || error.toString()
        }
    }

    let someMountData

    onMount(async () => {
        console.log('Mounta!')
        try {
            const { data } = await axios.get('/api/elever/hahah')
            someMountData = data.user?.name
        } catch (error) {
            console.log(error)
            someMountData = error.response?.data || error.stack || error.toString()
        }
    })



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


<p>Hvordan blir dette her seesnenene ut da</p>
<button on:click={updateButtonData}>With credentials</button>
{#if someButtonData}
    {JSON.stringify(someButtonData)}
{/if}

<div>
    <p>Litt data som kommer på onmount</p>
    {#if someMountData}
        {JSON.stringify(someMountData)}
    {/if}
</div>

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

