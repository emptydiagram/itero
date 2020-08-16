
interface DocumentLinkEntries {
  [entryId: number]: {
    id: number;
    text: string;
    headingSize: number;
  }
}
type DocumentLinksDisplayInfo = {
  id: string;
  name: string;
  entries: DocumentLinkEntries;
}

export interface BacklinksInfo {
  [docId: string]: DocumentLinksDisplayInfo
}