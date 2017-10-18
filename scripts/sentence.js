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
  const DELATUR = '\u200C';

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
    console.log(text);
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
    return (this.splitSentence(this.getCorrectText(), {'stripPunctuation': this.params.ignorePunctuation})).length;
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
    let aligned = H5P.TextUtilities.alignArrays(
          this.splitSentence(this.getCorrectText(), {'stripPunctuation': this.params.ignorePunctuation}),
          this.splitSentence(this.getText(), {'stripPunctuation': this.params.ignorePunctuation})
    );

    let html = [];
    let mistakesAdded = 0;
    let mistakesMissing = 0;
    let mistakesWrong = 0;
    let mistakesTypo = 0;
    for (let i = 0; i < aligned.text1.length; i++) {
      if (aligned.text1[i] === undefined) {
        html.push('<span class="added">' + aligned.text2[i] + '</span>');
        mistakesAdded++;
      }
      if (aligned.text2[i] === undefined) {
        html.push('<span class="missing">' + aligned.text1[i] + '</span>');
        mistakesMissing++;
      }

      if (aligned.text1[i] !== aligned.text2[i] &&
            aligned.text1[i] !== undefined &&
            aligned.text2[i] !== undefined) {
        if (H5P.TextUtilities.areSimilar(aligned.text1[i], aligned.text2[i])) {
          mistakesTypo++;
        }
        else {
          mistakesWrong++;
        }
        html.push('<span class="added">' + aligned.text1[i] + '</span>' +
            '<span class="missing">' + aligned.text2[i] + '</span>');
      }

       if (aligned.text1[i] === aligned.text2[i]) {
        html.push('<span class="match">' + aligned.text1[i] + '</span>');
      }
    }
    return {
      // TODO: Find fix for join failing ... :-/
      'html': this.joinWords(html),
      'mistakes': {
        'added': mistakesAdded,
        'missing': mistakesMissing,
        'wrong': mistakesWrong,
        'typo': mistakesTypo,
        'total': mistakesAdded + mistakesMissing + mistakesWrong + mistakesTypo
      },
      'length': html.length
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
    // Sanitization
    if (!sentence) {
      return [];
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

    return sentence.split(' ');
  };

  /**
   * Join words together to a sentence.
   * @params {string} words - Words to concatenate with regard to removable spaces.
   * @return {string} Sentence.
   */
  Dictation.Sentence.prototype.joinWords = function (words) {
    // Sanitization
    if (typeof words === 'undefined') {
      return;
    }
    return words.join(' ')
        .replace(new RegExp(DELATUR + ' ', 'g'), '')
        .replace(new RegExp(' ' + DELATUR, 'g'), '');
    };

})(H5P.jQuery, H5P.Dictation, H5P.Audio);
