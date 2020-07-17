<script>
  import { onMount } from "svelte";
  import Icon from 'svelte-awesome';
  import { faHammer } from '@fortawesome/free-solid-svg-icons';
  import Router from "svelte-spa-router";
  import { push } from "svelte-spa-router";

  import { docsStore } from "./stores.js";
  import Document from "./Document.svelte";
  import Home from "./Home.svelte";
  import Page from "./Page.svelte";
  import CreateDoc from "./CreateDoc.svelte";
  import NotFound from "./NotFound.svelte";
  import DataStore from "../DataStore.js";
  import { DataManager, makeInitContextFromDocuments, makeDoc } from "../data.js";
  import { findChildNodeSerializedCursorPosFromSelection } from "../markup/util.js";

  function findRenderedEntryParent(initNode) {
    let currNode = initNode;
    while (currNode != null
        && !(currNode.className != null && currNode.className.includes("rendered-entry"))) {
      currNode = currNode.parentNode;
    }
    return currNode;
  }

  onMount(() => {
    document.addEventListener('selectionchange', () => {
      let sel = document.getSelection();
      const renderedEntryNode = findRenderedEntryParent(sel.anchorNode);
      if (renderedEntryNode == null) {
        let docHeader = document.getElementById("doc-header");
        if (docHeader) {
          let docName = document.getElementById("doc-name-container");
          let docRefs = document.getElementById("doc-references");
          let actionsBar = document.getElementById("actions-bar");

          if (docHeader.contains(sel.anchorNode) || docName.contains(sel.anchorNode)
              || docRefs.contains(sel.anchorNode) || actionsBar.contains(sel.anchorNode)) {
            docsStore.saveCursorEntryId(null);
          }
        }
        return;
      }

      let colResult = findChildNodeSerializedCursorPosFromSelection(renderedEntryNode, sel, 0);
      let newColId = colResult.pos;

      let newEntryId = parseInt(renderedEntryNode.dataset.entryId);
      docsStore.saveCursor(newEntryId, newColId);
    });
  });


  /*** service and state ***/

  function initDocStoreFromInitContext(initContext) {
    docsStore.init(initContext.documents, initContext.docIdLookupByDocName, initContext.linkGraph);
  }

  let dataMgr = new DataManager(new DataStore);
  let initContext = makeInitContextFromDocuments(dataMgr.getDocuments());
  initDocStoreFromInitContext(initContext);


  /*** event handlers & some reactive variables ***/

  // from https://wiki.developer.mozilla.org/en-US/docs/Glossary/Base64$revision/1597964#The_Unicode_Problem
  function b64EncodeUnicode(str) {
      // first we use encodeURIComponent to get percent-encoded UTF-8,
      // then we convert the percent encodings into raw bytes which
      // can be fed into btoa.
      return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
          function toSolidBytes(match, p1) {
              return String.fromCharCode('0x' + p1);
      }));
  }

  function downloadData() {
    let s = dataMgr.getDocumentsString();
    location.assign("data:application/octet-stream;base64," + b64EncodeUnicode(s));
  }

  function uploadData() {
    let el = document.getElementById('import-docs');
    el.click();
  }

  function handleDocsImport(ev) {
    console.log(" ## handleDocsImport, ev = ", ev);
    console.log(" ## handleDocsImport, this.files = ", this, this.files);
    const filesList = this.files;
    if (filesList.length > 1) {
        // TODO: show error to UI?
      console.log("TODO: multiple files uploaded. show an error message of some kind? is this even possible?");
      return;
    }

    const file = filesList[0];
    file.arrayBuffer().then(buffer => {
      console.log(" ## handleDocsImport, the array buffer = ", buffer);
      // TODO: detect the encoding and use Uint8Array / Uint16Array as appropriate
      let docsStr = String.fromCharCode.apply(null, new Uint8Array(buffer));
      console.log(" ## handleFIleUpload, docsStr = ", docsStr);
      try {
        let newFileUploadObj = JSON.parse(docsStr);

        Object.entries(newFileUploadObj).forEach(([id, doc]) => {
          newFileUploadObj[id] = makeDoc(doc.id, doc.name, doc.lastUpdated, doc.tree.entries, doc.tree.node);
        })

        // TODO: verify that it has the required fields in the object
        let initContext = makeInitContextFromDocuments(newFileUploadObj);
        initDocStoreFromInitContext(initContext);

        push('/');
      } catch (err) {
        // TODO: show error to UI
        console.log("TODO: file is not a valid JSON object, err = ", err);
      }
    });
  }

  // save the latest document
  $: dataMgr.saveDocuments($docsStore.documents);


  const routes = {
    '/': Home,
    '/doc/:id': Document,
    '/create-doc': CreateDoc,
    '/page/:name': Page,
    '*': NotFound,
  }
</script>

<style>
  #import-docs {
    display: none;
  }

  #actions-bar {
    margin-top: 2em;
  }

  #actions-bar > button {
    font-size: 0.9em;
  }
</style>

<Router {routes} />

<div id="actions-bar">
  <Icon data={faHammer} scale="1" />
  <button on:click={downloadData}>export</button>

  <button on:click={uploadData}>import</button>
</div>
<input id="import-docs" type="file" on:change={handleDocsImport} />
