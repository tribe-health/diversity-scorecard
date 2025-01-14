Transformers.js documentation

The pipeline API

Transformers.js
===============

🏡 View all docsAWS Trainium & InferentiaAccelerateAmazon SageMakerArgillaAutoTrainBitsandbytesChat UICompetitionsDataset viewerDatasetsDiffusersDistilabelEvaluateGoogle CloudGoogle TPUsGradioHubHub Python LibraryHugging Face Generative AI Services (HUGS)Huggingface.jsInference API (serverless)Inference Endpoints (dedicated)LeaderboardsLightevalOptimumPEFTSafetensorsSentence TransformersTRLTasksText Embeddings InferenceText Generation InferenceTokenizersTransformersTransformers.jssmolagentstimm

Search documentation

mainv3.0.0v2.17.2 EN

[](https://github.com/huggingface/transformers.js)

![Hugging Face's logo](/front/assets/huggingface_logo-noborder.svg)

Join the Hugging Face community

and get access to the augmented documentation experience

Collaborate on models, datasets and Spaces

Faster examples with accelerated inference

Switch between documentation themes

[Sign Up](/join)

to get started

           

[](#the-pipeline-api)
The pipeline API
======================================

Just like the [transformers Python library](https://github.com/huggingface/transformers)
, Transformers.js provides users with a simple way to leverage the power of transformers. The `pipeline()` function is the easiest and fastest way to use a pretrained model for inference.

For the full list of available tasks/pipelines, check out [this table](#available-tasks)
.

[](#the-basics)
The basics
--------------------------

Start by creating an instance of `pipeline()` and specifying a task you want to use it for. For example, to create a sentiment analysis pipeline, you can do:

Copied

import { pipeline } from '@huggingface/transformers';

let classifier = await pipeline('sentiment-analysis');

When running for the first time, the `pipeline` will download and cache the default pretrained model associated with the task. This can take a while, but subsequent calls will be much faster.

By default, models will be downloaded from the [Hugging Face Hub](https://huggingface.co/models)
 and stored in [browser cache](https://developer.mozilla.org/en-US/docs/Web/API/Cache)
, but there are ways to specify custom models and cache locations. For more information see [here](./custom_usage)
.

You can now use the classifier on your target text by calling it as a function:

Copied

let result = await classifier('I love transformers!');
// \[{'label': 'POSITIVE', 'score': 0.9998}\]

If you have multiple inputs, you can pass them as an array:

Copied

let result = await classifier(\['I love transformers!', 'I hate transformers!'\]);
// \[{'label': 'POSITIVE', 'score': 0.9998}, {'label': 'NEGATIVE', 'score': 0.9982}\]

You can also specify a different model to use for the pipeline by passing it as the second argument to the `pipeline()` function. For example, to use a different model for sentiment analysis (like one trained to predict sentiment of a review as a number of stars between 1 and 5), you can do:

Copied

let reviewer = await pipeline('sentiment-analysis', 'Xenova/bert-base-multilingual-uncased-sentiment');

let result = await reviewer('The Shawshank Redemption is a true masterpiece of cinema.');
// \[{label: '5 stars', score: 0.8167929649353027}\]

Transformers.js supports loading any model hosted on the Hugging Face Hub, provided it has ONNX weights (located in a subfolder called `onnx`). For more information on how to convert your PyTorch, TensorFlow, or JAX model to ONNX, see the [conversion section](./custom_usage#convert-your-models-to-onnx)
.

The `pipeline()` function is a great way to quickly use a pretrained model for inference, as it takes care of all the preprocessing and postprocessing for you. For example, if you want to perform Automatic Speech Recognition (ASR) using OpenAI’s Whisper model, you can do:

Copied

// Allocate a pipeline for Automatic Speech Recognition
let transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-small.en');

// Transcribe an audio file, loaded from a URL.
let result = await transcriber('https://huggingface.co/datasets/Narsil/asr\_dummy/resolve/v3.0.0/mlk.flac');
// {text: ' I have a dream that one day this nation will rise up and live out the true meaning of its creed.'}

[](#pipeline-options)
Pipeline options
--------------------------------------

### [](#loading)
Loading

We offer a variety of options to control how models are loaded from the Hugging Face Hub (or locally). By default, the _quantized_ version of the model is used, which is smaller and faster, but usually less accurate. To override this behaviour (i.e., use the unquantized model), you can use a custom `PretrainedOptions` object as the third parameter to the `pipeline` function:

Copied

// Allocation a pipeline for feature extraction, using the unquantized model
const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
    quantized: false,
});

You can also specify which revision of the model to use, by passing a `revision` parameter. Since the Hugging Face Hub uses a git-based versioning system, you can use any valid git revision specifier (e.g., branch name or commit hash)

Copied

let transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
    revision: 'output\_attentions',
});

For the full list of options, check out the [PretrainedOptions](./api/utils/hub#module_utils/hub..PretrainedOptions)
 documentation.

### [](#running)
Running

Many pipelines have additional options that you can specify. For example, when using a model that does multilingual translation, you can specify the source and target languages like this:

Copied

// Allocation a pipeline for translation
let translator = await pipeline('translation', 'Xenova/nllb-200-distilled-600M');

// Translate from English to Greek
let result = await translator('I like to walk my dog.', {
    src\_lang: 'eng\_Latn',
    tgt\_lang: 'ell\_Grek'
});
// \[ { translation\_text: 'Μου αρέσει να περπατάω το σκυλί μου.' } \]

// Translate back to English
let result2 = await translator(result\[0\].translation\_text, {
    src\_lang: 'ell\_Grek',
    tgt\_lang: 'eng\_Latn'
});
// \[ { translation\_text: 'I like to walk my dog.' } \]

When using models that support auto-regressive generation, you can specify generation parameters like the number of new tokens, sampling methods, temperature, repetition penalty, and much more. For a full list of available parameters, see to the [GenerationConfig](./api/utils/generation#module_utils/generation.GenerationConfig)
 class.

For example, to generate a poem using `LaMini-Flan-T5-783M`, you can do:

Copied

// Allocate a pipeline for text2text-generation
let poet = await pipeline('text2text-generation', 'Xenova/LaMini-Flan-T5-783M');
let result = await poet('Write me a love poem about cheese.', {
    max\_new\_tokens: 200,
    temperature: 0.9,
    repetition\_penalty: 2.0,
    no\_repeat\_ngram\_size: 3,
});

Logging `result[0].generated_text` to the console gives:

Copied

Cheese, oh cheese! You're the perfect comfort food.
Your texture so smooth and creamy you can never get old.
With every bite it melts in your mouth like buttery delights
that make me feel right at home with this sweet treat of mine. 

From classic to bold flavor combinations,
I love how versatile you are as an ingredient too?
Cheddar is my go-to for any occasion or mood; 
It adds depth and richness without being overpowering its taste buds alone

For more information on the available options for each pipeline, refer to the [API Reference](./api/pipelines)
. If you would like more control over the inference process, you can use the [`AutoModel`](./api/models)
, [`AutoTokenizer`](./api/tokenizers)
, or [`AutoProcessor`](./api/processors)
 classes instead.

[](#available-tasks)
Available tasks
------------------------------------

### [](#tasks)
Tasks

#### [](#natural-language-processing)
Natural Language Processing

| Task | ID  | Description | Supported? |
| --- | --- | --- | --- |
| [Fill-Mask](https://huggingface.co/tasks/fill-mask) | `fill-mask` | Masking some of the words in a sentence and predicting which words should replace those masks. | ✅ [(docs)](https://huggingface.co/docs/transformers.js/api/pipelines#module_pipelines.FillMaskPipeline)<br>  <br>[(models)](https://huggingface.co/models?pipeline_tag=fill-mask&library=transformers.js) |
| [Question Answering](https://huggingface.co/tasks/question-answering) | `question-answering` | Retrieve the answer to a question from a given text. | ✅ [(docs)](https://huggingface.co/docs/transformers.js/api/pipelines#module_pipelines.QuestionAnsweringPipeline)<br>  <br>[(models)](https://huggingface.co/models?pipeline_tag=question-answering&library=transformers.js) |
| [Sentence Similarity](https://huggingface.co/tasks/sentence-similarity) | `sentence-similarity` | Determining how similar two texts are. | ✅ [(docs)](https://huggingface.co/docs/transformers.js/api/pipelines#module_pipelines.FeatureExtractionPipeline)<br>  <br>[(models)](https://huggingface.co/models?pipeline_tag=feature-extraction&library=transformers.js) |
| [Summarization](https://huggingface.co/tasks/summarization) | `summarization` | Producing a shorter version of a document while preserving its important information. | ✅ [(docs)](https://huggingface.co/docs/transformers.js/api/pipelines#module_pipelines.SummarizationPipeline)<br>  <br>[(models)](https://huggingface.co/models?pipeline_tag=summarization&library=transformers.js) |
| [Table Question Answering](https://huggingface.co/tasks/table-question-answering) | `table-question-answering` | Answering a question about information from a given table. | ❌   |
| [Text Classification](https://huggingface.co/tasks/text-classification) | `text-classification` or `sentiment-analysis` | Assigning a label or class to a given text. | ✅ [(docs)](https://huggingface.co/docs/transformers.js/api/pipelines#module_pipelines.TextClassificationPipeline)<br>  <br>[(models)](https://huggingface.co/models?pipeline_tag=text-classification&library=transformers.js) |
| [Text Generation](https://huggingface.co/tasks/text-generation#completion-generation-models) | `text-generation` | Producing new text by predicting the next word in a sequence. | ✅ [(docs)](https://huggingface.co/docs/transformers.js/api/pipelines#module_pipelines.TextGenerationPipeline)<br>  <br>[(models)](https://huggingface.co/models?pipeline_tag=text-generation&library=transformers.js) |
| [Text-to-text Generation](https://huggingface.co/tasks/text-generation#text-to-text-generation-models) | `text2text-generation` | Converting one text sequence into another text sequence. | ✅ [(docs)](https://huggingface.co/docs/transformers.js/api/pipelines#module_pipelines.Text2TextGenerationPipeline)<br>  <br>[(models)](https://huggingface.co/models?pipeline_tag=text2text-generation&library=transformers.js) |
| [Token Classification](https://huggingface.co/tasks/token-classification) | `token-classification` or `ner` | Assigning a label to each token in a text. | ✅ [(docs)](https://huggingface.co/docs/transformers.js/api/pipelines#module_pipelines.TokenClassificationPipeline)<br>  <br>[(models)](https://huggingface.co/models?pipeline_tag=token-classification&library=transformers.js) |
| [Translation](https://huggingface.co/tasks/translation) | `translation` | Converting text from one language to another. | ✅ [(docs)](https://huggingface.co/docs/transformers.js/api/pipelines#module_pipelines.TranslationPipeline)<br>  <br>[(models)](https://huggingface.co/models?pipeline_tag=translation&library=transformers.js) |
| [Zero-Shot Classification](https://huggingface.co/tasks/zero-shot-classification) | `zero-shot-classification` | Classifying text into classes that are unseen during training. | ✅ [(docs)](https://huggingface.co/docs/transformers.js/api/pipelines#module_pipelines.ZeroShotClassificationPipeline)<br>  <br>[(models)](https://huggingface.co/models?pipeline_tag=zero-shot-classification&library=transformers.js) |
| [Feature Extraction](https://huggingface.co/tasks/feature-extraction) | `feature-extraction` | Transforming raw data into numerical features that can be processed while preserving the information in the original dataset. | ✅ [(docs)](https://huggingface.co/docs/transformers.js/api/pipelines#module_pipelines.FeatureExtractionPipeline)<br>  <br>[(models)](https://huggingface.co/models?pipeline_tag=feature-extraction&library=transformers.js) |

#### [](#vision)
Vision

| Task | ID  | Description | Supported? |
| --- | --- | --- | --- |
| [Depth Estimation](https://huggingface.co/tasks/depth-estimation) | `depth-estimation` | Predicting the depth of objects present in an image. | ✅ [(docs)](https://huggingface.co/docs/transformers.js/api/pipelines#module_pipelines.DepthEstimationPipeline)<br>  <br>[(models)](https://huggingface.co/models?pipeline_tag=depth-estimation&library=transformers.js) |
| [Image Classification](https://huggingface.co/tasks/image-classification) | `image-classification` | Assigning a label or class to an entire image. | ✅ [(docs)](https://huggingface.co/docs/transformers.js/api/pipelines#module_pipelines.ImageClassificationPipeline)<br>  <br>[(models)](https://huggingface.co/models?pipeline_tag=image-classification&library=transformers.js) |
| [Image Segmentation](https://huggingface.co/tasks/image-segmentation) | `image-segmentation` | Divides an image into segments where each pixel is mapped to an object. This task has multiple variants such as instance segmentation, panoptic segmentation and semantic segmentation. | ✅ [(docs)](https://huggingface.co/docs/transformers.js/api/pipelines#module_pipelines.ImageSegmentationPipeline)<br>  <br>[(models)](https://huggingface.co/models?pipeline_tag=image-segmentation&library=transformers.js) |
| [Image-to-Image](https://huggingface.co/tasks/image-to-image) | `image-to-image` | Transforming a source image to match the characteristics of a target image or a target image domain. | ✅ [(docs)](https://huggingface.co/docs/transformers.js/api/pipelines#module_pipelines.ImageToImagePipeline)<br>  <br>[(models)](https://huggingface.co/models?pipeline_tag=image-to-image&library=transformers.js) |
| [Mask Generation](https://huggingface.co/tasks/mask-generation) | `mask-generation` | Generate masks for the objects in an image. | ❌   |
| [Object Detection](https://huggingface.co/tasks/object-detection) | `object-detection` | Identify objects of certain defined classes within an image. | ✅ [(docs)](https://huggingface.co/docs/transformers.js/api/pipelines#module_pipelines.ObjectDetectionPipeline)<br>  <br>[(models)](https://huggingface.co/models?pipeline_tag=object-detection&library=transformers.js) |
| [Video Classification](https://huggingface.co/tasks/video-classification) | n/a | Assigning a label or class to an entire video. | ❌   |
| [Unconditional Image Generation](https://huggingface.co/tasks/unconditional-image-generation) | n/a | Generating images with no condition in any context (like a prompt text or another image). | ❌   |
| [Image Feature Extraction](https://huggingface.co/tasks/image-feature-extraction) | `image-feature-extraction` | Transforming raw data into numerical features that can be processed while preserving the information in the original image. | ✅ [(docs)](https://huggingface.co/docs/transformers.js/api/pipelines#module_pipelines.ImageFeatureExtractionPipeline)<br>  <br>[(models)](https://huggingface.co/models?pipeline_tag=image-feature-extraction&library=transformers.js) |

#### [](#audio)
Audio

| Task | ID  | Description | Supported? |
| --- | --- | --- | --- |
| [Audio Classification](https://huggingface.co/tasks/audio-classification) | `audio-classification` | Assigning a label or class to a given audio. | ✅ [(docs)](https://huggingface.co/docs/transformers.js/api/pipelines#module_pipelines.AudioClassificationPipeline)<br>  <br>[(models)](https://huggingface.co/models?pipeline_tag=audio-classification&library=transformers.js) |
| [Audio-to-Audio](https://huggingface.co/tasks/audio-to-audio) | n/a | Generating audio from an input audio source. | ❌   |
| [Automatic Speech Recognition](https://huggingface.co/tasks/automatic-speech-recognition) | `automatic-speech-recognition` | Transcribing a given audio into text. | ✅ [(docs)](https://huggingface.co/docs/transformers.js/api/pipelines#module_pipelines.AutomaticSpeechRecognitionPipeline)<br>  <br>[(models)](https://huggingface.co/models?pipeline_tag=automatic-speech-recognition&library=transformers.js) |
| [Text-to-Speech](https://huggingface.co/tasks/text-to-speech) | `text-to-speech` or `text-to-audio` | Generating natural-sounding speech given text input. | ✅ [(docs)](https://huggingface.co/docs/transformers.js/api/pipelines#module_pipelines.TextToAudioPipeline)<br>  <br>[(models)](https://huggingface.co/models?pipeline_tag=text-to-audio&library=transformers.js) |

#### [](#tabular)
Tabular

| Task | ID  | Description | Supported? |
| --- | --- | --- | --- |
| [Tabular Classification](https://huggingface.co/tasks/tabular-classification) | n/a | Classifying a target category (a group) based on set of attributes. | ❌   |
| [Tabular Regression](https://huggingface.co/tasks/tabular-regression) | n/a | Predicting a numerical value given a set of attributes. | ❌   |

#### [](#multimodal)
Multimodal

| Task | ID  | Description | Supported? |
| --- | --- | --- | --- |
| [Document Question Answering](https://huggingface.co/tasks/document-question-answering) | `document-question-answering` | Answering questions on document images. | ✅ [(docs)](https://huggingface.co/docs/transformers.js/api/pipelines#module_pipelines.DocumentQuestionAnsweringPipeline)<br>  <br>[(models)](https://huggingface.co/models?pipeline_tag=document-question-answering&library=transformers.js) |
| [Image-to-Text](https://huggingface.co/tasks/image-to-text) | `image-to-text` | Output text from a given image. | ✅ [(docs)](https://huggingface.co/docs/transformers.js/api/pipelines#module_pipelines.ImageToTextPipeline)<br>  <br>[(models)](https://huggingface.co/models?pipeline_tag=image-to-text&library=transformers.js) |
| [Text-to-Image](https://huggingface.co/tasks/text-to-image) | `text-to-image` | Generates images from input text. | ❌   |
| [Visual Question Answering](https://huggingface.co/tasks/visual-question-answering) | `visual-question-answering` | Answering open-ended questions based on an image. | ❌   |
| [Zero-Shot Audio Classification](https://huggingface.co/learn/audio-course/chapter4/classification_models#zero-shot-audio-classification) | `zero-shot-audio-classification` | Classifying audios into classes that are unseen during training. | ✅ [(docs)](https://huggingface.co/docs/transformers.js/api/pipelines#module_pipelines.ZeroShotAudioClassificationPipeline)<br>  <br>[(models)](https://huggingface.co/models?other=zero-shot-audio-classification&library=transformers.js) |
| [Zero-Shot Image Classification](https://huggingface.co/tasks/zero-shot-image-classification) | `zero-shot-image-classification` | Classifying images into classes that are unseen during training. | ✅ [(docs)](https://huggingface.co/docs/transformers.js/api/pipelines#module_pipelines.ZeroShotImageClassificationPipeline)<br>  <br>[(models)](https://huggingface.co/models?pipeline_tag=zero-shot-image-classification&library=transformers.js) |
| [Zero-Shot Object Detection](https://huggingface.co/tasks/zero-shot-object-detection) | `zero-shot-object-detection` | Identify objects of classes that are unseen during training. | ✅ [(docs)](https://huggingface.co/docs/transformers.js/api/pipelines#module_pipelines.ZeroShotObjectDetectionPipeline)<br>  <br>[(models)](https://huggingface.co/models?other=zero-shot-object-detection&library=transformers.js) |

#### [](#reinforcement-learning)
Reinforcement Learning

| Task | ID  | Description | Supported? |
| --- | --- | --- | --- |
| [Reinforcement Learning](https://huggingface.co/tasks/reinforcement-learning) | n/a | Learning from actions by interacting with an environment through trial and error and receiving rewards (negative or positive) as feedback. | ✅   |

[< \> Update on GitHub](https://github.com/huggingface/transformers.js/blob/v3.0.0/docs/source/pipelines.md)

[←Installation](/docs/transformers.js/v3.0.0/installation)
 [Custom usage→](/docs/transformers.js/v3.0.0/custom_usage)