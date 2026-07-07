// Minimal pub/sub store — the single source of truth for UI/app state.
// Migration path (docs/superpowers/specs/2026-07-07-asset-designer-refactor-design.md §6):
// move one state domain at a time out of state.js into here (finder → active
// swatch → curtainState → sliders), with actions as the only setState callers.
// The Three.js scene graph stays imperative behind action functions — do NOT
// put meshes, materials, or textures in this store.
//
// Classic script: exposes `appStore` in the shared global scope.

function createStore(initialState) {
  let state = structuredClone(initialState);
  const listeners = new Set();

  return {
    getState() {
      return state;
    },
    // The ONLY way to change state. Pass a function returning a partial next state.
    setState(updater) {
      const next = updater(state);
      state = { ...state, ...next };
      listeners.forEach((fn) => fn(state));
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

const appStore = createStore({
  // Populated domain-by-domain as state migrates out of src/state.js.
  sliders: { brightness: 1.0, roughness: 0.72, metalness: 0, sheen: 0, scale: 10.0, norm: 1.0 },
  baseColorHex: '#ffffff',
  currentModelKey: 'chair',
  roomMode: false,
  activeRoomSection: 'living',
});
