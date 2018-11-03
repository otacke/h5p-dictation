import Sentence from './h5p-dictation-sentence';

class Dictation extends H5P.Question {
  /**
   * @constructor
   *
   * @param {object} params - Params from semantics.json.
   * @param {string} contentId - ContentId.
   * @param {object} contentData - contentData.
   */
  constructor(params, contentId, contentData) {
    super('dictation');

    // Initialize
    if (!params) {
      return;
    }

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

    // Other defaults
    this.params.behaviour.tries = this.params.behaviour.tries || Infinity;
    this.params.behaviour.triesAlternative = this.params.behaviour.triesAlternative || Infinity;

    this.sentences = [];

    // Relevant for building the DOM later (play slowly button)
    const hasAlternatives = this.params.sentences.some(sentence => (sentence.sampleAlternative !== undefined));

    // Proper format
    this.params.behaviour.typoFactor = parseInt(this.params.behaviour.typoFactor) / 100;

    // Create sentence instances
    this.params.sentences = this.params.sentences
      // Strip incomplete sentences
      .filter(element => (typeof element.text !== 'undefined' && typeof element.sample !== 'undefined'))
      .forEach((element, index) => {
        this.sentences.push(new Sentence(
          index + 1,
          {
            "sentence": element,
            "audioNotSupported": this.params.l10n.audioNotSupported,
            "tries": this.params.behaviour.tries,
            "triesAlternative": this.params.behaviour.triesAlternative,
            "ignorePunctuation": this.params.behaviour.ignorePunctuation,
            "hasAlternatives": hasAlternatives,
            "a11y": this.params.a11y,
            "typoFactor": this.params.behaviour.typoFactor
          },
          this.contentId)
        );
      });

    // Maximum number of possible mistakes for all sentences
    this.maxMistakes = this.sentences
      .map(sentence => sentence.getMaxMistakes())
      .reduce((a, b) => a + b, 0);

    this.mistakesCapped = 0;
    this.isAnswered = false;

    /**
     * Register the DOM elements with H5P.Question.
     */
    this.registerDomElements = () => {
      // Set optional media
      const media = this.params.media.type;
      if (media && media.library) {
        const type = media.library.split(' ')[0];
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
      if (this.params.taskDescription) {
        this.introduction = document.createElement('div');
        this.introduction.setAttribute('tabindex', '0');
        this.introduction.innerHTML = this.params.taskDescription;
        this.setIntroduction(this.introduction);
      }

      // Build content
      const content = document.createElement('div');
      this.sentences.forEach(element => content.appendChild(element.getContent()));

      // No content was given
      if (this.sentences.length === 0) {
        const message = document.createElement('div');
        message.classList.add('h5p-dictation-no-content');
        message.innerHTML = 'I really need at least one sound sample and text for it :-)';
        content.appendChild(message);
      }

      // Register content
      this.setContent(content);

      if (this.sentences.length !== 0) {
        // Register Buttons
        this.addButtons();
      }
    };

    /**
     * Add all the buttons that shall be passed to H5P.Question
     */
    this.addButtons = () => {
      // Show solution button
      this.addButton('show-solution', this.params.l10n.showSolution, () => {
        this.showSolutions();
      }, false, {}, {});

      // Check answer button
      this.addButton('check-answer', this.params.l10n.checkAnswer, () => {
        this.showEvaluation();
        this.triggerXAPI();
        if (this.params.behaviour.enableRetry && !this.isPassed()) {
          this.showButton('try-again');
        }
        this.isAnswered = true;
      }, true, {}, {});

      // Retry button
      this.addButton('try-again', this.params.l10n.tryAgain, () => {
        this.resetTask();
      }, false, {}, {});
    };

    /**
     * Show the evaluation for the input in the text input fields.
     */
    this.showEvaluation = () => {
      // Get results of all sentences
      this.results = [];
      this.sentences.forEach(element => {
        this.results.push(element.computeResults());
        element.disable();
      });

      // Sum up the scores of all sentences
      const score = this.results
        .map(element => element.score)
        .reduce((a, b) => {
          return {
            added: a.added + b.added,
            missing: a.missing + b.missing,
            typo: a.typo + b.typo,
            wrong: a.wrong + b.wrong,
            match: a.match + b.match
          };
        }, {added: 0, missing: 0, typo: 0, wrong: 0, match: 0});

      // Prepare output
      const mistakesTotal = score.added + score.missing + score.wrong + score.typo * this.params.behaviour.typoFactor;
      this.mistakesCapped = Math.min(mistakesTotal, this.maxMistakes);

      const generalFeedback = (this.params.l10n.generalFeedback || '')
        .replace('@added', score.added)
        .replace('@missing', score.missing)
        .replace('@wrong', score.wrong)
        .replace('@typo', score.typo)
        .replace('@matches', score.match)
        .replace('@total', mistakesTotal)
        .replace('@capped', this.mistakesCapped);

      const textScore = H5P.Question.determineOverallFeedback(
        this.params.overallFeedback, this.getScore() / this.getMaxScore());

      // Output via H5P.Question
      this.setFeedback(
        (`${generalFeedback} ${textScore}`).trim(),
        this.getScore(),
        this.getMaxScore(),
        this.params.a11y.yourResult
      );
      this.hideButton('check-answer');
      if (this.params.behaviour.enableSolution) {
        this.showButton('show-solution');
      }

      this.trigger('resize');
    };

    /**
     * Determine whether the task has been passed by the user.
     *
     * @return {boolean} True if user passed or task is not scored.
     */
    this.isPassed = () => {
      return (this.mistakesTrimmed === 0);
    };

    /**
     * Check if Dictation has been submitted/input has been given.
     *
     * @return {boolean} True, if answer was given.
     * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-1}
     */
    this.getAnswerGiven = () => {
      return this.isAnswered || this.sentences.some(sentence => sentence.getText().length > 0);
    };

    /**
     * Get latest score.
     *
     * @return {number} latest score.
     * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-2}
     */
    this.getScore = () => this.maxMistakes - this.mistakesCapped;

    /**
     * Get maximum possible score.
     * @return {number} Score necessary for mastering.
     * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-3}
     */
    this.getMaxScore = () => this.maxMistakes;

    /**
     * Show solution.
     *
     * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-4}
     */
    this.showSolutions = () => {
      this.sentences.forEach((sentence, index) => {
        sentence.showSolution(this.results[index]);
      });

      this.sentences[0].focusSolution();
      this.trigger('resize');
    };

    /**
     * Reset task.
     *
     * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-5}
     */
    this.resetTask = () => {
      this.sentences.forEach(sentence => {
        sentence.reset();
        sentence.enable();
        sentence.hideSolution();
      });
      this.removeFeedback();
      this.hideButton('try-again');
      this.hideButton('show-solution');
      this.showButton('check-answer');

      if (this.introduction) {
        this.introduction.focus();
      }
      else {
        this.sentences[0].focus();
      }

      this.mistakesCapped = 0;
      this.isAnswered = false;
    };

    /**
     * Get xAPI data.
     *
     * @return {object} xAPI statement.
     * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-6}
     */
    this.getXAPIData = () => {
      return {
        statement: this.getXAPIAnswerEvent().data.statement
      };
    };

    /**
     * Trigger all necessary xAPI events after evaluation. Might become more.
     */
    this.triggerXAPI = () => {
      this.trigger(this.getXAPIAnswerEvent());
    };

    /**
     * Build xAPI answer event.
     *
     * @return {H5P.XAPIEvent} xAPI answer event.
     */
    this.getXAPIAnswerEvent = () => {
      const xAPIEvent = this.createDictationXAPIEvent('answered');

      xAPIEvent.setScoredResult(this.getScore(), this.getMaxScore(), this, true, this.isPassed());
      xAPIEvent.data.statement.result.response = this.sentences
        .map(sentence => sentence.getText())
        .join('[,]');

      return xAPIEvent;
    };

    /**
     * Create an xAPI event for Dictation.
     *
     * @param {string} verb - Short id of the verb we want to trigger.
     * @return {H5P.XAPIEvent} Event template.
     */
    this.createDictationXAPIEvent = (verb) => {
      const xAPIEvent = this.createXAPIEventTemplate(verb);
      this.extend(
        xAPIEvent.getVerifiedStatementValue(['object', 'definition']),
        this.getxAPIDefinition());
      return xAPIEvent;
    };

    /**
     * Get the xAPI definition for the xAPI object.
     *
     * @return {object} XAPI definition.
     */
    this.getxAPIDefinition = () => {
      const definition = {};
      definition.name = {'en-US': Dictation.DEFAULT_DESCRIPTION};
      definition.description = {'en-US': this.getTitle()};
      definition.type = 'http://adlnet.gov/expapi/activities/cmi.interaction';
      definition.interactionType = 'long-fill-in';
      definition.correctResponsesPattern = this.sentences
        .map(sentence => sentence.getCorrectText())
        .join('[,]');

      return definition;
    };

    /**
     * Extend an array just like JQuery's extend.
     *
     * @param {object} arguments - Objects to be merged.
     * @return {object} Merged objects.
     */
    this.extend = function () {
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

    /**
     * Get the xAPI definition for the xAPI object.
     *
     * @return {object} XAPI definition.
     */
    this.getTitle = () => (this.params.taskDescription) ? this.params.taskDescription : Dictation.DEFAULT_DESCRIPTION;
  }
}

/** @constant {string} DEFAULT_DESCRIPTION Used for xAPI title and task description */
Dictation.DEFAULT_DESCRIPTION = 'Dictation';

export default Dictation;
