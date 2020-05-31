<script>
  export let entryText;

  import { MarkupParser } from "./markup/MarkupParser.js";

  let theSpan;

  $: {
    if (theSpan) {
      try {
        let result = MarkupParser.Text.tryParse(entryText);
        console.log("parse result = ", result);
        theSpan.innerHTML = result;
      } catch (err) {
        console.log("err parsing: ", err);
        theSpan.innerHTML = "ERROR";
      }
    }
  };
</script>

<div bind:this={theSpan}>
</div>