<script lang="ts">
  export let currEntryType: string;

  function handleEntryMenuTypeClick(type: string) {
    console.log(" ### handleEntryMenuTypeClick: ", type)

    // TODO: call handler to change entry type

  }

  $: markupTextCol1 = currEntryType === 'markup-text' ? '✓' : '';
  $: tableCol1 = currEntryType === 'table' ? '✓' : '';
</script>

<style>
  #entry-menu {
    position: absolute;
    z-index: 10;
    box-shadow: 3px 3px 5px #363636;
    background-color: #fff;
    margin-top: 1.75em;
    margin-left: -2em;
    padding: 0.4em;
    width: 7em;
    font-size: 0.8em;
    line-height: 1em;
  }

  #entry-menu h3 {
    margin-top: 0;
    margin-bottom: 0;
    padding: 0;
    font-size: 0.95em;
  }

  #entry-menu-type {
    border-bottom: 1px solid #333;
    padding-bottom: 0.2em;
    margin-bottom: 0.2em;
  }

  #entry-menu > table {
    width: 100%;
    border: 0;
    border-collapse: collapse;
  }

  #entry-menu > table tr {
    cursor: pointer;
  }

  #entry-menu > table tr:hover {
    background-color: #ffe5bd;
  }

  #entry-menu > table td:nth-child(1) {
    width: 24%;
    text-align: center;
  }

  #entry-menu > table td:nth-child(2) {
    width: 76%;
  }
</style>

<div id="entry-menu">
  <h3>type:</h3>
  <table id="entry-menu-type">
    <tr on:click={() => handleEntryMenuTypeClick('markup-text')}>
      <td>{markupTextCol1}</td>
      <td>text</td>
    </tr>
    <tr on:click={() => handleEntryMenuTypeClick('table')}>
      <td>{tableCol1}</td>
      <td>table</td>
    </tr>
  </table>
  <h3>actions:</h3>
  <table id="entry-menu-actions">
    <tr>
      <td>🗑</td>
      <td>delete entry</td>
    </tr>
  </table>
</div>