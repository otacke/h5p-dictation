/* jslint esversion: 6 */
/* globals: H5P */

var H5P = H5P || {};

H5P.Dictation = function (Audio, Question) {
  'use strict';

  // TODO: Clean up the code thoroughly!

  /**
   * @constructor
   *
   * @param {Object} params - Params from semantics.json.
   * @param {string} contentId - ContentId.
   * @param {Object} contentData - contentData.
   */
  function Dictation (params, contentId, contentData) {
    const that = this;
    // Initialize
    if (!params) {
      return;
    }

    // Inheritance
    Question.call(this, 'dictation');

    this.params = params;
    this.contentId = contentId;
    this.contentData = contentData || {};

    /*
     * this.params.behaviour.enableSolutionsButton and this.params.behaviour.enableRetry are used by
     * contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-8} and
     * {@link https://h5p.org/documentation/developers/contracts#guides-header-9}
     */
    this.params.behaviour.enableSolutionsButton = this.params.behaviour.enableSolutionsButton || false;
    this.params.behaviour.enableRetry = this.params.behaviour.enableRetry || false;

    // Defaults
    this.params.behaviour.taskDescription = this.params.behaviour.taskDescription || '';
    this.params.behaviour.tries = this.params.behaviour.tries || Infinity;
    this.params.behaviour.triesAlternative = this.params.behaviour.triesAlternative || Infinity;

    this.sentences = [];

    const hasAlternatives = this.params.sentences.map(function (sentence) {
      return (sentence.sampleAlternative === undefined) ? false : true;
    }).reduce(function (a, b) {
      return a || b;
    }, false);

    this.params.sentences.forEach(function (element, index) {
      that.sentences.push(new H5P.Dictation.Sentence({
        "sentence": element,
        "audioNotSupported": that.params.audioNotSupported,
        "tries": that.params.behaviour.tries,
        "triesAlternative": that.params.behaviour.triesAlternative,
        "ignorePunctuation": that.params.behaviour.ignorePunctuation,
        "hasAlternatives": hasAlternatives,
        "aria": {
          "play": that.params.ariaPlay,
          "playSlowly": that.params.ariaPlaySlowly,
          "enterText": that.params.ariaEnterText,
          "solution": that.params.ariaSolution
        }
      }, index + 1));
    });

    // Score parameters
    this.maxMistakes = this.computeMaxMistakes();
    this.params.behaviour.typoFactor = parseInt(this.params.behaviour.typoFactor) / 100;
    this.params.behaviour.mistakesPassing = Math.min(this.params.behaviour.mistakesPassing || 0, this.maxMistakes);
    this.params.behaviour.mistakesMastering = Math.min(this.params.behaviour.mistakesMastering || 0, this.maxMistakes);
    this.percentageMastering = (this.maxMistakes - this.params.behaviour.mistakesMastering) / this.maxMistakes;
    this.percentagePassing = Math.min(this.percentageMastering, (this.maxMistakes - this.params.behaviour.mistakesPassing) / this.maxMistakes);

    this.percentageMistakes = 0;
    this.isAnswered = false;
  }

  // Extends Question
  Dictation.prototype = Object.create(Question.prototype);
  Dictation.prototype.constructor = Dictation;

  /**
   * Register the DOM elements with H5P.Question.
   */
  Dictation.prototype.registerDomElements = function () {
    const that = this;
    // Set optional media
    var media = this.params.media.type;
    if (media && media.library) {
      var type = media.library.split(' ')[0];
      if (type === 'H5P.Image') {
        if (media.params.file) {
          this.setImage(media.params.file.path, {
            disableImageZooming: this.params.media.disableImageZooming,
            alt: media.params.alt,
            title: media.params.title
          });
        }
      }
      else if (type === 'H5P.Video') {
        if (media.params.sources) {
          this.setVideo(media);
        }
      }
    }

    // Register task introduction text
    this.setIntroduction('<div tabindex="0">' + this.params.taskDescription + '</div>');

    // Build content
    const content = document.createElement('div');
    this.sentences.forEach(function (element) {
      content.appendChild(element.getContent());
    });

    // Register content
    this.setContent(content);

    // Register Buttons
    this.addButtons();

    // Autoplay if set to
    if (that.params.behaviour.autoplayDelay) {
      window.addEventListener('load', function () {
        setTimeout(function () {
          if (that.sentences && that.sentences.length > 0) {
            that.sentences[0].button.click();
          }
        }, that.params.behaviour.autoplayDelay * 1000);
      });
    }
  };

  /**
   * Add all the buttons that shall be passed to H5P.Question
   */
  Dictation.prototype.addButtons = function () {
    const that = this;

    // Show solution button
    that.addButton('show-solution', that.params.showSolution, function () {
      that.showSolutions();
    }, false, {}, {});

    // Check answer button
    that.addButton('check-answer', that.params.checkAnswer, function () {
      that.showEvaluation();
      that.isAnswered = true;
    }, true, {}, {});

    // Retry button
    that.addButton('try-again', that.params.tryAgain, function () {
      that.resetTask();
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

    const mistakesTotal = mistakesAdded + mistakesMissing + mistakesWrong + mistakesTypo * that.params.behaviour.typoFactor;
    const mistakesTrimmed = Math.min(mistakesTotal, this.maxMistakes);

    this.percentageMistakes = Math.min(this.percentageMastering, (this.maxMistakes - mistakesTrimmed) / this.maxMistakes);

    const generalFeedback = (this.params.generalFeedback || '')
      .replace('@added', mistakesAdded)
      .replace('@missing', mistakesMissing)
      .replace('@wrong', mistakesWrong)
      .replace('@typo', mistakesTypo)
      .replace('@total', mistakesTotal)
      .replace('@matches', matches);

    const textScore = H5P.Question.determineOverallFeedback(
      this.params.overallFeedback, this.percentageMistakes / this.percentageMastering);

    this.setFeedback(
      (generalFeedback + ' ' + textScore).trim(),
      Math.round(this.percentageMistakes / this.percentageMastering * 100),
      this.percentageMastering / this.percentageMastering * 100);

    this.hideButton('check-answer');
    if (this.params.behaviour.enableSolution) {
      this.showButton('show-solution');
    }

    // Trigger xAPI events
    this.trigger(this.getXAPIAnswerEvent());

    if (this.percentageMistakes < this.percentagePassing) {
      this.trigger(this.createDictationXAPIEvent('failed'));
    }
    else {
      this.trigger(this.createDictationXAPIEvent('passed'));
    }
    if (this.percentageMistakes >= this.percentageMastering) {
      this.trigger(this.createDictationXAPIEvent('mastered'));
    }
    else {
      if (this.params.behaviour.enableRetry) {
        this.showButton('try-again');
      }
    }

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
    // TODO: Refactor
    const that = this;

    const scorePoints = new H5P.Question.ScorePoints();

    const output = [];
    results.forEach(function (result) {
      let correction = [];
      result.words.forEach(function (word, index) {
        const wrapper = document.createElement('span');
        wrapper.setAttribute('tabindex', (index === 0) ? '0' : '-1');
        wrapper.setAttribute('role', 'listitem');
        wrapper.classList.add('h5p-wrapper-' + word.type);
        wrapper.addEventListener('focus', function () {
          this.setAttribute('tabindex', '0');
        });
        wrapper.addEventListener('focusout',function () {
          this.setAttribute('tabindex', '-1');
        });
        wrapper.addEventListener('keydown', function (event) {
          switch (event.keyCode) {
            case 37:
              if (this.previousSibling) {
                this.previousSibling.focus();
              }
              break;
            case 39:
              if (this.nextSibling) {
                this.nextSibling.focus();
              }
              break;
          }
        });

        if (result.spaces[index]) {
          wrapper.classList.add('h5p-spacer');
        }

        const ariaLabelType = {
          match: that.params.ariaCorrect,
          wrong: that.params.ariaWrong,
          typo: that.params.ariaTypo,
          missing: that.params.ariaMissing,
          added: that.params.ariaAdded
        };

        var ariaLabel = (word.type === 'missing') ? word.solution : word.answer;
        ariaLabel = ariaLabel
          .replace(/\./g, that.params.ariaPeriod)
          .replace(/!/g, that.params.ariaExclamationPoint)
          .replace(/\?/g, that.params.ariaQuestionMark)
          .replace(/,/g, that.params.ariaComma)
          .replace(/'/g, that.params.ariaSingleQuote)
          .replace(/["|\u201C|\u201E]/g, that.params.ariaDoubleQuote)
          .replace(/:/g, that.params.ariaColon)
          .replace(/;/g, that.params.ariaSemicolon)
          .replace(/\+/g, that.params.ariaPlus)
          .replace(/-/g, that.params.ariaMinus)
          .replace(/\*/g, that.params.ariaAsterisk)
          .replace(/\//g, that.params.ariaForwardSlash);
        ariaLabel += '. ' + ariaLabelType[word.type];
        wrapper.setAttribute('aria-label', ariaLabel);

        if (word.type === 'wrong' || word.type === 'added' || word.type === 'typo') {
          const answer = document.createElement('span');
          answer.classList.add('h5p-answer-' + word.type);
          answer.innerHTML = word.answer;
          wrapper.appendChild(answer);
        }
        if (word.type !== 'added') {
          const solution = document.createElement('span');
          solution.classList.add('h5p-solution-' + word.type);
          solution.innerHTML = word.solution;
          wrapper.appendChild(solution);
        }
        if (word.type !== 'match') {
          const scoreIndicator = scorePoints.getElement(false);
          if (word.type === 'typo' && that.params.behaviour.typoFactor === 0.5) {
            scoreIndicator.classList.remove('h5p-question-minus-one');
            scoreIndicator.classList.add('h5p-question-minus-one-half');
          }
          if (word.type !== 'typo' || that.params.behaviour.typoFactor > 0) {
            wrapper.appendChild(scoreIndicator);
          }
        }

        correction.push(wrapper);
      });
      output.push(correction);
    });
    return output;
  };

  /**
   * Determine whether the task has been passed by the user.
   * @return {boolean} True if user passed or task is not scored.
   */
  Dictation.prototype.isPassed = function () {
    return (this.percentageMistakes >= this.percentagePassing);
  };

  /**
   * Check if Dictation has been submitted/input has been given.
   * @return {boolean} True, if answer was given.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-1}
   */
  Dictation.prototype.getAnswerGiven = function () {
    return this.isAnswered || this.sentences.some(function (sentence) {
      return sentence.getText().length > 0;
    });
  };

  /**
   * Get latest score.
   * @return {number} latest score.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-2}
   */
  Dictation.prototype.getScore = function () {
    return this.percentageMistakes * 100;
  };

  /**
   * Get maximum possible score.
   * @return {number} Score necessary for mastering.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-3}
   */
  Dictation.prototype.getMaxScore = function () {
    return this.percentageMastering * 100;
  };

  /**
   * Show solution.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-4}
   */
  Dictation.prototype.showSolutions = function () {
    const that = this;

    const solutions = this.buildSolutions(this.results);
    solutions.forEach(function (solution, index) {
      that.sentences[index].showSolution(solution);
    });
    that.sentences[0].focus();
    that.trigger('resize');
  };

  /**
   * Reset task.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-5}
   */
  Dictation.prototype.resetTask = function () {
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

    this.percentageMistakes = 0;
    this.isAnswered = false;
  };

  /**
   * Get xAPI data.
   * @return {Object} xAPI statement.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-6}
   */
  Dictation.prototype.getXAPIData = function () {
    return {
      statement: this.getXAPIAnswerEvent().data.statement
    };
  };

  /**
   * Build xAPI answer event.
   * @return {H5P.XAPIEvent} xAPI answer event.
   */
  Dictation.prototype.getXAPIAnswerEvent = function () {
    const xAPIEvent = this.createDictationXAPIEvent('answered');

    xAPIEvent.setScoredResult(this.getScore(), this.getMaxScore(), this, true, this.isPassed());
    xAPIEvent.data.statement.result.response = this.sentences
      .map(function (sentence) {
        return sentence.getText();
      })
      .join('[,]');

    return xAPIEvent;
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
    definition.description = {'en-US': this.params.taskDescription};
    definition.type = 'http://adlnet.gov/expapi/activities/cmi.interaction';
    definition.interactionType = 'long-fill-in';
    definition.correctResponsesPattern = this.sentences
      .map(function (sentence) {
        return sentence.getCorrectText();
      })
      .join('[,]');

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
