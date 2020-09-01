import RenderedEntry from './RenderedEntry.svelte'
import { render, fireEvent } from '@testing-library/svelte'
import type { FlowyTreeMarkupEntry } from '../FlowyTree';

it('it renders plain text', async () => {
  let updateEntryLinksData = {
    entryId: null,
    linkedPages: null,
  };
  let markupEntry: FlowyTreeMarkupEntry = {
    type: 'markup-text',
    text: 'hello!!',
    headingSize: 0
  };
  let props = {
    entryId: 123,
    entry: markupEntry,
    handleUpdateEntryLinks: (entryId, linkedPages) => {
      updateEntryLinksData.entryId = entryId;
      updateEntryLinksData.linkedPages = linkedPages;
    }
  };
  const { getByTestId } = render(RenderedEntry, props);

  const renderedEntry = getByTestId('rendered-entry');

  expect(renderedEntry.textContent).toBe(props.entry.text);

  expect(updateEntryLinksData.entryId).toBe(props.entryId);
  expect(updateEntryLinksData.linkedPages).toHaveLength(0);
});

it('it renders bold and italics', async () => {
  let updateEntryLinksData = {
    entryId: null,
    linkedPages: null,
  };
  let markupEntry: FlowyTreeMarkupEntry = {
    type: 'markup-text',
    text: 'three **blind __mice__**',
    headingSize: 0
  };
  let props = {
    entryId: 7,
    entry: markupEntry,
    handleUpdateEntryLinks: (entryId, linkedPages) => {
      updateEntryLinksData.entryId = entryId;
      updateEntryLinksData.linkedPages = linkedPages;
    }
  };
  const { getByTestId } = render(RenderedEntry, props);

  const renderedEntry = getByTestId('rendered-entry');

  expect(renderedEntry.innerHTML).toBe('three <strong>blind <em>mice</em></strong>');

  expect(updateEntryLinksData.entryId).toBe(props.entryId);
  expect(updateEntryLinksData.linkedPages).toHaveLength(0);
});

it('it renders entries with internal links', async () => {
  let updateEntryLinksData = {
    entryId: null,
    linkedPages: null,
  };
  let markupEntry: FlowyTreeMarkupEntry = {
    type: 'markup-text',
    text: 'humans were capable of reproduction until [[The Orb]] arrived, so',
    headingSize: 0
  };
  let props = {
    entryId: 0,
    entry: markupEntry,
    handleUpdateEntryLinks: (entryId, linkedPages) => {
      updateEntryLinksData.entryId = entryId;
      updateEntryLinksData.linkedPages = linkedPages;
    }
  };
  const { getByTestId } = render(RenderedEntry, props);

  const renderedEntry = getByTestId('rendered-entry');

  expect(renderedEntry.innerHTML).toContain('humans were capable of reproduction until');

  expect(updateEntryLinksData.entryId).toBe(props.entryId);
  expect(updateEntryLinksData.linkedPages).toHaveLength(1);
  expect(updateEntryLinksData.linkedPages).toContain('The Orb');
});