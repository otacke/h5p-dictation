/* jslint esversion: 6 */

(function ($, Dictation, Audio) {
  'use strict';

  // TODO: Comments

  // CSS Classes
  const CONTENT_WRAPPER = 'h5p-sentence';
  const AUDIO_WRAPPER = 'h5p-dictation-audio-wrapper';
  const INPUT_WRAPPER = 'h5p-input-wrapper';
  const INPUT_FIELD = 'h5p-text-input';
  const INPUT_SOLUTION = 'h5p-dictation-solution';
  const HIDE = 'hide'; // TODO: rwname?

  // score types
  const TYPE_ADDED = 'added';
  const TYPE_MISSING = 'missing';
  const TYPE_WRONG = 'wrong';
  const TYPE_MATCH = 'match';
  const TYPE_TYPO = 'typo';

  // TODO: Make editable?
  const PUNCTUATION = '[.?!,\'\";\\:\\-\\(\\)\/\\+\\-\\*\u201C\u201E]';
  const WORD = '\\w';

  // Not visible, but present
  const DELATUR = '\u200C';

  Dictation.Sentence = function (params) {
    let that = this;
    this.params = params;
    this.triesLeft = params.repetitions;

    this.solution = (!params.ignorePunctuation) ? params.sentence.text : this.stripPunctuation(params.sentence.text);
    this.mistakesMax = this.addDelaturs(this.solution).split(' ').length;

    // TODO: Sanitization
    this.content = document.createElement('div');
    this.content.classList.add(CONTENT_WRAPPER);

    // Normal audio
    this.audio = this.createAudio(params.sentence.sample, params.audioNotSupported);
    this.audio.addEventListener('click', function () {
      that.handleTries();
    });

    this.content.appendChild(this.audio);

    // TODO: Possibly 2nd sample with slower speed

    // Text input field
    this.inputField = document.createElement('input');
    this.inputField.classList.add(INPUT_FIELD);

    this.inputSolution = document.createElement('div');
    this.inputSolution.classList.add(INPUT_SOLUTION);
    this.inputSolution.classList.add(HIDE);

    let inputWrapper = document.createElement('div');
    inputWrapper.classList.add(INPUT_WRAPPER);
    inputWrapper.appendChild(this.inputField);
    inputWrapper.appendChild(this.inputSolution);
    this.content.appendChild(inputWrapper);
  };

  /**
   * Remove delatur symbols.
   * @param {array|string} words - Text to be cleaned.
   * @return {array|string} Cleaned words of a text.
   */
  Dictation.Sentence.prototype.removeDelaturs = function (words) {
    let returnString = false;
    if (typeof words === 'string') {
      words = [words];
      returnString = true;
    }
    if (words === undefined) {
      return undefined;
    }
    else {
      words = words.map(function (word) {
        return (word === undefined) ? undefined : word.replace(new RegExp(DELATUR, 'g'), '');
      });
    }
    return (returnString) ? words[0] : words;
  };

  Dictation.Sentence.prototype.handleTries = function () {
    this.triesLeft--;
    if (this.triesLeft === 0) {
      this.audio.classList.add(HIDE);
    }
  };

  /**
   * Get content for H5P.Question.
   * @return {object} DOM elements for content.
   */
  Dictation.Sentence.prototype.getContent = function () {
    return this.content;
  };

  /**
   * Get current text in InputField.
   * @return {string} Current text.
   */
  Dictation.Sentence.prototype.getText = function () {
    return this.inputField.value;
  };

  /**
   * Set current text in InputField.
   * @param {string} text - Current text.
   */
  Dictation.Sentence.prototype.showSolution = function (text) {
    // Sanitization
    if (typeof text !== 'string') {
      return;
    }
    this.inputSolution.innerHTML = text;
    this.inputSolution.classList.remove(HIDE);
    this.inputField.classList.add(HIDE);
  };

  Dictation.Sentence.prototype.hideSolution = function () {
    this.inputSolution.innerHTML = undefined;
    this.inputSolution.classList.add(HIDE);
    this.inputField.classList.remove(HIDE);
  };

  /**
   * Get correct text.
   * @return {string} Correct text.
   */
  Dictation.Sentence.prototype.getCorrectText = function () {
    return this.solution;
  };

  Dictation.Sentence.prototype.createAudio = function (sample, audioNotSupported) {
    let that = this;
    let audio;
    let $audioWrapper = $('<div>', {
      'class': AUDIO_WRAPPER
    });

    if (sample !== undefined) {

      let audioDefaults = {
        files: sample,
        audioNotSupported: audioNotSupported
      };
      audio = new Audio(audioDefaults, that.contentId);
      audio.attach($audioWrapper);

      // Have to stop else audio will take up a socket pending forever in chrome.
      if (audio.audio && audio.audio.preload) {
        audio.audio.preload = 'none';
      }
    }
    else {
      $audioWrapper.addClass('hide');
    }

    return $audioWrapper.get(0);
  };

  Dictation.Sentence.prototype.getMaxMistakes = function () {
    return this.mistakesMax;
  };

  Dictation.Sentence.prototype.reset = function () {
    this.inputField.value = '';
  };

  Dictation.Sentence.prototype.disable = function () {
    this.inputField.disabled = true;
  };

  Dictation.Sentence.prototype.enable = function () {
    this.inputField.disabled = false;
  };

  /**
   * Add spaces + delatur symbols between text and punctuation.
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
   * @param {array} words - Words to get spaces for.
   * @return {array} Spaces.
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
   * @param {array|string} words - Words of a sentence.
   * @return {array|string} Words without punctuation.
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

  Dictation.Sentence.prototype.computeResults = function() {
    // TODO: strip punctuation
    let wordsSolution = this.addDelaturs(this.getCorrectText()).split(' ');
    let answer = this.getText();
    if (this.params.ignorePunctuation) {
      answer = this.stripPunctuation(answer);
    }
    let wordsAnswer = this.addDelaturs(answer).split(' ');

    let aligned = this.alignWords(wordsSolution, wordsAnswer);

    let spaces = this.getSpaces(aligned.words1);

    let words = [];

    let score = [];
    score[TYPE_ADDED] = 0;
    score[TYPE_MISSING] = 0;
    score[TYPE_TYPO] = 0;
    score[TYPE_WRONG] = 0;
    score[TYPE_MATCH] = 0;

    for(let i = 0; i < aligned.words1.length; i++) {
      let solution = aligned.words1[i];
      let answer = aligned.words2[i];
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

    let output = {
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

    console.log(output);
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
    let align = function (words1, words2) {
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
      let slave = Array.apply(null, Array(master.length));

      /*
       * We let all words of the answer slide the solution array from left to right one by one.
       * We let them stick if a match is found AND there are no identical words in the answer
       * later on.
       */
      let floor = 0;
      for (let i = 0; i < words2.length; i++) {
        let currentAnswer = words2[i];
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
        let currentWord = slave[pos];

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
        let currentWord = slave[pos];

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
        if(master[pos] === undefined && slave[pos+1] === undefined) {
          master[pos] = master[pos+1];
          master.splice(pos+1, 1);
          slave.splice(pos+1, 1);
        }
      }

      // Make big clusters =>
      for (let pos = 0; pos < master.length-1; pos++) {
        if (slave[pos] === master[pos] && master[pos+1] === undefined) {
          let moves = 0;
          let posMatch = 0;
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
          let posMatch = 0;
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

    // Count the number of matches + typos
    let count = function(aligned) {
      let output = 0;
      aligned.words1.forEach(function(word1, index) {
        if (word1 === aligned.words2[index] || H5P.TextUtilities.areSimilar(word1, aligned.words2[index])) {
          output++;
        }
      });
      return output;
    };

    let aligned1 = align(words1, words2);
    let aligned2 = align(words1.reverse(), words2.reverse());

    if (count(aligned2) > count(aligned1)) {
      aligned1 = {"words1": aligned2.words1.reverse(), "words2": aligned2.words2.reverse()};
    }

    console.log(aligned1.words1, aligned1.words2);

    return aligned1;
  };

})(H5P.jQuery, H5P.Dictation, H5P.Audio);
