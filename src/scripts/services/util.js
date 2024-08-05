/** Class for utility functions */
class Util {
  /**
   * Extend an array just like JQuery's extend.
   * @returns {object} Merged objects.
   */
  static extend() {
    for (let i = 1; i < arguments.length; i++) {
      for (let key in arguments[i]) {
        if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
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
  }

  /**
   * Retrieve true string from HTML encoded string.
   * @param {string} input Input string.
   * @returns {string} Output string.
   */
  static htmlDecode(input) {
    const dparser = new DOMParser().parseFromString(input, 'text/html');
    return dparser.documentElement.textContent;
  }

  /**
   * Revert order of right-to-left chunks.
   *
   * Words can be mixed as right-to-left and left-to-right, and the
   * parsed input from the text field will have a different order than the
   * displayed words. The right-to-left chunks are reversed here.
   * @param {object[]} words Words object.
   * @param {string} words.solution Word to test.
   * @returns {object[]} RTL words reordered.
   */
  static revertRTL(words) {
    let reversedWords = [];
    let currentRTL = [];

    // Reverse RTL blocks, keep LTR
    words.forEach((word) => {
      const isRTL = Util.containsRTLCharacters(word.solution);
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
   * Split word into alternatives using | but not \| as delimiter.
   *
   * Can be replaced by word.split(/(?<!\\)\|/) as soon as lookbehinds in
   * regular expressions are commonly available in browsers (mind IE11 though)
   * @param {string} word Word to be split.
   * @returns {string[]} Word alternatives.
   */
  static splitWordAlternatives(word) {
    const wordReversed = word.split('').reverse().join('');
    const alternatives = wordReversed.split(/\|(?!\\)/);
    return alternatives
      .map((alternative) => alternative.split('').reverse().join('').replace('\\|', '|'))
      .reverse();
  }

  /**
   * Check for right-to-left characters.
   * @param {string} input Input to check for right-to-left characters.
   * @returns {boolean} True, if input contains right-to-left characters.
   */
  static containsRTLCharacters(input) {
    return new RegExp(`^[^${Util.RTL}]*?[${Util.RTL}]`).test(input);
  }

  /**
   * Combine all possible combinations of strings from two sets.
   *
   * ['a', 'b', 'c'] and ['d', 'e'] become ['a d', 'a e', 'b d', 'b e', 'c d', 'c e']
   * @param {object[]} words1 First set of strings.
   * @param {object[]} words2 Second set of strings.
   * @param {string} [delimiter] Delimiter between each string.
   * @returns {object[]} Result.
   */
  static buildCombinations(words1, words2, delimiter = ' ') {
    const result = [];

    words1.forEach((word1) => {
      result.push(
        ...words2.map((word2) => (word2 === '') ? word1 : `${word2}${delimiter}${word1}`)
      );
    });

    return result;
  }

  /**
   * Format language tag (RFC 5646). Assuming "language-coutry". No validation.
   * Cmp. https://tools.ietf.org/html/rfc5646
   * @param {string} languageCode Language tag.
   * @returns {string} Formatted language tag.
   */
  static formatLanguageCode(languageCode) {
    if (typeof languageCode !== 'string') {
      return languageCode;
    }

    /*
     * RFC 5646 states that language tags are case insensitive, but
     * recommendations may be followed to improve human interpretation
     */
    const segments = languageCode.split('-');
    segments[0] = segments[0].toLowerCase(); // ISO 639 recommendation
    if (segments.length > 1) {
      segments[1] = segments[1].toUpperCase(); // ISO 3166-1 recommendation
    }
    languageCode = segments.join('-');

    return languageCode;
  }

  /**
   * Shuffle array.
   * @param {object[]} array Array.
   * @returns {object[]} Shuffled array.
   */
  static shuffleArray(array) {
    let j, x, i;
    for (i = array.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      x = array[i];
      array[i] = array[j];
      array[j] = x;
    }

    return array;
  }
}

// Regular expression configuration
/** @constant {string} */
Util.RTL = '\u0591-\u08FF';

export default Util;
