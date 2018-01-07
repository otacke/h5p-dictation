/* jslint esversion: 6 */
/* globals: H5P */

var H5P = H5P || {};

H5P.Dictation = function (Audio, Question) {
  'use strict';

  // TODO: ARIA
  // TODO: Clean up thoroughly!

  /**
   * @constructor
   *
   * @param {Object} config - Config from semantics.json.
   * @param {string} contentId - ContentId.
   * @param {Object} contentData - contentData.
   */
  function Dictation (config, contentId, contentData) {
    const that = this;
    // Initialize
    if (!config) {
      return;
    }

    // Inheritance
    Question.call(this, 'dictation');

    this.config = config;
    this.contentId = contentId;
    this.contentData = contentData || {};

    // Defaults
    this.config.behaviour.taskDescription = this.config.behaviour.taskDescription || '';
    this.config.behaviour.tries = this.config.behaviour.tries || Infinity;
    this.config.behaviour.triesAlternative = this.config.behaviour.triesAlternative || Infinity;
    this.config.behaviour.typoFactor = parseInt(this.config.behaviour.typoFactor) / 100;
    this.config.behaviour.mistakesPassing = this.config.behaviour.mistakesPassing || 0;
    this.config.behaviour.mistakesMastering = this.config.behaviour.mistakesMastering || 0;

    this.sentences = [];

    const hasAlternatives = this.config.sentences.map(function (sentence) {
      return (sentence.sampleAlternative === undefined) ? false : true;
    }).reduce(function (a, b) {
      return a || b;
    }, false);

    this.config.sentences.forEach(function (element) {
      that.sentences.push(new H5P.Dictation.Sentence({
        "sentence": element,
        "audioNotSupported": that.config.audioNotSupported,
        "tries": that.config.behaviour.tries,
        "triesAlternative": that.config.behaviour.triesAlternative,
        "ignorePunctuation": that.config.behaviour.ignorePunctuation,
        "hasAlternatives": hasAlternatives
      }, that.contentId));
    });

    // Score parameters
    this.maxMistakes = this.computeMaxMistakes();
    this.percentageMastering = (this.maxMistakes - this.config.behaviour.mistakesMastering) / this.maxMistakes;
    this.percentagePassing = Math.min(this.percentageMastering, (this.maxMistakes - this.config.behaviour.mistakesPassing) / this.maxMistakes);
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
    const content = document.createElement('div');
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
    const that = this;

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

  /**
   * Compute the maximum number of possible mistakes for all sentences.
   * @return {number} Maximum number of possible mistakes.
   */
  Dictation.prototype.computeMaxMistakes = function () {
    return this.sentences
      .map(function (sentence) {
        return sentence.getMaxMistakes();
      })
      .reduce(function (a, b) {
        return a + b;
      }, 0);
  };

  /**
   * Show the evaluation for the input in the text input fields.
   * TODO: Refactoring.
   */
  Dictation.prototype.showEvaluation = function () {
    const that = this;
    this.results = [];
    this.sentences.forEach(function (element) {
      const currentResult = element.computeResults();
      that.results.push(currentResult);
      element.disable();
    });

    const sum = function (a, b) {
      return a + b;
    };

    const mistakesAdded = this.results
      .map(function (element) {
        return element.score.added;
      })
      .reduce(sum, 0);

    const mistakesMissing = this.results
      .map(function (element) {
        return element.score.missing;
      }).reduce(sum, 0);

    const mistakesWrong = this.results
      .map(function (element) {
        return element.score.wrong;
      }).reduce(sum, 0);

    const mistakesTypo = this.results
      .map(function (element) {
        return element.score.typo;
      }).reduce(sum, 0);

    const matches = this.results
      .map(function (element) {
        return element.score.match;
      }).reduce(sum, 0);

    let mistakesTotal = mistakesAdded + mistakesMissing + mistakesWrong + mistakesTypo * that.config.behaviour.typoFactor;
    mistakesTotal = Math.min(mistakesTotal, this.maxMistakes);

    const percentageMistakes = Math.min(this.percentageMastering, (this.maxMistakes - mistakesTotal) / this.maxMistakes);

    const generalFeedback = (this.config.generalFeedback || '')
      .replace('@added', mistakesAdded)
      .replace('@missing', mistakesMissing)
      .replace('@wrong', mistakesWrong)
      .replace('@typo', mistakesTypo)
      .replace('@total', mistakesTotal)
      .replace('@matches', matches);

    const textScore = H5P.Question.determineOverallFeedback(
      this.config.overallFeedback, percentageMistakes / this.percentageMastering);

    this.setFeedback(
      (generalFeedback + ' ' + textScore).trim(),
      Math.round(percentageMistakes / this.percentageMastering * 100),
      this.percentageMastering / this.percentageMastering * 100);

    this.hideButton('check-answer');
    if (this.config.behaviour.enableSolution) {
      this.showButton('show-solution');
    }

    this.trigger(this.createDictationXAPIEvent('completed'));
    var xAPIEvent = this.createDictationXAPIEvent('scored');
    xAPIEvent.setScoredResult(percentageMistakes * 100, this.percentageMastering * 100, this, true,
      percentageMistakes >= this.percentagePassing);
    xAPIEvent.data.statement.result.response = this.sentences.map(function (sentence) {
      return sentence.getText();
    });
    this.trigger(xAPIEvent);

    if (percentageMistakes < this.percentagePassing) {
      this.trigger(this.createDictationXAPIEvent('failed'));
    }
    else {
      this.trigger(this.createDictationXAPIEvent('passed'));
    }
    if (percentageMistakes >= this.percentageMastering) {
      this.trigger(this.createDictationXAPIEvent('mastered'));
    }
    else {
      if (this.config.behaviour.enableRetry) {
        this.showButton('try-again');
      }
    }

    this.trigger('resize');
  };

  /**
   * Show the solution.
   */
  Dictation.prototype.showSolution = function () {
    const that = this;
    const solutions = this.buildSolutions(this.results);
    solutions.forEach(function (solution, index) {
      that.sentences[index].showSolution(solution);
    });
    that.trigger('resize');
  };

  /**
   * Reset the task.
   */
  Dictation.prototype.reset = function () {
    this.sentences.forEach(function (sentence) {
      sentence.reset();
      sentence.enable();
      sentence.hideSolution();
    });
    this.removeFeedback();
    this.hideButton('try-again');
    this.hideButton('show-solution');
    this.showButton('check-answer');
    this.trigger('resize');
  };

  /**
   * Build the solution for one sentence's results.
   * @param {Object} results - Results.
   * @param {Object} results.score - Scores.
   * @param {number} results.score.added - Number of added words added.
   * @param {number} results.score.missing - Number of words missing.
   * @param {number} results.score.typo - Number of words with typing errors.
   * @param {number} results.score.wrong - Number of wrong words.
   * @param {number} results.score.match - Number of mathes.
   * @param {Object[]} results.words - Words.
   * @param {string} results.words[].answer - Answer given.
   * @param {string} results.words[].solution - Correct word.
   * @param {string} results.words[].type - Type of mistake or match.
   * @param {Boolean[]} results.spaces - Spaces for gaps between words.
   * @return {Array} Array of solutions.
   */
  Dictation.prototype.buildSolutions = function (results) {
    const output = [];
    results.forEach(function (result) {
      let correction = '';
      result.words.forEach(function (word, index) {
        const spacer = (result.spaces[index]) ? ' h5p-spacer' : '';
        correction += '<span class="h5p-wrapper-' + word.type + spacer + '">';
        if (word.type === 'wrong' || word.type === 'added' || word.type === 'typo') {
          correction += '<span class="h5p-answer-' + word.type + '">' + word.answer + '</span>';
        }
        if (word.type !== 'added') {
          correction += '<span class="h5p-solution-' + word.type +'">' + word.solution + '</span>';
        }
        correction += '</span>';
      });
      output.push(correction);
    });
    return output;
  };

  /**
   * Create an xAPI event for Dictation.
   * @param {string} verb - Short id of the verb we want to trigger.
   * @return {H5P.XAPIEvent} Event template.
   */
  Dictation.prototype.createDictationXAPIEvent = function (verb) {
    const xAPIEvent = this.createXAPIEventTemplate(verb);
    this.extend(
      xAPIEvent.getVerifiedStatementValue(['object', 'definition']),
      this.getxAPIDefinition());
    return xAPIEvent;
  };

  /**
   * Get the xAPI definition for the xAPI object.
   * @return {object} XAPI definition.
   */
  Dictation.prototype.getxAPIDefinition = function () {
    const definition = {};
    definition.name = {'en-US': 'Dictation'};
    definition.description = {'en-US': this.config.taskDescription};
    definition.type = 'http://adlnet.gov/expapi/activities/cmi.interaction';
    definition.interactionType = 'long-fill-in';
    definition.correctResponsesPattern = this.sentences.map(function (sentence) {
      return sentence.getCorrectText();
    });

    return definition;
  };

  /**
   * Extend an array just like JQuery's extend.
   * @param {object} arguments - Objects to be merged.
   * @return {object} Merged objects.
   */
  Dictation.prototype.extend = function () {
    for (let i = 1; i < arguments.length; i++) {
      for (let key in arguments[i]) {
        if (arguments[i].hasOwnProperty(key)) {
          if (typeof arguments[0][key] === 'object' && typeof arguments[i][key] === 'object') {
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
}(H5P.Audio, H5P.Question);
