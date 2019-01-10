/** Class for utility functions */
class Util {
  /**
   * Extend an array just like JQuery's extend.
   * @param {object} arguments Objects to be merged.
   * @return {object} Merged objects.
   */
  static extend() {
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
  }

  /**
   * Retrieve true string from HTML encoded string.
   * @param {string} input Input string.
   * @return {string} Output string.
   */
  static htmlDecode(input) {
    var dparser = new DOMParser().parseFromString(input, 'text/html');
    return dparser.documentElement.textContent;
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
  static revertRTL(words) {
    let reversedWords = [];
    let currentRTL = [];

    // Reverse RTL blocks, keep LTR
    words.forEach(word => {
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
   * Check for right-to-left characters.
   *
   * @param {string} input Input to check for right-to-left characters.
   * @return {boolean} True, if input contains right-to-left characters.
   */
  static containsRTLCharacters(input) {
    return new RegExp('^[^' + Util.RTL + ']*?[' + Util.RTL + ']').test(input);
  }
}

// Regular expression configuration
/** @constant {string} */
Util.RTL = '\u0591-\u08FF';

export default Util;
