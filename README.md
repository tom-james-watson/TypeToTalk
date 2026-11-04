# Type To Talk

A web app for being able to quickly turn typed text into speech. Useful if you have, for example, lost your voice.

Speech runs locally in English, Spanish, French, German, and Portuguese using Gradium’s Phonon 40M multilingual model and the blixt/phonon WebGPU runtime. Your text is not sent to a server. A browser with WebGPU is required, and compatibility depends on the browser and device. On the first visit, the app downloads about 54 MB of model files from Hugging Face and prepares the five default voices; later visits read the browser cache and skip the loading screen. The voice catalogue loads separately so you can browse voices during preparation. Additional voices download when first used. Speaking speed ranges from 0.8× to 1.3×.

Live app: [type-to-talk.tomjwatson.com](https://type-to-talk.tomjwatson.com/)

## Credits

- **Speech model:** [Phonon 40M multilingual](https://huggingface.co/gradium/phonon-40m-multilingual) by [Gradium](https://gradium.ai), building on Pocket TTS and the Mimi codec by [Kyutai](https://kyutai.org). Licensed under [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/), so this app is for non-commercial use.
- **Conversion:** the app uses blixt’s [WebGPU conversion](https://huggingface.co/blixt/phonon-40m-webgpu) of the model, which quantizes and rearranges the weights for the browser. Gradium did not make this conversion.
- **Runtime:** [blixt/phonon](https://github.com/blixt/phonon) (Apache-2.0).
- **Voices:** [gradium/phonon-voices](https://huggingface.co/gradium/phonon-voices) (Apache-2.0).

## Screenshots

![Type To Talk splash screen screenshot](./screenshots/splash-light.png#gh-light-mode-only)
![Type To Talk splash screen screenshot](./screenshots/splash-dark.png#gh-dark-mode-only)

![Type To Talk conversation screen screenshot](./screenshots/convo-light.png#gh-light-mode-only)
![Type To Talk conversation screen screenshot](./screenshots/convo-dark.png#gh-dark-mode-only)
