const flowikiStates = {
  initial: 'navigating',
  states: {
    navigating: {
      on: {
        START_EDIT: {
          target: 'editing'
        }
      }
    },

    editing: {
      on: {
        SAVE: {
          target: 'navigating',
        }
      }
    }
  }
}

const flowikiMachine = Machine(
  {
    id: 'flowiki',
    initial: 'top',
    context: {
      nodes: {},
      displayNodes: [],
      displayNodeEntries: [],
    },
    states: {
      top: {
        on: {
          VIEW_NODE: {
            target: 'node',
          },
          CREATE_NODE: {
            target: 'node',
          },
        },
      },
      node: {
        on: {
          BACK: {
            target: 'top',
          }
        },
        ...flowikiStates
      }
    }
  });
