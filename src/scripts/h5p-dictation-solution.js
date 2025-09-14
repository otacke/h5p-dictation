import Util from '@services/util.js';

/** @constant {number} TYPO_FACTOR_NO_MISTAKE Mistake multiplier for no mistake. */
const TYPO_NO_MISTAKE = 0;

/** @constant {number} TYPO_FACTOR_HALF_MISTAKE Mistake multiplier for half mistake. */
const TYPO_HALF_MISTAKE = 0.5;

/** @constant {number} TYPO_FACTOR_FULL_MISTAKE Mistake multiplier for full mistake. */
const TYPO_FULL_MISTAKE = 1;

/** Class representing a solution */
class Solution {
  /**
   * @class
   * @param {object} [params] Parameters.
   */
  constructor(params = {}) {
    this.params = params;

    // Solution words
    this.words = document.createElement('div');
    this.words.classList.add(Solution.SOLUTION_TEXT);
    this.words.setAttribute('role', 'list');
    this.words.setAttribute('aria-label', this.params.a11y.solution);
    this.words.setAttribute('aria-expanded', 'false');
    this.words.setAttribute('tabindex', '0');
    this.words.addEventListener('keydown', (event) => {
      const currentExpandedState = this.words.getAttribute('aria-expanded');
      // Retrieve previously marked word
      const wordElement = this.wordMarked ||
        (this.params.containsRTL ? this.words.lastChild : this.words.firstChild);

      switch (event.code) {
        case 'Enter':
        // intentional fallthrough
        case 'Space':
          if (event.target !== event.currentTarget) {
            // Ignore children
            break;
          }

          // Expand/collapse group for ARIA
          if (currentExpandedState === 'false') {
            this.words.setAttribute('aria-expanded', 'true');
            if (wordElement) {
              // Focus on previously tabbed element
              wordElement.focus();
            }
          }
          else {
            this.words.setAttribute('aria-expanded', 'false');
            wordElement.setAttribute('tabindex', '-1');
          }
          break;
      }
    });

    // Solution sentence
    this.solutionInner = document.createElement('div');
    this.solutionInner.classList.add(Solution.SOLUTION_INNER);
    this.solutionInner.appendChild(this.words);

    // Solution Container
    this.container = document.createElement('div');
    this.container.classList.add(Solution.SOLUTION_CONTAINER);
    this.container.classList.add(Solution.HIDE);
    this.container.appendChild(this.solutionInner);
  }

  /**
   * Get content for H5P.Question.
   * @returns {object} DOM elements for solution view.
   */
  getDOM() {
    return this.container;
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
   * @returns {object[]} Solution with all every word's DOM element.
   */
  createSolution(result) {
    // Revert order of right-to-left chunks
    if (this.params.containsRTL) {
      result.words = Util.revertRTL(result.words);
    }

    return result.words.map((word, index) =>
      this.createSolutionWordDOM(index, word),
    );
  }

  /**
   * Build wrapper for single word of a solution.
   * @param {number} index Tabindex for ARIA.
   * @param {object} word Word information.
   * @param {string} word.type Status about missing, typo, ...
   * @param {string} word.solution Correct spelling of the word.
   * @param {string} word.answer User input for this word.
   * @returns {HTMLElement} DOM for solution words.
   */
  createSolutionWordDOM(index, word) {
    if (this.params.alternateSolution === 'first' && word.type !== 'match' && word.type !== 'typo') {
      word.solution = word.solution ? Util.splitWordAlternatives(word.solution)[0] : '';
    }

    // General stuff
    const wordDOM = document.createElement('span');
    if (this.params.customTypoDisplay === false && word.type === 'typo') {
      // Use "mistake" style instead of "typo style"
      wordDOM.classList.add('h5p-wrapper-wrong');
    }
    else {
      wordDOM.classList.add(`h5p-wrapper-${word.type}`);
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
   * Add EventListeners to solutions's words.
   * @param {object} wordDOM Word's DOM element.
   */
  addSolutionWordListeners(wordDOM) {
    // on focus
    wordDOM.addEventListener('focus', (event) => {
      // Remember this word had focus
      this.wordMarked = event.target;
      event.target.setAttribute('tabindex', '0');
    });

    // on keydown
    wordDOM.addEventListener('keydown', (event) => {
      const firstChild = this.params.containsRTL ?
        event.target.parentNode.lastChild :
        event.target.parentNode.firstChild;

      const lastChild = this.params.containsRTL ?
        event.target.parentNode.firstChild :
        event.target.parentNode.lastChild;

      switch (event.code) {
        // Focus previous solution word
        case 'ArrowLeft': // Left
        case 'ArrowUp': // Up
          event.preventDefault();
          if (event.target.previousSibling) {
            event.target.setAttribute('tabindex', '-1');
            event.target.previousSibling.focus();
          }
          break;

        // Focus next solution word
        case 'ArrowRight': // Right
        case 'ArrowDown': // Down
          event.preventDefault();
          if (event.target.nextSibling) {
            event.target.setAttribute('tabindex', '-1');
            event.target.nextSibling.focus();
          }
          break;

        // Focus first solution word
        case 'Home':
          event.preventDefault();
          if (event.target !== firstChild) {
            event.target.setAttribute('tabindex', '-1');
            firstChild.focus();
          }
          break;

        // Focus last solution word
        case 'End':
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
   * Create explanation text for aria label.
   * @param {object} word Word with type, answer and solution.
   * @returns {string} Explanation text for aria label.
   */
  createAriaExplanation(word) {
    const ariaLabelType = {
      match: this.params.a11y.correct,
      wrong: this.params.a11y.wrong,
      typo: this.params.a11y.typo,
      missing: this.params.a11y.missing,
      added: this.params.a11y.added,
    };

    const answer = this.makeReadable(word.answer);

    // Account for use of \|
    const solutionText = (word.type === 'match' || word.type === 'typo') ?
      Util.splitWordAlternatives(word.solution).join(` ${this.params.a11y.or} `) :
      word.solution;
    const solution = this.makeReadable(solutionText);

    let ariaExplanation = `${answer}${answer === '' ? '' : '. '}${ariaLabelType[word.type]}.`;
    if (word.type === 'wrong' || word.type === 'typo' || word.type === 'missing') {
      ariaExplanation += ` ${this.params.a11y.shouldHaveBeen}. ${solution}.`;
    }

    return ariaExplanation;
  }

  /**
   * Replace symbols with a11y readably words.
   * @param {string} [text] Text to make readable.
   * @returns {string} Readable text.
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
      .replace(/["\u201C\u201E]/g, this.params.a11y.doubleQuote)
      .replace(/:/g, this.params.a11y.colon)
      .replace(/;/g, this.params.a11y.semicolon)
      .replace(/\+/g, this.params.a11y.plus)
      .replace(/-/g, this.params.a11y.minus)
      .replace(/\*/g, this.params.a11y.asterisk)
      .replace(/\//g, this.params.a11y.forwardSlash);
  }

  /**
   * Create aria score text.
   * @param {string} type Type of mistake.
   * @returns {string} Aria score text.
   */
  createAriaScore(type) {
    let ariaScore;

    if (this.params.zeroMistakeMode) {
      ariaScore = 0;

      if (type === 'match') {
        ariaScore = 1;
      }
      else if (type === 'typo') {
        ariaScore = (1 - this.params.typoFactor);
      }
    }
    else {
      ariaScore = -1;

      if (type === 'match') {
        ariaScore = 0;
      }
      else if (type === 'typo') {
        ariaScore = ariaScore * this.params.typoFactor;
      }
    }

    if (ariaScore === 0) {
      ariaScore = '';
    }
    else {
      const scoreUnit = (ariaScore === -1 || ariaScore === 1) ?
        this.params.a11y.point :
        this.params.a11y.points;
      ariaScore = `${ariaScore} ${scoreUnit}.`;
    }

    return ariaScore;
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
    if (this.params.zeroMistakeMode) {
      const scoreExplanation = scorePoints.getElement(true);
      if (word.type === 'match') {
        wordDOM.appendChild(scoreExplanation);
      }

      if (word.type === 'typo' && this.params.typoFactor === TYPO_HALF_MISTAKE) {
        scoreExplanation.classList.remove('h5p-question-minus-one');
        scoreExplanation.classList.add('h5p-question-plus-one-half');
      }

      if (word.type === 'typo' && this.params.typoFactor < TYPO_FULL_MISTAKE) {
        wordDOM.appendChild(scoreExplanation);
      }
    }
    else {
      const scoreExplanation = scorePoints.getElement(false);
      if (word.type !== 'match') {
        if (word.type === 'typo' && this.params.typoFactor === TYPO_HALF_MISTAKE) {
          scoreExplanation.classList.remove('h5p-question-minus-one');
          scoreExplanation.classList.add('h5p-question-minus-one-half');
        }

        if (word.type !== 'typo' || this.params.typoFactor > TYPO_NO_MISTAKE) {
          wordDOM.appendChild(scoreExplanation);
        }
      }
    }
  }

  /**
   * Set current text in InputField.
   * DOM is not created before to make cheating a little more difficult at least.
   * @param {object} result - Current DOM element with words.
   */
  show(result) {
    const solutionElements = this.createSolution(result);

    // Adjust padding around text
    if (solutionElements.length > 0 && result.words[solutionElements.length - 1].type === 'match') {
      this.words.classList.add('h5p-solution-last-correct');
    }
    else {
      this.words.classList.remove('h5p-solution-last-correct');
    }

    if (!this.words.firstChild) {
      solutionElements.forEach((element) => {
        this.words.appendChild(element);
        this.container.classList.remove(Solution.HIDE);
      });
    }
  }

  /**
   * Hide solution.
   */
  hide() {
    while (this.words.firstChild) {
      this.words.removeChild(this.words.firstChild);
    }
    this.container.classList.add(Solution.HIDE);
  }

  /**
   * Set focus to the sentence solution.
   */
  focus() {
    this.words.focus();
  }

  /**
   * Reset solution view.
   */
  reset() {
    this.wordMarked = undefined;
    this.words.setAttribute('aria-expanded', 'false');
  }
}

// CSS Classes
/** @constant {string} */
Solution.SOLUTION_CONTAINER = 'h5p-solution-container';
/** @constant {string} */
Solution.SOLUTION_INNER = 'h5p-solution-inner';
/** @constant {string} */
Solution.SOLUTION_TEXT = 'h5p-solution-text';
/** @constant {string} */
Solution.HIDE = 'hide';

export default Solution;
