<script>
  export let entries;

</script>

<style>
  #entries {
    font-family: Consolas, "Andale Mono WT", "Andale Mono", "Lucida Console", "Lucida Sans Typewriter", "DejaVu Sans Mono", "Bitstream Vera Sans Mono", "Liberation Mono", "Nimbus Mono L", Monaco, "Courier New", Courier, monospace;
    font-size: 1em;
  }
</style>

<ul id="entries">
{#each entries as entry}
  <li>{entry}</li>
{/each}
</ul>


<a href="#/">go back</a>
