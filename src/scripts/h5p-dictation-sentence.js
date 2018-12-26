import Button from './h5p-dictation-button';

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
   * @param {string} overrideRTL - Override for right-to-left support.
   * @param {boolean} autosplit - Set auto-splitting for characters.
   * @param {object} params.a11y - Readspeaker texts.
   * @param {string} params.a11y.play - Readspeaker text for "Play".
   * @param {string} params.a11y.playSlowly - Readspeaker text for "Play slowly".
   * @param {string} params.a11y.enterText - Readspeaker text for "Enter what you have heard here".
   * @param {string} params.a11y.solution - Readspeaker text for "Solution".
   * @param {string} params.a11y.sentence - Readspeaker text for "Sentence".
   * @param {number} id - Content Id.
   */
  constructor(index, params, id) {
    this.index = index;
    this.params = params;
    this.contentId = id;

    this.maxTries = params.tries;
    this.maxTriesAlternative = params.triesAlternative;
    this.triesLeft = this.maxTries;
    this.triesLeftAlternative = this.maxTriesAlternative;

    this.solution = this.htmlDecode(params.sentence.text).trim();
    this.solution = (!params.ignorePunctuation) ? this.solution : this.stripPunctuation(this.solution);
    this.containsRTL = (this.params.overrideRTL === 'auto') ?
      this.containsRTLCharacters(this.solution) :
      this.params.overrideRTL === 'on' ? true : false;
    this.mistakesMax = this.addSpaces(this.solution).split(' ').length;

    // DOM
    this.content = document.createElement('div');
    this.content.setAttribute('role', 'group');
    this.content.setAttribute('aria-label', `${params.a11y.sentence} ${this.index}`);
    this.content.classList.add(Sentence.CONTENT_WRAPPER);

    // Normal audio button
    this.buttonPlayNormal = new Button(id, {
      sample: params.sentence.sample,
      audioNotSupported: params.audioNotSupported,
      type: Button.BUTTON_TYPE_NORMAL,
      maxTries: params.tries,
      a11y: params.a11y
    });
    this.content.appendChild(this.buttonPlayNormal.getDOM());

    // Alternative audio button
    if (this.params.hasAlternatives === true) {
      this.buttonPlaySlow = new Button(id, {
        sample: params.sentence.sampleAlternative,
        audioNotSupported: params.audioNotSupported,
        type: Button.BUTTON_TYPE_SLOW,
        maxTries: params.triesAlternative,
        a11y: params.a11y
      });
      this.content.appendChild(this.buttonPlaySlow.getDOM());
    }

    // Text input field
    this.inputField = document.createElement('input');
    this.inputField.setAttribute('aria-label', this.params.a11y.enterText);
    this.inputField.classList.add(Sentence.INPUT_FIELD);

    // Solution words
    this.solutionText = document.createElement('div');
    this.solutionText.classList.add(Sentence.SOLUTION_TEXT);
    this.solutionText.setAttribute('role', 'list');
    this.solutionText.setAttribute('aria-label', this.params.a11y.solution);
    this.solutionText.setAttribute('aria-expanded', 'false');
    this.solutionText.setAttribute('tabindex', '0');
    this.solutionText.addEventListener('keydown', (event) => {
      const currentExpandedState = this.solutionText.getAttribute('aria-expanded');
      // Retrieve previously marked word
      const wordElement = this.wordMarked ||
        (this.containsRTL ? this.solutionText.lastChild : this.solutionText.firstChild);

      switch (event.keyCode) {
        case 13: // Enter
        // intentional fallthrough
        case 32: // Space
          if (event.target !== event.currentTarget) {
            // Ignore children
            break;
          }

          // Expand/collapse group for ARIA
          if (currentExpandedState === 'false') {
            this.solutionText.setAttribute('aria-expanded', 'true');
            if (wordElement) {
              // Focus on previously tabbed element
              wordElement.focus();
            }
          }
          else {
            this.solutionText.setAttribute('aria-expanded', 'false');
            wordElement.setAttribute('tabindex', '-1');
          }
          break;
      }
    });

    // Solution sentence
    this.solutionInner = document.createElement('div');
    this.solutionInner.classList.add(Sentence.SOLUTION_INNER);
    this.solutionInner.appendChild(this.solutionText);

    // Solution Container
    this.solutionContainer = document.createElement('div');
    this.solutionContainer.classList.add(Sentence.SOLUTION_CONTAINER);
    this.solutionContainer.classList.add(Sentence.HIDE);
    this.solutionContainer.appendChild(this.solutionInner);

    // Sentence input field and solution
    this.inputWrapper = document.createElement('div');
    this.inputWrapper.classList.add(Sentence.INPUT_WRAPPER);
    this.inputWrapper.appendChild(this.inputField);
    this.inputWrapper.appendChild(this.solutionContainer);

    this.content.appendChild(this.inputWrapper);
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
   * Build the solution for the sentence's results.
   * @param {object} result Result.
   * @param {object} result.score Scores.
   * @param {number} result.score.added Number of added words added.
   * @param {number} result.score.missing Number of words missing.
   * @param {number} result.score.typo Number of words with typing errors.
   * @param {number} result.score.wrong Number of wrong words.
   * @param {number} result.score.match Number of mathes.
   * @param {object[]} result.words Words.
   * @param {string} result.words[].answer Answer given.
   * @param {string} result.words[].solution Correct word.
   * @param {string} result.words[].type Type of mistake or match.
   * @param {boolean[]} result.spaces Spaces for gaps between words.
   * @return {object[]} Solution with all every word's DOM element.
   */
  createSolution(result) {
    // Revert order of right-to-left chunks
    if (this.containsRTL) {
      result.words = this.revertRTL(result.words);
    }

    return result.words.map((word, index) =>
      this.createSolutionWordDOM(index, word, result.words.length - 1 !== index));
  }

  /**
   * Build wrapper for single word of a solution.
   * @param {number} index Tabindex for ARIA.
   * @param {object} word Word information.
   * @param {string} word.type Status about missing, typo, ...
   * @param {string} word.solution Correct spelling of the word.
   * @param {string} word.answer User input for this word.
   * @param {boolean} [trainingGap=true] True if wrapper should have trailing gap.
   */
  createSolutionWordDOM(index, word, trailingGap=true) {
    if (this.params.alternateSolution === 'first' && word.type !== 'match' && word.type !== 'typo') {
      word.solution = this.splitWordAlternatives(word.solution)[0];
    }

    // General stuff
    const wordDOM = document.createElement('span');
    wordDOM.classList.add(`h5p-wrapper-${word.type}`);
    if (trailingGap) {
      wordDOM.classList.add('h5p-spacer');
    }
    wordDOM.setAttribute('tabindex', '-1');
    wordDOM.setAttribute('role', 'listitem');

    // Add EventListeners
    this.addSolutionWordListeners(wordDOM);

    // Create aria Label
    const ariaPrefix = `${this.params.a11y.item} ${index + 1}.`;
    const ariaExplanation = this.createAriaExplanation(word);
    const ariaScore = this.createAriaScore(word.type);
    wordDOM.setAttribute('aria-label', `${ariaPrefix} ${ariaExplanation} ${ariaScore}`);

    // Add explanation to solution
    this.appendExplanationTo(wordDOM, word);

    return wordDOM;
  }

  /**
   * Revert order of right-to-left chunks.
   *
   * Words can be mixed as right-to-left and left-to-right, and the
   * parsed input from the text field will have a different order than the
   * displayed words. The right-to-left chunks are reversed here.
   *
   * @param {object[]} words Words object.
   * @param {string} word.solution Word to test.
   * @return {object[]} RTL words reordered.
   */
  revertRTL(words) {
    let reversedWords = [];
    let currentRTL = [];

    // Reverse RTL blocks, keep LTR
    words.forEach(word => {
      const isRTL = this.containsRTLCharacters(word.solution);
      if (isRTL) {
        currentRTL.push(word);
      }
      else {
        reversedWords = reversedWords.concat(currentRTL.reverse());
        currentRTL = [];
        reversedWords.push(word);
      }
    });
    if (currentRTL.length !== 0) {
      reversedWords = reversedWords.concat(currentRTL.reverse());
    }

    return reversedWords;
  }

  /**
   * Add EventListeners to solutions's words.
   * @param {object} Word's DOM element.
   */
  addSolutionWordListeners(wordDOM) {
    // on focus
    wordDOM.addEventListener('focus', event => {
      // Remember this word had focus
      this.wordMarked = event.target;
      event.target.setAttribute('tabindex', '0');
    });

    // on keydown
    wordDOM.addEventListener('keydown', event => {
      const firstChild = this.containsRTL ?
        event.target.parentNode.lastChild :
        event.target.parentNode.firstChild;
      const lastChild = this.containsRTL ?
        event.target.parentNode.firstChild :
        event.target.parentNode.lastChild;

      switch (event.keyCode) {

        // Focus previous solution word
        case 37: // Left
        // intentional fallthrough
        case 38: // Top
          event.preventDefault();
          if (event.target.previousSibling) {
            event.target.setAttribute('tabindex', '-1');
            event.target.previousSibling.focus();
          }
          break;

        // Focus next solution word
        case 39: // Right
        // intentional fallthrough
        case 40: // Down
          event.preventDefault();
          if (event.target.nextSibling) {
            event.target.setAttribute('tabindex', '-1');
            event.target.nextSibling.focus();
          }
          break;

        // Focus first solution word
        case 36: // Home
          event.preventDefault();
          if (event.target !== firstChild) {
            event.target.setAttribute('tabindex', '-1');
            firstChild.focus();
          }
          break;

        // Focus last solution word
        case 35: // End
          event.preventDefault();
          if (event.target !== lastChild) {
            event.target.setAttribute('tabindex', '-1');
            lastChild.focus();
          }
          break;
      }
    });
  }

  /**
   * Append explanation to solution.
   * @param {object} wordDOM Word's DOM element.
   * @param {object} word Word with type, answer and solution.
   */
  appendExplanationTo(wordDOM, word) {
    // ScorePoints
    const scorePoints = new H5P.Question.ScorePoints();

    // Wrong input
    if (word.type === 'wrong' || word.type === 'added' || word.type === 'typo') {
      const wrongInput = document.createElement('span');
      wrongInput.classList.add(`h5p-answer-${word.type}`);
      wrongInput.innerHTML = word.answer;
      wordDOM.appendChild(wrongInput);
    }

    // Correct solution
    if (word.type !== 'added') {
      const correctSolution = document.createElement('span');
      correctSolution.classList.add(`h5p-solution-${word.type}`);
      correctSolution.innerHTML = word.solution;
      wordDOM.appendChild(correctSolution);
    }

    // Score explanation
    if (word.type !== 'match') {
      const scoreExplanation = scorePoints.getElement(false);
      if (word.type === 'typo' && this.params.typoFactor === 0.5) {
        scoreExplanation.classList.remove('h5p-question-minus-one');
        scoreExplanation.classList.add('h5p-question-minus-one-half');
      }

      if (word.type !== 'typo' || this.params.typoFactor > 0) {
        wordDOM.appendChild(scoreExplanation);
      }
    }
  }

  /**
   * Create explanation text for aria label.
   * @param {object} word Word with type, answer and solution.
   * @return {string} Explanation text for aria label.
   */
  createAriaExplanation(word) {
    const ariaLabelType = {
      match: this.params.a11y.correct,
      wrong: this.params.a11y.wrong,
      typo: this.params.a11y.typo,
      missing: this.params.a11y.missing,
      added: this.params.a11y.added
    };

    const answer = this.makeReadable(word.answer);
    const solution = this.makeReadable(word.solution);

    let ariaExplanation = `${answer}${answer === '' ? '' : '. '}${ariaLabelType[word.type]}.`;
    if (word.type === 'wrong' || word.type === 'typo' || word.type === 'missing') {
      ariaExplanation += ` ${this.params.a11y.shouldHaveBeen}. ${solution}.`;
    }

    return ariaExplanation;
  }

  /**
   * Create aria score text.
   * @param {string} type Type of mistake.
   * @return {string} Aria score text.
   */
  createAriaScore(type) {
    let ariaScore = -1;

    if (type === 'match') {
      ariaScore = 0;
    }
    else if (type === 'typo') {
      ariaScore = ariaScore * this.params.typoFactor;
    }
    if (ariaScore === 0) {
      ariaScore = '';
    }
    else {
      const scoreUnit = (ariaScore === -1) ?
        this.params.a11y.point :
        this.params.a11y.points;
      ariaScore = `${ariaScore} ${scoreUnit}.`;
    }

    return ariaScore;
  }

  /**
   * Replace symbols with a11y readably words.
   * @param {string} [text=''] Text to make readable.
   * @return {string} Readable text.
   */
  makeReadable(text) {
    if (text === undefined) {
      return '';
    }

    // Account for alternatives
    text = this.splitWordAlternatives(text).join(` ${this.params.a11y.or} `);

    return text
      .replace(/\./g, this.params.a11y.period)
      .replace(/!/g, this.params.a11y.exclamationPoint)
      .replace(/\?/g, this.params.a11y.questionMark)
      .replace(/,/g, this.params.a11y.comma)
      .replace(/'/g, this.params.a11y.singleQuote)
      .replace(/["\u201C\u201E]/g, this.params.a11y.doubleQuote)
      .replace(/:/g, this.params.a11y.colon)
      .replace(/;/g, this.params.a11y.semicolon)
      .replace(/\+/g, this.params.a11y.plus)
      .replace(/-/g, this.params.a11y.minus)
      .replace(/\*/g, this.params.a11y.asterisk)
      .replace(/\//g, this.params.a11y.forwardSlash);
  }

  /**
   * Set current text in InputField.
   * DOM is not created before to make cheating a little more difficult at least.
   * @param {object} result - Current DOM element with words.
   */
  showSolution(result) {
    const solutionElements = this.createSolution(result);

    // Adjust padding around text
    if (solutionElements.length > 0 && result.words[solutionElements.length - 1].type === 'match') {
      this.solutionText.classList.add('h5p-solution-last-correct');
    }
    else {
      this.solutionText.classList.remove('h5p-solution-last-correct');
    }

    if (!this.solutionText.firstChild) {
      solutionElements.forEach(element => {
        this.solutionText.appendChild(element);
        this.solutionContainer.classList.remove(Sentence.HIDE);
      });
    }
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
    while (this.solutionText.firstChild) {
      this.solutionText.removeChild(this.solutionText.firstChild);
    }
    this.solutionContainer.classList.add(Sentence.HIDE);

    if (this.buttonPlayNormal) {
      this.buttonPlayNormal.setTabbable();
    }
    if (this.buttonPlaySlow) {
      this.buttonPlaySlow.setTabbable();
    }
  }

  /**
   * Get correct text.
   * @return {string} Correct text.
   */
  getCorrectText() {
    return this.solution;
  }

  /**
   * Get the maximum of possible mistakes.
   * @return {number} Number of possible mistakes.
   */
  getMaxMistakes() {
    return this.mistakesMax;
  }

  /**
   * Reset sentences.
   */
  reset() {
    this.inputField.value = '';

    this.wordMarked = undefined;
    this.solutionText.setAttribute('aria-expanded', 'false');

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
   * Focus button.
   */
  focus() {
    if (this.buttonPlayNormal) {
      this.buttonPlayNormal.focus();
    }
  }

  /**
   * Add spaces between text and punctuation.
   * @param {string} text - Text to add spaces to.
   @ @return {string} Text with spaces and symbols.
   */
  addSpaces(text) {
    // Space between punctuation and word
    text = text.replace(
      new RegExp(`(${Sentence.WORD}|^)(?=${Sentence.PUNCTUATION})`, 'g'),
      `$1 `
    );
    text = text.replace(
      new RegExp(`(${Sentence.PUNCTUATION})(?=${Sentence.WORD})`, 'g'),
      `$1 `
    );

    if (this.params.autosplit === true) {
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
  stripPunctuation(words) {
    let wasString = false;
    if (typeof words === 'string') {
      wasString = true;
      words = [words];
    }

    const punctuation = new RegExp(Sentence.PUNCTUATION, 'g');
    words = words.map(word => word.replace(punctuation, ''));

    return (wasString) ? words.toString() : words;
  }

  /**
   * Split word into alternatives using | but not \| as delimiter.
   *
   * Can be replaced by word.split(/(?<!\\)\|/) as soon as lookbehinds in
   * regular expressions are commonly available in browsers (mind IE11 though)
   *
   * @param {string} word Word to be split.
   * @param {string[]} Word alternatives.
   */
  splitWordAlternatives(word) {
    const wordReversed = word.split('').reverse().join('');
    const alternatives = wordReversed.split(/\|(?!\\)/);
    return alternatives
      .map(alternative => alternative.split('').reverse().join('').replace('\\|', '|'))
      .reverse();
  }

  /**
   * Compute the results for this sentence.
   * @return {object} Results.
   */
  computeResults() {
    // Add spaces to correct text
    const wordsSolution = this.addSpaces(this.getCorrectText()).split(' ');

    let input = this.getUserInput();
    if (this.params.ignorePunctuation) {
      input = this.stripPunctuation(input);
    }

    // Add spaces to solution
    const wordsInput = input.trim() === '' ? [] : this.addSpaces(input).split(' ');

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

    const getMatch = (answer, solution, fuzzy=false) => {
      let match;

      if (solution === undefined) {
        return;
      }

      // Split alternatives like word.split(/(?<!\\)\|/)
      const alternatives = this.splitWordAlternatives(solution);

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
        if (slave[pos] === master[pos] && master[pos+1] === undefined) {
          let moves = 0;

          while (pos + moves + 1 < master.length && master[pos + moves + 1] === undefined) {
            moves++;
          }

          if (pos + moves + 1 < master.length && slave.slice(pos + 1, pos + moves + 1).lastIndexOf(slave[pos]) !== -1) {
            master[pos + moves + 1] = [master[pos]];
            master[pos] = undefined;
          }
        }
      }

      // Make big clusters <=
      master.reverse();
      slave.reverse();
      for (let pos = 0; pos < master.length - 1; pos++) {
        if (slave[pos] === master[pos] && master[pos + 1] === undefined) {
          let moves = 0;

          while (pos + moves + 1 < master.length && master[pos + moves + 1] === undefined) {
            moves++;
          }

          if (pos + moves + 1 < master.length && slave.slice(pos + 1, pos + moves + 1).lastIndexOf(slave[pos]) !== -1) {
            master[pos + moves + 1] = [master[pos]];
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
   * Retrieve true string from HTML encoded string.
   * @param {string} input Input string.
   * @return {string} Output string.
   */
  htmlDecode(input) {
    var dparser = new DOMParser().parseFromString(input, 'text/html');
    return dparser.documentElement.textContent;
  }

  /**
   * Check for right-to-left characters.
   *
   * @param {string} input Input to check for right-to-left characters.
   * @return {boolean} True, if input contains right-to-left characters.
   */
  containsRTLCharacters(input) {
    return new RegExp('^[^' + Sentence.RTL + ']*?[' + Sentence.RTL + ']').test(input);
  }

  /**
   * Set focus to the sentence solution.
   */
  focusSolution() {
    this.solutionText.focus();
  }
}

// CSS Classes
/** @constant {string} */
Sentence.CONTENT_WRAPPER = 'h5p-sentence';
/** @constant {string} */
Sentence.INPUT_WRAPPER = 'h5p-input-wrapper';
/** @constant {string} */
Sentence.INPUT_FIELD = 'h5p-text-input';
/** @constant {string} */
Sentence.SOLUTION_CONTAINER = 'h5p-solution-container';
/** @constant {string} */
Sentence.SOLUTION_INNER = 'h5p-solution-inner';
/** @constant {string} */
Sentence.SOLUTION_TEXT = 'h5p-solution-text';
/** @constant {string} */
Sentence.HIDE = 'hide';

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
Sentence.RTL = '\u0591-\u08FF';
/** @constant {string} */
Sentence.AUTOSPLIT = '[\u4E00-\u62FF\u6300-\u77FF\u7800-\u8CFF\u8D00-\u9FFF]';
/** @constant {string} */
Sentence.PUNCTUATION = '[.?!,\'";\\:\\-\\(\\)/\\+\\-\\*\u201C-\u201E\u060C\u061F\u05BE\u05C0\u05C3\u05C6\u2026\u2027\u22EF\u3000-\u3002\u3008-\u3011\uFF01\uFF08\uFF09\uFF0C\uFF1A\uFF1B\uFF1F\uFF3B\uFF3D\uFE41\uFE42\uFE4F\uFF5E]';
/** @constant {string} */
Sentence.WORD = '\\w|[\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7-\u060B\u060D-\u061E\u0620-\u08FF]';

export default Sentence;
