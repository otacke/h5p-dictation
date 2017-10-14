(function ($, Dictation, Audio) {
  'use strict';

  // TODO: Comments

  // CSS Classes:
  const CONTENT_WRAPPER = 'h5p-sentence';
  const AUDIO_WRAPPER = 'h5p-dictation-audio-wrapper';
  const INPUT_WRAPPER = 'h5p-input-wrapper';
  const INPUT_FIELD = 'h5p-text-input';
  const HIDE = 'hide';

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

    // Optional slow audio
    this.audioSlow = this.createAudio(params.sentence.sampleSlow, params.audioNotSupported);
    this.audioSlow.addEventListener('click', function () {
      that.handleTries();
    });
    this.content.appendChild(this.audioSlow);

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
      this.audioSlow.classList.add(HIDE);
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

})(H5P.jQuery, H5P.Dictation, H5P.Audio);
