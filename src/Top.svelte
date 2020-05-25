<script>
  export let displayDocs, createDoc;
</script>

<style>
  #docsList {
    border-top: 1px solid #000;
    padding: 0;
    list-style-type: none;
  }

  #docsList li {
    padding: 0.5em 0;
    border-bottom: 1px solid #000;
  }
</style>

<button on:click={createDoc}>create new doc</button>

<ul id="docsList">
  {#each displayDocs as doc}
    <li>
      <a href={'#/' + doc.id}>{doc.name}</a>
    </li>
  {/each}
</ul>
