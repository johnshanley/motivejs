(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.motive = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
var note_1 = require("./note");
var convert_1 = require("./convert");
var note_2 = require("./validators/note");
var abc_note_1 = require("./validators/abc-note");
function abc(abcInput) {
    var sci = abcToScientific(abcInput);
    return new note_1.default(sci);
}
var accidentals = {
    "_": -1,
    "=": 0,
    "^": 1
};
// octave adjustments
var adjustments = {
    ",": -1,
    "'": 1
};
function abcToScientific(abcInput) {
    var parsed = abc_note_1.default(abcInput).parse();
    if (!parsed) {
        throw new Error('Cannot convert ABC to scientific notation. Invalid ABC note name.');
    }
    var step, alter = 0, accidental, octave;
    // if parsed step is a capital letter
    if (/[A-G]/.test(parsed.step)) {
        octave = 4;
    }
    else {
        octave = 5;
    }
    // get the total alter value of all accidentals present
    for (var c = 0; c < parsed.accidental.length; c++) {
        alter += accidentals[parsed.accidental[c]];
    }
    // for each comma or apostrophe adjustment, adjust the octave value
    for (var d = 0; d < parsed.adjustments.length; d++) {
        octave += adjustments[parsed.adjustments[d]];
    }
    step = parsed.step.toUpperCase();
    accidental = convert_1.alterToAccidental(alter);
    var output = step + accidental + octave.toString(10);
    if (!note_2.default(output).valid) {
        throw new Error('Something went wrong converting ABC to scientific notation. Output invalid.');
    }
    return output;
}
exports.abcToScientific = abcToScientific;
;
function scientificToAbc(scientific) {
    var parsed = note_2.default(scientific).parse();
    if (!parsed || parsed.octave === null) {
        throw new Error('Cannot convert scientific to ABC. Invalid scientific note name.');
    }
    var abc_accidental = '', abc_step, abc_octave = '';
    var alter = convert_1.accidentalToAlter(parsed.accidental);
    // add abc accidental symbols until alter is consumed (alter === 0)
    while (alter < 0) {
        abc_accidental += '_';
        alter += 1;
    }
    while (alter > 0) {
        abc_accidental += '^';
        alter -= 1;
    }
    // step must be lowercase for octaves above 5
    // add apostrophes or commas to get abc_octave
    //   to the correct value
    var o = parsed.octave;
    if (o >= 5) {
        abc_step = parsed.step.toLowerCase();
        for (; o > 5; o--) {
            abc_octave += '\'';
        }
    }
    else {
        abc_step = parsed.step.toUpperCase();
        for (; o < 4; o++) {
            abc_octave += ',';
        }
    }
    var output = abc_accidental + abc_step + abc_octave;
    if (!abc_note_1.default(output).valid) {
        throw new Error('Something went wrong converting scientific to ABC. Output invalid.');
    }
    return output;
}
exports.scientificToAbc = scientificToAbc;
;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = abc;

},{"./convert":4,"./note":9,"./validators/abc-note":15,"./validators/note":19}],2:[function(require,module,exports){
"use strict";
var note_1 = require("./note");
var note_collection_1 = require("./note-collection");
var chord_1 = require("./validators/chord");
var palette_1 = require("./palette");
var Chord = (function () {
    function Chord(chordName) {
        var parsed = chord_1.default(chordName).parse();
        if (!parsed) {
            throw new Error('Invalid chord name.');
        }
        var speciesIntervals = getSpeciesIntervals(parsed.species);
        var memberIntervals = palette_1.applyAlterations(speciesIntervals, parsed.alterations);
        this.name = chordName;
        this.type = 'chord';
        this.root = new note_1.default(parsed.root);
        this.formula = parsed.species + parsed.alterations;
        this.isSlash = parsed.slash === '/' ? true : false;
        this.bass = this.isSlash ? new note_1.default(parsed.bass) : this.root;
        this.intervals = memberIntervals;
        this.notes = getChordNotes(this.intervals, this.root);
    }
    Chord.prototype.transpose = function (direction, interval) {
        var root = this.root.transpose(direction, interval);
        return new Chord(root.name + this.formula);
    };
    Chord.prototype.toString = function () {
        return '[chord ' + this.name + ']';
    };
    return Chord;
}());
function getChordNotes(intervals, root) {
    var output = [];
    output.push(root);
    for (var i = 1; i < intervals.length; i++) {
        output.push(root.up(intervals[i]));
    }
    return new note_collection_1.default(output);
}
var getSpeciesIntervals = (function () {
    var basic_types = {
        five: ['R', 'P5'],
        maj: ['R', 'M3', 'P5'],
        min: ['R', 'm3', 'P5'],
        aug: ['R', 'M3', 'A5'],
        dim: ['R', 'm3', 'd5'],
        sus2: ['R', 'M2', 'P5'],
        sus4: ['R', 'P4', 'P5']
    };
    var extensions = {
        nine: ['M9'],
        eleven: ['M9', 'P11'],
        thirteen: ['M9', 'P11', 'M13']
    };
    var species_regex = /^(maj|min|mmin|m|aug|dim|alt|sus|\-)?((?:\d+)|(?:6\/9))?$/;
    return function getSpeciesIntervals(species) {
        // easy stuff
        if (species in basic_types) {
            return basic_types[species];
        }
        if (species === '') {
            return basic_types.maj;
        }
        if (species === '5') {
            return basic_types.five;
        }
        if (species === 'm' || species === '-') {
            return basic_types.min;
        }
        if (species === 'sus') {
            return basic_types.sus4;
        }
        var output = [];
        var captures = species_regex.exec(species);
        var prefix = captures[1] ? captures[1] : '', degree = captures[2] ? captures[2] : '';
        switch (prefix) {
            case '':
                if (degree === '6/9') {
                    output = output.concat(basic_types.maj, ['M6', 'M9']);
                }
                else {
                    output = output.concat(basic_types.maj, degree === '6' ? 'M6' : 'm7');
                }
                break;
            case 'maj':
                output = output.concat(basic_types.maj, degree === '6' ? 'M6' : 'M7');
                break;
            case 'min':
            case 'm':
            case '-':
                output = output.concat(basic_types.min, degree === '6' ? 'M6' : 'm7');
                break;
            case 'aug':
                output = output.concat(basic_types.aug, degree === '6' ? 'M6' : 'm7');
                break;
            case 'dim':
                output = output.concat(basic_types.dim, 'd7');
                break;
            case 'mmaj':
                output = output.concat(basic_types.min, 'M7');
                break;
            default:
                break;
        }
        switch (degree) {
            case '9':
                output = output.concat(extensions.nine);
                break;
            case '11':
                output = output.concat(extensions.eleven);
                break;
            case '13':
                output = output.concat(extensions.thirteen);
                break;
            default:
                break;
        }
        return output;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Chord;

},{"./note":9,"./note-collection":8,"./palette":10,"./validators/chord":16}],3:[function(require,module,exports){
"use strict";
var math_1 = require("./math");
var convert_1 = require("./convert");
var note_1 = require("./validators/note");
var interval_1 = require("./validators/interval");
var fifths = new math_1.Circle(['F', 'C', 'G', 'D', 'A', 'E', 'B']);
exports.fifths = fifths;
fifths.indexOf = function (noteName) {
    var step = noteName[0], accidental = noteName.slice(1), alter = convert_1.accidentalToAlter(accidental);
    var index = this.array.indexOf(step);
    index = index + (this.size * alter);
    return index - 1;
};
fifths.atIndex = function (index) {
    index = index + 1;
    var alter = Math.floor(index / this.array.length), accidental = convert_1.alterToAccidental(alter);
    index = math_1.modulo(index, this.size);
    return this.array[index] + accidental;
};
// these values represent the size of intervals arranged by fifths.
// Given 4, each value is value[i] = mod7(value[i-1] + 4) with
//   the exception that zero is avoided by setting mod7(7) = 7
var intervals = new math_1.Circle([4, 1, 5, 2, 6, 3, 7]);
exports.intervals = intervals;
intervals.indexOf = function (intervalName) {
    var parsed = interval_1.default(intervalName).parse();
    if (!parsed) {
        throw new Error('Invalid interval name.');
    }
    var quality = parsed.quality, size = parsed.size;
    // string to integer, make 'unison' into size 1
    // size = size === 'U' ? 1 : parseInt(size, 10);
    // normalize large intervals
    size = size <= 7 ? size : math_1.modulo(size, this.size);
    // adjust by -1 since array starts with P4 which is index -1
    var size_index = this.array.indexOf(size) - 1;
    // now calculate the correct index value based on the interval quality and size
    var index, len_A, len_d;
    if (quality === 'P' || quality === 'M') {
        index = size_index;
    }
    else if (quality === 'm') {
        index = size_index - this.size;
    }
    else if (quality.match(/A+/)) {
        len_A = quality.match(/A+/)[0].length;
        index = size_index + (this.size * len_A);
    }
    else if (quality.match(/d+/)) {
        len_d = quality.match(/d+/)[0].length;
        if (size === 1 || size === 4 || size === 5) {
            index = size_index - (this.size * len_d);
        }
        else {
            index = size_index - (this.size + (this.size * len_d));
        }
    }
    return index;
};
intervals.atIndex = function (index) {
    // adjustment needed since array starts with P4 which is index -1
    var idx = index + 1;
    // factor represents the number of trips around the circle needed
    //   to get to index, and the sign represents the direction
    //   negative: anticlockwise, positive: clockwise
    var factor = Math.floor(idx / this.size);
    // mod by the size to normalize the index now that we know the factor
    idx = math_1.modulo(idx, this.size);
    // the size of the resultant interval is now known
    var size = this.array[idx].toString(10);
    // time to calculate the quality
    var quality = '';
    if (factor > 0) {
        for (var f = 0; f < factor; f += 1) {
            quality += 'A';
        }
    }
    else if (factor === 0) {
        quality = idx < 3 ? 'P' : 'M';
    }
    else if (factor === -1) {
        quality = idx < 3 ? 'd' : 'm';
    }
    else if (factor < -1) {
        for (var nf = -1; nf > factor; nf -= 1) {
            quality += 'd';
        }
        quality += idx < 3 ? 'd' : '';
    }
    return quality + size;
};
var pitchNames = new math_1.Circle(['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']);
exports.pitchNames = pitchNames;
pitchNames.indexOf = function (member) {
    var parsed = note_1.default(member).parse();
    if (!parsed) {
        throw new Error('Invalid pitch name.');
    }
    var alter = convert_1.accidentalToAlter(parsed.accidental);
    var step_index = this.array.indexOf(parsed.step);
    // return pitch class if no octave given
    if (parsed.octave === null) {
        return math_1.mod12(step_index + alter);
    }
    return step_index + alter + (this.size * (parsed.octave + 1));
};
pitchNames.atIndex = function (index) {
    var octave = Math.floor(index / this.size) - 1;
    var note_index = math_1.mod12(index);
    return this.array[note_index] + octave.toString(10);
};

},{"./convert":4,"./math":7,"./validators/interval":17,"./validators/note":19}],4:[function(require,module,exports){
"use strict";
var primitives_1 = require("./primitives");
function accidentalToAlter(accidental) {
    if (!accidental) {
        return 0;
    }
    var totalSymbolValue = 0;
    // look up the value of each symbol in the parsed accidental
    for (var a = 0; a < accidental.length; a++) {
        totalSymbolValue += primitives_1.operators[accidental[a]];
    }
    // add the total value of the accidental to alter
    return totalSymbolValue;
}
exports.accidentalToAlter = accidentalToAlter;
function alterToAccidental(alter) {
    if (typeof alter === 'undefined') {
        throw new Error('Cannot convert alter to accidental, none given.');
    }
    if (alter === 0 || alter === null) {
        return '';
    }
    var accidental = '';
    while (alter < 0) {
        accidental += 'b';
        alter += 1;
    }
    while (alter > 1) {
        accidental += 'x';
        alter += -2;
    }
    while (alter > 0) {
        accidental += '#';
        alter += -1;
    }
    return accidental;
}
exports.alterToAccidental = alterToAccidental;
function mtof(midi) {
    return Math.pow(2, ((midi - 69) / 12)) * 440;
}
exports.mtof = mtof;

},{"./primitives":12}],5:[function(require,module,exports){
"use strict";
var interval_1 = require("./validators/interval");
var Interval = (function () {
    function Interval(intervalName) {
        var parsed = interval_1.default(intervalName).parse();
        if (!parsed) {
            throw new Error('Invalid interval name.');
        }
        this.steps = parsed.size - 1;
        var normalizedSize = parsed.size > 7 ? (this.steps % 7) + 1 : parsed.size;
        this.name = intervalName;
        this.type = 'interval';
        this.quality = parsed.quality;
        this.size = parsed.size;
        this.normalized = this.quality + normalizedSize.toString(10);
        this.species = getIntervalSpecies(normalizedSize);
        // this is kinda ugly but it works...
        //   dividing by 7 evenly returns an extra octave if the value is a multiple of 7
        this.octaves = Math.floor(this.size / 7.001);
        this.semitones = getIntervalSemitones(this.quality, normalizedSize, this.octaves, this.species);
    }
    return Interval;
}());
function getIntervalSemitones(quality, normalizedSize, octaves, species) {
    // semitones from root of each note of the major scale
    var major = [0, 2, 4, 5, 7, 9, 11];
    // qualityInt represents the integer difference from a major or perfect quality interval
    //   for example, m3 will yield -1 since a minor 3rd is one semitone less than a major 3rd
    var qualityInt = 0;
    var q1 = quality.slice(0, 1);
    switch (q1) {
        case 'P':
        case 'M':
            break;
        case 'm':
            qualityInt -= 1;
            break;
        case 'A':
            qualityInt += 1;
            break;
        case 'd':
            if (species === 'M') {
                qualityInt -= 2;
            }
            else {
                qualityInt -= 1;
            }
            break;
    }
    // handle additional augmentations or diminutions
    for (var q = 0; q < quality.slice(1).length; q++) {
        if (quality.slice(1)[q] === 'd') {
            qualityInt -= 1;
        }
        else if (quality.slice(1)[q] === 'A') {
            qualityInt += 1;
        }
    }
    return major[normalizedSize - 1] + qualityInt + (octaves * 12);
}
// 1,4,5 are treated differently than other interval sizes,
//   this helps to identify them immediately
function getIntervalSpecies(size) {
    if (size === 1 || size === 4 || size === 5) {
        return 'P';
    }
    else {
        return 'M';
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Interval;

},{"./validators/interval":17}],6:[function(require,module,exports){
"use strict";
var key_1 = require("./validators/key");
var circles_1 = require("./circles");
var Key = (function () {
    function Key(keyInput) {
        // run input through validation
        var parsed = key_1.default(keyInput).parse();
        if (!parsed) {
            throw new Error('Invalid key name: ' + keyInput.toString());
        }
        // assign mode based on the parsed input's quality
        if (/[a-g]/.test(parsed.step) || parsed.quality === 'minor' || parsed.quality === 'm') {
            this.mode = 'minor';
        }
        else {
            this.mode = 'major';
        }
        // now that we have the mode, enforce uppercase for root note
        parsed.step = parsed.step.toUpperCase();
        // get fifths for major key
        this.fifths = circles_1.fifths.indexOf(parsed.step + parsed.accidental);
        // minor is 3 fifths less than major
        if (this.mode === 'minor') {
            this.fifths -= 3;
            this.name = parsed.step.toLowerCase() + parsed.accidental + ' minor';
        }
        else {
            this.name = parsed.step + parsed.accidental + ' major';
        }
    }
    return Key;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Key;

},{"./circles":3,"./validators/key":18}],7:[function(require,module,exports){
"use strict";
var Circle = (function () {
    function Circle(array) {
        this.array = array;
        this.size = array.length;
    }
    // define functions for simple circular lookup
    // most instances will override these functions
    //   with custom accessors
    Circle.prototype.indexOf = function (item) {
        return this.array.indexOf(item);
    };
    Circle.prototype.atIndex = function (index) {
        return this.array[modulo(index, this.size)];
    };
    return Circle;
}());
exports.Circle = Circle;
function modulo(a, b) {
    if (a >= 0) {
        return a % b;
    }
    else {
        return ((a % b) + b) % b;
    }
}
exports.modulo = modulo;
function mod7(a) {
    return modulo(a, 7);
}
exports.mod7 = mod7;
function mod12(a) {
    return modulo(a, 12);
}
exports.mod12 = mod12;

},{}],8:[function(require,module,exports){
"use strict";
var note_1 = require("./note");
var interval_1 = require("./interval");
var utilities_1 = require("./utilities");
var pattern_1 = require("./pattern");
var NoteCollection = (function () {
    function NoteCollection(noteArray) {
        if (noteArray === void 0) { noteArray = []; }
        this.array = noteArray.map(function (d) {
            return utilities_1.toObject(d, toNote);
        });
    }
    NoteCollection.prototype.contents = function () {
        return this.array;
    };
    NoteCollection.prototype.each = function (fn) {
        this.array.forEach(fn);
        return this;
    };
    NoteCollection.prototype.contains = function (item) {
        var note = utilities_1.toObject(item, toNote);
        var output = false;
        this.each(function (d) {
            if (d.isEquivalent(note))
                output = true;
        });
        return output;
    };
    NoteCollection.prototype.add = function (item) {
        var note = utilities_1.toObject(item, toNote);
        this.array.push(note);
        return this;
    };
    NoteCollection.prototype.remove = function (item) {
        var note = utilities_1.toObject(item, toNote);
        this.array = this.array.filter(function (d) {
            return !d.isEquivalent(note);
        });
        return this;
    };
    NoteCollection.prototype.map = function (fn) {
        return new NoteCollection(this.array.map(fn));
    };
    NoteCollection.prototype.names = function () {
        return this.array.map(function (d) {
            return d.name;
        });
    };
    NoteCollection.prototype.patternFrom = function (item) {
        var note = utilities_1.toObject(item, toNote);
        if (!this.contains(note))
            return new pattern_1.default([]);
        var intervals = [];
        this.each(function (d) {
            intervals.push(new interval_1.default(d.intervalFrom(note)));
        });
        intervals.sort(function (a, b) {
            return a.size - b.size;
        });
        intervals = intervals.map(function (d) {
            var name = d.name !== 'P1' ? d.name : 'R';
            return name;
        });
        return new pattern_1.default(intervals);
    };
    ;
    return NoteCollection;
}());
function toNote(string) {
    return new note_1.default(string);
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = NoteCollection;

},{"./interval":5,"./note":9,"./pattern":11,"./utilities":14}],9:[function(require,module,exports){
"use strict";
var convert_1 = require("./convert");
var utilities_1 = require("./utilities");
var circles_1 = require("./circles");
var note_1 = require("./validators/note");
var abc_1 = require("./abc");
var Note = (function () {
    function Note(noteInput) {
        var name;
        if (utilities_1.isString(noteInput)) {
            name = noteInput;
        }
        else if (utilities_1.isNumber(noteInput)) {
            name = circles_1.pitchNames.atIndex(noteInput);
        }
        else {
            throw new TypeError('Note name must be a string or number.');
        }
        var parsed = note_1.default(name).parse();
        if (!parsed) {
            throw new Error('Invalid note name.');
        }
        this.name = name;
        this.type = 'note';
        this.pitchClass = circles_1.pitchNames.indexOf(parsed.step + parsed.accidental);
        this.parts = {
            step: parsed.step,
            accidental: parsed.accidental
        };
        if (parsed.octave !== null) {
            this.setOctave(parsed.octave);
        }
    }
    Note.prototype.setOctave = function (octave) {
        if (!utilities_1.isNumber(octave)) {
            throw new TypeError('Octave must be a number.');
        }
        this.name = this.parts.step + this.parts.accidental;
        this.type = 'pitch';
        this.octave = octave;
        this.scientific = this.name + octave.toString(10);
        this.abc = abc_1.scientificToAbc(this.scientific);
        this.midi = circles_1.pitchNames.indexOf(this.scientific);
        this.frequency = convert_1.mtof(this.midi);
    };
    Note.prototype.isEquivalent = function (other) {
        other = toNote(other);
        if (this.name !== other.name) {
            return false;
        }
        if (this.type === 'pitch' && other.type === 'pitch' && this.octave !== other.octave) {
            return false;
        }
        return true;
    };
    Note.prototype.isEnharmonic = function (other) {
        var otherNote = toNote(other);
        if (this.pitchClass !== otherNote.pitchClass) {
            return false;
        }
        if (this.type === 'pitch' && otherNote.type === 'pitch' && (Math.abs(this.midi - otherNote.midi) > 11)) {
            return false;
        }
        return true;
    };
    Note.prototype.transpose = function (direction, interval) {
        return new Note(utilities_1.transpose(this.type === 'pitch' ? this.scientific : this.name, direction, interval));
    };
    Note.prototype.intervalTo = function (note) {
        var otherNote = toNote(note);
        return circles_1.intervals.atIndex(circles_1.fifths.indexOf(otherNote.name) - circles_1.fifths.indexOf(this.name));
    };
    Note.prototype.intervalFrom = function (note) {
        var otherNote = toNote(note);
        return circles_1.intervals.atIndex(circles_1.fifths.indexOf(this.name) - circles_1.fifths.indexOf(otherNote.name));
    };
    Note.prototype.up = function (interval) {
        return this.transpose('up', interval);
    };
    Note.prototype.down = function (interval) {
        return this.transpose('down', interval);
    };
    Note.prototype.toString = function () {
        var name;
        if (this.type === 'note') {
            name = this.name;
        }
        else if (this.type === 'pitch') {
            name = this.scientific;
        }
        return '[note ' + name + ']';
    };
    return Note;
}());
function toNote(input) {
    if (utilities_1.isString(input)) {
        return new Note(input);
    }
    else {
        return input;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Note;

},{"./abc":1,"./circles":3,"./convert":4,"./utilities":14,"./validators/note":19}],10:[function(require,module,exports){
"use strict";
var interval_1 = require("./validators/interval");
var regex_1 = require("./regex");
function piaCompare(a, b) {
    var qualities = ['d', 'm', 'P', 'M', 'A'];
    if (a.size < b.size) {
        return -1;
    }
    else if (a.size > b.size) {
        return 1;
    }
    else {
        if (qualities.indexOf(a.quality) < qualities.indexOf(b.quality)) {
            return -1;
        }
        else if (qualities.indexOf(a.quality) > qualities.indexOf(b.quality)) {
            return 1;
        }
        else {
            return 0;
        }
    }
}
function isFalse(thing) {
    return thing === false;
}
var ParsedIntervalArray = (function () {
    function ParsedIntervalArray(intervalArray) {
        this.array = [];
        for (var i = 0; i < intervalArray.length; i++) {
            if (intervalArray[i] === 'R') {
                this.array.push({ quality: 'P', size: 1 });
            }
            else {
                var parsed = interval_1.default(intervalArray[i]).parse();
                if (!isFalse(parsed))
                    this.array.push(parsed);
            }
        }
    }
    ParsedIntervalArray.prototype.sort = function () {
        return this.array.sort(piaCompare);
    };
    ParsedIntervalArray.prototype.add = function (interval) {
        var pInterval = interval_1.default(interval).parse();
        if (!isFalse(pInterval)) {
            for (var i = 0; i < this.array.length; i++) {
                if (this.array[i].size === pInterval.size && this.array[i].quality === pInterval.quality) {
                    return;
                }
            }
            this.array.push(pInterval);
            this.sort();
        }
    };
    ParsedIntervalArray.prototype.remove = function (size) {
        // alias is the octave equivalent of size, for instance
        //   the alias of 2 is 9, alias of 13 is 6
        var alias = size <= 7 ? size + 7 : size - 7;
        var updated = [];
        // add all intervals that are not of the given size or its alias
        for (var i = 0; i < this.array.length; i++) {
            if (this.array[i].size !== size && this.array[i].size !== alias) {
                updated.push(this.array[i]);
            }
        }
        this.array = updated;
    };
    ParsedIntervalArray.prototype.update = function (interval) {
        var pInterval = interval_1.default(interval).parse();
        if (!isFalse(pInterval)) {
            // remove any intervals of the same size
            this.remove(pInterval.size);
            // add the new interval
            this.array.push(pInterval);
            this.sort();
        }
    };
    ParsedIntervalArray.prototype.unparse = function () {
        this.sort();
        var output = [];
        for (var i = 0; i < this.array.length; i++) {
            var str = this.array[i].quality + this.array[i].size;
            if (str === 'P1') {
                output.push('R');
            }
            else {
                output.push(str);
            }
        }
        return output;
    };
    return ParsedIntervalArray;
}());
exports.ParsedIntervalArray = ParsedIntervalArray;
var applyAlterations = (function () {
    var alteration_regex = /^(?:(?:add|sus|no)(?:\d+)|(?:sus|alt)|(?:n|b|\#|\+|\-)(?:\d+))/;
    // applies to alterations of the form (operation)(degree) such as 'b5' or '#9'
    var toInterval = function (alteration) {
        var valid = /(?:n|b|\#|\+|\-)(?:\d+)/;
        if (!valid.test(alteration)) {
            return false;
        }
        var operation = alteration.slice(0, 1);
        var degree = alteration.slice(1);
        if (operation === '+') {
            operation = '#';
        }
        if (operation === '-') {
            operation = 'b';
        }
        if (operation === '#') {
            return 'A' + degree;
        }
        if (operation === 'b') {
            if (degree === '5' || degree === '11' || degree === '4') {
                return 'd' + degree;
            }
            else {
                return 'm' + degree;
            }
        }
        if (operation === 'n') {
            if (degree === '5' || degree === '11' || degree === '4') {
                return 'P' + degree;
            }
            else {
                return 'M' + degree;
            }
        }
    };
    /* might want this later
      var intervalType = function(parsed_interval) {
        if (parsed_interval.quality === 'P' || parsed_interval.quality === 'M') {
          return 'natural';
        } else {
          return 'altered';
        }
      };
    */
    var alterationType = function (alteration) {
        if (/sus/.test(alteration)) {
            return 'susX';
        }
        if (/add/.test(alteration)) {
            return 'addX';
        }
        if (/no/.test(alteration)) {
            return 'noX';
        }
        if (/alt/.test(alteration)) {
            return 'alt';
        }
        return 'binary';
    };
    function getNaturalInterval(size) {
        var normalized = size < 8 ? size : size % 7;
        if (normalized === 1 || normalized === 4 || normalized === 5) {
            return 'P' + size.toString(10);
        }
        else {
            return 'M' + size.toString(10);
        }
    }
    return function (intervalArray, alterations) {
        var pia = new ParsedIntervalArray(intervalArray);
        var alterationArray = regex_1.splitStringByPattern(alterations, alteration_regex);
        // for each alteration...
        for (var a = 0; a < alterationArray.length; a++) {
            var thisAlteration = alterationArray[a];
            switch (alterationType(thisAlteration)) {
                case 'binary':
                    var asInterval = toInterval(thisAlteration);
                    pia.update(asInterval);
                    break;
                case 'susX':
                    pia.remove(3);
                    pia.add('P4');
                    break;
                case 'addX':
                    var addition = parseInt(thisAlteration.slice(3), 10);
                    pia.add(getNaturalInterval(addition));
                    break;
                case 'noX':
                    var removal = parseInt(thisAlteration.slice(2), 10);
                    pia.remove(removal);
                    break;
                case 'alt':
                    pia.update('d5');
                    pia.add('A5');
                    pia.update('m9');
                    pia.add('A9');
                    pia.update('m13');
                    break;
            }
        }
        return pia.unparse();
    };
})();
exports.applyAlterations = applyAlterations;

},{"./regex":13,"./validators/interval":17}],11:[function(require,module,exports){
"use strict";
var utilities_1 = require("./utilities");
var note_1 = require("./note");
var note_collection_1 = require("./note-collection");
var Pattern = (function () {
    function Pattern(intervals) {
        this.intervalNames = intervals;
    }
    Pattern.prototype.from = function (item) {
        var note = utilities_1.toObject(item, toNote);
        return new note_collection_1.default(this.intervalNames.map(function (d) {
            if (d === 'R')
                d = 'P1';
            return note.up(d);
        }));
    };
    return Pattern;
}());
function toNote(item) {
    if (utilities_1.isString(item)) {
        return new note_1.default(item);
    }
    else {
        return item;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Pattern;

},{"./note":9,"./note-collection":8,"./utilities":14}],12:[function(require,module,exports){
"use strict";
exports.operators = {
    'b': -1,
    '#': 1,
    'x': 2
};
exports.steps = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

},{}],13:[function(require,module,exports){
"use strict";
// this makes a validation function for a string type defined by 'name'
function makeValidation(name, exp, parser) {
    return function (input) {
        if (typeof input !== 'string') {
            throw new TypeError('Cannot validate ' + name + '. Input must be a string.');
        }
        var validate = function () {
            return input.match(exp) ? true : false;
        };
        return {
            valid: validate(),
            parse: function () {
                if (!validate()) {
                    return false;
                }
                var captures = exp.exec(input);
                return parser(captures);
            }
        };
    };
}
exports.makeValidation = makeValidation;
;
function splitStringByPattern(str, pattern) {
    var output = [];
    while (pattern.test(str)) {
        var thisMatch = str.match(pattern);
        output.push(thisMatch[0]);
        str = str.slice(thisMatch[0].length);
    }
    return output;
}
exports.splitStringByPattern = splitStringByPattern;
;

},{}],14:[function(require,module,exports){
"use strict";
var primitives_1 = require("./primitives");
var note_1 = require("./validators/note");
var interval_1 = require("./validators/interval");
var circles_1 = require("./circles");
function transpose(note_name, direction, interval) {
    if (direction !== 'up' && direction !== 'down') {
        throw new Error('Transpose direction must be either "up" or "down".');
    }
    var parsed_n = note_1.default(note_name).parse();
    if (!parsed_n) {
        throw new Error('Invalid note name.');
    }
    var parsed_i = interval_1.default(interval).parse();
    if (!parsed_i) {
        throw new Error('Invalid interval name.');
    }
    var factor = direction === 'up' ? 1 : -1;
    var new_note_name = circles_1.fifths.atIndex(circles_1.fifths.indexOf(parsed_n.step + parsed_n.accidental) +
        (factor * circles_1.intervals.indexOf(interval)));
    // check if octave adjustment is needed
    if (parsed_n.octave === null) {
        return new_note_name;
    }
    // octave adjustment
    var new_octave = parsed_n.octave + (factor * Math.floor(parsed_i.size / 8));
    var normalized_steps = parsed_i.size > 7 ? (parsed_i.size % 7) - 1 : parsed_i.size - 1;
    if ((primitives_1.steps.indexOf(parsed_n.step) + normalized_steps) >= 7) {
        new_octave += factor;
    }
    return new_note_name + new_octave.toString(10);
}
exports.transpose = transpose;
;
function isString(input) {
    return typeof input === 'string';
}
exports.isString = isString;
function isNumber(input) {
    return typeof input === 'number';
}
exports.isNumber = isNumber;
// ensures that a function requiring a note (or similar type of) object as input
//   gets an object rather than a string representation of it.
//   'obj' will be the function used to create the object.
function toObject(input, obj) {
    if (isString(input)) {
        input = obj(input);
    }
    if (typeof input !== 'object') {
        throw new TypeError('Input must be an object or string.');
    }
    return input;
}
exports.toObject = toObject;

},{"./circles":3,"./primitives":12,"./validators/interval":17,"./validators/note":19}],15:[function(require,module,exports){
"use strict";
var regex_1 = require("../regex");
function validateAbcNoteName(abcNoteName) {
    var abcRegex = /((?:\_|\=|\^)*)([a-g]|[A-G])((?:\,|\')*)/;
    return regex_1.makeValidation('abc-note', abcRegex, function (captures) {
        return {
            accidental: captures[1] ? captures[1] : '',
            step: captures[2],
            adjustments: captures[3] ? captures[3] : ''
        };
    })(abcNoteName);
}
;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = validateAbcNoteName;

},{"../regex":13}],16:[function(require,module,exports){
"use strict";
var regex_1 = require("../regex");
function validateChordName(chordName) {
    // lets split up this ugly regex
    var intro = /^/, root_note = /([A-G](?:b+|\#+|x+)?)/, species = /((?:maj|min|sus|aug|dim|mmaj|m|\-)?(?:\d+)?(?:\/\d+)?)?/, alterations = /((?:(?:add|sus)(?:\d+)|(?:sus|alt)|(?:\#|\+|b|\-)(?:\d+))*)/, bass_slash = /(\/)?/, bass_note = /([A-G](?:b+|\#+|x+)?)?/, outro = /$/;
    var chordRegex = new RegExp(intro.source +
        root_note.source +
        species.source +
        alterations.source +
        bass_slash.source +
        bass_note.source +
        outro.source);
    return regex_1.makeValidation('chord', chordRegex, function (captures) {
        return {
            root: captures[1],
            species: captures[2] ? captures[2] : '',
            alterations: captures[3] ? captures[3] : '',
            slash: captures[4] ? captures[4] : '',
            bass: captures[5] ? captures[5] : ''
        };
    })(chordName);
}
;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = validateChordName;

},{"../regex":13}],17:[function(require,module,exports){
"use strict";
var regex_1 = require("../regex");
function validateIntervalName(intervalName) {
    var intervalRegex = /^(P|M|m|A+|d+)(\d+|U)$/;
    return regex_1.makeValidation('interval', intervalRegex, function (captures) {
        return {
            quality: captures[1],
            size: parseInt(captures[2], 10)
        };
    })(intervalName);
}
;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = validateIntervalName;

},{"../regex":13}],18:[function(require,module,exports){
"use strict";
var regex_1 = require("../regex");
function validateKeyName(keyName) {
    var keyRegex = /^([A-G])(b+|\#+|x+)* ?(m|major|minor)?$/i;
    return regex_1.makeValidation('key', keyRegex, function (captures) {
        return {
            step: captures[1],
            accidental: captures[2] ? captures[2] : '',
            quality: captures[3] ? captures[3] : ''
        };
    })(keyName);
}
;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = validateKeyName;

},{"../regex":13}],19:[function(require,module,exports){
"use strict";
var regex_1 = require("../regex");
function validateNoteName(noteName) {
    var noteRegex = /^([A-G])(b+|\#+|x+)?(\-?[0-9]+)?$/;
    return regex_1.makeValidation('note', noteRegex, function (captures) {
        return {
            step: captures[1],
            accidental: captures[2] ? captures[2] : '',
            octave: captures[3] ? parseInt(captures[3], 10) : null
        };
    })(noteName);
}
;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = validateNoteName;

},{"../regex":13}],20:[function(require,module,exports){
"use strict";
var abc_1 = require("./abc");
var _circles = require("./circles");
var key_1 = require("./key");
var note_1 = require("./note");
var chord_1 = require("./chord");
var interval_1 = require("./interval");
var pattern_1 = require("./pattern");
var note_collection_1 = require("./note-collection");
var motive;
(function (motive) {
    motive.abc = abc_1.default;
    motive.key = function (keyInput) {
        return new key_1.default(keyInput);
    };
    motive.note = function (noteInput) {
        return new note_1.default(noteInput);
    };
    motive.chord = function (chordInput) {
        return new chord_1.default(chordInput);
    };
    motive.interval = function (intervalInput) {
        return new interval_1.default(intervalInput);
    };
    motive.pattern = function (patternInput) {
        return new pattern_1.default(patternInput);
    };
    motive.noteCollection = function (noteCollectionInput) {
        return new note_collection_1.default(noteCollectionInput);
    };
    motive.circles = _circles;
    motive.constructors = {
        Note: note_1.default,
        Interval: interval_1.default,
        Chord: chord_1.default
    };
})(motive || (motive = {}));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = motive;

},{"./abc":1,"./chord":2,"./circles":3,"./interval":5,"./key":6,"./note":9,"./note-collection":8,"./pattern":11}]},{},[20])(20)
});