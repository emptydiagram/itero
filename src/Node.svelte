<script>
  export let entries, nodeCursorRowId, nodeCursorColId;
  export let handleSaveNodeEntry,
    handleSaveFullCursor,
    handleGoUp,
    handleGoDown,
    handleSplitEntry,
    handleEntryBackspace,
    handleSaveCursorColId;

  import EntryInput from "./EntryInput.svelte";

  $: atFirstRow = nodeCursorRowId === 0;
  $: atLastRow = nodeCursorRowId === entries.length - 1;
</script>

<style>
  #entries {
    font-family: Consolas, "Andale Mono WT", "Andale Mono", "Lucida Console",
      "Lucida Sans Typewriter", "DejaVu Sans Mono", "Bitstream Vera Sans Mono",
      "Liberation Mono", "Nimbus Mono L", Monaco, "Courier New", Courier,
      monospace;
    font-size: 1em;
  }
</style>

<ul id="entries">
  {#each entries as entry, i}
    <li>
      <EntryInput
        entryId={i}
        entryValue={entry}
        {nodeCursorRowId}
        {nodeCursorColId}
        {atFirstRow}
        {atLastRow}
        {handleSaveNodeEntry}
        {handleSaveFullCursor}
        {handleGoUp}
        {handleGoDown}
        {handleSplitEntry}
        {handleEntryBackspace}
        {handleSaveCursorColId} />
    </li>
  {/each}
</ul>
