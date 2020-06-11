// Background: This markup:
//
// ```
// xyz **abc [def](foo) ghi** jkl
// ```
//
// renders to:
//
// ```
//  xyz <strong>abc <a href="foo">def</a> ghi</strong> jkl
// ```
//
// Problem: given renderedEntryNode child nodes below, and a pointer `anchorNode`
// to some text element that was clicked on, find the appropriate cursor position
// within the associated markup text
//
//  - "xyz "
//  - <strong>
//     - "abc "
//     - <a href="foo">
//        - "def"
//     - " ghi"
//  - " jkl"
//
// e.g.: given a pointer to "def", return 11 (preceded by "xyz **abc [")
// e.g.: given a pointer to " ghi", return 20 (preceded by "xyz **abc [def](foo)")
//
// returns { found: boolean, pos: number }
export function findChildNodeSerializedCursorPosFromSelection(n, sel, pos) {
  if (n.nodeType !== Node.TEXT_NODE && n.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }
  if (n.nodeType === Node.TEXT_NODE) {
    if (n === sel.anchorNode) {
      return { found: true, pos: pos + sel.anchorOffset };
    } else {
      return { found: false, pos: pos + n.textContent.length }
    }
  }

  if (n.localName === "mjx-container") {
    // pos + 3 is a lower bound. to get the
    // true length we'd need to know the size of the LaTeX substring
    return { found: false, pos: pos + 2 + n.dataset.original.length}
  }

  if (n.localName === "strong" || n.localName === "em") {
    pos += 2;
  } else if (n.localName === "a") {
    if (n.dataset.markupLinkType === "internal") {
      pos += 2;
    } else if (n.dataset.markupLinkType !== "auto") {
      pos += 1;
    }
  }

  let currNode = n;
  let childNodes = currNode.childNodes;
  for(var i = 0; i < childNodes.length; ++i) {
    let result = findChildNodeSerializedCursorPosFromSelection(childNodes[i], sel, pos);
    if (result.found) {
      return result;
    }
    pos = result.pos;
  }

  if (n.localName === "strong" || n.localName === "em") {
    pos += 2;
  } else if (n.localName === "a") {
    if (n.dataset.markupLinkType === "internal") {
      pos += 2;
    } else if (n.dataset.markupLinkType !== "auto") {
      pos += n.getAttribute("href").length + 3;
    }
  }

  return { found: false, pos: pos };
}