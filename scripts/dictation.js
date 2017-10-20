/* jslint esversion: 6 */
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

    this.sentences = [];
    this.config.sentences.forEach(function (element) {
      that.sentences.push(new H5P.Dictation.Sentence({
        "sentence": element,
        "audioNotSupported": that.config.audioNotSupported,
        "repetitions": that.config.behaviour.repetitions,
        "ignorePunctuation": that.config.behaviour.ignorePunctuation
      }));
    });
    this.maxMistakes = this.computeMaxMistakes();
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
      that.showSolution();
    }, false, {}, {});

    // Check answer button
    that.addButton('check-answer', that.config.checkAnswer, function () {
      that.showEvaluation();
    }, true, {}, {});

    // Retry button
    that.addButton('try-again', that.config.tryAgain, function () {
      that.reset();
    }, false, {}, {});
  };

  Dictation.prototype.computeMaxMistakes = function () {
    let that = this;
    return this.sentences
        .map(function (sentence) {
          return sentence.getMaxMistakes();
        })
        .reduce(function (a, b) {
          return a + b;
        }, 0);
  };

  Dictation.prototype.showEvaluation = function () {
    let that = this;
    this.results = [];
    this.sentences.forEach(function (element) {
      let currentResult = element.computeResults();
      that.results.push(currentResult);
      element.disable();
    });

    // The results basically allow us to punish different mistakes differently,
    // e.g. wrong = 1 but typo = 0.5
    let mistakes = this.results.map(function(element) {
      return element.mistakes.total;
    }).reduce(function (a, b) {
      return a + b;
    }, 0);

    let score = Math.floor((this.maxMistakes - mistakes) / this.maxMistakes * 100);
    let textScore = H5P.Question.determineOverallFeedback(
        this.config.overallFeedback, score / 100) // TODO: scoreMastering!
            .replace('@score', score)
            .replace('@total', 100); // TODO: scoreMastering!

    this.setFeedback(
        'You have made ' + mistakes + ' mistakes. ' + textScore, // TODO: make feedback parameter
        score,
        100); // TODO: scoreMastering!

    // TODO: Think about a good way to score the input, e.g. at max one
    //       mistake per word, punctuation etc.
    // TODO: Visualize mistakes

    this.hideButton('check-answer');
    if (this.config.behaviour.enableSolution) {
      this.showButton('show-solution');
    }
    if (score < 100) { // TODO: scoreMastering!
      if (this.config.behaviour.enableRetry) {
        this.showButton('try-again');
      }
    }

    this.trigger('resize');
  };

  Dictation.prototype.showSolution = function () {
    // TODO: Should get the DOM to be shown
    let that = this;
    let solutions = this.buildSolutions(this.results);
    solutions.forEach(function (solution, index) {
      that.sentences[index].setText(solution);
    });
  };

  Dictation.prototype.reset = function () {
    this.sentences.forEach(function (sentence) {
      sentence.reset();
      sentence.enable();
    });
    this.removeFeedback();
    this.hideButton('try-again');
    this.hideButton('show-solution');
    this.showButton('check-answer');
    this.trigger('resize');
  };

  Dictation.prototype.buildSolutions = function (results) {
    console.log(results);
    let that = this;
    // TODO: Change CSS (border to wrapper, etc.)
    let output = [];
    results.forEach(function (result) {
      let sentence = '';
      result.words.forEach(function (word, index) {
        // TODO: element + styling according to type

        if (word.type === 'wrong') {
          sentence += '<span class="h5p-' + 'added' +'">';
          sentence += word.answer;
          sentence += '</span>';
          sentence += '<span class="h5p-' + 'wrong' +'">';
          sentence += word.solution;
          sentence += '</span>';
        }
        else {
          sentence += '<span class="h5p-' + word.type +'">';
          sentence += (word.solution !== undefined) ? word.solution : word.answer;
          sentence += '</span>';
        }
        sentence += result.spaces[index];
      });
      let div = document.createElement('div');
      div.innerHTML = sentence;

      output.push(sentence);
      // TODO: remove
      let foo = document.getElementsByClassName('h5p-dictation')[0];
      console.log(foo);
      foo.appendChild(div);
      that.trigger('resize');
    });
    return output;
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
