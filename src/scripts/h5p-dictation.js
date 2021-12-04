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
        tries: Infinity,
        triesAlternative: Infinity,
        shuffleSentences: 'never',
        scoring: {
          ignorePunctuation: true,
          zeroMistakeMode: false,
          typoFactor: '100'
        },
        textual: {
          wordSeparator: ' ',
          overrideRTL: 'auto',
          autosplit: true
        },
        feedbackPresentation: {
          customTypoDisplay: false,
          alternateSolution: 'first'
        },
        enableRetry: true, // @see {@link https://h5p.org/documentation/developers/contracts#guides-header-9}
        enableSolutionsButton: true, // @see {@link https://h5p.org/documentation/developers/contracts#guides-header-8}
        enableSolutionOnCheck: false
      },
      l10n: {
        generalFeedback: 'You have made @total mistake(s).',
        generalFeedbackZeroMistakesMode: 'You have entered @total word(s) correctly and @typo word(s) with minor mistakes.',
        checkAnswer: 'Check',
        tryAgain: 'Retry',
        showSolution: 'Show solution',
        audioNotSupported: 'Your browser does not support this audio.',
        submitAnswer: 'Submit',
      },
      a11y: {
        check: 'Check the answers. The responses will be marked as correct, incorrect, or unanswered.',
        showSolution: 'Show the solution. The task will be marked with its correct solution.',
        retry: 'Retry the task. Reset all responses and start the task over again.',
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

    const defaultLanguage = (contentData && contentData.metadata) ? contentData.metadata.defaultLanguage || 'en' : 'en';
    this.languageTag = Util.formatLanguageCode(defaultLanguage);

    // Initialize
    if (!params) {
      return;
    }

    this.contentId = contentId;
    this.contentData = contentData || {};

    this.contextId = 0; // Best guess, no interaction.

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
    this.params.behaviour.scoring.typoFactor = parseInt(this.params.behaviour.scoring.typoFactor) / 100;

    // Strip incomplete sentences
    this.params.sentences = this.params.sentences
      .filter(sentence => sentence.text !== undefined && sentence.sample !== undefined);

    // Set previousState to empty defaults
    this.previousSentenceStates = [...Array(this.params.sentences.length)];

    // Retrieve previousState
    if (this.contentData.previousState && Array.isArray(this.contentData.previousState)) {
      this.contentData.previousState.forEach((state, index) => {
        if (this.previousSentenceStates.length > index) {
          state.index = state.index ?? index; // Accept previous states from former versions
          this.previousSentenceStates[index] = state;
        }
      });
    }

    // Create sentence instances
    this.params.sentences = this.params.sentences.forEach((sentence, index) => {
      this.sentences.push(new Sentence(
        index,
        {
          sentence: sentence,
          audioNotSupported: this.params.l10n.audioNotSupported,
          tries: this.params.behaviour.tries,
          triesAlternative: this.params.behaviour.triesAlternative,
          ignorePunctuation: this.params.behaviour.scoring.ignorePunctuation,
          hasAlternatives: hasAlternatives,
          a11y: this.params.a11y,
          customTypoDisplay: this.params.behaviour.feedbackPresentation.customTypoDisplay,
          zeroMistakeMode: this.params.behaviour.scoring.zeroMistakeMode,
          typoFactor: this.params.behaviour.scoring.typoFactor,
          alternateSolution: this.params.behaviour.feedbackPresentation.alternateSolution,
          overrideRTL: this.params.behaviour.textual.overrideRTL,
          autosplit: this.params.behaviour.textual.autosplit,
          wordSeparator: this.params.behaviour.textual.wordSeparator,
          disablePause: this.params.behaviour.disablePause,
          callbacks: {
            playAudio: (button) => {
              this.handlePlayAudio(button);
            },
            onInteracted: () => {
              this.handleInteracted();
            },
            onContextChanged: (index) => {
              this.handleContextChanged(index);
            },
            resize: () => {
              this.trigger('resize');
            }
          }
        },
        this.contentId,
        this.previousSentenceStates.filter(state => state?.index === index).shift()
      ));
    });

    // Maximum number of possible mistakes for all sentences
    this.maxMistakes = this.sentences
      .map(sentence => sentence.getMaxMistakes())
      .reduce((a, b) => a + b, 0);

    this.mistakesCapped = this.maxMistakes;
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
        // Audio
        else if (type === 'H5P.Audio') {
          if (media.params.files) {
            this.setAudio(media);
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
      this.content = document.createElement('div');
      this.content.classList.add('h5p-dictation-sentences');

      // Rebuild old order or shuffle sentences if required
      if (this.contentData.previousState) {
        const oldOrder = this.previousSentenceStates.reduce((result, current, index) => {
          return [...result, current ? current?.index : index];
        }, []);

        this.reorderSentences(oldOrder);
      }
      else {
        if (this.params.behaviour.shuffleSentences !== 'never') {
          this.shuffleSentences();
        }
      }

      // Add sentences
      this.addSentences();

      // Register content
      this.setContent(this.content);

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
      }, false, {
        'aria-label': this.params.a11y.showSolution
      }, {});

      // Check answer button
      this.addButton('check-answer', this.params.l10n.checkAnswer, () => {
        this.showEvaluation();
        this.isAnswered = true;
        this.triggerXAPIAnswered();
        if (this.params.behaviour.enableRetry && !this.isPassed()) {
          this.showButton('try-again');
        }
      }, true, {
        'aria-label': this.params.a11y.check
      }, {
        contentData: this.contentData,
        textIfSubmitting: this.params.l10n.submitAnswer,
      });

      // Retry button
      this.addButton('try-again', this.params.l10n.tryAgain, () => {
        this.resetTask();
        this.sentences[0].focus();
      }, false, {
        'aria-label': this.params.a11y.retry
      }, {});
    };

    /**
     * Add sentences to DOM.
     */
    this.addSentences = () => {
      // Clean previous sentences
      this.content.innerHTML = '';

      if (this.sentences.length === 0) {
        // No content was given
        const message = document.createElement('div');
        message.classList.add('h5p-dictation-no-content');
        message.innerHTML = 'I really need at least one sound sample and text for it :-)';
        this.content.appendChild(message);
      }
      else {
        // Sentences
        this.sentences.forEach(sentence => {
          this.content.appendChild(sentence.getDOM());
        });
      }
    };

    /**
     * Shuffle sentences.
     */
    this.shuffleSentences = () => {
      this.sentences = Util.shuffleArray(this.sentences);
      this.sentences.forEach((sentence, index) => {
        sentence.setPosition(index + 1);
      });
    };

    /**
     * Reorder sentences.
     * @param {number[]} order Order.
     */
    this.reorderSentences = (order) => {
      const reorderedSentences = [];
      for (let i = 0; i < order.length; i++) {
        reorderedSentences.push(this.sentences[order[i]]);
      }

      this.sentences = reorderedSentences;
    };

    /**
     * Handle playing audio.
     * @param {Button} button Calling button.
     */
    this.handlePlayAudio = (button) => {
      this.sentences.forEach(sentence => {
        if (this.params.behaviour.disablePause) {
          sentence.stopButtons(button);
        }
        else {
          sentence.pauseButtons(button);
        }
      });
    };

    /**
     * Handle user interacted
     */
    this.handleInteracted = () => {
      this.triggerXAPI('interacted');
    };

    /**
     * Handle context changed.
     */
    this.handleContextChanged = (contextId) => {
      this.contextId = contextId;
    };

    /**
     * Show the evaluation for the input in the text input fields.
     */
    this.showEvaluation = () => {
      // Update buttons
      this.hideButton('check-answer');
      if (this.params.behaviour.enableSolutionsButton && !this.params.behaviour.enableSolutionOnCheck) {
        this.showButton('show-solution');
      }

      this.computedResults = this.sentences.map(sentence => {
        return sentence.computeResults();
      });

      this.sentences.forEach(sentence => {
        sentence.disable();
      });

      // Sum up the scores of all sentences
      const scoreTotal = this.computedResults
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
        scoreTotal.typo * this.params.behaviour.scoring.typoFactor;

      // Number of mistakes shall not be higher than number of words.
      this.mistakesCapped = Math.min(mistakesTotal, this.maxMistakes);
      this.correctTotal = scoreTotal.match + scoreTotal.typo * (1 - this.params.behaviour.scoring.typoFactor);

      let generalFeedback;
      if (this.params.behaviour.scoring.zeroMistakeMode) {
        generalFeedback = (this.params.l10n.generalFeedbackZeroMistakesMode || '')
          .replace('@added', scoreTotal.added)
          .replace('@missing', scoreTotal.missing)
          .replace('@wrong', scoreTotal.wrong)
          .replace('@typo', scoreTotal.typo)
          .replace('@matches', scoreTotal.match)
          .replace('@total', scoreTotal.match);
      }
      else {
        generalFeedback = (this.params.l10n.generalFeedback || '')
          .replace('@added', scoreTotal.added)
          .replace('@missing', scoreTotal.missing)
          .replace('@wrong', scoreTotal.wrong)
          .replace('@typo', scoreTotal.typo)
          .replace('@matches', scoreTotal.match)
          .replace('@total', mistakesTotal)
          .replace('@capped', this.mistakesCapped);
      }

      const textScore = H5P.Question.determineOverallFeedback(
        this.params.overallFeedback, this.getScore() / this.getMaxScore());

      // H5P.Question expects ':num' and ':total'
      const ariaMessage = this.params.a11y.yourResult
        .replace('@score', ':num')
        .replace('@total', ':total');

      this.setFeedback(
        (`${generalFeedback} ${textScore}`).trim(),
        this.getScore(),
        this.getMaxScore(),
        ariaMessage
      );

      if (this.params.behaviour.enableSolutionOnCheck) {
        this.showSolutions();
      }

      this.trigger('resize');
    };

    /**
     * Determine whether the task has been passed by the user.
     * @return {boolean} True if user passed or task is not scored.
     */
    this.isPassed = () => this.mistakesCapped === 0;

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
    this.getScore = () => (this.params.behaviour.scoring.zeroMistakeMode) ?
      Math.round(this.correctTotal) :
      Math.round(this.maxMistakes - this.mistakesCapped);

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
        sentence.showSolution(this.computedResults[index]);
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
      // Shuffle sentences if they should be
      if (this.params.behaviour.shuffleSentences === 'onRetry') {
        this.shuffleSentences();
        this.addSentences();
      }

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

      this.mistakesCapped = this.maxMistakes;
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
    this.triggerXAPIAnswered = () => {
      this.trigger(this.getXAPIAnswerEvent());
    };

    /**
     * Build xAPI answer event.
     * @return {H5P.XAPIEvent} XAPI answer event.
     */
    this.getXAPIAnswerEvent = () => {
      this.computedResults = this.sentences.map(sentence => {
        return sentence.computeResults();
      });

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

      const response = this
        .computedResults.reduce((gaps, sentence) => {
          return gaps.concat(
            sentence.words.reduce((answers, word) => {
              return answers.concat(word.answer || '');
            }, [])
          );
        }, [])
        .join('[,]');

      // Concatenate input from sentences
      xAPIEvent.data.statement.result.response = response;

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
      // We need to build the placeholders dynamically based on user input
      const placeholders = this.computedResults.reduce((placeholder, result, index) => {
        const description = this.sentences[index].getXAPIDescription();
        const sentence = result.words
          .map(() => {
            return Dictation.FILL_IN_PLACEHOLDER;
          })
          .join(' '); // TODO: Use pattern to put punctuation right
        return `${placeholder}${description}<p>${sentence}</p>`;
      }, '');

      const definition = {};
      definition.name = {};
      definition.name[this.languageTag] = this.getTitle();
      // Fallback for h5p-php-reporting, expects en-US
      definition.name['en-US'] = definition.name[this.languageTag];
      definition.description = {};
      definition.description[this.languageTag] = `${this.getDescription()}${placeholders}`;
      // Fallback for h5p-php-reporting, expects en-US
      definition.description['en-US'] = definition.description[this.languageTag];
      definition.type = 'http://adlnet.gov/expapi/activities/cmi.interaction';
      definition.interactionType = 'fill-in';

      // Use extension to avoid exponentially growing solution space
      definition.extensions = definition.extensions || {};
      definition.extensions[Dictation.XAPI_CASE_SENSITIVITY] = true;

      const gapVariations = this.buildCorrectGapVariations();
      definition.extensions[Dictation.XAPI_ALTERNATIVE_EXTENSION] = gapVariations;

      // Fallback CRP with only first gap variation
      definition.correctResponsesPattern = this.buildxAPICRP(gapVariations.slice());

      return definition;
    };

    /**
     * Build all correct gap variations.
     * @return {object[]} Correct gap variations.
     */
    this.buildCorrectGapVariations = () => {
      return this.computedResults.reduce((gaps, sentence) => {
        return gaps.concat(
          sentence.words.map(word => {
            return word.solution ? word.solution.split('|') : [];
          })
        );
      }, []);
    };

    /**
     * Build correct responses pattern from gaps.
     *
     * This may not be completely true, because we can't sensibly compile all
     * possible answers for a sentence if we accept small mistakes.
     *
     * @param {object[]} gapsVariations Sentences gaps.
     * @param {boolean} [complete=false] If true, will build complete CRP.
     * @return {object[]} Correct responses pattern.
     */
    this.buildxAPICRP = (gapsVariations, complete = false) => {
      let crp = [''];

      if (!gapsVariations) {
        return crp;
      }

      if (!complete) {
        crp = gapsVariations
          .map(sentences => sentences[0])
          .join('[,]');
        crp = [`{case_matters=true}${crp}`];
      }
      else {
        gapsVariations.forEach(sentences => {
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
     * Get context data.
     * Contract used for confusion report.
     * @return {object} Context data.
     */
    this.getContext = () => {
      return {
        type: 'sentence',
        value: this.contextId + 1
      };
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
Dictation.XAPI_REPORTING_VERSION = '1.0.0';

/** @constant {string}
 * Required to be added to xAPI object description for H5P reporting
 */
Dictation.FILL_IN_PLACEHOLDER = '__________';

export default Dictation;
