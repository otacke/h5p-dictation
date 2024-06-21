import Util from '@services/util.js';
import Sentence from '@scripts/h5p-dictation-sentence.js';
import { describe, expect, test } from '@jest/globals';

describe('Does the string contain RTL characters?', () => {
  const testCasesRTL = [
    { string: 'abc', result: false },
    { string: '', result: false },
    { string: undefined, result: false },
    { string: '汉堡包/漢堡包, 汉堡/漢堡', result: false },
    { string: 'עברית', result: true },
    { string: 'عبرانی_زبان', result: true },
    { string: 'Arabic: عَرَبِيّ', result: true }
  ];

  testCasesRTL.forEach((testCase) => {
    test(`Does "${testCase.string}" contain RTL characters?`, () => {
      expect(Util.containsRTLCharacters(testCase.string)).toBe(testCase.result);
    });
  });
});

describe('Strip punctuation from string', () => {
  const testCasesStripPunctuation = [
    { string: '', result: '' },
    { string: 'John', result: 'John' },
    { string: 'John goes to school.', result: 'John goes to school' },
    { string: 'John goes to school. Do you?', result: 'John goes to school Do you' },
    { string: 'Users\' browser', result: 'Users\' browser' },
    { string: 'John\'s car broke.', result: 'John\'s car broke' },
    { string: '¿Qué?', result: 'Qué' },
    { string: '¿Qué? Hola!', result: 'Qué Hola' },
    { string: '¿Qué? Foo\'s Hola!', result: 'Qué Foo\'s Hola' },
    { string: 'a - b', result: 'a b' },
    { string: 'a- b', result: 'a b' },
    { string: 'a -b', result: 'a b' },
    { string: 'a - b – c — d', result: 'a b c d' }
  ];

  testCasesStripPunctuation.forEach((testCase) => {
    test(`Is "${testCase.string}" stripped to "${testCase.result}"`, () => {
      expect(Sentence.stripPunctuation(testCase.string)).toBe(testCase.result);
    });
  });
});

/*
 * In content typed used to determine separate "words".
 */
describe('Add spaces to string', () => {
  const testCasesAddSpaces = [
    { string: '', result: '' },
    { string: 'John', result: 'John' },
    { string: 'John goes to school.', result: 'John goes to school .' },
    { string: 'John goes to school. Do you?', result: 'John goes to school . Do you ?' },
    { string: 'Users\' browser', result: 'Users\' browser' },
    { string: 'John\'s car broke.', result: 'John\'s car broke .' },
    { string: '¿Qui?', result: '¿ Qui ?' },
    { string: '¿Qué?', result: '¿ Qué ?' },
    { string: '¿Qué? Hola!', result: '¿ Qué ? Hola !' },
    { string: '¿Qué? Foo\'s Hola!', result: '¿ Qué ? Foo\'s Hola !' }
  ];

  testCasesAddSpaces.forEach((testCase) => {
    test(`Is "${testCase.string}" expanded to "${testCase.result}"`, () => {
      expect(Sentence.addSpaces(testCase.string)).toBe(testCase.result);
    });
  });
});

/*
 * Some languages use full width characters in order to keep a homogeneous
 * layout. The content type replaces them with their half width counterparts
 * in order to make it easier for the user to type them (in some cases) and to
 * be able to detect digits.
 */
describe('Replace full width characters with half width characters', () => {
  const testCasesReplaceFullwidth = [
    { string: '　！＂＃＄％＆＇（）＊＋，－．／０１２３４５６７８９：；＜＝＞？＠ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ［＼］＾＿｀ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ｛｜｝～', result: ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~' },
  ];

  test('Do all full width characters get replaced with their regular width counterparts?', () => {
    expect(Sentence.replaceFullwidthWithHalfwidth(testCasesReplaceFullwidth[0].string, { autosplit: true })).toBe(testCasesReplaceFullwidth[0].result);
  });
});

describe('Add spaces to string without splitting automatically', () => {
  const testCasesAutosplitOff = [
    { string: '', result: '' },
    { string: 'JohnDoe', result: 'JohnDoe' },
    { string: '明日の午後、わたしはスーパーでリンゴとミルクを買います。', result: '明日の午後、わたしはスーパーでリンゴとミルクを買います。' },
    { string: 'Johnさんはリンゴを買います。', result: 'Johnさんはリンゴを買います。' },
    { string: 'Johnさんはリンゴを12個買います。', result: 'Johnさんはリンゴを12個買います。' },
    { string: 'Johnさんはリンゴを１２個買います。', result: 'Johnさんはリンゴを１２個買います。' }
  ];

  testCasesAutosplitOff.forEach((testCase) => {
    test(`Is "${testCase.string}" kept as "${testCase.result}"`, () => {
      expect(Sentence.addSpaces(testCase.string, { autosplit: false })).toBe(testCase.result);
    });
  });
});

/*
 * Some languages do not use spaces to separate words. In order to determine
 * words (we don't have a dictionary), we need to split the string. Boundaries
 * between characters from those languages, between words, digits and
 * punctuation marks need to be detected correctly and marked with a space.
 */
describe('Add spaces to string without splitting automatically', () => {
  const testCasesAutosplitOn = [
    { string: '', result: '' },
    { string: 'JohnDoe', result: 'JohnDoe' },
    { string: '明日の午後、わたしはスーパーでリンゴとミルクを買います。', result: '明 日 の 午 後 、 わ た し は ス ー パ ー で リ ン ゴ と ミ ル ク を 買 い ま す 。' },
    { string: 'Johnさんはリンゴを買います。', result: 'John さ ん は リ ン ゴ を 買 い ま す 。' },
    { string: 'Johnさんはリンゴを12個買います。', result: 'John さ ん は リ ン ゴ を 12 個 買 い ま す 。' },
    // 1 and 2 are fullwidth characters and do get replaces outside of addSpaces
    { string: 'Johnさんはリンゴを１２個買います。', result: 'John さ ん は リ ン ゴ を１２個 買 い ま す 。' }
  ];

  // Autosplit on
  testCasesAutosplitOn.forEach((testCase) => {
    test(`Is "${testCase.string}" expanded to "${testCase.result}"`, () => {
      expect(Sentence.addSpaces(testCase.string, { autosplit: true })).toBe(testCase.result);
    });
  });
});
