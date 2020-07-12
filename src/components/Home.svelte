<script>
  import { docsStore } from "./stores.js";

  import { replace } from 'svelte-spa-router';
  import Icon from 'svelte-awesome';
  import { faPlus, faTrashAlt } from '@fortawesome/free-solid-svg-icons';

  function createDoc() {
    // navigate to #/create
    replace("/create-doc");
  }

  function deleteDocs() {
    // FIXME: linear scan non-ideal
    let toDelete = Object.entries($docsStore.docsDisplay)
      .filter(([_docId, docDisplay]) => docDisplay.isSelected)
      .map(([docId, _docDisplay]) => docId);
    const numDocs = n => n == 1 ? "document" : `${n} documents`;
    let confirmMessage = `Are you sure you want to delete the selected ${numDocs(toDelete.length)}?`;
    let confirmResult = window.confirm(confirmMessage);
    if (confirmResult) {
      docsStore.deleteDocs(toDelete);
    }
  }

  function handleDocSelectionToggle(docId, event) {
    docsStore.docsDisplaySetSelection(docId, event.target.checked);
  }

  function sortNameAsc(a, b) {
    a = a.doc;
    b = b.doc;
    if (a.name < b.name) {
      return -1;
    } else if (a.name > b.name) {
      return 1;
    }
    return 0;
  }
  function sortNameDesc(a, b) {
    a = a.doc;
    b = b.doc;
    if (a.name > b.name) {
      return -1;
    } else if (a.name < b.name) {
      return 1;
    }
    return 0;
  }
  function sortLastUpdatedAsc(a, b) {
    a = a.doc;
    b = b.doc;
    if (a.lastUpdated < b.lastUpdated) {
      return -1;
    } else if (a.lastUpdated > b.lastUpdated) {
      return 1;
    }
    return 0;
  }
  function sortLastUpdatedDesc(a, b) {
    a = a.doc;
    b = b.doc;
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
          return sortNameAsc;
      }
    }
    return sortNameAsc;
  })();


  let atLeastOneSelected = false;

  // docsDisplay is Map<string, {docId: string, isSelected: boolean }>
  // returns a {doc: Document, isSelected: boolean }
  $: displayDocs = (function() {
    let newOneSelected = false;
    let displayList = Object.entries($docsStore.docsDisplay).map(([docId, docDisplay]) => {
      newOneSelected = newOneSelected || docDisplay.isSelected;
      return {
        doc: $docsStore.documents[docId],
        isSelected: docDisplay.isSelected,
      };
    }).sort(sortFunction);
    atLeastOneSelected = newOneSelected;
    return displayList;
  })();
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
    display: flex;
    flex-direction: row;
  }

  #top-control-sort {
    margin-left: auto;
  }

  .selected-doc {
    background-color:#e6fcf1
  }
</style>

<div id="top-control">
  <div id="top-control-button-bar">
    <button on:click={deleteDocs} disabled={!atLeastOneSelected}><Icon data={faTrashAlt} scale="1" /></button>
    <button on:click={createDoc}><Icon data={faPlus} scale="1" /></button>
  </div>
  <div id="top-control-sort">
    <select id="sort-select" bind:value={selectedSort}>
      <option value="name-asc" selected>Sort by name ↓</option>
      <option value="name-desc">Sort by name ↑</option>
      <option value="updated-asc">Sort by last updated ↓</option>
      <option value="updated-desc">Sort by last updated ↑</option>
    </select>
  </div>
</div>

<table id="docsList">
  <tr id="docsListHeader">
    <th>
    </th>
    <th id="doc-name-header">name</th>
    <th>last updated</th>
  </tr>
  {#each displayDocs as doc}
    <tr class={doc.isSelected ? "selected-doc" : ""}>
      <td class="doc-select">
        <input type="checkbox" checked={doc.isSelected} on:change={(ev) => handleDocSelectionToggle(doc.doc.id, ev)} />
      </td>
      <td>
        <a href={'#/doc/' + doc.doc.id}>{doc.doc.name}</a>
      </td>
      <td class="last-updated">{new Date(doc.doc.lastUpdated).toLocaleString()}</td>
    </tr>
  {/each}
</table>
