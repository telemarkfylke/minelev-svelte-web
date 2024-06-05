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

	<h3>Entra Id info</h3>
	<p>Principal name: {data.entraUser.principalName}</p>
	<p>Principal Id: {data.entraUser.principalId}</p>
	<p>Name: {data.entraUser.name}</p>
	<p>Roles: {data.entraUser.roles.join(', ')}</p>

</ul>
