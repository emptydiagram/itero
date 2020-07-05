<script>
  export let params = {};

  import { replace } from 'svelte-spa-router'

  import { docsStore } from "./stores.js";

  let pageName = decodeURI(params.name);
  if (pageName in $docsStore.docIdLookupByDocName) {
    let docId = $docsStore.docIdLookupByDocName[pageName];
    replace(`/doc/${docId}`);
  } else {
    console.log("TODO: couldnt find page name in lookup. name = ", params.name);
    console.log("lookup = ", $docsStore.docIdLookupByDocName);
    //pop();
  }
</script>