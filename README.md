# h5p-dictation
Let your students train their listening comprehension and spelling skills.

You can e.g. upload sound samples that contain a recording of someone reading a sentence. Students can play these sound samples (n times) and enter what they hear.

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
- Indicator about how many tries are left
- Use the full featured audio player and marks to jump to? Could be useful for sound samples containing more than one sample.
