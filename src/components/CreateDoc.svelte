<script>
  import { docsStore } from "./stores.js";
  import { replace } from 'svelte-spa-router'

  docsStore.createNewDocument();
  replace('/doc/'+$docsStore.currentDocId);
</script>