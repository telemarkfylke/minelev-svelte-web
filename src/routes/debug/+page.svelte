<script>
    import { env } from '$env/dynamic/public';


	/** @type {import('./$types').PageData} */
	export let data

	console.log(env)

</script>


<h1>Dine headers</h1>
<ul>
	{#each data.headers as header}
		<li><strong>{header.name}: </strong>{header.value}</li>
	{/each}
</ul>
