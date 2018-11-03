import Button from './h5p-dictation-button';

class Sentence {
  /**
   * @constructor
   *
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

    this.solution = this.htmlDecode(params.sentence.text);
    this.solution = (!params.ignorePunctuation) ? this.solution : this.stripPunctuation(this.solution);
    this.mistakesMax = this.addDelaturs(this.solution).split(' ').length;

    // DOM
    this.content = document.createElement('div');
    this.content.setAttribute('role', 'group');
    this.content.setAttribute('aria-label', `${params.a11y.sentence} ${this.index}`);
    this.content.classList.add(Sentence.CONTENT_WRAPPER);

    // Normal audio
    this.buttonPlayNormal = new Button(id, {
      sample: params.sentence.sample,
      audioNotSupported: params.audioNotSupported,
      type: Button.BUTTON_TYPE_NORMAL,
      maxTries: params.tries,
      a11y: params.a11y
    });
    this.content.appendChild(this.buttonPlayNormal.getDOM());

    // Alternative audio
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

    // Solution container
    this.solutionText = document.createElement('div');
    this.solutionText.classList.add(Sentence.SOLUTION_TEXT);
    this.solutionText.setAttribute('role', 'list');
    this.solutionText.setAttribute('aria-label', this.params.a11y.solution);
    this.solutionText.setAttribute('tabindex', '0');
    this.solutionText.addEventListener('focus', () => {
      const wordElement = this.wordMarked || this.solutionText.firstChild;
      if (wordElement) {
        wordElement.setAttribute('tabindex', '0');
      }
    });

    this.solutionInner = document.createElement('div');
    this.solutionInner.classList.add(Sentence.SOLUTION_INNER);
    this.solutionInner.appendChild(this.solutionText);

    this.solutionContainer = document.createElement('div');
    this.solutionContainer.classList.add(Sentence.SOLUTION_CONTAINER);
    this.solutionContainer.classList.add(Sentence.HIDE);
    this.solutionContainer.appendChild(this.solutionInner);

    this.inputWrapper = document.createElement('div');
    this.inputWrapper.classList.add(Sentence.INPUT_WRAPPER);
    this.inputWrapper.appendChild(this.inputField);
    this.inputWrapper.appendChild(this.solutionContainer);

    this.content.appendChild(this.inputWrapper);
  }

  /**
   * Read first sample.
   */
  read() {
    this.buttonPlayNormal.play();
  }

  /**
   * Remove delatur symbols.
   *
   * @param {array|string} words - Text to be cleaned.
   * @return {array|string} Cleaned words of a text.
   */
  removeDelaturs(words) {
    let wasString = false;
    if (typeof words === 'string') {
      words = [words];
      wasString = true;
    }
    if (words === undefined) {
      return undefined;
    }
    else {
      words = words.map(word => {
        return (word === undefined) ?
          undefined :
          word.replace(new RegExp(Sentence.DELATUR, 'g'), '');
      });
    }
    return (wasString) ? words[0] : words;
  }

  /**
   * Get content for H5P.Question.
   *
   * @return {object} DOM elements for content.
   */
  getContent() {
    return this.content;
  }

  /**
   * Get current text in InputField.
   *
   * @return {string} Current text.
   */
  getText() {
    return this.inputField.value;
  }

  /**
   * Build the solution for the sentence's results.
   * @param {object} result - Result.
   * @param {object} result.score - Scores.
   * @param {number} result.score.added - Number of added words added.
   * @param {number} result.score.missing - Number of words missing.
   * @param {number} result.score.typo - Number of words with typing errors.
   * @param {number} result.score.wrong - Number of wrong words.
   * @param {number} result.score.match - Number of mathes.
   * @param {object[]} result.words - Words.
   * @param {string} result.words[].answer - Answer given.
   * @param {string} result.words[].solution - Correct word.
   * @param {string} result.words[].type - Type of mistake or match.
   * @param {boolean[]} result.spaces - Spaces for gaps between words.
   * @return {object[]} solution.
   */
  buildSolution(result) {
    const solution = [];
    result.words.forEach((word, index) => {
      solution.push(this.buildWordWrapper(index, word, result));
    });

    return solution;
  }

  /**
   * Build wrapper for single word of a solution.
   *
   * @param {number} index -Tabindex for ARIA.
   * @param {object} word - Word information.
   * @param {string} word.type - Status about missing, typo, ...
   * @param {string} word.solution - Correct spelling of the word.
   * @param {string} word.answer -
   * @param {object} result - Result data.
   */
  buildWordWrapper(index, word, result) {
    // General stuff
    const wrapper = document.createElement('span');
    wrapper.classList.add(`h5p-wrapper-${word.type}`);
    if (result.spaces[index]) {
      wrapper.classList.add('h5p-spacer');
    }
    wrapper.setAttribute('tabindex', (index === 0) ? '0' : '-1');
    wrapper.setAttribute('role', 'listitem');

    // Listeners
    wrapper.addEventListener('focus', event => {
      this.wordMarked = event.target;
      event.target.setAttribute('tabindex', '0');
    });
    wrapper.addEventListener('focusout', event => {
      event.target.setAttribute('tabindex', '-1');
    });
    wrapper.addEventListener('keydown', event => {
      switch (event.keyCode) {
        case 37: // Left
        // intentional fallthrough
        case 38: // Top
          event.preventDefault();
          if (event.target.previousSibling) {
            event.target.previousSibling.focus();
          }
          break;
        case 39: // Right
        // intentional fallthrough
        case 40: // Down
          event.preventDefault();
          if (event.target.nextSibling) {
            event.target.nextSibling.focus();
          }
          break;
      }
    });

    // Create aria Label
    const ariaPrefix = `${this.params.a11y.item} ${index + 1}.`;
    const ariaExplanation = this.createAriaExplanation(word);
    const ariaScore = this.createAriaScore(word.type);
    wrapper.setAttribute('aria-label', `${ariaPrefix} ${ariaExplanation} ${ariaScore}`);

    // ScorePoints
    const scorePoints = new H5P.Question.ScorePoints();
    if (word.type === 'wrong' || word.type === 'added' || word.type === 'typo') {
      const answer = document.createElement('span');
      answer.classList.add(`h5p-answer-${word.type}`);
      answer.innerHTML = word.answer;
      wrapper.appendChild(answer);
    }
    if (word.type !== 'added') {
      const solution = document.createElement('span');
      solution.classList.add(`h5p-solution-${word.type}`);
      solution.innerHTML = word.solution;
      wrapper.appendChild(solution);
    }
    if (word.type !== 'match') {
      const scoreIndicator = scorePoints.getElement(false);
      if (word.type === 'typo' && this.params.typoFactor === 0.5) {
        scoreIndicator.classList.remove('h5p-question-minus-one');
        scoreIndicator.classList.add('h5p-question-minus-one-half');
      }
      if (word.type !== 'typo' || this.params.typoFactor > 0) {
        wrapper.appendChild(scoreIndicator);
      }
    }

    return wrapper;
  }

  /**
   * Create explanation text for aria label.
   *
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
   *
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
   *
   * @param {string} [text] Text to make readable.
   * @return {string} Readable text.
   */
  makeReadable(text) {
    if (text === undefined) {
      return '';
    }

    return text
      .replace(/\./g, this.params.a11y.period)
      .replace(/!/g, this.params.a11y.exclamationPoint)
      .replace(/\?/g, this.params.a11y.questionMark)
      .replace(/,/g, this.params.a11y.comma)
      .replace(/'/g, this.params.a11y.singleQuote)
      .replace(/["|\u201C|\u201E]/g, this.params.a11y.doubleQuote)
      .replace(/:/g, this.params.a11y.colon)
      .replace(/;/g, this.params.a11y.semicolon)
      .replace(/\+/g, this.params.a11y.plus)
      .replace(/-/g, this.params.a11y.minus)
      .replace(/\*/g, this.params.a11y.asterisk)
      .replace(/\//g, this.params.a11y.forwardSlash);
  }

  /**
   * Set current text in InputField.
   *
   * @param {object} result - Current DOM element with words.
   */
  showSolution(result) {
    const solutionElements = this.buildSolution(result);

    if (!this.solutionText.firstChild) {
      solutionElements.forEach(element => {
        this.solutionText.appendChild(element);
        this.solutionContainer.classList.remove(Sentence.HIDE);
      });
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
  }

  /**
   * Get correct text.
   *
   * @return {string} Correct text.
   */
  getCorrectText() {
    return this.solution;
  }

  /**
   * Get the maximum of possible mistakes.
   *
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
   * Add spaces + delatur symbols between text and punctuation.
   *
   * @param {string} text - Text to enter spaces + symbols.
   @ @return {string} Text with spaces and symbols.
   */
  addDelaturs(text) {
    text = text.replace(new RegExp(`(${Sentence.WORD}|^)(${Sentence.PUNCTUATION})`, 'g'), `$1 ${Sentence.DELATUR}$2`);
    text = text.replace(new RegExp(`(${Sentence.PUNCTUATION})(${Sentence.WORD})`, 'g'), `$1${Sentence.DELATUR} $2`);
    return text;
  }

  /**
   * Get pattern of spaces to add behind aliged array of words.
   *
   * @param {object[]} words - Words to get spaces for.
   * @return {object[]} Spaces.
   */
  getSpaces(words) {
    if (words.length < 2) {
      return [false];
    }

    let output = [];
    words = words.map(word => word || '');
    for (let i = 0; i < words.length-1; i++) {
      output.push(!(words[i].substr(-1) === Sentence.DELATUR || words[i+1].substring(0, 1) === Sentence.DELATUR));
    }
    output.push(false);

    return output;
  }

  /**
   * Strip punctuation from a sentence.
   *
   * @param {object[]|string} words - Words of a sentence.
   * @return {object[]|string} Words without punctuation.
   */
  stripPunctuation(words) {
    let returnString = false;
    if (typeof words === 'string') {
      returnString = true;
      words = [words];
    }

    const punctuation = new RegExp(Sentence.PUNCTUATION, 'g');
    words = words.map(word => word.replace(punctuation, ''));

    return (returnString) ? words.toString() : words;
  }

  /**
   * Compute the results for this sentence.
   *
   * @return {object} Results.
   */
  computeResults() {
    const wordsSolution = this.addDelaturs(this.getCorrectText()).split(' ');
    let answer = this.getText();
    if (this.params.ignorePunctuation) {
      answer = this.stripPunctuation(answer);
    }
    const wordsAnswer = this.addDelaturs(answer).split(' ');
    const aligned = this.alignWords(wordsSolution, wordsAnswer);

    const spaces = this.getSpaces(aligned.words1);
    const words = [];

    let score = [];
    score[Sentence.TYPE_ADDED] = 0;
    score[Sentence.TYPE_MISSING] = 0;
    score[Sentence.TYPE_TYPO] = 0;
    score[Sentence.TYPE_WRONG] = 0;
    score[Sentence.TYPE_MATCH] = 0;

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
      score[type]++;

      words.push({
        "solution": this.removeDelaturs(solution),
        "answer": this.removeDelaturs(answer),
        "type": type
      });
    }

    const output = {
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
      "words": words,
      'spaces': spaces
    };

    return output;
  }

  /**
   * Bring two array of words to same length and match the words' positions
   * There may be a smarter way to do it ...
   *
   * TODO: There's a lot of redundant code here! Make it nice!
   *
   * @param {array} words1 - First Array of words.
   * @param {array} words2 - Second Array of words.
   * @return {object} Object containing two new arrays.
   */
  alignWords(words1, words2) {
    const align = (words1, words2) => {
      words2 = words2.map(word => (word === '') ? undefined : word);

      // Add enough space for additional words in answer to prevent errors by stacking
      let master = words1.map(word1 => {
        return Array.apply(null, Array(words2.length)).concat(word1);
      }).reduce((a, b) => a.concat(b), []);
      master = master.concat(Array.apply(null, Array(words2.length)));

      // Matches in answer
      const slave = Array.apply(null, Array(master.length));

      /*
       * We let all words of the answer slide the solution array from left to right one by one.
       * We let them stick if a match is found AND there are no identical words in the answer
       * later on.
       */
      let floor = 0;
      for (let i = 0; i < words2.length; i++) {
        const currentAnswer = words2[i];
        for (let pos = master.length-1; pos >= floor; pos--) {
          if (currentAnswer !== undefined && master[pos] === currentAnswer && words2.slice(i+1).indexOf(currentAnswer) === -1 || pos === floor) {
            slave[pos] = currentAnswer;
            floor = pos+1;
            break;
          }
        }
      }

      /*
       * We let all the words that don't have a match yet slide from right to left
       * as far as possible looking for a match just in case they slided too far
       */
      for (let pos = slave.length-1; pos >= 0; pos--) {
        const currentWord = slave[pos];

        if (currentWord !== undefined && currentWord !== master[pos]) {
          let moves = 0;
          let posMatch = 0;
          while (pos + moves + 1 < slave.length && slave[pos + moves + 1] === undefined) {
            if (master[pos + moves + 1] === currentWord) {
              posMatch = pos + moves + 1;
            }
            moves++;
          }
          slave[posMatch || pos + moves] = currentWord;
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
          while (pos + moves -1 >= 0 && slave[pos + moves - 1] === undefined) {
            if (H5P.TextUtilities.areSimilar(master[pos + moves - 1], currentWord)) {
              posMatch = pos + moves - 1;
            }
            moves--;
          }
          slave[posMatch || pos + moves] = currentWord;
          slave[pos] = undefined;
        }
      }

      // Remove clutter
      for (let pos = master.length-1; pos >= 0; pos--) {
        if (master[pos] === undefined && slave[pos] === undefined) {
          master.splice(pos, 1);
          slave.splice(pos, 1);
        }
      }

      // Finally we can simply interpret adjacent missing/added words as wrong
      for (let pos = 0; pos < master.length-1; pos++) {
        // We're assuming a left-swipe as previous operation here
        if (master[pos] === undefined && slave[pos+1] === undefined) {
          master[pos] = master[pos+1];
          master.splice(pos+1, 1);
          slave.splice(pos+1, 1);
        }
      }

      // Make big clusters =>
      for (let pos = 0; pos < master.length-1; pos++) {
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
      for (let pos = 0; pos < master.length-1; pos++) {
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
      master.reverse();
      slave.reverse();

      return {"words1": master, "words2": slave};
    };

    /**
     * Count the number of matches + typos.
     *
     * @param {object} aligned - Aligned words.
     * @return {number} Number of matches and typos.
     */
    const count = (aligned) => {
      let output = 0;
      aligned.words1.forEach((word1, index) => {
        if (word1 === aligned.words2[index] || H5P.TextUtilities.areSimilar(word1, aligned.words2[index])) {
          output++;
        }
      });
      return output;
    };

    let aligned1 = align(words1, words2);
    const aligned2 = align(words1.reverse(), words2.reverse());

    if (count(aligned2) > count(aligned1)) {
      aligned1 = {"words1": aligned2.words1.reverse(), "words2": aligned2.words2.reverse()};
    }

    // Don't add unnecessary added words without a counterpart as extra mistakes
    while (aligned1.words1[0] === undefined && aligned1.words2[aligned1.words2.length - 1] === undefined) {
      aligned1.words1 = aligned1.words1.slice(1);
      aligned1.words2 = aligned1.words2.slice(0, aligned1.words2.length - 1);
    }

    return aligned1;
  }

  /**
   * Retrieve true string from HTML encoded string
   * @param {string} input - Input string.
   * @return {string} Output string.
   */
  htmlDecode(input) {
    var dparser = new DOMParser().parseFromString(input, 'text/html');
    return dparser.documentElement.textContent;
  }

  /**
   * Set focus to the sentence solution.
   */
  focusSolution() {
    this.solutionText.focus();
  }
}

// CSS Classes
Sentence.CONTENT_WRAPPER = 'h5p-sentence';
Sentence.INPUT_WRAPPER = 'h5p-input-wrapper';
Sentence.INPUT_FIELD = 'h5p-text-input';
Sentence.SOLUTION_CONTAINER = 'h5p-solution-container';
Sentence.SOLUTION_INNER = 'h5p-solution-inner';
Sentence.SOLUTION_TEXT = 'h5p-solution-text';
Sentence.HIDE = 'hide';

// Score types
Sentence.TYPE_ADDED = 'added';
Sentence.TYPE_MISSING = 'missing';
Sentence.TYPE_WRONG = 'wrong';
Sentence.TYPE_MATCH = 'match';
Sentence.TYPE_TYPO = 'typo';

Sentence.PUNCTUATION = '[.?!,\'";\\:\\-\\(\\)/\\+\\-\\*\u201C\u201E]';
Sentence.WORD = '\\w';

// Not visible, but present
Sentence.DELATUR = '\u200C';

export default Sentence;
