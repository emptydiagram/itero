import { readable } from "svelte/store";
import { interpret } from "xstate";

// from XState + Svelte template
export function useMachine(machine, options) {
  const service = interpret(machine, options);

  const store = readable(service.initialState, set => {
    service.onTransition(state => {
        console.log("-------------------");
        console.log(
        "transitioning to context = ",
        state.context,
        ", state = ",
        state.value
        );
      set(state);
    });

    service.start();

    return () => {
      service.stop();
    };
  });

  return {
    state: store,
    send: service.send
  };
}