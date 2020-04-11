<script>
  export let displayNodes, createNode, viewNode;

</script>

<p>TOP</p>
<button on:click={createNode}>create new node</button>

<ul>
{#each displayNodes as node, i}
  <li>{node}</li>
  <button on:click={() => viewNode(i+1)}>view node {i}</button>
{/each}
</ul>


