<script>
  export let displayNodes, createNode;

</script>

<p>TOP</p>
<button on:click={createNode}>create new node</button>

<ul>
{#each displayNodes as node}
  <li><a href={"#/"+node.id}>{node.name}</a></li>
{/each}
</ul>


