"use strict"

var MIDI_MAX = 127;
var MOD_CHANNEL = 1;

// TODO: Find a good way to deal with ids

class Scale {
  constructor(id, name, notes) {
    this.name = name;
    this.id = id;
    this.notes = notes;
  }
}

class Pad {
  constructor(tw, name, surfaceParams) {
    this._tw = tw;
    this._name = name;
    this._domAdapter = new PadDomAdapter(this);
    this._input = tw.chosenInput;
    this._output = tw.chosenOutput;
    this._surface = new Surface(this, surfaceParams);
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
    this._defaultVel = initParams.defaultVel;
    this._domArea = this._getSurfaceConfig();
    this._pointerParams = {};
    this._sendAreas = {
      x: null,
      y: null,
      z: null
    }
  }

  getChannel() {
    return this._channel;
  }

  getVel(pointerId) {
    if (this._pointerParams.hasOwnProperty(pointerId)) {
      return this._pointerParams[pointerId];
    } else {
      return this._defaultVel;
    }
  }

  getArea() {
    return this._domArea;
  }

  setVel(pointerId, vel) {
    this._pointerParams[pointerId] = vel;
  }

  _getSurfaceConfig() {
    let $area = $('<div class="surfaceConfigSends"></div>');
    let self = this;
    //TODO: Make this better
    let sendTypes = [
      {id: "note", text: "Note"},
      {id: "vel",  text: "Velocity"},
      {id: "mod",  text: "Modulation"},
      {id: "par",  text: "Parameter"}
    ];
    ['x', 'y', 'z'].forEach(function(axis) {
      let $sendArea = $('<div class="' + axis + '-config-area"></div>');
      $sendArea.append('<p>' + axis + '-axis config area</p>');
      $sendArea.append('<p>Current send type: ' + self._surface._sends[axis]._type + '</p>');
      let $picker = getConfigPicker("surface-" + axis + "type-picker","Change Surface Type", sendTypes, function(e) {
        self._changeSendType(axis, e.target.id);
      });
      $sendArea.append($picker);
      $sendArea.append(self._surface._sends[axis].getConfigArea());
      $area.append($sendArea);
    });
    return $area;
  }

  _changeSendType(axis, type) {
    this._surface.resetSend(axis, type);
  }

  updateSendConfig(axis) {
    let self = this;
    let sendTypes = [
      {id: "note", text: "Note"},
      {id: "vel", text: "Velocity"},
      {id: "mod", text: "Modulation"},
      {id: "par", text: "Parameter"}
    ];
    let $sendArea = $(this._domArea).find('.' + axis + '-config-area');
    $sendArea.empty();
    $sendArea.append('<p>' + axis + '-axis config area</p>');
    $sendArea.append('<p>Current send type: ' + this._surface._sends[axis]._type  + '</p>');
    let $picker = getConfigPicker("surface-" + axis + "type-picker","Change Surface Type", sendTypes, function(e) {
      self._changeSendType(axis, e.target.id);
    });
    $sendArea.append($picker);
    $sendArea.append(this._surface._sends[axis].getConfigArea());
  }
}

class Surface{
  constructor(pad, params) {
    this._pad = pad;
    this._sends = {
      x: Send.getSend(this, "x", params.x),
      y: Send.getSend(this, "y", params.y),
      z: Send.getSend(this, "z", params.z)
    };
    this._activeEvents = {};
    this._numEvents = 0;
    this._domSurface = null;
    this._config = new SurfaceConfig(this, params);
  }

  resetSend(axis, type) {
    let params = this._pad._tw._getDefaultSendParams(type);
    this._sends[axis] = Send.getSend(this, axis, params);
    let maxVal = 1;
    if (axis === "x") {
      maxVal = $(this._domSurface).width();
    } else if (axis === "y") {
      maxVal = $(this._domSurface).height();
    }
    this._sends[axis].updateScale(maxVal);
    this._config.updateSendConfig(axis);
  }

  pointerdown(ev) {
    this._numEvents++;
    this._sends.x.pointerdownPre(ev);
    this._sends.y.pointerdownPre(ev);
    this._sends.z.pointerdownPre(ev);

    this._sends.x.pointerdown(ev);
    this._sends.y.pointerdown(ev);
    this._sends.z.pointerdown(ev);
  }

  pointermove(ev) {
    this._sends.x.pointermovePre(ev);
    this._sends.y.pointermovePre(ev);
    this._sends.z.pointermovePre(ev);

    this._sends.x.pointermove(ev);
    this._sends.y.pointermove(ev);
    this._sends.z.pointermove(ev);
  }

  pointerup(ev) {
    this._numEvents--;
    this._sends.x.pointerupPre(ev);
    this._sends.y.pointerupPre(ev);
    this._sends.z.pointerupPre(ev);

    this._sends.x.pointerup(ev);
    this._sends.y.pointerup(ev);
    this._sends.z.pointerup(ev);
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
    this._sends.x.updateScale($(this._domSurface).width());
    this._sends.y.updateScale($(this._domSurface).height());
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
    } else if (params.type === "par") {
      return new ParamSend(surface, axis, params);
    } else if (params.type === "par") {
      return new ParamSend(surface, axis, params);
    }
  }

  constructor(surface, axis, params) {
    this._surface = surface;
    this._axis = axis;
    this._scaleMax = 0;
    this._enabled = true;
    if (params.hasOwnProperty("cooldown")) {
      this._cooldown = params.cooldown;
    }
    if (params.hasOwnProperty("defaultVal")) {
      this._defaultVal= params.defaultVal;
    }
  }

  updateScale(maxVal) {
    this._scaleMax = maxVal;
  }

  enable() {
    this._enabled = true;
  }

  disable() {
    this._enabled = false;
  }

  _getVal(ev) {
    if (this._axis === "x") {
      return ev.offsetX;
    } else if (this._axis === "y") {
      return this._scaleMax - ev.offsetY;
    } else if (this._axis === "z") {
      if (ev.hasOwnProperty('pressure')) {
        return ev.pressure;
      } else {
        return this._defaultVal;
      }
    }
  }

  pointerdownPre(ev) {
  }

  pointermovePre(ev) {
  }

  pointerupPre(ev) {
  }

  pointerdown(ev) {
  }

  pointermove(ev) {
  }

  pointerup(ev) {
  }

  getConfigArea() {
    let $conf = $('<div class="' + this._axis + '-conf"></div>');
    $conf.append($('<p> No config for axis </p>'));
    this._addEnableDisableButtons($conf);
    return $conf;
  }

  _addEnableDisableButtons($conf) {
    let $disableButton = $('<button class="' + this._axis + ' disable-btn">Disable</button>');
    let self = this;
    $disableButton.on('click', function() {
      self.disable();
    });
    $conf.append($disableButton);
    let $enableButton = $('<button class="' + this._axis + ' enable-btn">Enable</button>');
    $enableButton.on('click', function() {
      self.enable();
    });
    $conf.append($enableButton);
  }
}

class NoteSend extends Send {
  constructor(surface, axis, params) {
    super(surface, axis, params);
    this._type = "note";
    this._scale = params.scale;
    this._key = params.key;
    this._bottomOct = params.bottomOct;
    this._topOct = params.topOct;
    this._computeAllNotes();
    this._switch = params.switch;
    this._lastNotes = {};
    this._decorate = params.decorate;
    if (this._decorate) {
      //TODO: Decorate notes with note boundaries
      //this._surface.decorateSend(this._axis, params);
    }
  }

  getConfigArea() {
    // TODO: Add slider for cooldown range
    let self = this;
    let $conf = $('<div class="' + this._axis + '-' + this._type + '-conf"></div>');
    this._addEnableDisableButtons($conf);
    let switchTypes = [
      { id: 'retrigger', text: "Retrigger" },
      { id: 'strict_retrigger', text: "Strict Retrigger" },
      { id: 'bend', text: "Bend" }
    ];
    let $switchPicker = getConfigPicker('.axis-' + this._axis + '-note-switch-picker', "Choose Switch Type", switchTypes, function(e) {
      self.updateParams({ switch: e.target.id });
    });
    let keyOpts = [
      { text: "C",  id: "0"},
      { text: "C#", id: "1"},
      { text: "D",  id: "2"},
      { text: "D#", id: "3"},
      { text: "E",  id: "4"},
      { text: "F",  id: "5"},
      { text: "F#", id: "6"},
      { text: "G",  id: "7"},
      { text: "G#", id: "8"},
      { text: "A",  id: "9"},
      { text: "A#", id: "10"},
      { text: "B",  id: "11"}
    ];
    let $keyPicker = getConfigPicker('.axis=' + this._axis + '-note-key-picker', "Choose Key", keyOpts, function(e) {
      self.updateParams({ key: parseInt(e.target.id) });
    });
    let scaleOpts = [];
    $.each(this._surface._pad._tw.DEFAULT_SCALES, function(scale) {
      scaleOpts.push({ id: this.id, text: this.name });
    });
    let $scalePicker = getConfigPicker('.axis=' + this._axis + '-note-scale-picker', "Choose Scale", scaleOpts, function(e) {
      self.updateParams({ scale: e.target.id });
    });
    let octOpts = [
      {id: '0', text: '0'},
      {id: '1', text: '1'},
      {id: '2', text: '2'},
      {id: '3', text: '3'},
      {id: '4', text: '4'},
      {id: '5', text: '5'},
      {id: '6', text: '6'},
      {id: '7', text: '7'},
      {id: '8', text: '8'},
      {id: '9', text: '9'}
    ];
    let $bottomOctPicker = getConfigPicker('.axis=' + this._axis + '-note-bottom-oct-picker', "Choose Bottom Octave", octOpts, function(e) {
      self.updateParams({ bottomOct: parseInt(e.target.id) });
    });
    let $topOctPicker = getConfigPicker('.axis=' + this._axis + '-note-top-oct-picker', "Choose Top Octave", octOpts, function(e) {
      self.updateParams({ topOct: parseInt(e.target.id) });
    });
    $conf.append($switchPicker, [$keyPicker, $scalePicker, $bottomOctPicker, $topOctPicker]);
    return $conf;
  }

  updateParams(params) {
    if (params.hasOwnProperty("scale")) {
      this._scale = this._surface._pad._tw.DEFAULT_SCALES[params.scale];
      this._computeAllNotes();
    }
    if (params.hasOwnProperty("bottomOct")) {
      this._bottomOct = params.bottomOct;
      this._computeAllNotes();
    }
    if (params.hasOwnProperty("topOct")) {
      this._topOct = params.topOct;
      this._computeAllNotes();
    }
    if (params.hasOwnProperty("key")) {
      this._key = params.key;
      this._computeAllNotes();
    }
    if (params.hasOwnProperty("switch")) {
      this._switch = params.switch;
    }
    if (params.hasOwnProperty("cooldown")) {
      this._cooldown = params.cooldown;
    }
  }
  _computeAllNotes() {
    this._allNotes = [];
    let self = this;
    for (var oct = this._bottomOct; oct <= this._topOct; oct++) {
      this._scale.notes.forEach( function(note) {
        self._allNotes.push(oct*12 + self._key + note);
      });
    }
  }

  pointerdown(ev) {
    if(this._enabled && (!this._lastNotes[ev.pointerId] || !this._lastNotes[ev.pointerId].cooldown)) {
      this._playNote(ev);
    }
  }

  pointermove(ev) {
    if(this._enabled) {
      if (this._switch === "retrigger" || this._switch === "strict_retrigger") {
        this._retriggerNote(ev);
      } else if (this._switch === "bend") {
        this._bendNote(ev);
      }
    }
  }

  pointerup(ev) {
    if(this._enabled) {
      this._stopNote(ev.pointerId);
    }
  }

  _computeNote(val) {
    return this._allNotes[Math.trunc(this._allNotes.length*val/this._scaleMax)];
  }

  _playNote(ev) {
    let note = {
      note: this._computeNote(this._getVal(ev)),
      cooldown: true
    };
    this._lastNotes[ev.pointerId] = note;
    let velocity = this._surface._config.getVel(ev.pointerId);
    let channel = this._surface._config.getChannel();
    this._surface._pad._tw.chosenOutput.playNote(note.note, channel, {velocity: velocity});
    var send = this;
    setTimeout(function() {
      if (send._lastNotes.hasOwnProperty(ev.pointerId)) {
        send._lastNotes[ev.pointerId].cooldown = false;
      }
    }, send._cooldown);
  }

  _retriggerNote(ev) {
    if (this._lastNotes.hasOwnProperty(ev.pointerId) && !this._lastNotes[ev.pointerId].cooldown) {
      let oldNote = this._lastNotes[ev.pointerId].note;
      let newNote = this._computeNote(this._getVal(ev));
      if (this._switch !== "strict_retrigger" || oldNote !== newNote) {
        this._surface._pad._tw.chosenOutput.stopNote(oldNote, this._surface._config.getChannel());
        let velocity = this._surface._config.getVel(ev.pointerId);
        let channel = this._surface._config.getChannel();
        this._surface._pad._tw.chosenOutput.playNote(newNote, channel, {velocity: velocity});
        this._lastNotes[ev.pointerId] = {
          note: newNote,
          cooldown: true
        };
        var send = this;
        setTimeout(function() {
          if (send._lastNotes.hasOwnProperty(ev.pointerId)) {
            send._lastNotes[ev.pointerId].cooldown = false;
          }
        }, send._cooldown);
      }
    }
  }

  _bendNote(ev) {
    if (this._lastNotes.hasOwnProperty(ev.pointerId) && !this._lastNotes[ev.pointerId].cooldown) {
      let oldNote = this._lastNotes[ev.pointerId].note;
      let newNote = this._computeNote(this._getVal(ev));
      if (oldNote !== newNote) {
        let semitoneDiff = newNote - oldNote;
        let sign = (semitoneDiff < 0) ? -1 : 1;
        let absDiff = Math.abs(semitoneDiff);
        this._surface._pad._tw.chosenOutput.setPitchBendRange(absDiff);
        this._surface._pad._tw.chosenOutput.sendPitchBend(sign, this._surface._config.getChannel());
        this._lastNotes[ev.pointerId].cooldown = true;
        var send = this;
        setTimeout(function() {
          if (send._lastNotes.hasOwnProperty(ev.pointerId)) {
            send._lastNotes[ev.pointerId].cooldown = false;
          }
        }, send._cooldown);
      }
    }
  }

  _stopNote(id) {
    if (this._lastNotes.hasOwnProperty(id)) {
      let note = this._lastNotes[id].note;
      this._surface._pad._tw.chosenOutput.stopNote(note, this._surface._config.getChannel());
      delete this._lastNotes[id];
    }
  }
}

class VelSend extends Send {
  constructor(surface, axis, params) {
    super(surface, axis, params);
    this._type = "vel";
  }

  pointerdownPre(ev) {
    if (this._enabled) {
      this._setVelocity(ev.pointerId, this._getVal(ev));
    }
  }

  pointermovePre(ev) {
    if (this._enabled) {
      this._setVelocity(ev.pointerId, this._getVal(ev));
    }
  }

  _setVelocity(pointerId, val) {
    let vel = val/this._scaleMax;
    this._surface._config.setVel(pointerId, vel);
  }
}

class ModSend extends Send {
  constructor(surface, axis, params) {
    super(surface, axis, params);
    this._type = "mod";
  }

  pointerdown(ev) {
    if(this._enabled) {
      this._sendMod(this._getVal(ev));
    }
  }

  pointermove(ev) {
    if(this._enabled) {
      this._sendMod(this._getVal(ev));
    }
  }

  _sendMod(val) {
    let mod = val/this._scaleMax * MIDI_MAX;
    this._surface._pad._tw.chosenOutput.sendControlChange(MOD_CHANNEL, mod, this._surface._config.getChannel());
  }
}

class ParamSend extends Send {
  constructor(surface, axis, params) {
    super(surface, axis, params);
    this._type = "par";
    this._controller = params.controller;
  }

  getConfigArea() {
    let self = this;
    let $conf = $('<div class="' + this._axis + '-' + this._type + '-conf"></div>');
    this._addEnableDisableButtons($conf);
    let paramArr = Array.from(new Array(100), (x,i) => i);
    let paramOpts = [];
    paramArr.forEach(function(par) {
      paramOpts.push({ id: par, text: par });
    });
    let $paramPicker = getConfigPicker('axis-' + this._axis + '-param-chnl-picker', "Choose Control Change Channel", paramOpts, function(e) {
      self.updateParams({ controller: parseInt(e.target.id) });
    });
    $conf.append($paramPicker);
    return $conf;
  }

  updateParams(params) {
    if (params.hasOwnProperty("controller")) {
      this._controller = params.controller;
    }
  }

  pointerdownPre(ev) {
    if(this._enabled) {
      this._sendParam(this._getVal(ev));
    }
  }

  pointermovePre(ev){
    if(this._enabled) {
      this._sendParam(this._getVal(ev));
    }
  }

  _sendParam(val) {
    let actual_val = val/this._scaleMax * MIDI_MAX;
    this._surface._pad._tw.chosenOutput.sendControlChange(this._controller, actual_val, this._surface._config.getChannel());
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
    let $inputPicker = getConfigPicker('inputPicker', "MIDI Input", pickerInputs, function(e) {
      self._tw.chooseInput(e.target.id);
    });
    let $outputPicker = getConfigPicker('outputPicker', "MIDI Output", pickerOutputs, function(e) {
      self._tw.chooseOutput(e.target.id);
    });
    let $addPadButton = $('<button class="addPad">Add Another Pad</button>');
    $addPadButton.on('click', function() {
      self._tw.addPad({});
    });
    $twGeneralConfig.append($addPadButton);
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
    let children = this._padArea.children();
    let nChildren = children.length;
    let padSize = (1/nChildren)*100;
    children.css('width', 'calc(' + padSize + '% - 14px)');
    this._tw._pads.forEach(function (pad) {
      pad._surface.updateDOMSurface();
    });
  }
}

function getConfigPicker(id, title, opts, optCb) {
  let $dropdown = $('<div class="dropdown" id="' + id + '">' + title + '</div>');
  let $dropdownContent = $('<div class="dropdown-content"></div>');
  opts.forEach(function(option) {
    let $opt = $('<button id="' + option.id + '">' + option.text + '</button>');
    $opt.on('click', optCb);
    $dropdownContent.append($opt);
  });
  $dropdown.append($dropdownContent);
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
          "D": 2,
          "D#": 3,
          "E": 4,
          "F": 5,
          "F#": 6,
          "G": 7,
          "G#": 8,
          "A": 9,
          "A#": 10,
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
    this._eventOverwrite();
  }

  _eventOverwrite() {
    window.oncontextmenu = function(event) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
    document.addEventListener('touchstart', function(event) {
      event.preventDefault();
    });
  }

  chooseOutput(id) {
    this._chosenOutput = WebMidi.getOutputById(id);
  }

  chooseInput(id) {
    this._chosenInput = WebMidi.getInputById(id);
  }

  _getDefaultSendParams(type) {
    if (type === "note") {
      return {
        type: "note", cooldown: 100, scale: this.DEFAULT_SCALES.bls,
        key: this.KEYS.C,
        bottomOct: 2,
        topOct: 6,
        switch: "retrigger",
        decorate: true
      };
    } else if (type === "mod") {
      return {
        type: "mod",
        cooldown: 10,
        defaultVal: 0
      };
    } else if (type === "vel") {
      return {
        type: "vel",
        cooldown: 10
      };
    } else if (type === "par") {
      return {
        type: "par",
        cooldown: 10,
        controller: 33,
        defaultVal: 0.5
      };
    }
  }

  _getDefaultSurfaceParams() {
    return {
      channel: 1,
      defaultVel: 1,
      x: this._getDefaultSendParams("note"),
      y: this._getDefaultSendParams("vel"),
      z: this._getDefaultSendParams("par")
    }
  }

  addPad(surfaceParams) {
    let name= "newPad" + this._pads.length;
    let defaultParams = this._getDefaultSurfaceParams();
    let final_surfaceParams = Object.assign(defaultParams, surfaceParams);
    final_surfaceParams.x = Object.assign(defaultParams.x, surfaceParams.x);
    final_surfaceParams.y = Object.assign(defaultParams.y, surfaceParams.y);
    final_surfaceParams.z = Object.assign(defaultParams.z, surfaceParams.z);
    let pad = new Pad(this, name, final_surfaceParams);
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
