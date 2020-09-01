<script lang="ts">
  export let entryId: number,
    entry: FlowyTreeEntry,
    handleUpdateEntryLinks: (entryId: number, linkedPages: string[]) => void;

  import { MarkupParser } from "../markup/MarkupParser.js";
  import RenderedMarkupEntry from './RenderedMarkupEntry.svelte';
  import RenderedTableEntry from './RenderedTableEntry.svelte';
  import type { FlowyTreeEntry, FlowyTreeMarkupEntry, FlowyTreeTableEntry } from "../FlowyTree";

  let entryType: string;
  $: entryType = entry ? entry.type : null;

  let entryMarkup: FlowyTreeMarkupEntry;
  $: entryMarkup = entryType === 'markup-text' ? entry as FlowyTreeMarkupEntry : null;

  let entryTable: FlowyTreeTableEntry;
  $: entryTable = entryType === 'table' ? entry as FlowyTreeTableEntry : null;
</script>

<style>
</style>

{#if entryType === 'markup-text'}
  <RenderedMarkupEntry
    {entryId}
    entry={entryMarkup}
    {handleUpdateEntryLinks}
  />
{:else}
  <RenderedTableEntry
    {entryId}
    entry={entryTable}
    {handleUpdateEntryLinks}
  />
{/if}