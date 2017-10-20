/* jslint esversion: 6 */

(function ($, Dictation, Audio) {
  'use strict';

  // TODO: Comments

  // CSS Classes:
  const CONTENT_WRAPPER = 'h5p-sentence';
  const AUDIO_WRAPPER = 'h5p-dictation-audio-wrapper';
  const INPUT_WRAPPER = 'h5p-input-wrapper';
  const INPUT_FIELD = 'h5p-text-input';
  const HIDE = 'hide'; // TODO: rwname?

  // TODO: Make editable
  const PUNCTUATION = '[.?!,\'\";\\:\\-\\(\\)\/\\+\\-\\*\u201C\u201E]';
  const WORD = '\\w';

  // Not visible, but present
  //TODO: const DELATUR = '\u200C';
  const DELATUR = '\u00ff';

  Dictation.Sentence = function (params) {
    let that = this;
    this.params = params;
    this.triesLeft = params.repetitions;

    this.solution = (!params.ignorePunctuation) ? params.sentence.text : this.stripPunctuation(params.sentence.text);
    this.mistakesMax = this.addDelaturs(this.solution).split(' ').length;

    // TODO: Sanitization
    this.content = document.createElement('div');
    this.content.classList.add(CONTENT_WRAPPER);

    // Normal audio
    this.audio = this.createAudio(params.sentence.sample, params.audioNotSupported);
    this.audio.addEventListener('click', function () {
      that.handleTries();
    });
    this.content.appendChild(this.audio);

    // TODO: Possibly 2nd sample with slower speed

    // Text input field
    this.inputField = document.createElement('input');
    this.inputField.classList.add(INPUT_FIELD);
    let inputWrapper = document.createElement('div');
    inputWrapper.classList.add(INPUT_WRAPPER);
    inputWrapper.appendChild(this.inputField);
    this.content.appendChild(inputWrapper);

    // TODO: delete
    console.log(H5P.TextUtilities.areSimilar('brown', 'bri'))
  };

  /**
   * Remove delatur symbols.
   * @param {array|string} words - Text to be cleaned.
   * @return {array} Cleaned words of a text.
   */
  Dictation.Sentence.prototype.removeDelaturs = function (words) {
    let returnString = false;
    if (typeof words === 'string') {
      words = [words];
      returnString = true;
    }
    if (words === undefined) {
      return undefined;
    }
    else {
      words = words.map(function (word) {
        return (word === undefined) ? undefined : word.replace(new RegExp(DELATUR, 'g'), '');
      });
    }
    return (returnString) ? words[0] : words;
  };

  Dictation.Sentence.prototype.handleTries = function () {
    this.triesLeft--;
    if (this.triesLeft === 0) {
      this.audio.classList.add(HIDE);
    }
  };

  /**
   * Get content for H5P.Question.
   * @return {object} DOM elements for content.
   */
  Dictation.Sentence.prototype.getContent = function () {
    return this.content;
  };

  /**
   * Get current text in InputField.
   * @return {string} Current text.
   */
  Dictation.Sentence.prototype.getText = function () {
    return this.inputField.value;
  };

  /**
   * Set current text in InputField.
   * @param {string} text - Current text.
   */
  Dictation.Sentence.prototype.setText = function (text) {
    // Sanitization
    if (typeof text !== 'string') {
      return;
    }
    this.inputField.value = text;
  };

  /**
   * Get correct text.
   * @return {string} Correct text.
   */
  Dictation.Sentence.prototype.getCorrectText = function () {
    return this.solution;
  };

  Dictation.Sentence.prototype.createAudio = function (sample, audioNotSupported) {
    let that = this;
    let audio;
    let $audioWrapper = $('<div>', {
      'class': AUDIO_WRAPPER
    });

    if (sample !== undefined) {

      let audioDefaults = {
        files: sample,
        audioNotSupported: audioNotSupported
      };
      audio = new Audio(audioDefaults, that.contentId);
      audio.attach($audioWrapper);

      // Have to stop else audio will take up a socket pending forever in chrome.
      if (audio.audio && audio.audio.preload) {
        audio.audio.preload = 'none';
      }
    }
    else {
      $audioWrapper.addClass('hide');
    }

    return $audioWrapper.get(0);
  };

  Dictation.Sentence.prototype.getMaxMistakes = function () {
    return this.mistakesMax;
  };

  Dictation.Sentence.prototype.reset = function () {
    this.inputField.value = '';
  };

  Dictation.Sentence.prototype.disable = function () {
    this.inputField.disabled = true;
  };

  Dictation.Sentence.prototype.enable = function () {
    this.inputField.disabled = false;
  };

  /**
   * Add spaces + delatur symbols between text and punctuation.
   * @param {string} text - Text to enter spaces + symbols.
   @ @return {string} Text with spaces and symbols.
   */
  Dictation.Sentence.prototype.addDelaturs = function (text) {
    text = text.replace(new RegExp('('+WORD+')('+PUNCTUATION+')', 'g'), '$1 '+DELATUR+'$2');
    text = text.replace(new RegExp('('+PUNCTUATION+')('+WORD+')', 'g'), '$1'+DELATUR+' $2');
    return text;
  };


  /**
   * Get pattern of spaces to add behind aliged array of words.
   * @param {array} words - Words to get spaces for.
   * @return {array} Spaces.
   */
  Dictation.Sentence.prototype.getSpaces = function (words) {
    let output = [];
    if (words.length < 2) {
      return words;
    }
    words = words.map(function (word) {
      //return (word === undefined) ? '' : word;
      return word || '';
    });
    for (let i = 0; i < words.length-1; i++) {
      output.push((words[i].substr(-1) === DELATUR || words[i+1].substring(0, 1) === DELATUR) ? '' : ' ');
    }
    output.push('');
    return output;
  };

  /**
   * Strip punctuation from a sentence.
   * @param {array|string} words - Words of a sentence.
   * @return {array} Words without punctuation.
   */
  Dictation.Sentence.prototype.stripPunctuation = function (words) {
    if (typeof words === 'string') {
      let returnString = true;
      words = [words];
    }
    words = words.map(function (word) {
      return word.replace(new RegExp(PUNCTUATION, 'g'), '');
    });
    return (returnString) ? words.toString() : words;
  };

  Dictation.Sentence.prototype.computeResults = function() {
    // TODO: strip punctuation
    let wordsSolution = this.addDelaturs(this.getCorrectText()).split(' ');
    let answer = this.getText();
    if (this.params.ignorePunctuation) {
      answer = answer.stripPunctuation();
    }
    let wordsAnswer = this.addDelaturs(answer).split(' ');

    console.log(wordsSolution, wordsAnswer);

    let aligned = this.alignWords(wordsSolution, wordsAnswer);
    console.log(aligned);

    let spaces = this.getSpaces(aligned.words1);

    let words = [];

    let mistakes = 0;
    for(let i = 0; i < aligned.words1.length; i++) {
      let solution = aligned.words1[i];
      let answer = aligned.words2[i];
      let type = '';

      // TODO: make constants
      if (solution === undefined) {
        type = 'added';
        mistakes++;
      }
      else if (answer === undefined) {
        type = 'missing';
        mistakes++;
      }
      else if (answer === solution) {
        type = 'match';
      }
      else if (H5P.TextUtilities.areSimilar(solution, answer)) {
        type = 'typo';
        mistakes++;
      }
      else {
        type = 'wrong';
        mistakes++;
      }
      words.push({
        "solution": this.removeDelaturs(solution),
        "answer": this.removeDelaturs(answer),
        "type": type
      });
    }

    let output = {
      "mistakes": {
        "total": Math.min(mistakes, this.getMaxMistakes())
      },
      "words": words,
      'spaces': spaces
    };

    console.log(output);
    return output;
  };

  /**
   * Bring two array of words to same length and match the words' positions
   * @param {array} words1 - First Array of words.
   * @param {array} words2 - Second Array of words.
   * @return {object} Object containing two new arrays.
   */
  Dictation.Sentence.prototype.alignWords = function (words1, words2) {
    if (words1.length === words2.length) {
      return {
        "words1": words1,
        "words2": words2
      };
    }

    words2 = words2.map(function (word) {
      return (word === '') ? undefined : word;
    });

    let diff = words2.length - words1.length;
    for (let i = 0; i < diff; i++) {
      words1.push(undefined);
    }

    let master = (words1.length >= words2.length) ? words1 : words2;
    let slave = (words1.length >= words2.length) ? words2 : words1;

    console.log(master, slave);

    let slaveNew = [];
    for (let i = 0; i < master.length; i++) {
      slaveNew.push(undefined);
    }

    let posEnd = master.length-1;
    for (let i = slave.length-1; i >= 0; i--) {
      let destination = master.lastIndexOf(slave[i]);

      if (destination < 0) {
        destination = posEnd;
        // TODO: We could possibly re-align those non-matches after
        //       we have set everything else. Could be moved to the
        //       best fitting master word (Levenshtein) in between the
        //       surrounding other slave words
      }
      else {
        destination = Math.min(destination, posEnd);
      }

      slaveNew[destination] = slave[i];
      posEnd = destination - 1;
      if (posEnd === -1) {
        for (let j = 0; j < i; j++) {
          slaveNew.unshift(undefined);
        }
        posEnd = 0;
      }
    }

    // Someone might have added wrong words at the beginning
    diff = slaveNew.length - master.length;
    for(let i = 0; i < diff; i++) {
      master.unshift(undefined);
    }

    // Remove clutter that may appear when the answer is weird and longer that the solution
    for (let i = words1.length-1; i > 0; i--) {
      if (words1[i] === undefined && slaveNew[i] === undefined) {
        words1.splice(i,1);
        slaveNew.splice(i,1);
      }
    }

    return {
      "words1": words1,
      "words2": slaveNew
    };
  };

})(H5P.jQuery, H5P.Dictation, H5P.Audio);
