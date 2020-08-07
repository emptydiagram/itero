import RenderedEntry from './RenderedEntry.svelte'
import { render, fireEvent } from '@testing-library/svelte'

it('it renders plain text', async () => {
  let updateEntryLinksData = {
    entryId: null,
    linkedPages: null,
  };
  let props = {
    entryId: 123,
    entryText: 'hello!!',
    entryHeadingSize: 0,
    handleUpdateEntryLinks: (entryId, linkedPages) => {
      updateEntryLinksData.entryId = entryId;
      updateEntryLinksData.linkedPages = linkedPages;
    }
  };
  const { getByTestId } = render(RenderedEntry, props);

  const renderedEntry = getByTestId('rendered-entry');

  expect(renderedEntry.textContent).toBe(props.entryText);

  expect(updateEntryLinksData.entryId).toBe(props.entryId);
  expect(updateEntryLinksData.linkedPages).toHaveLength(0);
});

it('it renders bold and italics', async () => {
  let updateEntryLinksData = {
    entryId: null,
    linkedPages: null,
  };
  let props = {
    entryId: 7,
    entryText: 'three **blind __mice__**',
    entryHeadingSize: 0,
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
  let props = {
    entryId: 0,
    entryText: 'humans were capable of reproduction until [[The Orb]] arrived, so',
    entryHeadingSize: 0,
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