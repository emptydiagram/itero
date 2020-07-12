<script>
  import { docsStore } from "./stores.js";

  import { replace } from 'svelte-spa-router';
  import Icon from 'svelte-awesome';
  import { faPlus, faTrashAlt } from '@fortawesome/free-solid-svg-icons';

  function createDoc() {
    // navigate to #/create
    replace("/create-doc");
  }

  function sortNameAsc(a, b) {
    if (a.name < b.name) {
      return -1;
    } else if (a.name > b.name) {
      return 1;
    }
    return 0;
  }
  function sortNameDesc(a, b) {
    if (a.name > b.name) {
      return -1;
    } else if (a.name < b.name) {
      return 1;
    }
    return 0;
  }
  function sortLastUpdatedAsc(a, b) {
    if (a.lastUpdated < b.lastUpdated) {
      return -1;
    } else if (a.lastUpdated > b.lastUpdated) {
      return 1;
    }
    return 0;
  }
  function sortLastUpdatedDesc(a, b) {
    if (a.lastUpdated > b.lastUpdated) {
      return -1;
    } else if (a.lastUpdated < b.lastUpdated) {
      return 1;
    }
    return 0;
  }

  let selectedSort = null;

  $: sortFunction = (function() {
    if (selectedSort) {
      switch (selectedSort) {
        case "name-asc":
          return sortNameAsc;
        case "name-desc":
          return sortNameDesc;
        case "updated-asc":
          return sortLastUpdatedAsc;
        case "updated-desc":
          return sortLastUpdatedDesc;
        default:
          console.log("TODO: sort selection has an unrecognized value");
          return null;
      }
    }
    return sortNameAsc;
  })();

  $: displayDocs = $docsStore.docsDisplayList.map(id => {
    return $docsStore.documents[id];
  }).sort(sortFunction);
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

  .doc-select {
    text-align: center;
  }

  #top-control {
    margin-top: 1em;
  }
</style>

<div id="top-control">
  <button on:click={() => null}><Icon data={faTrashAlt} scale="1" /></button>
  <button on:click={createDoc}><Icon data={faPlus} scale="1" /></button>
  <select id="sort-select" bind:value={selectedSort}>
    <option value="name-asc" selected>Sort by name ↓</option>
    <option value="name-desc">Sort by name ↑</option>
    <option value="updated-asc">Sort by last updated ↓</option>
    <option value="updated-desc">Sort by last updated ↑</option>
  </select>
</div>

<table id="docsList">
  <tr id="docsListHeader">
    <th>
      <input type="checkbox" />
    </th>
    <th id="doc-name-header">name</th>
    <th>last updated</th>
  </tr>
  {#each displayDocs as doc}
    <tr>
      <td class="doc-select">
        <input type="checkbox" />
      </td>
      <td>
        <a href={'#/doc/' + doc.id}>{doc.name}</a>
      </td>
      <td class="last-updated">{new Date(doc.lastUpdated).toLocaleString()}</td>
    </tr>
  {/each}
</table>
