import Util from '../../src/scripts/h5p-dictation-util';

/* containsRTLCharacters */
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
