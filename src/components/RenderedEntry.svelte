<script>
  export let entryId,
    entryText,
    handleUpdateEntryLinks;

  import { MarkupParser } from "../markup/MarkupParser.js";

  let theDiv;

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
</style>

<div class="rendered-entry" bind:this={theDiv} data-entry-id={entryId}>
</div>