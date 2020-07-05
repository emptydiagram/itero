import { Machine } from 'xstate';

export default () => {

  const flowikiStates = {
    initial: 'top',
    states: {
      top: {
        on: {
          CREATE_DOC: {
            target: ['document'],
          },
        },
      },
      document: {
        on: {
        },
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
