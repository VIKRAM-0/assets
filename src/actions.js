// Actions — the ONLY setState callers (docs/superpowers/specs §5).
// Modules read via appStore.getState() and mutate via these functions;
// nothing else may call appStore.setState.
//
// Classic script: exposes action functions in the shared global scope.

const SLIDER_DEFAULTS = { brightness: 1.0, roughness: 0.72, metalness: 0, sheen: 0, scale: 10.0, norm: 1.0 };

function setSlider(name, v) {
  appStore.setState(s => ({ sliders: { ...s.sliders, [name]: v } }));
}

function resetSliders() {
  appStore.setState(() => ({ sliders: { ...SLIDER_DEFAULTS } }));
}

function setBaseColor(hex) {
  appStore.setState(() => ({ baseColorHex: hex }));
}
