import Util from '@services/util.js';
import Sentence from '@scripts/h5p-dictation-sentence.js';
import {expect, test} from '@jest/globals';

// containsRTLCharacters
const testCasesRTL = [
  {string: 'abc', result: false},
  {string: '', result: false},
  {string: undefined, result: false},
  {string: '汉堡包/漢堡包, 汉堡/漢堡', result: false},
  {string: 'עברית', result: true},
  {string: 'عبرانی_زبان', result: true},
  {string: 'Arabic: عَرَبِيّ', result: true}
];

for (let i = 0; i < testCasesRTL.length; i++) {
  test('Does "' + testCasesRTL[i].string + '" contain RTL characters?', () => {
    expect(Util.containsRTLCharacters(testCasesRTL[i].string)).toBe(testCasesRTL[i].result);
  });
}

// stripPunctuation
const testCasesStripPunctuation = [
  {string: '', result: ''},
  {string: 'John', result: 'John'},
  {string: 'John goes to school.', result: 'John goes to school'},
  {string: 'John goes to school. Do you?', result: 'John goes to school Do you'},
  {string: 'Users\' browser', result: 'Users\' browser'},
  {string: 'John\'s car broke.', result: 'John\'s car broke'},
  {string: '¿Qué?', result: 'Qué'},
  {string: '¿Qué? Hola!', result: 'Qué Hola'},
  {string: '¿Qué? Foo\'s Hola!', result: 'Qué Foo\'s Hola'},
  {string: 'a - b', result: 'a b'},
  {string: 'a- b', result: 'a b'},
  {string: 'a -b', result: 'a b'},
  {string: 'a - b – c — d', result: 'a b c d'}
];

for (let i = 0; i < testCasesStripPunctuation.length; i++) {
  test('Is ' + testCasesStripPunctuation[i].string + ' stripped to ' + testCasesStripPunctuation[i].result, () => {
    expect(Sentence.stripPunctuation(testCasesStripPunctuation[i].string)).toBe(testCasesStripPunctuation[i].result);
  });
}

// addSpaces
const testCasesAddSpaces = [
  {string: '', result: ''},
  {string: 'John', result: 'John'},
  {string: 'John goes to school.', result: 'John goes to school .'},
  {string: 'John goes to school. Do you?', result: 'John goes to school . Do you ?'},
  {string: 'Users\' browser', result: 'Users\' browser'},
  {string: 'John\'s car broke.', result: 'John\'s car broke .'},
  {string: '¿Qui?', result: '¿ Qui ?'},
  {string: '¿Qué?', result: '¿ Qué ?'},
  {string: '¿Qué? Hola!', result: '¿ Qué ? Hola !'},
  {string: '¿Qué? Foo\'s Hola!', result: '¿ Qué ? Foo\'s Hola !'}
];

for (let i = 0; i < testCasesAddSpaces.length; i++) {
  test('Is ' + testCasesAddSpaces[i].string + ' expanded to ' + testCasesAddSpaces[i].result, () => {
    expect(Sentence.addSpaces(testCasesAddSpaces[i].string)).toBe(testCasesAddSpaces[i].result);
  });
}

// replace fullwidth characters
const testCasesReplaceFullwidth = [
  {string: '　！＂＃＄％＆＇（）＊＋，－．／０１２３４５６７８９：；＜＝＞？＠ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ［＼］＾＿｀ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ｛｜｝～', result: ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~'},
];

test('Do all full width characters get replaced with their regular width counterparts?', () => {
  expect(Sentence.replaceFullwidthWithHalfwidth(testCasesReplaceFullwidth[0].string, { autosplit: true })).toBe(testCasesReplaceFullwidth[0].result);
});

// autosplit off
const testCasesAutosplitOff = [
  {string: '', result: ''},
  {string: 'JohnDoe', result: 'JohnDoe'},
  {string: '明日の午後、わたしはスーパーでリンゴとミルクを買います。', result: '明日の午後、わたしはスーパーでリンゴとミルクを買います。'},
  {string: 'Johnさんはリンゴを買います。', result: 'Johnさんはリンゴを買います。'},
  {string: 'Johnさんはリンゴを12個買います。', result: 'Johnさんはリンゴを12個買います。'},
  {string: 'Johnさんはリンゴを１２個買います。', result: 'Johnさんはリンゴを１２個買います。'}
];

for (let i = 0; i < testCasesAutosplitOff.length; i++) {
  test('Is ' + testCasesAutosplitOff[i].string + ' kept as ' + testCasesAutosplitOff[i].result, () => {
    expect(Sentence.addSpaces(testCasesAutosplitOff[i].string, { autosplit: false } )).toBe(testCasesAutosplitOff[i].result);
  });
}

// autosplit on

/*
 * Some languages do not use spaces to separate words. In order to determine
 * words (we don't have a dictionary), we need to split the string. Boundaries
 * between characters from those languages, between words, digits and
 * punctuation marks need to be detected correctly and marked with a space.
 */
const testCasesAutosplitOn = [
  {string: '', result: ''},
  {string: 'JohnDoe', result: 'JohnDoe'},
  {string: '明日の午後、わたしはスーパーでリンゴとミルクを買います。', result: '明 日 の 午 後 、 わ た し は ス ー パ ー で リ ン ゴ と ミ ル ク を 買 い ま す 。'},
  {string: 'Johnさんはリンゴを買います。', result: 'John さ ん は リ ン ゴ を 買 い ま す 。'},
  {string: 'Johnさんはリンゴを12個買います。', result: 'John さ ん は リ ン ゴ を 12 個 買 い ま す 。'},
  // 1 and 2 are fullwidth characters and do get replaces outside of addSpaces
  {string: 'Johnさんはリンゴを１２個買います。', result: 'John さ ん は リ ン ゴ を１２個 買 い ま す 。'}
];

// Autosplit on
for (let i = 0; i < testCasesAutosplitOn.length; i++) {
  test('Is ' + testCasesAutosplitOn[i].string + ' expanded to ' + testCasesAutosplitOn[i].result, () => {
    expect(Sentence.addSpaces(testCasesAutosplitOn[i].string, { autosplit: true })).toBe(testCasesAutosplitOn[i].result);
  });
}
