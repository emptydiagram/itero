import { Machine } from 'xstate';

export default () => {

  const docStates = {
    states: {
      docTitle: {
        on: {},
        initial: 'displaying',
        states: {
          editing: {
            on: {
              SAVE_DOC_NAME: {
                target: 'displaying',
              },
              CANCEL_EDITING_NAME: {
                target: 'displaying',
              },
            },
          },
          displaying: {
            on: {
              START_EDITING_NAME: {
                target: 'editing',
              },
            }
          }
        }
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
