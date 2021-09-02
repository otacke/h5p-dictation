import Button from './h5p-dictation-button';
import Solution from './h5p-dictation-solution';
import Util from './h5p-dictation-util';

/** Class representing a sentence */
class Sentence {
  /**
   * @constructor
   * @param {number} index - Index of the sentence.
   * @param {object} params - Parameters.
   * @param {number} params.tries - Number of attempts for sample.
   * @param {number} params.triesAlternative - Number of attempts for alternative sample.
   * @param {boolean} params.ignorePunctuation - If true, punctuation is ignored.
   * @param {object} params.sentence - Sentence content.
   * @param {string} params.sentence.text - Correct answer.
   * @param {string} params.sentence.sample - Path to sound sample.
   * @param {string} params.sentence.sampleAlternatives - Path to alternative sound sample.
   * @param {string} params.audioNotSupported - Text to show if audio not supported.
   * @param {string} params.alternateSolution - Mode to display alternate solutions.
   * @param {string} params.wordSeparator - Separator of words.
   * @param {string} overrideRTL - Override for right-to-left support.
   * @param {boolean} autosplit - Set auto-splitting for characters.
   * @param {object} params.a11y - Readspeaker texts.
   * @param {number} id - Content Id.
   * @param {object} previousState - PreviousState.
   */
  constructor(index, params, id, previousState = {}) {
    this.index = index;
    this.position = index + 1;
    this.params = params;
    this.contentId = id;

    this.maxTries = params.tries;
    this.maxTriesAlternative = params.triesAlternative;

    this.params.sentence.description = (this.params.sentence.description || '').trim();

    this.params.callbacks = Util.extend({
      playAudio: () => {},
      onInteracted: () => {},
      onContextChanged: () => {},
      resize: () => {}
    }, params.callbacks);

    this.solutionText = Util.htmlDecode(params.sentence.text).trim();
    this.solutionText = (!params.ignorePunctuation) ? this.solutionText : Sentence.stripPunctuation(this.solutionText);
    this.containsRTL = (this.params.overrideRTL === 'auto') ?
      Util.containsRTLCharacters(this.solutionText) :
      this.params.overrideRTL === 'on';

    // Compute maximum possible mistakes
    this.mistakesMax = Sentence.addSpaces(
      this.solutionText,
      {
        autosplit: this.params.autosplit,
        wordSeparator: this.params.wordSeparator
      }
    ).split(params.wordSeparator).length;

    // DOM
    this.content = document.createElement('div');
    this.content.setAttribute('role', 'group');
    this.content.setAttribute('aria-label', `${this.params.a11y.sentence} ${this.position}`);
    this.content.classList.add(Sentence.CONTENT_WRAPPER);

    // Description (optional)
    const contentDescription = document.createElement('div');
    contentDescription.classList.add(Sentence.CONTENT_DESCRIPTION);
    contentDescription.innerHTML = this.params.sentence.description;

    const contentInteraction = document.createElement('div');
    contentInteraction.classList.add(Sentence.CONTENT_INTERACTION);

    // Normal audio button
    this.buttonPlayNormal = new Button(
      id,
      {
        sample: params.sentence.sample,
        audioNotSupported: params.audioNotSupported,
        type: Button.BUTTON_TYPE_NORMAL,
        maxTries: params.tries,
        a11y: params.a11y,
        callbacks: {
          playAudio: (button) => {
            this.handleButtonClicked(button);
          }
        }
      },
      previousState.buttonPlayNormal
    );
    contentInteraction.appendChild(this.buttonPlayNormal.getDOM());

    // Alternative audio button
    if (this.params.hasAlternatives === true) {
      this.buttonPlaySlow = new Button(
        id,
        {
          sample: params.sentence.sampleAlternative,
          audioNotSupported: params.audioNotSupported,
          type: Button.BUTTON_TYPE_SLOW,
          maxTries: params.triesAlternative,
          a11y: params.a11y,
          callbacks: {
            playAudio: (button) => {
              this.handleButtonClicked(button);
            }
          }
        },
        previousState.buttonPlaySlow
      );
      contentInteraction.appendChild(this.buttonPlaySlow.getDOM());

    }

    contentDescription.classList.add((this.params.hasAlternatives === true) ?
      Sentence.CONTENT_DESCRIPTION_TWO_BUTTONS :
      Sentence.CONTENT_DESCRIPTION_ONE_BUTTON
    );

    // Text input field
    this.inputField = document.createElement('textarea');
    this.inputField.setAttribute('rows', 1);
    this.inputField.setAttribute('spellcheck', 'false');
    this.inputField.setAttribute('autocorrect', 'off');
    this.inputField.setAttribute('autocapitalize', 'off');
    this.inputField.setAttribute('aria-label', this.params.a11y.enterText);

    // Auto resize the input field
    this.inputField.addEventListener('input', () => {
      // Remove line breaks when pasting, etc.
      if (this.inputField.value.indexOf('\n') !== -1 || this.inputField.value.indexOf('\r') !== -1) {
        this.inputField.value = this.inputField.value.replace(/[\n\r]/g, '');
      }

      this.inputField.style.height = 'auto'; // Reset to allow shrinking
      const needsResize = (this.previousScrollHeight !== this.inputField.scrollHeight);

      this.inputField.style.height = `${this.inputField.scrollHeight + this.inputField.offsetHeight - this.inputField.clientHeight}px`;

      if (needsResize) {
        this.previousScrollHeight = this.inputField.scrollHeight;

        // Trigger iframe resize
        this.params.callbacks.resize();
      }
    });

    this.inputField.classList.add(Sentence.INPUT_FIELD);

    // Restore previous state
    if (previousState.userInput) {
      this.inputField.value = previousState.userInput;
      this.oldValue = this.inputField.value || '';
    }
    else {
      this.oldValue = '';
    }

    // Handle context changed for context contract
    this.inputField.addEventListener('keydown', () => {
      this.params.callbacks.onContextChanged(this.index);
    });

    // Add interacted listener
    this.inputField.addEventListener('blur', () => {
      if (this.oldValue !== this.inputField.value) {
        this.params.callbacks.onInteracted();
      }
      this.oldValue = this.inputField.value;
    });

    this.solution = new Solution({
      alternateSolution: this.params.alternateSolution,
      zeroMistakeMode: this.params.zeroMistakeMode,
      customTypoDisplay: this.params.customTypoDisplay,
      typoFactor: this.params.typoFactor,
      containsRTL: this.containsRTL,
      a11y: {
        match: this.params.a11y.correct,
        wrong: this.params.a11y.wrong,
        typo: this.params.a11y.typo,
        missing: this.params.a11y.missing,
        added: this.params.a11y.added,
        correct: this.params.a11y.correct,
        point: this.params.a11y.point,
        points: this.params.a11y.points,
        item: this.params.a11y.item,
        solution: this.params.a11y.solution,
        or: this.params.a11y.or,
        shouldHaveBeen: this.params.a11y.shouldHaveBeen,
        period: this.params.a11y.period,
        exclamationPoint: this.params.a11y.exclamationPoint,
        questionMark: this.params.a11y.questionMark,
        comma: this.params.a11y.comma,
        singleQuote: this.params.a11y.singleQuote,
        doubleQuote: this.params.a11y.doubleQuote,
        colon: this.params.a11y.colon,
        semicolon: this.params.a11y.semicolon,
        plus: this.params.a11y.plus,
        minus: this.params.a11y.minus,
        asterisk: this.params.a11y.asterisk,
        forwardSlash: this.params.a11y.forwardSlash
      }
    });

    // Sentence input field and solution
    this.inputWrapper = document.createElement('div');
    this.inputWrapper.classList.add(Sentence.INPUT_WRAPPER);
    this.inputWrapper.appendChild(this.inputField);
    this.inputWrapper.appendChild(this.solution.getDOM());
    contentInteraction.appendChild(this.inputWrapper);

    this.content.appendChild(contentDescription);
    this.content.appendChild(contentInteraction);
  }

  /**
   * Get content for H5P.Question.
   * @return {object} DOM elements for content.
   */
  getDOM() {
    return this.content;
  }

  /**
   * Get current text in InputField.
   * @return {string} Current text.
   */
  getUserInput() {
    return this.inputField.value;
  }

  /**
   * Set the sentence's position in DOM.
   * @param {number} position Position.
   */
  setPosition(position) {
    this.position = position;
    this.content.setAttribute('aria-label', `${this.params.a11y.sentence} ${this.position}`);
  }

  /**
   * Set current text in InputField.
   * DOM is not created before to make cheating a little more difficult at least.
   * @param {object} result - Current DOM element with words.
   */
  showSolution(result) {
    this.solution.show(result);

    if (this.buttonPlayNormal) {
      this.buttonPlayNormal.setUntabbable();
    }
    if (this.buttonPlaySlow) {
      this.buttonPlaySlow.setUntabbable();
    }
  }

  /**
   * Hide solution.
   */
  hideSolution() {
    this.solution.hide();

    if (this.buttonPlayNormal) {
      this.buttonPlayNormal.setTabbable();
    }
    if (this.buttonPlaySlow) {
      this.buttonPlaySlow.setTabbable();
    }
  }

  /**
   * Get correct text.
   * @param {boolean} asArray If true, text will be returned as array of words.
   * @return {string} Correct text.
   */
  getCorrectText(asArray = false) {
    return (asArray) ? Sentence.addSpaces(
      this.solutionText,
      {
        autosplit: this.params.autosplit,
        wordSeparator: this.params.wordSeparator
      }
    ).split(this.params.wordSeparator) : this.solutionText;
  }

  /**
   * Get current state.
   * @return {object} current State.
   */
  getCurrentState() {
    return {
      index: this.index, // Original index in semantics
      userInput: this.getUserInput(),
      buttonPlayNormal: (this.buttonPlayNormal) ? this.buttonPlayNormal.getCurrentState() : undefined,
      buttonPlaySlow: (this.buttonPlaySlow) ? this.buttonPlaySlow.getCurrentState() : undefined
    };
  }

  /**
   * Get the maximum of possible mistakes.
   * @return {number} Number of possible mistakes.
   */
  getMaxMistakes() {
    return this.mistakesMax;
  }

  /**
   * Get description text.
   * @return {string} Description text.
   */
  getXAPIDescription() {
    return this.params.sentence.description || '' ?
      `<p>${this.params.sentence.description}</p>` :
      '';
  }

  /**
   * Reset sentences.
   */
  reset() {
    this.inputField.value = '';
    this.oldValue = '';

    this.solution.reset();

    if (this.buttonPlayNormal) {
      this.buttonPlayNormal.reset();
    }
    if (this.buttonPlaySlow) {
      this.buttonPlaySlow.reset();
    }
  }

  /**
   * Disable input field.
   */
  disable() {
    this.inputField.disabled = true;

    if (this.buttonPlayNormal) {
      this.buttonPlayNormal.disable();
      this.buttonPlayNormal.resetAudio();
    }

    if (this.buttonPlaySlow) {
      this.buttonPlaySlow.disable();
      this.buttonPlaySlow.resetAudio();
    }
  }

  /**
   * Enable input field.
   */
  enable() {
    this.inputField.disabled = false;

    if (this.buttonPlayNormal) {
      this.buttonPlayNormal.enable();
    }

    if (this.buttonPlaySlow) {
      this.buttonPlaySlow.enable();
    }
  }

  /**
   * Pause buttons.
   * @param {Button} [excludeButton] Button to ignore.
   */
  pauseButtons(excludeButton) {
    if (this.buttonPlayNormal && this.buttonPlayNormal !== excludeButton) {
      this.buttonPlayNormal.pause();
    }

    if (this.buttonPlaySlow && this.buttonPlaySlow !== excludeButton) {
      this.buttonPlaySlow.pause();
    }
  }

  /**
   * Handle button clicked.
   * @param {Button} button Calling button.
   */
  handleButtonClicked(button) {
    this.params.callbacks.playAudio(button);
    this.params.callbacks.onInteracted();
    this.params.callbacks.onContextChanged(this.index);
  }

  /**
   * Focus button.
   */
  focus() {
    if (this.buttonPlayNormal) {
      this.buttonPlayNormal.focus();
    }
  }

  /**
   * Add spaces between text and punctuation.
   * @param {string} text Text to add spaces to.
   * @param {object} [options] Options.
   * @param {boolean} [options.autosplit=true] If true, automatically split respective symbols.
   * @return {string} [options.wordSeparator=' '] Text with spaces and symbols.
   */
  static addSpaces(text, options = {}) {
    options.autosplit = (typeof options.autosplit !== 'boolean') ? true : options.autosplit;
    options.wordSeparator = options.wordSeparator || ' ';

    // Users with a non default word separator will manually handle all spacing options
    if (' ' !== options.wordSeparator)
      return text;

    // In a sentence like "John's car broke.", the . would be removed, but not the '
    const wordThenPunctuation = new RegExp(`(${Sentence.WORD}|^)(${Sentence.PUNCTUATION.replace("'", '')})( |$)`, 'g');
    const punctuationThenWord = new RegExp(`( |^)(${Sentence.PUNCTUATION})(${Sentence.WORD}|$)`, 'g');

    text = text
      .replace(wordThenPunctuation, `$1 $2 `)
      .replace(punctuationThenWord, ` $2 $3`);

    if (options.autosplit === true) {
      // Space between autosplit characters, e.g. Chinese Han symbols
      text = text.replace(
        new RegExp(`(${Sentence.AUTOSPLIT})(?=${Sentence.AUTOSPLIT})`, 'g'),
        `$1 `
      );

      text = text.replace(
        new RegExp(`(${Sentence.AUTOSPLIT})(?=${Sentence.WORD}|d|${Sentence.PUNCTUATION})`, 'g'),
        `$1 `
      );

      text = text.replace(
        new RegExp(`(${Sentence.WORD}|d|${Sentence.PUNCTUATION})(?=${Sentence.AUTOSPLIT})`, 'g'),
        `$1 `
      );
    }

    return text.trim();
  }

  /**
   * Strip punctuation from a sentence.
   * @param {object[]|string} words - Words of a sentence.
   * @return {object[]|string} Words without punctuation.
   */
  static stripPunctuation(words) {
    let wasString = false;
    if (typeof words === 'string') {
      wasString = true;
      words = [words];
    }

    /*
     * Will remove all punctuation symbols that are not directly enclosed in characters
     * In a sentence like "John's car broke.", the . would be removed, but not the '
     */
    const punctuationStart = new RegExp(`^${Sentence.PUNCTUATION}`);
    const punctuationEnd = new RegExp(`${Sentence.PUNCTUATION}$`);
    const punctuationBefore = new RegExp(` ${Sentence.PUNCTUATION}`, 'g');
    // Special case: "The users' browser", keep the ' here
    const punctuationAfter = new RegExp(`${Sentence.PUNCTUATION.replace("'", '')} `, 'g');

    words = words.map(word => {
      return word
        .replace(punctuationStart, '')
        .replace(punctuationEnd, '')
        .replace(punctuationBefore, ' ')
        .replace(punctuationAfter, ' ');
    });

    return (wasString) ? words.toString().replace(/[ ]{2}/g, ' ') : words;
  }

  /**
   * Compute the results for this sentence.
   * @return {object} Results.
   */
  computeResults() {
    // Add spaces to correct text
    const wordsSolution = Sentence.addSpaces(
      this.getCorrectText(),
      {
        autosplit: this.params.autosplit,
        wordSeparator: this.params.wordSeparator
      },
    ).split(this.params.wordSeparator);

    let input = this.getUserInput();
    if (this.params.ignorePunctuation) {
      input = Sentence.stripPunctuation(input);
    }

    // In case our wordSeparator is not space, we must replace spaces by the separator
    if (' ' !== this.params.wordSeparator) {
      // If we have one alternative with multiple words, we want to escape the spaces
      wordsSolution.forEach( solutionPart => {
        const alternatives = solutionPart.split('|');

        alternatives.forEach(alternative => {
          alternative = alternative.trim();
          if (alternative.indexOf(' ') !== -1) {
            const escapedAlternative = alternative.replace(/ /g, Sentence.SPACE_ESCAPE);
            input = input.replace(new RegExp(alternative, 'g'), escapedAlternative);
          }
        });
      });

      // And then unescape spaces
      input = input.replace(/ /g, this.params.wordSeparator);
      input = input.replace(new RegExp(Sentence.SPACE_ESCAPE, 'g'), ' ');
    }

    // Add spaces to solution and break in parts
    let wordsInput = input.trim() === '' ? [] : Sentence.addSpaces(
      input,
      {
        autosplit: this.params.autosplit,
        wordSeparator: this.params.wordSeparator
      },
    ).split(this.params.wordSeparator).filter(word => word.length > 0);

    // In case our wordSeparator is not space, we add spaces between tokens
    if (' ' !== this.params.wordSeparator) {
      wordsInput = wordsInput.map( (word, i) => i === wordsInput.length - 1 ? word : `${word} `);
    }

    // Compute diff between correct solution and user input
    const aligned = this.alignWords(wordsSolution, wordsInput);

    // Compute total score and explanation for each word
    const scoreNWords = this.computeScore(aligned);
    const score = scoreNWords.scoreTotal;
    const words = scoreNWords.words;

    return {
      "score": {
        "added": score[Sentence.TYPE_ADDED],
        "missing": score[Sentence.TYPE_MISSING],
        "typo": score[Sentence.TYPE_TYPO],
        "wrong": score[Sentence.TYPE_WRONG],
        "match": score[Sentence.TYPE_MATCH],
        "total": Math.min(score[Sentence.TYPE_ADDED] +
          score[Sentence.TYPE_MISSING] +
          score[Sentence.TYPE_TYPO] +
          score[Sentence.TYPE_WRONG], this.getMaxMistakes())
      },
      "words": words
    };
  }

  /**
   * Compute total score and explanation for each word.
   * @param {object} aligned Word by word comparison of input and solution.
   */
  computeScore(aligned) {
    const words = [];
    let scoreTotal = [];
    scoreTotal[Sentence.TYPE_ADDED] = 0;
    scoreTotal[Sentence.TYPE_MISSING] = 0;
    scoreTotal[Sentence.TYPE_TYPO] = 0;
    scoreTotal[Sentence.TYPE_WRONG] = 0;
    scoreTotal[Sentence.TYPE_MATCH] = 0;

    for (let i = 0; i < aligned.words1.length; i++) {
      const solution = aligned.words1[i];
      const answer = aligned.words2[i];
      let type = '';

      if (solution === undefined) {
        type = Sentence.TYPE_ADDED;
      }
      else if (answer === undefined) {
        type = Sentence.TYPE_MISSING;
      }
      else if (answer === solution) {
        type = Sentence.TYPE_MATCH;
      }
      else if (H5P.TextUtilities.areSimilar(solution, answer)) {
        type = Sentence.TYPE_TYPO;
      }
      else {
        type = Sentence.TYPE_WRONG;
      }
      scoreTotal[type]++;

      words.push({
        'solution': solution,
        'answer': answer,
        'type': type
      });
    }

    return {
      scoreTotal: scoreTotal,
      words: words
    };
  }

  /**
   * Bring two arrays of words to same length and match the words' positions
   * There may be a smarter way to do it, but it works well.
   *
   * The idea behind the algorithm is to add as many gaps between each solution
   * word as there are words in the input. Afterwards, the input words are shaken
   * left and right multiple times with decreasing strictness for finding
   * matches in the solution. Afterwords, all gaps that appear at the same
   * position of the input and the solution can be removed.
   *
   * TODO: This needs to be boiled down. It's long, there's redundant code,
   * but I am too scared to touch it without having tests in place first.
   *
   * @param {array} words1 - First Array of words.
   * @param {array} words2 - Second Array of words.
   * @return {object} Object containing two new arrays.
   */
  alignWords(words1, words2) {

    /**
     * Get match pattern.
     * @param {object} aligned Aligned words.
     * @return {boolean[]} Match pattern.
     */
    const getMatchPattern = (aligned) => aligned.words1.map((word1, index) =>
      word1 === aligned.words2[index] ||
        H5P.TextUtilities.areSimilar(word1, aligned.words2[index]) ||
        false);

    const getMatch = (answer, solution, fuzzy = false) => {
      let match;

      if (solution === undefined) {
        return;
      }

      // Split alternatives like word.split(/(?<!\\)\|/)
      const alternatives = Util.splitWordAlternatives(solution);

      if (fuzzy) {
        alternatives.forEach(alternative => {
          if (H5P.TextUtilities.areSimilar(alternative, answer)) {
            match = match || alternative;
          }
        });
      }
      else {
        alternatives.forEach(alternative => {
          if (alternative === answer) {
            match = match || alternative;
          }
        });
      }

      return match;
    };

    const align = (words1, words2) => {
      words2 = words2.map(word => (word === '') ? undefined : word);

      // Add words2.length empty gaps in front of and behind every word
      let master = words1
        .map(word1 => {
          return Array.apply(null, Array(words2.length)).concat(word1);
        })
        .reduce((a, b) => a.concat(b), []);
      master = master.concat(Array.apply(null, Array(words2.length)));

      // Create empty duplicate of same length
      const slave = Array.apply(null, Array(master.length));

      /*
       * We let all words of the answer slide the solution array from left to right one by one.
       * We let them stick if a match is found AND there are no identical words in the answer
       * later on.
       */
      let floor = 0; // Lower boundary

      for (let i = 0; i < words2.length; i++) {
        const currentInput = words2[i];

        for (let pos = master.length - 1; pos >= floor; pos--) {
          const match = getMatch(currentInput, master[pos]);
          const matchFound = currentInput !== undefined && match !== undefined;
          // const matchFound = currentInput !== undefined && currentInput === master[pos];
          const noIdenticalWords = words2.slice(i + 1).indexOf(currentInput) === -1;

          if (matchFound && noIdenticalWords || pos === floor) {
            master[pos] = match;
            slave[pos] = currentInput;
            floor = pos + 1;
            break;
          }
        }
      }

      /*
       * We let all the words that don't have a match yet slide from right to left
       * as far as possible looking for a match just in case they slided too far
       */
      for (let pos = slave.length - 1; pos >= 0; pos--) {
        const currentWord = slave[pos];

        if (currentWord !== undefined && currentWord !== master[pos]) {
          let moves = 0;
          let posMatch = 0;

          let matchLater;
          while (pos + moves + 1 < slave.length && slave[pos + moves + 1] === undefined) {
            const match = getMatch(currentWord, master[pos + moves + 1]);
            if (match !== undefined) {
              posMatch = pos + moves + 1;
              matchLater = match;
            }
            moves++;
          }

          slave[posMatch || pos + moves] = currentWord;
          if (matchLater !== undefined) {
            master[posMatch] = matchLater;
          }

          slave[pos] = undefined;
        }
      }

      /*
       * Now we slide the remainders from left to right to finally deal with typos
       */
      for (let pos = 0; pos < slave.length; pos++) {
        const currentWord = slave[pos];

        if (currentWord !== undefined && currentWord !== master[pos]) {
          let moves = 0;
          let posMatch = 0;

          let matchLater;
          while (pos + moves - 1 >= 0 && slave[pos + moves - 1] === undefined) {
            const match = getMatch(currentWord, master[pos + moves - 1], true);
            if (match !== undefined) {
              posMatch = pos + moves - 1;
              matchLater = match;
            }

            moves--;
          }

          slave[posMatch || pos + moves] = currentWord;
          if (matchLater !== undefined) {
            master[posMatch] = matchLater;
          }
          slave[pos] = undefined;
        }
      }

      // Remove clutter aka gaps at same position in both array
      for (let pos = master.length - 1; pos >= 0; pos--) {
        if (master[pos] === undefined && slave[pos] === undefined) {
          master.splice(pos, 1);
          slave.splice(pos, 1);
        }
      }

      // Finally we can simply interpret adjacent missing/added words as wrong
      for (let pos = 0; pos < master.length - 1; pos++) {
        // We're assuming a left-swipe as previous operation here
        if (master[pos] === undefined && slave[pos + 1] === undefined) {
          master[pos] = master[pos + 1];
          master.splice(pos + 1, 1);
          slave.splice(pos + 1, 1);
        }
      }

      // Make big clusters =>
      for (let pos = 0; pos < master.length - 1; pos++) {
        if (slave[pos] === master[pos] && master[pos + 1] === undefined && slave[pos] !== slave[pos + 1]) {
          let moves = 0;

          while (pos + moves + 1 < master.length && master[pos + moves + 1] === undefined) {
            moves++;
          }

          if (pos + moves + 1 < master.length && slave.slice(pos + 1, pos + moves + 1).lastIndexOf(slave[pos]) !== -1) {
            master[pos + moves + 1] = master[pos];
            master[pos] = undefined;
          }
        }
      }

      // Make big clusters <=
      master.reverse();
      slave.reverse();
      for (let pos = 0; pos < master.length - 1; pos++) {
        if (slave[pos] === master[pos] && master[pos + 1] === undefined && slave[pos] !== slave[pos + 1]) {
          let moves = 0;

          while (pos + moves + 1 < master.length && master[pos + moves + 1] === undefined) {
            moves++;
          }

          if (pos + moves + 1 < master.length && slave.slice(pos + 1, pos + moves + 1).lastIndexOf(slave[pos]) !== -1) {
            master[pos + moves + 1] = master[pos];
            master[pos] = undefined;
          }
        }
      }
      master.reverse();
      slave.reverse();

      return {"words1": master, "words2": slave};
    };

    /**
     * Count the number of matches + typos.
     * @param {object} aligned Aligned words.
     * @return {number} Number of matches and typos.
     */
    const count = (aligned) => getMatchPattern(aligned)
      .reduce((stack, current) => stack + (current ? 1 : 0), 0);

    // The order of the words makes a difference when shaking. We return the best match
    let aligned1 = align(words1, words2);
    const aligned2 = align(words1.reverse(), words2.reverse());

    if (count(aligned2) > count(aligned1)) {
      aligned1 = {'words1': aligned2.words1.reverse(), 'words2': aligned2.words2.reverse()};
    }

    /*
     * If learners add a lot of wrong words, these can lack a counterpart
     * in the solution, and clusters between matches can be squeezed together
     * in order to not count these counterpartless words as mistakes.
     */
    const matchPattern = getMatchPattern(aligned1);
    let lo = -1;
    let hi = matchPattern.length - 1;
    do {
      lo = matchPattern.lastIndexOf(true, hi);
      while (aligned1.words1[lo + 1] === undefined && aligned1.words2[hi] === undefined) {
        aligned1.words1.splice(lo + 1, 1);
        aligned1.words2.splice(hi, 1);
        hi -= 1;
      }
      hi = lo - 1;
    } while (lo > 0);

    return aligned1;
  }

  /**
   * Set focus to the sentence solution.
   */
  focusSolution() {
    this.solution.focus();
  }
}

// CSS Classes
/** @constant {string} */
Sentence.CONTENT_WRAPPER = 'h5p-sentence';
/** @constant {string} */
Sentence.CONTENT_DESCRIPTION = 'h5p-sentence-description';
/** @constant {string} */
Sentence.CONTENT_DESCRIPTION_ONE_BUTTON = 'h5p-sentence-description-one-button';
/** @constant {string} */
Sentence.CONTENT_DESCRIPTION_TWO_BUTTONS = 'h5p-sentence-description-two-buttons';
/** @constant {string} */
Sentence.CONTENT_INTERACTION = 'h5p-sentence-interaction';
/** @constant {string} */
Sentence.INPUT_WRAPPER = 'h5p-input-wrapper';
/** @constant {string} */
Sentence.INPUT_FIELD = 'h5p-text-input';

// Score types
/** @constant {string} */
Sentence.TYPE_ADDED = 'added';
/** @constant {string} */
Sentence.TYPE_MISSING = 'missing';
/** @constant {string} */
Sentence.TYPE_WRONG = 'wrong';
/** @constant {string} */
Sentence.TYPE_MATCH = 'match';
/** @constant {string} */
Sentence.TYPE_TYPO = 'typo';

// Regular expression configuration
/** @constant {string} */
Sentence.AUTOSPLIT = '[\u4E00-\u62FF\u6300-\u77FF\u7800-\u8CFF\u8D00-\u9FFF]';
/** @constant {string} */

Sentence.PUNCTUATION = '[.?!,\'";\\:\\-\\(\\)/\\+\\-\\*\u00AB\u00BB\u00BF\u201C-\u201E\u060C\u061F\u05BE\u05C0\u05C3\u05C6\u2000-\u206F\u22EF\u3000-\u3002\u3008-\u3011\uFF01\uFF08\uFF09\uFF0C\uFF1A\uFF1B\uFF1F\uFF3B\uFF3D\uFE41\uFE42\uFE4F\uFF5E]';
/** @constant {string} */
Sentence.WORD = '\\w|[\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF\u0100-\u02AF\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7-\u060B\u060D-\u061E\u0620-\u08FF]';

/** @constant {string} */
Sentence.SPACE_ESCAPE = 'astringthatwillneverhappen123@@';

export default Sentence;
