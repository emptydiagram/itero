<script>
  import Header from './Header.svelte';
  import { docsStore } from "./stores.js";

  import { replace } from 'svelte-spa-router';
  import Icon from 'svelte-awesome';
  import { faPlus } from '@fortawesome/free-solid-svg-icons';

  function createDoc() {
    // navigate to #/create
    replace("/create-doc");
  }

  $: displayDocs = $docsStore.docsDisplayList.map(id => {
    return $docsStore.documents[id];
  });
</script>

<style>
  #docsList {
    border-collapse: collapse;
    border: 0;
    width: 100%;
  }

  #docsList tr {
    border-top: 1px solid #e9e9e9;
  }

  #docsList td {
    padding: 0.4em;
  }

  #docsListHeader {
    background-color: #e9e9e9;
  }

  #docsListHeader th {
    padding: 0.4em;
  }

  #doc-name-header {
    text-align: left;
    width: 75%;
  }

  .last-updated {
    font-size: 0.9em;
    color: #404040;
    text-align: center;
  }
</style>

<Header isTop={true} />
<button on:click={createDoc}><Icon data={faPlus} scale="1" /></button>

<table id="docsList">
  <tr id="docsListHeader">
    <th id="doc-name-header">name</th>
    <th>last updated</th>
  </tr>
  {#each displayDocs as doc}
    <tr>
      <td>
        <a href={'#/doc/' + doc.id}>{doc.name}</a>
      </td>
      <td class="last-updated">{new Date(doc.lastUpdated).toLocaleString()}</td>
    </tr>
  {/each}
</table>
