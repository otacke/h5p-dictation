import Util from '@services/util.js';

/** Class representing a sound playing button. */
class Button {
  /**
   * @class
   * @param {number} id Content Id.
   * @param {object} params More params.
   * @param {object} params.a11y Readspeaker texts.
   * @param {string} params.a11y.play Readspeaker text for "Play".
   * @param {string} params.a11y.playSlowly Readspeaker text for "Play slowly".
   * @param {string} params.a11y.continuePlaying Readspeaker text for "Continue playing".
   * @param {string} params.a11y.continuePlayingSlowly Readspeaker text for "Continue playing slowly".
   * @param {string} params.a11y.triesLeft Readspeaker text for "number of tries left".
   * @param {string} params.a11y.infinite Readspeaker text for "infinite".
   * @param {string} params.a11y.enterText Readspeaker text for "Enter what you have heard here".
   * @param {string} params.a11y.solution Readspeaker text for "Solution".
   * @param {string} params.a11y.sentence Readspeaker text for "Sentence".
   * @param {string} params.audioNotSupported Text to show if audio not supported.
   * @param {number} params.tries Maximum number of tries before disabling button;
   * @param {string} params.sample Path to sound sample.
   * @param {number} params.type Type of the sample (0 = normal, 1 = slow);
   * @param {object} params.callbacks Callbacks.
   * @param {function} params.callbacks.playAudio PlayAudio callback.
   * @param {object} previousState PreviousState.
   */
  constructor(id, params, previousState = {}) {
    // Sanitization of params
    this.params = Util.extend({
      audioNotSupported: 'Your browser does not support this audio.',
      a11y: {
        play: 'Play',
        playSlowly: 'Play slowly',
        continuePlaying: 'Continue playing',
        continuePlayingSlowly: 'Continue playing slowly',
        triesLeft: 'number of tries left: @number',
        infinite: 'infinite',
        sentence: 'Sentence',
        solution: 'Solution',
        enterText: 'Enter what you have heard'
      },
      disablePause: false,
      type: Button.BUTTON_TYPE_NORMAL,
      callbacks: {
        playAudio: (() => {})
      }
    }, params);

    this.previousState = previousState;

    if (typeof previousState.triesLeft === 'undefined') {
      this.triesLeft = this.params.maxTries;
    }
    else if (previousState.triesLeft === null) {
      this.triesLeft = Infinity;
    }
    else {
      this.triesLeft = previousState.triesLeft;
    }

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
   * @returns {object} DOM element for the sample.
   */
  createAudioDOM(id, params) {
    const $audioWrapper = H5P.jQuery('<div>', { 'class': Button.AUDIO_WRAPPER });

    if (params.sample !== undefined) {
      // H5P.Audio
      const audioDefaults = {
        files: params.sample,
        audioNotSupported: params.audioNotSupported
      };

      this.audioInstance = new H5P.Audio(
        audioDefaults,
        id,
        {
          previousState: this.previousState.audio
        }
      );
      this.audioInstance.playOriginal = this.audioInstance.play;
      this.audioInstance.play = this.playOverride.bind(this);

      this.audioInstance.attach($audioWrapper);

      this.button = this.audioInstance.$audioButton.get(0);

      // Poor man's check for proper H5P.Tooltip version (should be in core 1.28+)
      if (H5P.Tooltip && !!H5P.Tooltip(document.createElement('div'))?.observer) {
        H5P.Tooltip(this.button, {position: 'bottom'});
      }

      this.audio = this.audioInstance;

      if (params.type === Button.BUTTON_TYPE_SLOW) {
        this.audioInstance.$audioButton
          .removeClass(Button.BUTTON_PLAY)
          .addClass(Button.BUTTON_SLOW);
        this.setLabel(params.a11y.playSlowly);
      }
      else {
        this.setLabel(params.a11y.play);
      }

      // Set from previous state
      if (this.triesLeft < 1) {
        this.audio.disableToggleButton();
      }

      // Set from previous state
      if (this.previousState.audio && this.previousState.audio.currentTime !== 0) {
        this.status = Button.STATUS_PAUSE;
        this.audioInstance.$audioButton.addClass(Button.BUTTON_PLAY_PAUSED);
      }

      // Event Listener Play
      this.audioInstance.audio.addEventListener('play', () => {
        // Prevent pausing
        if (params.disablePause) {
          this.audioInstance.$audioButton.get(0).classList.add('h5p-audio-disabled');
        }

        if (params.type === Button.BUTTON_TYPE_SLOW) {
          this.audioInstance.$audioButton
            .removeClass(Button.BUTTON_SLOW)
            .addClass(Button.BUTTON_PAUSE);
        }

        this.status = Button.STATUS_PLAYING;

        this.params.callbacks.playAudio(this);
      });

      // Event Listener Pause
      this.audioInstance.audio.addEventListener('pause', () => {

        if (params.type === Button.BUTTON_TYPE_SLOW) {
          this.audioInstance.$audioButton
            .removeClass(Button.BUTTON_PAUSE)
            .addClass(Button.BUTTON_SLOW);

          this.setLabel(params.a11y.continuePlayingSlowly, { amend: false });
        }
        else {
          this.setLabel(params.a11y.continuePlaying, { amend: false });
        }

        this.status = Button.STATUS_PAUSE;
      });

      // Event Listener Ended
      this.audioInstance.audio.addEventListener('ended', () => {
        this.handleAudioEnded();
      });

      // Have to stop, else audio will take up socket pending forever in chrome.
      if (this.audioInstance.audio && this.audioInstance.audio.preload) {
        this.audioInstance.audio.preload = 'none';
      }
    }

    return $audioWrapper.get(0);
  }

  /**
   * Get Button DOM.
   * @returns {object} Button DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Get DOM for dummy button.
   * @returns {object} DOM for dummy button.
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
   * Pause.
   */
  pause() {
    if (this.status === Button.STATUS_PLAYING) {
      this.button.click();
    }
  }

  /**
   * Stop.
   */
  stop() {
    if (this.status !== Button.STATUS_PLAYING) {
      return;
    }

    this.resetAudio();
    this.handleAudioEnded();
  }

  /**
   * Handle audio ended.
   */
  handleAudioEnded() {
    // Re-allow pausing
    if (this.params.disablePause) {
      this.audio.$audioButton.get(0).classList.remove('h5p-audio-disabled');
    }

    this.handlePlayed();

    if (this.params.type === Button.BUTTON_TYPE_SLOW) {
      this.audio.$audioButton
        .removeClass(Button.BUTTON_PAUSE)
        .addClass(Button.BUTTON_SLOW);
      this.setLabel(this.params.a11y.playSlowly);
    }
    else {
      this.setLabel(this.params.a11y.play);
    }

    this.status = Button.STATUS_ENDED;
  }

  /**
   * Decrease the number of tries and disable button if necessary.
   */
  handlePlayed() {
    this.triesLeft--;
    if (this.triesLeft === 0) {
      this.disable();
    }
  }

  /**
   * Set the aria label.
   * @param {string} label Label to set.
   * @param {object} options Options.
   * @param {boolean} options.amend If not false, append tries left to label.
   */
  setLabel(label, options = {}) {
    if (!this.button || !label) {
      return;
    }

    if (options.amend === false) {
      this.button.setAttribute('aria-label', label);
      return;
    }

    const tries = isFinite(this.triesLeft) ?
      this.triesLeft :
      this.params.a11y.infinite;

    const triesLeftLabel = this.params.a11y.triesLeft.replace(/@number/g, tries);
    this.button.setAttribute('aria-label', `${label}. ${triesLeftLabel}`);
  }

  /**
   * Reset button.
   */
  reset() {
    this.triesLeft = this.params.maxTries;
    if (this.audio) {
      this.audio.seekTo(0);
    }
    this.status = Button.STATUS_ENDED;

    this.enable();
    if (this.params.type === Button.BUTTON_TYPE_SLOW) {
      this.setLabel(this.params.a11y.playSlowly);
    }
    else {
      this.setLabel(this.params.a11y.play);
    }

    this.resetAudio();
  }

  /**
   * Enable button.
   */
  enable() {
    if (this.button) {
      this.audio.enableToggleButton();
    }
  }

  /**
   * Remove button from tabindex.
   */
  setUntabbable() {
    if (this.button) {
      this.button.setAttribute('tabindex', '-1');
    }
  }

  /**
   * Add button to tabindex.
   */
  setTabbable() {
    if (this.button) {
      this.button.setAttribute('tabindex', '0');
    }
  }

  /**
   * Disable button.
   */
  disable() {
    if (this.button) {
      this.audio.disableToggleButton();
    }
  }

  /**
   * Check if button is enabled.
   * @returns {boolean} True, if enabled.
   */
  isEnabled() {
    if (!this.button) {
      return false;
    }

    return this.audio.isEnabled();
  }

  /**
   * Reset audio.
   */
  resetAudio() {
    if (this.audio && this.audio.audio && this.audio.audio.load) {
      this.audio.audio.load();
    }

    // Reset button DOM
    if (!this.button) {
      return; // No sample for this button
    }

    this.button.classList.remove(Button.BUTTON_PAUSE);
    this.button.classList.remove(Button.BUTTON_PLAY_PAUSED);
    if (this.params.type === Button.BUTTON_TYPE_SLOW) {
      this.button.classList.add(Button.BUTTON_SLOW);
    }
    else {
      this.button.classList.add(Button.BUTTON_PLAY);
    }
  }

  /**
   * Get current state.
   * @returns {object} Current state.
   */
  getCurrentState() {
    return {
      audio: (this.audio) ? this.audio.getCurrentState() : undefined,
      triesLeft: this.triesLeft
    };
  }

  /**
   * Focus button.
   */
  focus() {
    if (this.button) {
      this.button.focus();
    }
  }

  /**
   * Override for original H5P.Audio play method. Allows delaying of playing.
   */
  playOverride() {
    if (this.isDelayingPlay) {
      return;
    }

    // No delay requested
    if (this.params.playButtonDelay === 0) {
      this.audioInstance.playOriginal();
      return;
    }

    // Add a small delay to the play button, workaround for something :-)
    const WORKAROUND_DELAY = 0.01;

    // There are 1000 ms in a second
    const MS_IN_S = 1000;

    this.isDelayingPlay = true;
    this.button.classList.add('h5p-dictation-delay-animation');
    this.button.style.animationDuration =
      `${this.params.playButtonDelay + WORKAROUND_DELAY}s`;

    window.clearTimeout(this.playTimeout);
    this.playTimeout = window.setTimeout(() => {
      this.audioInstance.playOriginal();
      this.button.classList.remove('h5p-dictation-delay-animation');
      this.button.style.animationDuration = '';
      this.isDelayingPlay = false;
    }, this.params.playButtonDelay * MS_IN_S);
  }

  isAudioPlaying() {
    return this.audio?.audio?.currentTime > 0;
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
Button.BUTTON_PLAY_PAUSED = 'h5p-audio-minimal-play-paused';
/** @constant {string} */
Button.BUTTON_PAUSE = 'h5p-audio-minimal-pause';
/** @constant {string} */
Button.BUTTON_SLOW = 'h5p-audio-minimal-slow';
/** @constant {string} */
Button.BUTTON_NONE = 'h5p-audio-minimal-none';
/** @constant {string} */
Button.INNER_CONTAINER = 'h5p-audio-inner';

export default Button;
