/** Class representing a sound playing button. */
class Button {
  /**
   * @constructor
   * @param {number} id Content Id.
   * @param {object} params More params.
   * @param {object} params.a11y Readspeaker texts.
   * @param {string} params.a11y.play Readspeaker text for "Play".
   * @param {string} params.a11y.playSlowly Readspeaker text for "Play slowly".
   * @param {string} params.a11y.triesLeft Readspeaker text for "number of tries left".
   * @param {string} params.a11y.infinite Readspeaker text for "infinite".
   * @param {string} params.a11y.enterText Readspeaker text for "Enter what you have heard here".
   * @param {string} params.a11y.solution Readspeaker text for "Solution".
   * @param {string} params.a11y.sentence Readspeaker text for "Sentence".
   * @param {string} params.audioNotSupported Text to show if audio not supported.
   * @param {number} params.tries Maximum number of tries before disabling button;
   * @param {string} params.sample Path to sound sample.
   * @param {number} params.type Type of the sample (0 = normal, 1 = slow);
   */
  constructor(id, params) {
    this.params = params;

    // Sanitization
    this.params.audioNotSupported = this.params.audioNotSupported || "Your browser does not support this audio.";
    this.params.a11y = params.a11y || [];
    this.params.a11y.play = this.params.a11y.play || 'Play';
    this.params.a11y.playSlowly = this.params.a11y.playSlowly || 'Play slowly';
    this.params.a11y.triesLeft = this.params.a11y.triesLeft || 'number of tries left: @number';
    this.params.a11y.infinite = this.params.a11y.infinite || 'infinite';
    this.params.a11y.sentence = this.params.a11y.sentence || 'Sentence';
    this.params.a11y.solution = this.params.a11y.solution || 'Solution';
    this.params.a11y.enterText = this.params.a11y.enterText || 'Enter what you have heard';
    this.params.type = this.params.type || Button.BUTTON_TYPE_NORMAL;

    this.triesLeft = this.params.maxTries;

    this.dom = this.createAudioDOM(id, this.params);
    // Placeholder if Audio could not be created
    if (this.dom.firstChild === null) {
      this.dom.appendChild(this.getDummyButtonDOM());
    }
    this.status = Button.STATUS_ENDED;
  }

  /**
   * Create H5P.Audio.
   * @param {number} id ContentID.
   * @param {object} params Parameters.
   * @return {object} DOM element for the sample.
   */
  createAudioDOM(id, params) {
    const $audioWrapper = H5P.jQuery('<div>', {'class': Button.AUDIO_WRAPPER});

    if (params.sample !== undefined) {
      // H5P.Audio
      const audioDefaults = {
        files: params.sample,
        audioNotSupported: params.audioNotSupported
      };

      const audio = new H5P.Audio(audioDefaults, id);
      audio.attach($audioWrapper);

      this.button = audio.$audioButton.get(0);
      this.audio = audio;

      if (params.type === Button.BUTTON_TYPE_SLOW) {
        audio.$audioButton
          .removeClass(Button.BUTTON_PLAY)
          .addClass(Button.BUTTON_SLOW);
        this.setLabel(params.a11y.playSlowly);
      }
      else {
        this.setLabel(params.a11y.play);
      }

      // Event Listener Play
      audio.audio.addEventListener('play', () => {

        if (params.type === Button.BUTTON_TYPE_SLOW) {
          audio.$audioButton
            .removeClass(Button.BUTTON_SLOW)
            .addClass(Button.BUTTON_PAUSE);
        }

        this.status = Button.STATUS_PLAYING;
      });

      // Event Listener Pause
      audio.audio.addEventListener('pause', () => {

        if (params.type === Button.BUTTON_TYPE_SLOW) {
          audio.$audioButton
            .removeClass(Button.BUTTON_PAUSE)
            .addClass(Button.BUTTON_SLOW);
        }

        this.status = Button.STATUS_PAUSE;
      });

      // Event Listener Ended
      audio.audio.addEventListener('ended', () => {
        this.handlePlayed();

        if (params.type === Button.BUTTON_TYPE_SLOW) {
          audio.$audioButton
            .removeClass(Button.BUTTON_PAUSE)
            .addClass(Button.BUTTON_SLOW);
          this.setLabel(this.params.a11y.playSlowly);
        }
        else {
          this.setLabel(this.params.a11y.play);
        }

        this.status = Button.STATUS_ENDED;
      });

      // Have to stop, else audio will take up socket pending forever in chrome.
      if (audio.audio && audio.audio.preload) {
        audio.audio.preload = 'none';
      }
    }

    return $audioWrapper.get(0);
  }

  /**
   * Get Button DOM.
   * @return {object} Button DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Get DOM for dummy button.
   * @return {object} DOM for dummy button.
   */
  getDummyButtonDOM() {
    const button = document.createElement('div');
    button.classList.add(Button.BUTTON);
    button.classList.add(Button.BUTTON_NONE);

    const buttonContainer = document.createElement('div');
    buttonContainer.classList.add(Button.INNER_CONTAINER);
    buttonContainer.appendChild(button);

    return buttonContainer;
  }

  /**
   * Play.
   */
  play() {
    if (this.status !== Button.STATUS_PLAYING) {
      this.button.click();
    }
  }

  /**
   * Decrease the number of tries and disable button if necessary.
   */
  handlePlayed() {
    this.triesLeft--;
    if (this.triesLeft === 0) {
      this.button.setAttribute('disabled', 'disabled');
      this.button.classList.add(Button.DISABLED);
    }
  }

  /**
   * Set the title label and the aria label.
   * @param {string} label Label to set.
   */
  setLabel(label) {
    const tries = isFinite(this.triesLeft) ?
      this.triesLeft :
      this.params.a11y.infinite;

    const triesLeftLabel = this.params.a11y.triesLeft.replace(/@number/g, tries);
    this.button.setAttribute('aria-label', `${label}. ${triesLeftLabel}`);
    this.button.setAttribute('title', triesLeftLabel);
  }

  /**
   * Reset button.
   */
  reset() {
    this.triesLeft = this.params.maxTries;
    this.enable();
    if (this.params.type === Button.BUTTON_TYPE_SLOW) {
      this.setLabel(this.params.a11y.playSlowly);
    }
    else {
      this.setLabel(this.params.a11y.play);
    }
  }

  /**
   * Enable button.
   */
  enable() {
    if (this.button) {
      this.button.removeAttribute('disabled');
      this.button.classList.remove(Button.DISABLED);
    }
  }

  /**
   * Disable button.
   */
  disable() {
    if (this.button) {
      this.button.setAttribute('disabled', 'disabled');
      this.button.classList.add(Button.DISABLED);
    }
  }

  /**
   * Reset audio.
   */
  resetAudio() {
    if (this.audio && this.audio.audio && this.audio.audio.load) {
      this.audio.audio.load();
    }

    // Reset button DOM
    this.button.classList.remove(Button.BUTTON_PAUSE);
    if (this.params.type === Button.BUTTON_TYPE_SLOW) {
      this.button.classList.add(Button.BUTTON_SLOW);
    }
    else {
      this.button.classList.add(Button.BUTTON_PLAY);
    }
  }

  /**
   * Focus button.
   */
  focus() {
    if (this.button) {
      this.button.focus();
    }
  }
}

// Button status
/** @constant {number} */
Button.BUTTON_TYPE_NORMAL = 0;
/** @constant {number} */
Button.BUTTON_TYPE_SLOW = 1;
/** @constant {number} */
Button.STATUS_PAUSE = 0;
/** @constant {number} */
Button.STATUS_PLAYING = 1;
/** @constant {number} */
Button.STATUS_ENDED = 2;

// Class names
/** @constant {string} */
Button.AUDIO_WRAPPER = 'h5p-dictation-audio-wrapper';
/** @constant {string} */
Button.BUTTON = 'h5p-audio-minimal-button';
/** @constant {string} */
Button.BUTTON_PLAY = 'h5p-audio-minimal-play';
/** @constant {string} */
Button.BUTTON_PAUSE = 'h5p-audio-minimal-pause';
/** @constant {string} */
Button.BUTTON_SLOW = 'h5p-audio-minimal-slow';
/** @constant {string} */
Button.BUTTON_NONE = 'h5p-audio-minimal-none';
/** @constant {string} */
Button.INNER_CONTAINER = 'h5p-audio-inner';
/** @constant {string} */
Button.DISABLED = 'disabled';

export default Button;
