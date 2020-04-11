<script>
  export let entries;

</script>

<p>node</p>

<ul>
{#each entries as entry}
  <li>{entry}</li>
{/each}
</ul>


<a href="#/">go back</a>
