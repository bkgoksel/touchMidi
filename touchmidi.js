"use strict"

// TODO: Find a good way to deal with ids

class Scale {
  constructor(id, name, notes) {
    this.name = name;
    this.id = id;
    this.notes = notes;
  }
}

class Pad {
  constructor(tw, name, surface_params) {
    this._tw = tw;
    this._name = name;
    this._domAdapter = new PadDomAdapter(this);
    this._input = tw.chosenInput;
    this._output = tw.chosenOutput;
    this._surface = new Surface(this, surface_params);
  }

  getSurfaceArea() {
    return this._domAdapter.getSurfaceArea();
  }

  getConfigArea() {
    return this._domAdapter.getConfigArea();
  }

  postRender() {
    this._surface.registerDOMSurface(this._domAdapter.getSurfaceArea());
    this._surface.registerConfigArea(this._domAdapter.getConfigArea());
  }
}

class PadDomAdapter {
  constructor(pad) {
    this._pad = pad;
    this._id = pad.name;
    this._configArea = $('<div class="padConfigArea"></div>');
    this._surfaceArea = $('<div class="padSurfaceArea" id="' + this._id+ '"></div>');
  }

  getSurfaceArea() {
    return this._surfaceArea;
  }

  getConfigArea() {
    return this._configArea;
  }
}

class SurfaceConfig{
  constructor(surface, initParams) {
    this._surface = surface;
    this._channel = initParams.channel;
    this._vel = initParams.defaultVel;
    this._domArea = this._getSurfaceConfig();
  }

  getChannel() {
    return this._channel;
  }

  getVel() {
    return this._vel;
  }

  getArea() {
    return this._domArea;
  }

  _getSurfaceConfig() {
    let $area = $('<div class="surfaceConfigSends"></div>');
    let self = this;
    //TODO: Make this better
    let sendTypes = [
      {id: "note", text: "Note"},
      {id: "vel", text: "Velocity"},
      {id: "mod", text: "Modulation"}
    ];
    ['x', 'y', 'z'].forEach(function(axis) {
      let $picker = getConfigPicker("surface-" + axis + "type-picker", sendTypes, function(e) {
        self._changeSendType(axis, e.target.id);
      });
      $area.append($picker);
    });
    return $area;
  }

  _changeSendType(axis, type) {
    this._surface.resetSend(axis, type);
  }
}

class Surface{
  constructor(pad, params) {
    this._pad = pad;
    this._xSend = Send.getSend(this, "x", params.x);
    this._ySend = Send.getSend(this, "y", params.y);
    this._zSend = Send.getSend(this, "z", params.z);
    this._activeEvents = {};
    this._numEvents = 0;
    this._domSurface = null;
    this._config = new SurfaceConfig(this, params);
    this._pointerRootEvents = {};
    this._pointerLastEvents = {};
  }

  resetSend(axis, type) {
    if (axis === "x") {
      this._xSend = Send.getSend(this, "x", type);
    } else if (axis === "y") {
      this._ySend = Send.getSend(this, "y", type);
    } else if (axis === "z") {
      this._zSend = Send.getSend(this, "z", type);
    }
  }

  pointerdown(ev) {
    console.log("SURFACE: pointer down");
    this._pointerRootEvents[ev.pointerId] = ev;
    this._pointerLastEvents[ev.pointerId] = ev;
    this._numEvents++;
    this._xSend.pointerdown_pre(ev);
    this._ySend.pointerdown_pre(ev);
    this._zSend.pointerdown_pre(ev);

    this._xSend.pointerdown(ev);
    this._ySend.pointerdown(ev);
    this._zSend.pointerdown(ev);
  }

  pointermove(ev) {
    this._pointerLastEvents[ev.pointerId] = ev;
    this._xSend.pointermove_pre(ev);
    this._ySend.pointermove_pre(ev);
    this._zSend.pointermove_pre(ev);

    this._xSend.pointermove(ev);
    this._ySend.pointermove(ev);
    this._zSend.pointermove(ev);
  }

  pointerup(ev) {
    this._numEvents--;
    delete this._pointerRootEvents[ev.pointerId]
    delete this._pointerLastEvents[ev.pointerId]
    this._xSend.pointerup_pre(ev);
    this._ySend.pointerup_pre(ev);
    this._zSend.pointerup_pre(ev);

    this._xSend.pointerup(ev);
    this._ySend.pointerup(ev);
    this._zSend.pointerup(ev);
  }

  registerDOMSurface(elem) {
    let self = this;
    this._domSurface = elem;
    $(elem).on('pointerdown', function(e) {
      self.pointerdown(e);
    });
    $(elem).on('pointermove', function(e) {
      self.pointermove(e);
    });
    $(elem).on('pointerup', function(e) {
      self.pointerup(e);
    });
    this.updateDOMSurface();
  }

  registerConfigArea(elem) {
    $(elem).append(this._config.getArea());
  }

  updateDOMSurface() {
    this._xSend.updateScale($(this._domSurface).width());
    this._ySend.updateScale($(this._domSurface).height());
  }
}

class Send {
  static getSend(surface, axis, params) {
    if (params.type === "note") {
      return new NoteSend(surface, axis, params);
    } else if (params.type === "vel") {
      return new VelSend(surface, axis, params);
    } else if (params.type === "mod") {
      return new ModSend(surface, axis, params);
    }
  }

  constructor(surface, axis, type) {
    this._surface = surface;
    this._axis = axis;
    this._scaleMax = 0;
  }

  updateScale(maxVal) {
    this._scaleMax = maxVal;
  }

  pointerdown_pre(ev) {
  }

  pointermove_pre(ev) {
  }

  pointerup_pre(ev) {
  }

  pointerdown(ev) {
  }

  pointermove(ev) {
  }

  pointerup(ev) {
  }
}

class NoteSend extends Send {
  constructor(surface, axis, params) {
    super(surface, axis);
    this._type = "note";
    this._scale = params.scale;
    this._key = params.key;
    this._bottom_oct = params.bottom_oct;
    this._top_oct = params.top_oct;
    this._computeAllNotes();
    this._switch = params.switch;
  }
  updateParams(params) {
    if (params.hasOwnProperty("scale")) {
      this._scale = params.scale;
    }
    if (params.hasOwnProperty("bottom_oct")) {
      this._bottom_oct = params.bottom_oct;
    }
    if (params.hasOwnProperty("top_oct")) {
      this._bottom_oct = params.top_oct;
    }
    if (params.hasOwnProperty("key")) {
      this._key = params.key;
    }
    if (params.hasOwnProperty("switch")) {
      this._switch = params.switch;
    }
  }
  _computeAllNotes() {
    this._all_notes = [];
    let self = this;
    for (var oct = this._bottom_oct; oct <= this._top_oct; oct++) {
      this._scale.notes.forEach( function(note) {
        self._all_notes.push(oct*12 + self._key + note);
      });
    }
  }

  pointerdown(ev) {
    this._playNote(ev);
  }

  pointermove(ev) {
    if (this._switch === "retrigger") {
      this._retriggerNote(ev);
    } else if (this._switch === "bend") {
      this._bendNote(ev);
    }
  }

  pointerup(ev) {
    if (this._switch === "retrigger") {
      this._stopNote(ev);
    } else if (this._switch === "bend") {
      this._stopNote(this._surface._pointerRootEvents[ev.pointerId]);
    }
  }

  _computeNote(x) {
    return this._all_notes[Math.trunc(this._all_notes.length*x/this._scaleMax)];
  }

  _playNote(ev) {
    let note = this._computeNote(ev.offsetX);
    let velocity = this._surface._config.getVel();
    let channel = this._surface._config.getChannel();
    this._surface._pad._tw.chosenOutput.playNote(note, channel, {velocity: velocity});
  }

  _retriggerNote(ev) {
    this._stopNote(this._surface._pointerLastEvents[ev.pointerId]);
    this._playNote(ev);
  }

  _bendNote(ev) {
    let oldNote = this._computeNote(this._surface._pointerRootEvents[ev.pointerId].offsetX);
    let newNote = this._computeNote(ev.offsetX);
    let semitoneDiff = newNote - oldNote;
    let pbRange = 64;
    let pbRate = semitoneDiff/pbRange;
    this._surface._pad._tw.chosenOutput.sendPitchBend(pbRate, this._surface._config.getChannel());
  }

  _stopNote(ev) {
    let note = this._computeNote(ev.offsetX);
    this._surface._pad._tw.chosenOutput.stopNote(note, this._surface._config.getChannel());
  }
}

class VelSend extends Send {
  constructor(surface, axis, params) {
    super(surface, axis);
    this._type = "vel";
  }
}

class ModSend extends Send {
  constructor(surface, axis, params) {
    super(surface, axis);
    this._type = "mod";
  }
}

class DOMAdapter {
  constructor(tw) {
    this._tw = tw;
    this._configArea = $('#twConfig');
    this._padArea = $('#padArea');
    this._setPadArea();
  }

  updateTWConfig() {
    let self = this;
    this._configArea.empty();
    let $twGeneralConfig = $('<div class="twGeneralConfig"></div>');
    let pickerInputs = [];
    this._tw.inputs.forEach(function(input) {
      pickerInputs.push({id: input.id, text: input.manufacturer + ' ' + input.name});
    });
    let pickerOutputs = [];
    this._tw.outputs.forEach(function(output) {
      pickerOutputs.push({id: output.id, text: output.manufacturer + ' ' + output.name});
    });
    let $inputPicker = getConfigPicker('inputPicker', pickerInputs, function(e) {
      self._tw.chooseInput(e.target.id);
    });
    let $outputPicker = getConfigPicker('outputPicker', pickerOutputs, function(e) {
      self._tw.chooseOutput(e.target.id);
    });
    $twGeneralConfig.append($inputPicker);
    $twGeneralConfig.append($outputPicker);
    this._configArea.append($twGeneralConfig);
  }

  _setPadArea() {
    this._padArea.empty();
  }

  addPad(pad) {
    this._padArea.append(pad.getSurfaceArea());
    this._configArea.append(pad.getConfigArea());
    pad.postRender();
  }
}

function getConfigPicker(id, opts, optCb) {
  let $dropdown = $('<div class="dropdown" id="' + id + '"></div>');
  opts.forEach(function(option) {
    let $opt = $('<button id="' + option.id + '">' + option.text + '</button>');
    $opt.on('click', optCb);
    $dropdown.append($opt);
  });
  return $dropdown;
}

class TouchMidi {
  constructor() {
    this._inputs = [];
    this._outputs = [];
    this._pads = [];
    this._chosenInput = null;
    this._chosenOutput = null;
    this._domAdapter = new DOMAdapter(this);
    Object.defineProperties(this, {
      KEYS: {
        value: {
          "C": 0,
          "C#": 1,
          "D_f": 1,
          "D": 2,
          "D#": 3,
          "E_f": 3,
          "E": 4,
          "F": 5,
          "F#": 6,
          "G_f": 6,
          "G": 7,
          "G#": 8,
          "A_f": 8,
          "A": 9,
          "A#": 10,
          "B_f": 10,
          "B": 11,
        },
        writable: false,
        enumerable: true,
        configurable: false
      },

      DEFAULT_SCALES: {
        value: {
          maj: new Scale("maj", "Major", [0,2,4,5,7,9,11]),
          min: new Scale("min", "Minor", [0,2,3,5,7,8,10]),
          har: new Scale("har", "Harmonic Minor", [0,2,3,5,7,8,11]),
          bls: new Scale("bls", "Minor Blues", [0,3,5,6,7,10])
        },
        writable: false,
        enumerable: true,
        configurable: false
      }
    });
    Object.defineProperties(this, {
      inputs: {
        enumerable: true,
        get: function() {
          return this._inputs;
        }.bind(this)
      },
      outputs: {
        enumerable: true,
        get: function() {
          return this._outputs;
        }.bind(this)
      },
      chosenInput: {
        get: function() {
          return this._chosenInput;
        }.bind(this)
      },
      chosenOutput: {
        get: function() {
          return this._chosenOutput;
        }.bind(this)
      }
    });
  }
  enable(callback) {
    if (!WebMidi.enabled) {
      throw new Error("WebMidi is not enabled, TouchMidi cannot be enabled.");
    }
    this._inputs = WebMidi.inputs;
    this._outputs = WebMidi.outputs;
    this._domAdapter.updateTWConfig();
  }
  chooseOutput(id) {
    console.log("Getting output: " + id);
    this._chosenOutput = WebMidi.getOutputById(id);
    console.log("Got output: " + this._chosenOutput);
  }
  chooseInput(id) {
    this._chosenInput = WebMidi.getInputById(id);
  }

  _getDefaultSurfaceParams() {
    return {
      channel: 1,
      defaultVel: 0.75,
      x: {
        type: "note",
        scale: this.DEFAULT_SCALES.maj,
        key: this.KEYS.C,
        bottom_oct: 2,
        top_oct: 6,
        switch: "retrigger"
      },
      y: {
        type: "vel",
      },
      z: {
        type: "mod",
      }
    }
  }

  addPad(surface_params) {
    let name= "newPad" + this._pads.length;
    let defaultParams = this._getDefaultSurfaceParams();
    let final_surface_params = Object.assign(defaultParams, surface_params);
    final_surface_params.x = Object.assign(defaultParams.x, surface_params.x);
    final_surface_params.y = Object.assign(defaultParams.y, surface_params.y);
    final_surface_params.z = Object.assign(defaultParams.z, surface_params.z);
    let pad = new Pad(this, name, final_surface_params);
    this._pads.push(pad);
    this._domAdapter.addPad(pad);
  }
}

var tw;

WebMidi.enable(function (err) {
  if (err) {
    console.log("WebMidi could not be enabled.", err);
  } else {
    console.log("WebMidi enabled successfully.");
    var tw = new TouchMidi();
    tw.enable();
    console.log("TouchMidi enabled successfully.");
    tw.addPad({});
    console.log("Pad added successfully.");
  }
});
