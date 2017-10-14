var H5P = H5P || {};

H5P.Dictation = function ($, Audio, Question) {
  'use strict';

  // TODO: xAPI
  // TODO:

  /**
   * @constructor
   *
   * @param {Object} config - Config from semantics.json.
   * @param {string} contentId - ContentId.
   * @param {Object} contentData - contentData.
   */
  function Dictation(config, contentId, contentData) {
    let that = this;
    // Initialize
    if (!config) {
      return;
    }

    // Inheritance
    Question.call(this, 'dictation');

    this.config = config;
    this.contentId = contentId;
    this.contentData = contentData || {};

    this.extend(this.config, {
      "behaviour": {
        "repetitions": Infinity,
        "mistakesPassing" : 0,
        "mistakesMastering": 0
      }
    });

    //console.log(config);
    this.sentences = [];
    this.config.sentences.forEach(function (element) {
      that.sentences.push(new H5P.Dictation.Sentence({
        "sentence": element,
        "audioNotSupported": that.config.audioNotSupported,
        "repetitions": that.config.behaviour.repetitions
      }));
    });
  }

  // Extends Question
  Dictation.prototype = Object.create(Question.prototype);
  Dictation.prototype.constructor = Dictation;

  /**
   * Register the DOM elements with H5P.Question.
   */
  Dictation.prototype.registerDomElements = function () {

    // Register task introduction text
    this.setIntroduction(this.config.taskDescription);

    // Build content
    let content = document.createElement('div');
    this.sentences.forEach(function (element) {
      content.appendChild(element.getContent());
    });

    // Register content
    this.setContent(content);

    // Register Buttons
    this.addButtons();
  };

  /**
   * Add all the buttons that shall be passed to H5P.Question
   */
  Dictation.prototype.addButtons = function () {
    let that = this;

    // Show solution button
    that.addButton('show-solution', that.config.showSolution, function () {
      // TODO: that.showSolution();
    }, false, {}, {});

    // Check answer button
    that.addButton('check-answer', that.config.checkAnswer, function () {
      that.showEvaluation();
    }, true, {}, {});

    // Retry button
    that.addButton('try-again', that.config.tryAgain, function () {
      // TODO: that.reset();
    }, false, {}, {});
  };

  Dictation.prototype.showEvaluation = function () {
    // map function
    var toMistakes = function (sentences) {
      return sentences.computeMistakes();
    };

    // reduce function
    var sum = function (a, b) {
      return a + b;
    };

    // scoreMax = Maximum number of points available by all keyword groups
    let mistakes = this.sentences
        .map(toMistakes)
        .reduce(sum, 0);

    // TODO: Think about a good way to score the input, e.g. at max one
    //       mistake per word, punctuation etc.
    // TODO: Visualize mistakes
  };

  Dictation.prototype.extend = function () {
    for(let i = 1; i < arguments.length; i++) {
      for(let key in arguments[i]) {
        if (arguments[i].hasOwnProperty(key)) {
          if (typeof arguments[0][key] === 'object' &&
              typeof arguments[i][key] === 'object') {
            this.extend(arguments[0][key], arguments[i][key]);
          }
          else {
            arguments[0][key] = arguments[i][key];
          }
        }
      }
    }
    return arguments[0];
  };

  return Dictation;
}(H5P.jQuery, H5P.Audio, H5P.Question);
