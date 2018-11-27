# h5p-dictation
Let your students train their listening comprehension and spelling skills.

You can add audio samples containing a sentence for dictation and enter the correct transcription. Your students can listen to the samples and enter what they have heard in to a text field. Their answers will be evaluated automatically.

Several options will allow you to control the exercise's difficulty. You can optionally add a second audio sample for a sentence that could hold a version spoken slowly. You can also set a limit for how often a sample can be played, define if punctuation should be relevant for scoring, and decide whether small mistakes like typing errors should be counted as no mistake, a full mistake, or just a half mistake.

## Support me at patreon!
If you like what I do, please consider to become my supporter at patreon: https://www.patreon.com/otacke

## Building the distribution files
Pull or download this archive files and go into the main folder. There run

```bash
npm install
```

to get the required modules. Then build the project using

```bash
npm run build
```

or

```bash
npm run watch
```

if you want to modify the code and want to get a fresh build built in the background.

## Ideas to think about ...
- Could be interesting, but the use case might be rather particular for this content type: Audio Recorder widget which would allow to record the reading directly from within H5P/enhance Audio widget. (future option)
- Do we need an option for different diff styles?
- Automatic speed change? How to balance speed/pitch?
- Add option for "drag the words" instead of text input fields? But then the name Dictation might be a little misleading
- Use the full featured audio player and marks to jump to? Could be useful for sound samples containing more than one sample.
