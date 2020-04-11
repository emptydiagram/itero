<script>
  export let entries, goBack;

</script>

<p>node</p>

<ul>
{#each entries as entry}
  <li>{entry}</li>
{/each}
</ul>


<button on:click={goBack}>go back</button>
