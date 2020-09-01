<script lang="ts">
  export let entryId: number,
    entry: FlowyTreeTableEntry;

  import { MarkupParser } from "../markup/MarkupParser.js";
  import type { FlowyTreeTableEntry } from "../FlowyTree";

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
}
</style>

<div
  class={`rendered-entry`}
  data-entry-id={entryId}
  data-testid="rendered-entry">

  <table>
  <tr>
    <td>TODO</td>
    <td>TODO</td>
  </tr>
  <tr>
    <td>TODO</td>
    <td>TODO</td>
  </tr>
  </table>
</div>