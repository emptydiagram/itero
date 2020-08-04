<script>
  import { docsStore } from "../stores.ts";
  import { replace } from 'svelte-spa-router'

  docsStore.createNewDocument();
  replace('/doc/'+$docsStore.currentDocId);
</script>