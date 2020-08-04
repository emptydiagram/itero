<script lang="ts">
  export let entryId: number,
    entryText: string,
    entryHeadingSize: number,
    handleUpdateEntryLinks: (entryId: number, linkedPages: string[]) => void;

  import { MarkupParser } from "../markup/MarkupParser.js";

  let theDiv: HTMLElement;

  $: {
    if (theDiv) {
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
}

.heading-1 {
  font-size: 1.2em;
  font-weight: bold;
}

.heading-2 {
  font-size: 1.13em;
  font-weight: bold;
}

.heading-3 {
  font-size: 1.06em;
  font-weight: bold;
}

.heading-0 {
  font-size: 1em;
}
</style>

<div class={`rendered-entry heading-${entryHeadingSize}`} bind:this={theDiv} data-entry-id={entryId} data-testid="rendered-entry">
</div>