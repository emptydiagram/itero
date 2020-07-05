<script>
  export let isTop;
</script>
<style>
  header {
    font-size: 1.1em;
    font-weight: bold;
    margin-top: 1.5em;
    border-bottom: 2px solid #666;
    margin-bottom: 0.3em;
    font-family: Consolas, "Andale Mono WT", "Andale Mono", "Lucida Console",
      "Lucida Sans Typewriter", "DejaVu Sans Mono", "Bitstream Vera Sans Mono",
      "Liberation Mono", "Nimbus Mono L", Monaco, "Courier New", Courier,
      monospace;
  }

  .home {
    font-size: 1.2em;
  }
</style>

<header>
  {#if isTop}
    <span class="home">🏠</span>
  {:else}
    <span class="home">
      <a href="#/">🏠</a>
    </span>
    &gt;
  {/if}
</header>