import Sentence from './h5p-dictation-sentence';
import Util from './h5p-dictation-util';

/** Class for dictation interaction */
class Dictation extends H5P.Question {
  /**
   * @constructor
   * @param {object} params Params from semantics.json.
   * @param {string} contentId ContentId.
   * @param {object} contentData contentData.
   */
  constructor(params, contentId, contentData) {
    super('dictation');

    // Add defaults
    this.params = Util.extend({
      media: {},
      taskDescription: 'Please listen carefully and write what you hear.',
      sentences: [],
      behaviour: {
        alternateSolution: 'first',
        autosplit: true,
        enableSolutionsButton: true, // @see {@link https://h5p.org/documentation/developers/contracts#guides-header-8}
        enableRetry: true, // @see {@link https://h5p.org/documentation/developers/contracts#guides-header-9}
        ignorePunctuation: true,
        overrideRTL: 'auto',
        tries: Infinity,
        triesAlternative: Infinity,
        customTypoDisplay: true,
        typoFactor: '50'
      },
      l10n: {
        generalFeedback: 'You have made @total mistake(s).',
        checkAnswer: 'Check',
        tryAgain: 'Retry',
        showSolution: 'Show solution',
        audioNotSupported: 'Your browser does not support this audio.'
      },
      a11y: {
        play: 'Play',
        playSlowly: 'Play slowly',
        triesLeft: 'Number of tries left: @number',
        infinite: 'infinite',
        enterText: 'Enter what you have heard.',
        yourResult: 'You got @score out of @total points',
        solution: 'Solution',
        sentence: 'Sentence',
        item: 'Item',
        correct: 'correct',
        wrong: 'wrong',
        typo: 'small mistake',
        missing: 'missing',
        added: 'added',
        shouldHaveBeen: 'Should have been',
        or: 'or',
        point: 'point',
        points: 'points',
        period: 'period',
        exclamationPoint: 'exclamation point',
        questionMark: 'question mark',
        comma: 'comma',
        singleQuote: 'single quote',
        doubleQuote: 'double quote',
        colon: 'colon',
        semicolon: 'semicolon',
        plus: 'plus',
        minus: 'minus',
        asterisk: 'asterisk',
        forwardSlash: 'forward slash'
      }
    }, params);

    // TODO: When other functionality needs a minor version bump, rename semantics variable in upgrade script
    params.behaviour.enableSolutionsButton = params.behaviour.enableSolution === undefined ?
      true : params.behaviour.enableSolution;

    // Initialize
    if (!params) {
      return;
    }

    this.contentId = contentId;
    this.contentData = contentData || {};

    this.sentences = [];

    /*
     * IE11 doesn't support wavs. Remove samples. Generic checking when audios
     * are created would make code way more complicated given how it's written.
     */
    if (!!window.MSInputMethodContext && !!document.documentMode) {
      this.params.sentences.forEach((sentence, index) => {
        if (sentence.sample && sentence.sample[0].mime === 'audio/x-wav') {
          console.warn(`${this.params.a11y.sentence} ${index + 1}: ${this.params.l10n.audioNotSupported}`);
          delete sentence.sample;
        }
        if (sentence.sampleAlternative && sentence.sampleAlternative[0].mime === 'audio/x-wav') {
          console.warn(`${this.params.a11y.sentence} ${index + 1}: ${this.params.l10n.audioNotSupported}`);
          delete sentence.sampleAlternative;
        }
      });
    }

    // Relevant for building the DOM later (play slowly button)
    const hasAlternatives = this.params.sentences.some(sentence => sentence.sampleAlternative !== undefined);

    // Proper format for percentage
    this.params.behaviour.typoFactor = parseInt(this.params.behaviour.typoFactor) / 100;

    // Create sentence instances
    this.params.sentences = this.params.sentences
      // Strip incomplete sentences
      .filter(sentence => sentence.text !== undefined && sentence.sample !== undefined)
      .forEach((sentence, index) => {
        // Get previous state
        const previousState = (this.contentData.previousState && this.contentData.previousState.length >= index + 1) ?
          this.contentData.previousState[index] :
          undefined;

        this.sentences.push(new Sentence(
          index + 1,
          {
            sentence: sentence,
            audioNotSupported: this.params.l10n.audioNotSupported,
            tries: this.params.behaviour.tries,
            triesAlternative: this.params.behaviour.triesAlternative,
            ignorePunctuation: this.params.behaviour.ignorePunctuation,
            hasAlternatives: hasAlternatives,
            a11y: this.params.a11y,
            customTypoDisplay: this.params.behaviour.customTypoDisplay,
            typoFactor: this.params.behaviour.typoFactor,
            alternateSolution: this.params.behaviour.alternateSolution,
            overrideRTL: this.params.behaviour.overrideRTL,
            autosplit: this.params.behaviour.autosplit,
            callbacks: {
              playAudio: (button) => {
                this.handlePlayAudio(button);
              }
            }
          },
          this.contentId,
          previousState)
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
        // Image
        if (type === 'H5P.Image') {
          if (media.params.file) {
            this.setImage(media.params.file.path, {
              disableImageZooming: this.params.media.disableImageZooming,
              alt: media.params.alt,
              title: media.params.title
            });
          }
        }
        // Video
        else if (type === 'H5P.Video') {
          if (media.params.sources) {
            this.setVideo(media);
          }
        }
      }

      // Register task introduction text
      if (this.params.taskDescription) {
        this.introduction = document.createElement('div');
        this.introduction.innerHTML = this.params.taskDescription;
        this.setIntroduction(this.introduction);
      }

      // Build content
      const content = document.createElement('div');
      this.sentences.forEach(sentence => {
        content.appendChild(sentence.getDOM());
      });

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
        this.hideButton('show-solution');
      }, false, {}, {});

      // Check answer button
      this.addButton('check-answer', this.params.l10n.checkAnswer, () => {
        this.showEvaluation();
        this.isAnswered = true;
        this.triggerXAPI();
        if (this.params.behaviour.enableRetry && !this.isPassed()) {
          this.showButton('try-again');
        }
      }, true, {}, {});

      // Retry button
      this.addButton('try-again', this.params.l10n.tryAgain, () => {
        this.resetTask();
        this.sentences[0].focus();
      }, false, {}, {});
    };

    /**
     * Handle playing audio.
     * @param {Button} button Calling button.
     */
    this.handlePlayAudio = (button) => {
      this.sentences.forEach(sentence => {
        sentence.pauseButtons(button);
      });
    };

    /**
     * Show the evaluation for the input in the text input fields.
     */
    this.showEvaluation = () => {
      // Get results of all sentences
      this.results = [];
      this.sentences.forEach(sentence => {
        this.results.push(sentence.computeResults());
        sentence.disable();
      });

      // Sum up the scores of all sentences
      const scoreTotal = this.results
        .map(result => result.score)
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
      const mistakesTotal = scoreTotal.added +
        scoreTotal.missing +
        scoreTotal.wrong +
        scoreTotal.typo * this.params.behaviour.typoFactor;

      // Number of mistakes shall not be higher than number of words.
      this.mistakesCapped = Math.min(mistakesTotal, this.maxMistakes);

      const generalFeedback = (this.params.l10n.generalFeedback || '')
        .replace('@added', scoreTotal.added)
        .replace('@missing', scoreTotal.missing)
        .replace('@wrong', scoreTotal.wrong)
        .replace('@typo', scoreTotal.typo)
        .replace('@matches', scoreTotal.match)
        .replace('@total', mistakesTotal)
        .replace('@capped', this.mistakesCapped);

      const textScore = H5P.Question.determineOverallFeedback(
        this.params.overallFeedback, this.getScore() / this.getMaxScore());

      // Output via H5P.Question
      const ariaMessage = this.params.a11y.yourResult
        .replace('@score', this.getScore())
        .replace('@total', this.getMaxScore());

      this.setFeedback(
        (`${generalFeedback} ${textScore}`).trim(),
        this.getScore(),
        this.getMaxScore(),
        ariaMessage
      );

      // Update buttons
      this.hideButton('check-answer');
      if (this.params.behaviour.enableSolutionsButton) {
        this.showButton('show-solution');
      }

      this.trigger('resize');
    };

    /**
     * Determine whether the task has been passed by the user.
     * @return {boolean} True if user passed or task is not scored.
     */
    this.isPassed = () => this.mistakesTrimmed === 0;

    /**
     * Check if Dictation has been submitted or input has been given.
     * @return {boolean} True, if answer was given.
     * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-1}
     */
    this.getAnswerGiven = () => {
      return this.isAnswered ||
        this.sentences.some(sentence => sentence.getUserInput().length > 0);
    };

    /**
     * Get latest score.
     * @return {number} latest score.
     * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-2}
     */
    this.getScore = () => Math.round(this.maxMistakes - this.mistakesCapped);

    /**
     * Get maximum possible score.
     * @return {number} Score necessary for mastering.
     * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-3}
     */
    this.getMaxScore = () => this.maxMistakes;

    /**
     * Show solutions for all sentences.
     * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-4}
     */
    this.showSolutions = () => {
      this.sentences.forEach((sentence, index) => {
        sentence.showSolution(this.results[index]);
      });

      // Focus first solution
      this.sentences[0].focusSolution();

      this.trigger('resize');
    };

    /**
     * Reset task.
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
     * @return {object} XAPI statement.
     * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-6}
     */
    this.getXAPIData = () => ({statement: this.getXAPIAnswerEvent().data.statement});

    /**
     * Trigger all necessary xAPI events after evaluation. Might become more.
     */
    this.triggerXAPI = () => {
      this.trigger(this.getXAPIAnswerEvent());
    };

    /**
     * Build xAPI answer event.
     * @return {H5P.XAPIEvent} XAPI answer event.
     */
    this.getXAPIAnswerEvent = () => {
      const xAPIEvent = this.createDictationXAPIEvent('answered');

      // Set reporting module version if alternative extension is used
      const definition = xAPIEvent.getVerifiedStatementValue(['object', 'definition']);
      if (definition.extensions && definition.extensions[Dictation.XAPI_ALTERNATIVE_EXTENSION]) {
        const context = xAPIEvent.getVerifiedStatementValue(['context']);
        context.extensions = context.extensions || {};
        context.extensions[Dictation.XAPI_REPORTING_VERSION_EXTENSION] = Dictation.XAPI_REPORTING_VERSION;
      }

      xAPIEvent.setScoredResult(this.getScore(), this.getMaxScore(), this,
        true, this.isPassed());

      // Concatenate input from sentences
      xAPIEvent.data.statement.result.response = this.sentences
        .map(sentence => sentence.getUserInput())
        .join('[,]');

      return xAPIEvent;
    };

    /**
     * Create an xAPI event for Dictation.
     * @param {string} verb Short id of the verb we want to trigger.
     * @return {H5P.XAPIEvent} Event template.
     */
    this.createDictationXAPIEvent = (verb) => {
      const xAPIEvent = this.createXAPIEventTemplate(verb);
      Util.extend(
        xAPIEvent.getVerifiedStatementValue(['object', 'definition']),
        this.getxAPIDefinition());
      return xAPIEvent;
    };

    /**
     * Get the xAPI definition for the xAPI object.
     * @return {object} XAPI definition.
     */
    this.getxAPIDefinition = () => {
      const placeholders = this.sentences.map(sentence => sentence.getXAPIDescription()).join('');

      const definition = {};
      definition.name = {'en-US': this.getTitle()};
      definition.description = {'en-US': `${this.getDescription()}${placeholders}`};
      definition.type = 'http://adlnet.gov/expapi/activities/cmi.interaction';
      definition.interactionType = 'long-fill-in';

      // Use extension to avoid exponentially growing solution space
      definition.extensions = definition.extensions || {};
      definition.extensions[Dictation.XAPI_CASE_SENSITIVITY] = true;

      const sentencesVariations = this.buildCorrectSentencesVariations();
      definition.extensions[Dictation.XAPI_ALTERNATIVE_EXTENSION] = sentencesVariations;

      // Fallback CRP with only first sentence variation
      definition.correctResponsesPattern = this.buildxAPICRP(sentencesVariations.slice());

      return definition;
    };

    /**
     * Build all correct sentence variations.
     *
     * This may not be completely true, because we can't sensibly compile all
     * possible answers for a sentence if we accept small mistakes.
     *
     * @return {object[]} Correct sentence variations.
     */
    this.buildCorrectSentencesVariations = () => {
      let sentences = this.sentences.map(sentence => sentence.getCorrectText(true));

      sentences = sentences.map(sentence => {
        let variations = [''];
        sentence.forEach(word => {
          word = word.split('|');
          variations = Util.buildCombinations(word, variations, ' ');
        });
        return variations;
      });

      return sentences;
    };

    /**
     * Build correct responses pattern from sentences.
     *
     * This may not be completely true, because we can't sensibly compile all
     * possible answers for a sentence if we accept small mistakes.
     *
     * @param {object[]} sentencesVariations Sentences variations.
     * @param {boolean} [complete=false] If true, will build complete CRP.
     * @return {object[]} Correct responses pattern.
     */
    this.buildxAPICRP = (sentencesVariations, complete = false) => {
      let crp = [''];

      if (!sentencesVariations) {
        return crp;
      }

      if (!complete) {
        crp = sentencesVariations
          .map(sentences => sentences[0])
          .join('[,]');
        crp = [`{case_matters=true}${crp}`];
      }
      else {
        sentencesVariations.forEach(sentences => {
          crp = Util.buildCombinations(sentences, crp, '[,]');
        });

        crp = crp.map(response => `{case_matters=true}${response}`);

      }

      return crp;
    };

    /**
     * Get current state.
     * @return {Object} Current state.
     */
    this.getCurrentState = () => {
      return this.sentences.map(sentence => sentence.getCurrentState());
    };

    /**
     * Get tasks title.
     * @return {string} Title.
     */
    this.getTitle = () => {
      let raw;
      if (this.contentData && this.contentData.metadata) {
        raw = this.contentData.metadata.title;
      }
      raw = raw || Dictation.DEFAULT_DESCRIPTION;

      return H5P.createTitle(raw);
    };

    /**
     * Get tasks description.
     * @return {string} Description.
     */
    this.getDescription = () => this.params.taskDescription || Dictation.DEFAULT_DESCRIPTION;
  }
}

/** @constant {string} */
Dictation.DEFAULT_DESCRIPTION = 'Dictation';

/** @constant {string} */
Dictation.XAPI_ALTERNATIVE_EXTENSION = 'https://h5p.org/x-api/alternatives';

/** @constant {string} */
Dictation.XAPI_CASE_SENSITIVITY = 'https://h5p.org/x-api/case-sensitivity';

/** @constant {string} */
Dictation.XAPI_REPORTING_VERSION_EXTENSION = 'https://h5p.org/x-api/h5p-reporting-version';

/** @constant {string} */
Dictation.XAPI_REPORTING_VERSION = '1.1.0';

export default Dictation;
