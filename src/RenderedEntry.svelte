<script>
  export let entryId,
    entryText;

  import { MarkupParser } from "./markup/MarkupParser.js";

  let theSpan;

  $: {
    if (theSpan) {
      try {
        let result = MarkupParser.Text.tryParse(entryText);
        theSpan.innerHTML = result;
      } catch (err) {
        console.log("err parsing: ", err);
        theSpan.innerHTML = entryText;
      }
    }
  }
</script>

<div class="rendered-entry" bind:this={theSpan} data-entry-id={entryId}>
</div>