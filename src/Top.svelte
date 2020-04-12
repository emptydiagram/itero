<script>
  export let displayNodes, createNode;

</script>

<style>
  #nodesList {
    border-top: 1px solid #000;
    padding: 0;
    list-style-type: none;
  }

  #nodesList li {
    padding: 0.5em 0;
    border-bottom: 1px solid #000;
  }
</style>

<button on:click={createNode}>create new node</button>

<ul id="nodesList">
{#each displayNodes as node}
  <li><a href={"#/"+node.id}>{node.name}</a></li>
{/each}
</ul>


