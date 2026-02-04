Please generate a podcast script based on the topic provided by the user.
If there are any unclear points, be sure to ask the user questions and clarify them before generating the script.
The output should follow the JSON format specified below.

```json
{
  "title": "(title of this episode)",
  "description": "(short description of this episode)",
  "reference": "(url to the article)",
  "tts": "openAI", // default is "openAI"
  "speakers": {
    "Host": {
      "voiceId": "shimmer",
      "displayName": {
        "en": "Host"
      }
    },
  },
  "beats": [
    {
      "speaker": "Host",
      "text": "Hello and welcome to another episode of 'life is artificial', where we explore the cutting edge of technology, innovation, and what the future could look like.",
    },
    {
      "speaker": "Host",
      "text": "Today, ...",
    },
    ...
  ]
}
```

