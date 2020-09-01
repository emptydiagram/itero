<script lang="ts">
  export let entryId: number,
    entry: FlowyTreeEntry,
    handleUpdateEntryLinks: (entryId: number, linkedPages: string[]) => void;

  import { MarkupParser } from "../markup/MarkupParser.js";
  import RenderedMarkupEntry from './RenderedMarkupEntry.svelte';
  import type { FlowyTreeEntry, FlowyTreeMarkupEntry } from "../FlowyTree";

  let entryType: string;
  $: entryType = entry ? entry.type : null;

  let entryMarkup: FlowyTreeMarkupEntry;
  $: entryMarkup = entryType === 'markup-text' ? entry as FlowyTreeMarkupEntry : null;
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

{#if entryType === 'markup-text'}
  <RenderedMarkupEntry
    {entryId}
    entry={entryMarkup}
    {handleUpdateEntryLinks}
  />
{:else}
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
{/if}