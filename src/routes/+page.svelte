<script>
    import { browser } from "$app/environment";
    import { goto } from "$app/navigation"
    import axios from "axios";
    import { onMount } from "svelte";
    
    export const sleep = (ms) => {
        return new Promise((resolve) => {
            setTimeout(resolve, ms)
        })
    }

    const apicall = async () => {
        try {
            console.log('Kjører apicall')
            await sleep(2000)
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
    {#if browser}
        {#await apicall()}
            Laster...
        {:then response}
            {JSON.stringify(response)}
        {:catch apierror}
            {apierror.toString()}
        {/await}
    {/if}
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
</style>

