import { Machine } from 'xstate';

export default () => {

  const docStates = {
    states: {
      docTitle: {
        on: {},
      }
    },
  }

  const flowikiStates = {
    initial: 'top',
    states: {
      top: {
        on: {
          CREATE_DOC: {
            target: ['document.docTitle.editing'],
          },
        },
      },
      document: {
        on: {
        },
        type: 'parallel',
        ...docStates
      }
    }
  };

  return Machine({
    id: 'flowiki',
    initial: 'flowiki',
    states: {
      flowiki: {
        on: {
          NAVIGATE: {
            target: 'flowiki.document',
          },
          GO_HOME: {
            target: 'flowiki.top',
          },
          IMPORT_DOCS: {
            target: 'flowiki.top',
          }
        },
        ...flowikiStates
      }
    }

  });
};
