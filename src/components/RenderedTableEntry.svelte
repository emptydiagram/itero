<script lang="ts">
  export let entryId: number,
    entry: FlowyTreeTableEntry;

  import { MarkupParser } from "../markup/MarkupParser.js";
  import type { FlowyTreeTableEntry } from "../FlowyTree";

  let tableDisplayStrings: string[][];
  $: tableDisplayStrings = (function() {
    let display = entry.table.map(rowCellIds => {
      return rowCellIds.map(cellId => cellId != null ? entry.cells[cellId] : '');
    });
    // return [['TODO1', 'todo 2'], ['TODO 3', 'TODO 4']];
    return display;
  })();

</script>

<style>
.rendered-entry {
  white-space: pre-wrap;
  /* FIXME: to match EntryInput */
  border: 1px solid rgba(1.0, 1.0, 1.0, 0.0);
}

.rendered-entry table {
  border-collapse: collapse;
  border: 1px solid #000;
}

.rendered-entry td {
  border: 1px solid #000;
  min-width: 2em;
}
</style>

<div
  class={`rendered-entry`}
  data-entry-id={entryId}
  data-testid="rendered-entry">

  <table>
  {#each tableDisplayStrings as rowStrings}
    <tr>
      {#each rowStrings as s}
        <td>{s}</td>
      {/each}
    </tr>
  {/each}
  </table>
</div>