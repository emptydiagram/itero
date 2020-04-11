<script>
  export let displayNodes, createNode, viewNode;

</script>

<p>TOP</p>
<button on:click={createNode}>create new node</button>

<ul>
{#each displayNodes as node}
  <li><a href={"#/"+node.id}>{node.name}</a></li>
  <button on:click={() => viewNode(node.id)}>view node {node.id}</button>
{/each}
</ul>


