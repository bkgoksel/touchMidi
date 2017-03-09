# Welcome to TouchMIDI!

TouchMIDI is a highly configurable browser based MIDI controller. It uses the WebMIDI API through [webmidi.js](https://github.com/cotejp/webmidi), and currently tested on Chrome. It *should* work in Internet Explorer and Safari if the user has the [Jazz-soft Plugin](http://jazz-soft.net/download/Jazz-Plugin/), but this is not tested yet.

## Current features

Upon launch, the user should see a very basic (and ugly) page that consists of a black background and a red sidebar on the right side. The screen area in that state is one giant control surface, and the sidebar holds the configuration for the general controller and for the given surface. The initial surface comes with the default setup, which means it is mapped to play notes on each touch based on the x-axis coordinate, where the notes are mapped to notes in C-major scale from octave 2 to 8, and the y-axis is mapped to the note velocity value. However these value are all configurable.

## Requirements

TouchMIDI as it is now is tested on Chrome. To prevent accidental zoom events, please make sure touch event listeners are not passive by disabling the corresponding flag in Chrome flags.

## Workflow

TouchMIDI consists of the following components:

### Choosing MIDI In/Out

The first thing the user needs to do is choose a MIDI Output. The app detects the available MIDI outputs on document load. The user should select their preferred output from the hover menu on the config settings. The output may be changed at any time, but if an output is added to the system after document load, hthe document should be reloaded for it to become available.

While the menu to choose a MIDI Input is there, it currently does not do anything.

### Pads, Surfaces, Sends

The main unit of MIDI interaction in TouchMIDI is a **Pad**. A Pad has a **Surface** which holds the control surface, and the Surface has an **x-Send, y-Send **and **z-Send**. Each send corresponds to an axis (z corresponds to pointer pressure, more on it later.). Sends are the actual components that send MIDI messages to the chosen output. There are currently 4 types of sends in TouchMIDI:

#### Note Send

A note send sends MIDI note messages. Its parameters are the following:
* **Ke**y: The key the scale is based on.
* **Scal**e: The scale to be played, currently Major, Minor, Harmonic Minor and Minor Blues scales are supported
* **Bottom octav**e: The octave that corresponds to the min edge of the surface
* **Top octav**e: The upper limit
* **Switc****h: Note firing policy. *Retrigger* triggers a new note every time a pointer move is detected, with a cooldown period between allowed refires for each pointer. Since move events are very sensitive, this basically refires a note for each finger on the screen with the cooldown interval (currently 100ms) pause in between. Leads to a fast-picking/arpeggiated sound. *Strict retrigger* only retriggers if a finger/pointer moves on to a different note. Gives finer control over the playing. *Bend* currently doesn't function correctly, but will bend to the new note once a pointer moves to a new note.

#### Velocity Send

A velocity send updates the velocity value for the finger that's moving. When the same surface has a note send and a velocity send, once a finger moces, the following events happen:
* The velocity send calculates the velocity at the current finger position
* A note gets fired for the given finger with the new velocity value.
This way, each finger can have its own velocity in muli-touch scenarios.


#### Mod Send

A mod send is expected to send mod wheel messages, but is not functional yet

#### Param Send

This is a send that can be configured to send values for any MIDI ControlChange event. The default channel is 33 but that can be changed to any value 1-99. This can then be mapped to any parameter the user would like on the receiving end. It sends values between 0-127 based on where the pointer event occured on hte surface.


### Configuration

All configuration is done on the sidebar. The page currently has touch events disabled, so a mouse or stylus is required to use the configuration (this will be fixed soon). For each axis send of each pad, a set of configuration options are available. Each axis may be updated to a different send type or disabled. Each send's configurable parameters are also updated here. More Pads may be added, which divide the Pad area horizontally to make room.

## WIP

TouchMIDI is in a very early development stage, so many features are lacking and there are countless bugs. However, here's a list of what's to come:

* Functional note bending: For a continous, portamento/glissando type of note playing
* Decoration of node axes: With visual indicators for octaves, key notes and significant intervals
* Ability to layout pads: Instead of dividing horizontally, add option to divide vertically etc.
* Ability to save current configuration: Currently the app launches with the default config, but it may be initialized to any config.
* Ability to save presets for Pads/Sends: To make it easier to add a new pad to the current config that is not default.
* MIDI Output refresh: Ability to refresh the list of available MIDI outs.
* Visual overhaul: Remake the visual design for usability
* Functional mod send: Make modulation an easy to add separate send
* Support touch on configuration area: All touch events were disabled to prevent accidental touch zooming on Chrome, but we should enable it for the config area.
