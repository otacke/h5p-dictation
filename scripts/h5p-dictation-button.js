(function ($, Dictation, Audio) {
  'use strict';

  const AUDIO_WRAPPER = 'h5p-dictation-audio-wrapper';
  const BUTTON = 'h5p-audio-minimal-button';
  const BUTTON_PLAY = 'h5p-audio-minimal-play';
  const BUTTON_PAUSE = 'h5p-audio-minimal-pause';
  const BUTTON_SLOW = 'h5p-audio-minimal-slow';
  const BUTTON_NONE = 'h5p-audio-minimal-none';
  const INNER_CONTAINER = 'h5p-audio-inner';
  const DISABLED = 'disabled';

  /**
   * Constructor
   *
   * @param {number} id - Content Id.
   * @param {object} params - More params.
   * @param {object} params.a11y - Readspeaker texts.
   * @param {string} params.a11y.play - Readspeaker text for "Play".
   * @param {string} params.a11y.playSlowly - Readspeaker text for "Play slowly".
   * @param {string} params.a11y.triesLeft - Readspeaker text for "Number of tries left".
   * @param {string} params.a11y.infinite - Readspeaker text for "infinite".
   * @param {string} params.a11y.enterText - Readspeaker text for "Enter what you have heard here".
   * @param {string} params.a11y.solution - Readspeaker text for "Solution".
   * @param {string} params.a11y.sentence - Readspeaker text for "Sentence".
   * @param {string} params.audioNotSupported - Text to show if audio not supported.
   * @param {number} params.tries - Maximum number of tries before disabling button;
   * @param {string} params.sample - Path to sound sample.
   * @param {number} params.type - Type of the sample (0 = normal, 1 = slow);
   */
  Dictation.Button = function (id, params) {
    this.params = params;

    // Sanitization
    this.params.audioNotSupported = this.params.audioNotSupported || "Your browser does not support this audio.";
    this.params.a11y = params.a11y || [];
    this.params.a11y.play = this.params.a11y.play || 'Play';
    this.params.a11y.playSlowly = this.params.a11y.playSlowly || 'Play slowly';
    this.params.a11y.triesLeft = this.params.a11y.triesLeft || 'Number of tries left: @number';
    this.params.a11y.infinite = this.params.a11y.infinite || 'infinite';
    this.params.a11y.sentence = this.params.a11y.sentence || 'Sentence';
    this.params.a11y.solution = this.params.a11y.solution || 'Solution';
    this.params.a11y.enterText = this.params.a11y.enterText || 'Enter what you have heard';
    this.params.type = this.params.type || Dictation.Button.BUTTON_TYPE_NORMAL;

    this.triesLeft = this.params.maxTries;

    this.dom = this.createAudioDOM(id, this.params);
    // Placeholder if Audio could not be created
    if (this.dom.firstChild === null) {
      this.dom.appendChild(this.getDummyButton());
    }
    this.status = Dictation.Button.STATUS_ENDED;
  };

  /**
   * Create H5P.Audio.
   *
   * @param {number} id - ContentID.
   * @param {object} params - Parameters.
   * @return {object} DOM element for the sample.
   */
  Dictation.Button.prototype.createAudioDOM = function (id, params) {
    const that = this;
    const $audioWrapper = $('<div>', {'class': AUDIO_WRAPPER});

    if (params.sample !== undefined) {

      // H5P.Audio
      const audioDefaults = {
        files: params.sample,
        audioNotSupported: params.audioNotSupported
      };
      const audio = new Audio(audioDefaults, id);
      audio.attach($audioWrapper);
      this.button = audio.$audioButton.get(0);
      this.audio = audio;

      if (params.type === Dictation.Button.BUTTON_TYPE_SLOW) {
        audio.$audioButton.removeClass(BUTTON_PLAY).addClass(BUTTON_SLOW);
        this.setLabel(params.a11y.playSlowly);
      }
      else {
        this.setLabel(params.a11y.play);
      }

      // Event Listener Play
      audio.audio.addEventListener('play', function () {
        if (params.type === Dictation.Button.BUTTON_TYPE_SLOW) {
          audio.$audioButton.removeClass(BUTTON_SLOW).addClass(BUTTON_PAUSE);
        }
        that.status = Dictation.Button.STATUS_PLAYING;
      });

      // Event Listener Pause
      audio.audio.addEventListener('pause', function () {
        if (params.type === Dictation.Button.BUTTON_TYPE_SLOW) {
          audio.$audioButton.removeClass(BUTTON_PAUSE).addClass(BUTTON_SLOW);
        }
        that.status = Dictation.Button.STATUS_PAUSE;
      });

      // Event Listener Ended
      audio.audio.addEventListener('ended', function () {
        that.handleTries();
        if (params.type === Dictation.Button.BUTTON_TYPE_SLOW) {
          audio.$audioButton.removeClass(BUTTON_PAUSE).addClass(BUTTON_SLOW);
          that.setLabel(that.params.a11y.playSlowly);
        }
        else {
          that.setLabel(that.params.a11y.play);
        }
        that.status = Dictation.Button.STATUS_ENDED;
      });

      // Have to stop, else audio will take up a socket pending forever in chrome.
      if (audio.audio && audio.audio.preload) {
        audio.audio.preload = 'none';
      }
    }

    return $audioWrapper.get(0);
  };

  /**
   * Get Button DOM.
   *
   * @return {object} Button DOM.
   */
  Dictation.Button.prototype.getDOM = function () {
    return this.dom;
  };

  /**
   * Get DOM for dummy button.
   *
   * @return {object} DOM for dummy button.
   */
  Dictation.Button.prototype.getDummyButton = function () {
    const inner2 = document.createElement('div');
    inner2.classList.add(BUTTON);
    inner2.classList.add(BUTTON_NONE);

    const inner = document.createElement('div');
    inner.classList.add(INNER_CONTAINER);
    inner.appendChild(inner2);

    return inner;
  };

  /**
   * Play.
   */
  Dictation.Button.prototype.play = function () {
    if (this.status !== Dictation.Button.STATUS_PLAYING) {
      this.button.click();
    }
  };

  /**
   * Decrease the number of tries and disable button if necessary.
   */
  Dictation.Button.prototype.handleTries = function () {
    this.triesLeft--;
    if (this.triesLeft === 0) {
      this.button.setAttribute('disabled', 'disabled');
      this.button.classList.add(DISABLED);
    }
  };

  /**
   * Set the title label and the aria label.
   *
   * @param {string} label - The label to set.
   */
  Dictation.Button.prototype.setLabel = function (label) {
    const tries = isFinite(this.triesLeft) ? this.triesLeft : this.params.a11y.infinite;
    const triesLeftLabel = this.params.a11y.triesLeft.replace(/@number/g, tries);
    this.button.setAttribute('aria-label', label + '.' + triesLeftLabel);
    this.button.setAttribute('title', triesLeftLabel);
  };

  /**
   * Reset button.
   */
  Dictation.Button.prototype.reset = function () {
    this.triesLeft = this.params.maxTries;
    this.enable();
    if (this.params.type === Dictation.Button.BUTTON_TYPE_SLOW) {
      this.setLabel(this.params.a11y.playSlowly);
    }
    else {
      this.setLabel(this.params.a11y.play);
    }
  };

  /**
   * Enable button.
   */
  Dictation.Button.prototype.enable = function () {
    if (this.button) {
      this.button.removeAttribute('disabled');
      this.button.classList.remove(DISABLED);
    }
  };

  /**
   * Disable button.
   */
  Dictation.Button.prototype.disable = function () {
    if (this.button) {
      this.button.setAttribute('disabled', 'disabled');
      this.button.classList.add(DISABLED);
    }
  };

  /**
   * Reset audio.
   */
  Dictation.Button.prototype.resetAudio = function () {
    if (this.audio && this.audio.audio && this.audio.audio.load) {
      this.audio.audio.load();
    }
    this.button.classList.remove(BUTTON_PAUSE);
    if (this.params.type === Dictation.Button.BUTTON_TYPE_SLOW) {
      this.button.classList.add(BUTTON_SLOW);
    }
    else {
      this.button.classList.add(BUTTON_PLAY);
    }
  };

  /**
   * Focus button.
   */
  Dictation.Button.prototype.focus = function () {
    if (this.button) {
      this.button.focus();
    }
  };

  /** @constant {Number} */
  Dictation.Button.BUTTON_TYPE_NORMAL = 0;
  /** @constant {Number} */
  Dictation.Button.BUTTON_TYPE_SLOW = 1;
  /** @constant {Number} */
  Dictation.Button.STATUS_PAUSE = 0;
  /** @constant {Number} */
  Dictation.Button.STATUS_PLAYING = 1;
  /** @constant {Number} */
  Dictation.Button.STATUS_ENDED = 2;

})(H5P.jQuery, H5P.Dictation, H5P.Audio);
