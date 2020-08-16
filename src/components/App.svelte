<script>
  import { onMount } from "svelte";
  import Icon from 'svelte-awesome';
  import { faHammer } from '@fortawesome/free-solid-svg-icons';
  import Router from "svelte-spa-router";
  import { push } from "svelte-spa-router";

  import { docsStore } from "../stores.ts";
  import Document from "./Document.svelte";
  import Home from "./Home.svelte";
  import Page from "./Page.svelte";
  import CreateDoc from "./CreateDoc.svelte";
  import NotFound from "./NotFound.svelte";
  import DataStore from "../DataStore.js";
  import { DataManager, makeInitContextFromDocuments, makeDoc } from "../data.ts";
  import { findChildNodeSerializedCursorPosFromSelection } from "../markup/util.js";

  function stringIncludesOne(str, values) {
    for (var i = 0; i < values.length; i++) {
      if (str.includes(values[i])) {
        return values[i];
      }
    }
    return false;
  }

  // TODO: findDocContentElement
  function findDocContentElement(initNode) {
    let currNode = initNode;
    let currLocatedClassName;
    let classNames = ["rendered-entry", "icon-container", "entry-display"];

    function calcCurrLocatedClassName() {
      currLocatedClassName = stringIncludesOne(currNode.className, classNames);
      return currLocatedClassName;
    }


    // while:
    //  - node isnt null
    //  - and either:
    //     - no className (how?)
    //     - or, className doesn't include "rendered-entry"
    // do:
    //  - currNode <- currNode's parent
    while (currNode
        && (!currNode.className || !currNode.className.includes || !calcCurrLocatedClassName())) {
      currNode = currNode.parentNode;
      if (currNode && currNode.className && currNode.className.includes) {
        calcCurrLocatedClassName();
      }
    }
    return {
      node: currNode,
      className: currLocatedClassName,
    }
  }

  onMount(() => {
    document.addEventListener('selectionchange', () => {
      let sel = document.getSelection();

      if (sel.anchorNode.className && sel.anchorNode.className.includes && sel.anchorNode.className.includes("entry-display")) {
        // FIXME: tee hee, I don't know why these selectionchange events on entry-display are occurring
        return;
      }

      let docHeader = document.getElementById("doc-header");
      if (!docHeader) {
        // TODO: find a better way to detect whether we're on doc page
        return;
      }

      let docContent = document.getElementById("doc-content");

      let autocomplete = document.getElementById("doc-name-autocomplete");
      if (autocomplete && autocomplete.contains(sel.anchorNode)) {
        // clicked on autocomplete, ignore
        return;
      }

      if (!docContent.contains(sel.anchorNode)) {
        docsStore.saveCursor(null, null, null);
        return;
      }

      let docContentResult = findDocContentElement(sel.anchorNode);
      if (docContentResult.className === "icon-container") {
        docsStore.saveCursor(null, null, null);
        return;
      }

      if (docContentResult.className === "rendered-entry") {
        const renderedEntryNode = docContentResult.node;
        let colResult = findChildNodeSerializedCursorPosFromSelection(renderedEntryNode, sel, 0);
        let newCursorPos = colResult.pos;

        let newEntryId = parseInt(renderedEntryNode.dataset.entryId);
        docsStore.saveCursor(newEntryId, newCursorPos, newCursorPos);
        return;
      }

      // if we've made it here, then it's (a) inside #doc-content, but (b) outside an .entry-display
      if (!docContentResult.node) {
        docsStore.saveCursor(null, null, null);
        return;
      }

      docsStore.saveCursor(parseInt(docContentResult.node.dataset.entryId), 0, 0);
    });
  });


  /*** service and state ***/

  function initDocStoreFromInitContext(initContext) {
    docsStore.init(initContext.documents, initContext.docIdLookupByDocName, initContext.linkGraph, initContext.docNameInvIndex);
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
          function toSolidBytes(_match, p1) {
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
      // TODO: detect the encoding and use Uint8Array / Uint16Array as appropriate
      let docsStr = new TextDecoder().decode(new Uint8Array(buffer));
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

  main {
    font-size: 1.25em;
  }
</style>

<main>
  <Router {routes} />
</main>

<div id="actions-bar">
  <Icon data={faHammer} scale="1" />
  <button on:click={downloadData}>export</button>

  <button on:click={uploadData}>import</button>
</div>
<input id="import-docs" type="file" on:change={handleDocsImport} />
