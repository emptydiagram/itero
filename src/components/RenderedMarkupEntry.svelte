<script lang="ts">
  export let entryId: number,
    entry: FlowyTreeMarkupEntry,
    handleUpdateEntryLinks: (entryId: number, linkedPages: string[]) => void;

  import { MarkupParser } from "../markup/MarkupParser.js";
  import type { FlowyTreeEntry, FlowyTreeMarkupEntry } from "../FlowyTree";

  let theDiv: HTMLElement;

  let entryType: string;
  $: entryType = entry ? entry.type : null;

  let entryText: string
  $: entryText = (function() {
    if (entry) {
      return entry.text;
    }
  })();

  let entryHeadingSize: number
  $: entryHeadingSize = (function() {
    if (entry) {
      return entry.headingSize;
    }
  })();

  $: {
    if (theDiv && entryText) {
      console.log(" ::: theDiv, entryText = ", theDiv, entryText);
      try {
        console.log(" $$ RE, entryText = ", entryText);
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
</style>

<div
  class={`rendered-entry heading-${entryHeadingSize}`}
  bind:this={theDiv}
  data-entry-id={entryId}
  data-testid="rendered-entry">
</div>