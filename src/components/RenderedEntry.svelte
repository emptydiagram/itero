<script lang="ts">
  export let entryId: number,
    entry: FlowyTreeEntry,
    handleUpdateEntryLinks: (entryId: number, linkedPages: string[]) => void;

  import { MarkupParser } from "../markup/MarkupParser.js";
  import type { FlowyTreeEntry, FlowyTreeMarkupEntry } from "../FlowyTree";

  let theDiv: HTMLElement;

  let entryType: string;
  $: entryType = entry ? entry.type : null;

  let entryText: string
  $: entryText = (function() {
    if (entry && entry.type === 'markup-text') {
      return (entry as FlowyTreeMarkupEntry).text;
    }
  })();

  let entryHeadingSize: number
  $: entryHeadingSize = (function() {
    if (entry && entry.type === 'markup-text') {
      return (entry as FlowyTreeMarkupEntry).headingSize;
    }
  })();

  $: {
    if (theDiv && entryText) {
      try {
        let parseResult = MarkupParser.Text.tryParse(entryText);
        theDiv.innerHTML = parseResult.html;
        handleUpdateEntryLinks(entryId, parseResult.linkedPages);
      } catch (err) {
        // TODO: display error somehow?
        console.log("err parsing: ", err);
        theDiv.innerHTML = entryText;
      }
    }
  }

</script>

<style>
.rendered-entry {
  white-space: pre-wrap;
  /* FIXME: to match EntryInput */
  border: 1px solid rgba(1.0, 1.0, 1.0, 0.0);
}

.heading-1 {
  font-size: 1.45em;
  font-weight: bold;
}

.heading-2 {
  font-size: 1.30em;
  font-weight: bold;
}

.heading-3 {
  font-size: 1.15em;
  font-weight: bold;
}

.heading-0 {
  font-size: 1em;
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
<div
  class={`rendered-entry heading-${entryHeadingSize}`}
  bind:this={theDiv}
  data-entry-id={entryId}
  data-testid="rendered-entry">
</div>
{:else}
<div
  class={`rendered-entry heading-${entryHeadingSize}`}
  bind:this={theDiv}
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