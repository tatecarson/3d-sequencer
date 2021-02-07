import * as Tone from "tone";

export function makeKalimba() {
  var panner = new Tone.Panner3D().toDestination();
  var instrument = new Tone.FMSynth();
  var synthJSON = {
    harmonicity: 8,
    modulationIndex: 2,
    oscillator: {
      type: "sine",
    },
    envelope: {
      attack: 0.001,
      decay: 2,
      sustain: 0.1,
      release: 2,
    },
    modulation: {
      type: "square",
    },
    modulationEnvelope: {
      attack: 0.002,
      decay: 0.2,
      sustain: 0,
      release: 0.2,
    },
  };

  instrument.set(synthJSON);

  var effect1, effect2, effect3;

  // create effects
  var effect1 = new Tone.PingPongDelay();
  const effect1JSON = {
    delayTime: "8n",
    feedback: 0.3,
    wet: 0.5,
  };
  effect1.set(effect1JSON);

  // make connections
  instrument.connect(effect1);
  effect1.connect(panner);

  const seq = new Tone.Sequence(
    (time, note) => {
      instrument.triggerAttackRelease(note, 0.1, time);
      // subdivisions are given as subarrays
    },
    ["C4", ["E4", "D4", "E4"], "G4", ["A4", "G4"]]
  ).start(0);
  // Tone.Transport.start();

  // define deep dispose function
  function deep_dispose() {
    if (effect1 != undefined && effect1 != null) {
      effect1.dispose();
      effect1 = null;
    }
    if (effect2 != undefined && effect2 != null) {
      effect2.dispose();
      effect2 = null;
    }
    if (effect3 != undefined && effect3 != null) {
      effect3.dispose();
      effect3 = null;
    }
    if (instrument != undefined && instrument != null) {
      instrument.dispose();
      instrument = null;
    }
  }

  // TODO: add sequencer from guitarland
  return {
    instrument: instrument,
    delay: effect1,
    deep_dispose: deep_dispose,
    seq,
  };
}
