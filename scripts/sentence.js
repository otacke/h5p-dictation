/* jslint esversion: 6 */
/* globals: H5P */

var H5P = H5P || {};

(function ($, Dictation) {
  'use strict';

  // CSS Classes
  const CONTENT_WRAPPER = 'h5p-sentence';
  const INPUT_WRAPPER = 'h5p-input-wrapper';
  const INPUT_FIELD = 'h5p-text-input';
  const SOLUTION_CONTAINER = 'h5p-solution-container';
  const SOLUTION_INNER = 'h5p-solution-inner';
  const SOLUTION_TEXT = 'h5p-solution-text';
  const HIDE = 'hide';

  // score types
  const TYPE_ADDED = 'added';
  const TYPE_MISSING = 'missing';
  const TYPE_WRONG = 'wrong';
  const TYPE_MATCH = 'match';
  const TYPE_TYPO = 'typo';

  const PUNCTUATION = '[.?!,\'\";\\:\\-\\(\\)\/\\+\\-\\*\u201C\u201E]';
  const WORD = '\\w';

  // Not visible, but present
  const DELATUR = '\u200C';

  /**
   * Constructor.
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
   * @param {object} params.aria - Readspeaker texts.
   * @param {string} params.aria.play - Readspeaker text for "Play".
   * @param {string} params.aria.playSlowly - Readspeaker text for "Play slowly".
   * @param {string} params.aria.enterText - Readspeaker text for "Enter what you have heard here".
   * @param {string} params.aria.solution - Readspeaker text for "Solution".
   * @param {string} params.aria.sentence - Readspeaker text for "Sentence".
   * @param {number} id - Content Id.
   */
  Dictation.Sentence = function (index, params, id) {
    this.index = index;
    this.params = params;
    this.contentId = id;

    this.maxTries = params.tries;
    this.maxTriesAlternative = params.triesAlternative;
    this.triesLeft = this.maxTries;
    this.triesLeftAlternative = this.maxTriesAlternative;

    this.solution = (!params.ignorePunctuation) ? params.sentence.text : this.stripPunctuation(params.sentence.text);
    this.mistakesMax = this.addDelaturs(this.solution).split(' ').length;

    // DOM
    this.content = document.createElement('div');
    this.content.setAttribute('role', 'group');
    this.content.setAttribute('aria-label', params.aria.sentence + ' ' + this.index);
    this.content.classList.add(CONTENT_WRAPPER);

    // Normal audio
    this.buttonPlayNormal = new H5P.Dictation.Button(id, {
      sample: params.sentence.sample,
      audioNotSupported: params.audioNotSupported,
      type: H5P.Dictation.Button.BUTTON_TYPE_NORMAL,
      maxTries: params.tries,
      aria: params.aria
    });
    this.content.appendChild(this.buttonPlayNormal.getDOM());

    // Alternative audio
    if (this.params.hasAlternatives === true) {
      this.buttonPlaySlow = new H5P.Dictation.Button(id, {
        sample: params.sentence.sampleAlternative,
        audioNotSupported: params.audioNotSupported,
        type: H5P.Dictation.Button.BUTTON_TYPE_SLOW,
        maxTries: params.triesAlternative,
        aria: params.aria
      });
      this.content.appendChild(this.buttonPlaySlow.getDOM());
    }

    // Text input field
    this.inputField = document.createElement('input');
    this.inputField.setAttribute('aria-label', this.params.aria.enterText);
    this.inputField.classList.add(INPUT_FIELD);

    // Solution container
    this.solutionText = document.createElement('div');
    this.solutionText.classList.add(SOLUTION_TEXT);

    this.solutionInner = document.createElement('div');
    this.solutionInner.setAttribute('tabindex', '0');
    this.solutionInner.setAttribute('role', 'list');
    this.solutionInner.setAttribute('aria-label', this.params.aria.solution);
    this.solutionInner.addEventListener('focus', function() {
      if (this.firstChild.firstChild) {
        this.firstChild.firstChild.setAttribute('tabindex', '0');
      }
    });
    this.solutionInner.classList.add(SOLUTION_INNER);
    this.solutionInner.appendChild(this.solutionText);

    this.solutionContainer = document.createElement('div');
    this.solutionContainer.classList.add(SOLUTION_CONTAINER);
    this.solutionContainer.classList.add(HIDE);
    this.solutionContainer.appendChild(this.solutionInner);

    this.inputWrapper = document.createElement('div');
    this.inputWrapper.classList.add(INPUT_WRAPPER);
    this.inputWrapper.appendChild(this.inputField);
    this.inputWrapper.appendChild(this.solutionContainer);

    this.content.appendChild(this.inputWrapper);
  };

  /**
   * Read first sample.
   */
  Dictation.Sentence.prototype.read = function () {
    this.buttonPlayNormal.play();
  };

  /**
   * Remove delatur symbols.
   *
   * @param {array|string} words - Text to be cleaned.
   * @return {array|string} Cleaned words of a text.
   */
  Dictation.Sentence.prototype.removeDelaturs = function (words) {
    let wasString = false;
    if (typeof words === 'string') {
      words = [words];
      wasString = true;
    }
    if (words === undefined) {
      return undefined;
    }
    else {
      words = words.map(function (word) {
        return (word === undefined) ? undefined : word.replace(new RegExp(DELATUR, 'g'), '');
      });
    }
    return (wasString) ? words[0] : words;
  };

  /**
   * Get content for H5P.Question.
   *
   * @return {object} DOM elements for content.
   */
  Dictation.Sentence.prototype.getContent = function () {
    return this.content;
  };

  /**
   * Get current text in InputField.
   *
   * @return {string} Current text.
   */
  Dictation.Sentence.prototype.getText = function () {
    return this.inputField.value;
  };

  /**
   * Set current text in InputField.
   *
   * @param {object} text - Current DOM element with text.
   */
  Dictation.Sentence.prototype.showSolution = function (text) {
    const that = this;

    if (!this.solutionText.firstChild) {
      text.forEach(function (element) {
        that.solutionText.appendChild(element);
        that.solutionContainer.classList.remove(HIDE);
      });
    }
  };

  /**
   * Hide solution.
   */
  Dictation.Sentence.prototype.hideSolution = function () {
    while (this.solutionText.firstChild) {
      this.solutionText.removeChild(this.solutionText.firstChild);
    }
    this.solutionContainer.classList.add(HIDE);
  };

  /**
   * Get correct text.
   *
   * @return {string} Correct text.
   */
  Dictation.Sentence.prototype.getCorrectText = function () {
    return this.solution;
  };

  /**
   * Get the maximum of possible mistakes.
   *
   * @return {number} Number of possible mistakes.
   */
  Dictation.Sentence.prototype.getMaxMistakes = function () {
    return this.mistakesMax;
  };

  /**
   * Reset sentences.
   */
  Dictation.Sentence.prototype.reset = function () {
    this.inputField.value = '';
    if (this.buttonPlayNormal) {
      this.buttonPlayNormal.reset();
    }
    if (this.buttonPlaySlow) {
      this.buttonPlaySlow.reset();
    }
  };

  /**
   * Disable input field.
   */
  Dictation.Sentence.prototype.disable = function () {
    this.inputField.disabled = true;
    if (this.buttonPlayNormal) {
      this.buttonPlayNormal.disable();
    }
    if (this.buttonPlaySlow) {
      this.buttonPlaySlow.disable();
    }
  };

  /**
   * Enable input field.
   */
  Dictation.Sentence.prototype.enable = function () {
    this.inputField.disabled = false;
    if (this.buttonPlayNormal) {
      this.buttonPlayNormal.enable();
    }
    if (this.buttonPlaySlow) {
      this.buttonPlaySlow.enable();
    }
  };

  /**
   * Focus button.
   */
  Dictation.Sentence.prototype.focus = function () {
    if (this.buttonPlayNormal) {
      this.buttonPlayNormal.focus();
    }
  };

  /**
   * Add spaces + delatur symbols between text and punctuation.
   *
   * @param {string} text - Text to enter spaces + symbols.
   @ @return {string} Text with spaces and symbols.
   */
  Dictation.Sentence.prototype.addDelaturs = function (text) {
    text = text.replace(new RegExp('(' + WORD + '|^)(' + PUNCTUATION + ')', 'g'), '$1 ' + DELATUR + '$2');
    text = text.replace(new RegExp('(' + PUNCTUATION + ')(' + WORD + ')', 'g'), '$1' + DELATUR + ' $2');
    return text;
  };

  /**
   * Get pattern of spaces to add behind aliged array of words.
   *
   * @param {object[]} words - Words to get spaces for.
   * @return {object[]} Spaces.
   */
  Dictation.Sentence.prototype.getSpaces = function (words) {
    let output = [];
    if (words.length < 2) {
      return [false];
    }
    words = words.map(function (word) {
      return word || '';
    });
    for (let i = 0; i < words.length-1; i++) {
      output.push(!(words[i].substr(-1) === DELATUR || words[i+1].substring(0, 1) === DELATUR));
    }
    output.push(false);
    return output;
  };

  /**
   * Strip punctuation from a sentence.
   *
   * @param {object[]|string} words - Words of a sentence.
   * @return {object[]|string} Words without punctuation.
   */
  Dictation.Sentence.prototype.stripPunctuation = function (words) {
    let returnString = false;
    if (typeof words === 'string') {
      returnString = true;
      words = [words];
    }
    words = words.map(function (word) {
      return word.replace(new RegExp(PUNCTUATION, 'g'), '');
    });
    return (returnString) ? words.toString() : words;
  };

  /**
   * Compute the results for this sentence.
   *
   * @return {object} Results.
   */
  Dictation.Sentence.prototype.computeResults = function() {
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
    score[TYPE_ADDED] = 0;
    score[TYPE_MISSING] = 0;
    score[TYPE_TYPO] = 0;
    score[TYPE_WRONG] = 0;
    score[TYPE_MATCH] = 0;

    for (let i = 0; i < aligned.words1.length; i++) {
      const solution = aligned.words1[i];
      const answer = aligned.words2[i];
      let type = '';

      if (solution === undefined) {
        type = TYPE_ADDED;
      }
      else if (answer === undefined) {
        type = TYPE_MISSING;
      }
      else if (answer === solution) {
        type = TYPE_MATCH;
      }
      else if (H5P.TextUtilities.areSimilar(solution, answer)) {
        type = TYPE_TYPO;
      }
      else {
        type = TYPE_WRONG;
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
        "added": score[TYPE_ADDED],
        "missing": score[TYPE_MISSING],
        "typo": score[TYPE_TYPO],
        "wrong": score[TYPE_WRONG],
        "match": score[TYPE_MATCH],
        "total": Math.min(score[TYPE_ADDED] + score[TYPE_MISSING] + score[TYPE_TYPO] + score[TYPE_WRONG], this.getMaxMistakes())
      },
      "words": words,
      'spaces': spaces
    };

    return output;
  };

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
  Dictation.Sentence.prototype.alignWords = function (words1, words2) {
    const align = function (words1, words2) {
      words2 = words2.map(function (word) {
        return (word === '') ? undefined : word;
      });

      // Add enough space for additional words in answer to prevent errors by stacking
      let master = words1.map(function(word1) {
        return Array.apply(null, Array(words2.length)).concat(word1);
      }).reduce(function(a, b) {
        return a.concat(b);
      }, []);
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
    const count = function(aligned) {
      let output = 0;
      aligned.words1.forEach(function(word1, index) {
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
  };

  /**
   * Set focus to the sentence solution.
   */
  Dictation.Sentence.prototype.focusSolution = function () {
    this.solutionInner.focus();
    this.solutionInner.classList.add('11');
  };

})(H5P.jQuery, H5P.Dictation);
