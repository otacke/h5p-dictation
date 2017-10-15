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

  Dictation.Sentence.prototype.computeResults = function() {
    // TODO: Think about .,! etc.
    let aligned = H5P.TextUtilities.alignArrays(
          this.getCorrectText().split(' '),
          this.getText().split(' ')
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
      'html': html.join(' '),
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

})(H5P.jQuery, H5P.Dictation, H5P.Audio);
