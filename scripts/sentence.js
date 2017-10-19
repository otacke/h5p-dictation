/* jslint esversion: 6 */

(function ($, Dictation, Audio) {
  'use strict';

  // TODO: Comments

  // CSS Classes:
  const CONTENT_WRAPPER = 'h5p-sentence';
  const AUDIO_WRAPPER = 'h5p-dictation-audio-wrapper';
  const INPUT_WRAPPER = 'h5p-input-wrapper';
  const INPUT_FIELD = 'h5p-text-input';
  const HIDE = 'hide';

  const PUNCTUATION_SYMBOLS = /[.?!,\'\";\:\-\(\)\/\u201E\u201C]/g;

  // Not visible, but present
  //const DELATUR = '\u200C';
  const DELATUR = '\u00ff';

  Dictation.Sentence = function (params) {
    let that = this;
    this.params = params;
    this.triesLeft = params.repetitions;

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
    return this.params.sentence.text;
  };

  Dictation.Sentence.prototype.computeMistakes = function () {
    return H5P.TextUtilities.computeLevenshteinDistance(this.getText(), this.getCorrectText(), false);
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
    let words = this.splitSentence(
        this.getCorrectText(),
        {'stripPunctuation': this.params.ignorePunctuation}
    );
    return words.words.length;
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

  Dictation.Sentence.prototype.computeResults = function() {
    let wordsCorrect = this.splitSentence(this.getCorrectText(), {'stripPunctuation': this.params.ignorePunctuation});
    let wordsAnswer = this.splitSentence(this.getText(), {'stripPunctuation': this.params.ignorePunctuation});

    // TODO: Get that out of TextUtilities
    let aligned = H5P.TextUtilities.alignArrays(wordsCorrect.words, wordsAnswer.words);

    // TODO: clean up
    // TODO: xAPI values needed per sentence

    let texts = [];
    let mistakesAdded = 0;
    let mistakesMissing = 0;
    let mistakesWrong = 0;
    let mistakesTypo = 0;
    let mistakesPunctuation = 0;
    let solution, answer, type = '';
    let punctuation = false;

    for (let i = 0; i < aligned.text1.length; i++) {
      solution = aligned.text1[i];
      answer = aligned.text2[i];
      punctuation = PUNCTUATION_SYMBOLS.test(aligned.text1[i]);

      if (solution === undefined) {
        // TODO: Make constants
        type = 'added';
        mistakesAdded++;
        mistakesPunctuation += punctuation ? 1 : 0;
      }
      if (answer === undefined) {
        type = 'missing';
        mistakesMissing++;
        mistakesPunctuation += punctuation ? 1 : 0;
      }
      if (solution !== answer && solution !== undefined && answer !== undefined) {
        if (H5P.TextUtilities.areSimilar(solution, answer)) {
          type = 'typo';
          mistakesTypo++;
          mistakesPunctuation += punctuation ? 1 : 0;
        }
        else {
          type = 'wrong';
          mistakesWrong++;
          mistakesPunctuation += punctuation ? 1 : 0;
        }
      }

      if (solution === answer) {
        type = 'match';
      }
      texts.push({
        'solution': solution,
        'answer': answer,
        'punctuation': punctuation,
        'type': type
      });
    }
    return {
      'solution': this.getCorrectText(),
      'texts': texts,
      'mistakes': {
        'punctuation': mistakesPunctuation,
        'spelling': texts.length - mistakesPunctuation,
        'added': mistakesAdded,
        'missing': mistakesMissing,
        'wrong': mistakesWrong,
        'typo': mistakesTypo,
        'total': mistakesAdded + mistakesMissing + mistakesWrong + mistakesTypo
      },
      'length': texts.length,
      'spaces': wordsCorrect.spaces
    };
  };

  /**
   * Split a sentence in words and account for spaces to be deleted in regard to punctuation.
   * @params {string} sentence - Sentence to be split.
   * @params {object} params - Parameters.
   * @params {string} params.punctuationSymbols - Punctuation symbols.
   * @params {boolean} params.StripPunctuation - If true, punctuation symbols will be removed.
   * @return {Array} Words (and punctuation symbols) from the sentence.
   */
  Dictation.Sentence.prototype.splitSentence = function (sentence, params) {
    let words = [];
    let spaces = [];
    // Sanitization
    if (!sentence) {
      return {'words': words, 'spaces': spaces};
    }
    if (!params) {
      params = {};
    }
    if (typeof params.punctuationSymbols === 'undefined') {
      params.punctuationSymbols = PUNCTUATION_SYMBOLS.source;
    }

    // Strip punctuation from sentence if requested
    if (typeof params.stripPunctuation === 'undefined' || params.stripPunctuation === true) {
      sentence = sentence.replace(new RegExp(params.punctuationSymbols, 'g'), '');
    }

    // Add delatur symbol indicating the the space before/after the punctuation symbol should be removed when joining
    sentence = sentence.replace(new RegExp('(' + params.punctuationSymbols + ')(\\w{2,})', 'g'), '$1' + DELATUR + ' $2');
    sentence = sentence.replace(new RegExp('(\\w{2,})(' + params.punctuationSymbols + ')', 'g'), '$1 ' + DELATUR + '$2');

    words = sentence.split(' ');

    for (let i = 0; i < words.length-1; i++) {
      spaces.push(
          !(words[i].substr(-1) === DELATUR || words[i+1].substring(0, 1) === DELATUR) ? ' ': ''
      );
    }
    spaces.push('');
    words = words.map(function (word) {
      return word.replace(new RegExp(DELATUR, 'g'), '');
    });

    return {'words': words, 'spaces': spaces};
  };

})(H5P.jQuery, H5P.Dictation, H5P.Audio);
