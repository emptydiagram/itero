<script>
  export let entryId,
    entryText;

  import { MarkupParser } from "./markup/MarkupParser.js";

  let theDiv;

  $: {
    if (theDiv) {
      try {
        let result = MarkupParser.Text.tryParse(entryText);
        theDiv.innerHTML = result;
      } catch (err) {
        console.log("err parsing: ", err);
        theDiv.innerHTML = entryText;
      }
    }
  }
</script>

<div class="rendered-entry" bind:this={theDiv} data-entry-id={entryId}>
</div>