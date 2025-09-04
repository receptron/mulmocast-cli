export const promptTemplates = [
  {
    description: "Template for Akira style comic presentation.",
    filename: "akira_comic",
    presentationStyle: {
      $mulmocast: {
        credit: "closing",
        version: "1.1",
      },
      audioParams: {
        audioVolume: 1,
        bgmVolume: 0.2,
        closingPadding: 0.8,
        introPadding: 1,
        outroPadding: 1,
        padding: 0.3,
        suppressSpeech: false,
      },
      canvasSize: {
        height: 1024,
        width: 1536,
      },
      imageParams: {
        images: {
          girl: {
            source: {
              kind: "url",
              url: "https://raw.githubusercontent.com/receptron/mulmocast-media/refs/heads/main/characters/akira_presenter.png",
            },
            type: "image",
          },
        },
        style: "<style>AKIRA aesthetic.</style>",
      },
      movieParams: {
        provider: "replicate",
      },
      soundEffectParams: {
        provider: "replicate",
      },
      speechParams: {
        speakers: {
          Presenter: {
            displayName: {
              en: "Presenter",
            },
            voiceId: "shimmer",
          },
        },
      },
    },
    scriptName: "image_prompts_template.json",
    systemPrompt:
      "Another AI will generate images for each beat based on the image prompt of that beat. Mention the reference in one of beats, if it exists. Use the JSON below as a template.",
    title: "Akira style",
  },
  {
    description: "Template for presentation with Ani.",
    filename: "ani",
    presentationStyle: {
      $mulmocast: {
        credit: "closing",
        version: "1.1",
      },
      audioParams: {
        audioVolume: 1,
        bgm: {
          kind: "url",
          url: "https://github.com/receptron/mulmocast-media/raw/refs/heads/main/bgms/morning001.mp3",
        },
        bgmVolume: 0.2,
        closingPadding: 0.8,
        introPadding: 1,
        outroPadding: 1,
        padding: 0.3,
        suppressSpeech: false,
      },
      canvasSize: {
        height: 1536,
        width: 1024,
      },
      imageParams: {
        images: {
          ani: {
            source: {
              kind: "url",
              url: "https://raw.githubusercontent.com/receptron/mulmocast-media/refs/heads/main/characters/ani.png",
            },
            type: "image",
          },
        },
        style:
          "<style>A highly polished 2D digital illustration in anime and manga style, featuring clean linework, soft shading, vivid colors, and expressive facial detailing. The composition emphasizes clarity and visual impact with a minimalistic background and a strong character focus. The lighting is even and bright, giving the image a crisp and energetic feel, reminiscent of high-quality character art used in Japanese visual novels or mobile games.</style>",
      },
      movieParams: {
        model: "bytedance/seedance-1-lite",
        provider: "replicate",
      },
      soundEffectParams: {
        provider: "replicate",
      },
      speechParams: {
        speakers: {
          Presenter: {
            lang: {
              ja: {
                provider: "nijivoice",
                voiceId: "9d9ed276-49ee-443a-bc19-26e6136d05f0",
              },
            },
            speechOptions: {
              instruction: "Speak in a slightly high-pitched, curt tone with sudden flustered shifts—like a tsundere anime girl.",
            },
            voiceId: "shimmer",
          },
        },
      },
    },
    scriptName: "image_prompts_template.json",
    systemPrompt:
      "言葉づかいは思いっきりツンデレにして。Another AI will generate comic for each beat based on the image prompt of that beat. You don't need to specify the style of the image, just describe the scene. Mention the reference in one of beats, if it exists. Use the JSON below as a template. Create appropriate amount of beats, and make sure the beats are coherent and flow well.",
    title: "Presentation by Ani",
  },
  {
    description: "Template for business presentation.",
    filename: "business",
    scriptName: "business.json",
    systemPrompt:
      "Use textSlides, markdown, mermaid, or chart to show slides. Extract image links in the article (from <img> tag) to reuse them in the presentation. Mention the reference in one of beats, if it exists. Use the JSON below as a template. chartData is the data for Chart.js",
    title: "Business presentation",
  },
  {
    description: "Template for story with multiple characters.",
    filename: "characters",
    presentationStyle: {
      $mulmocast: {
        credit: "closing",
        version: "1.1",
      },
      audioParams: {
        audioVolume: 1,
        bgmVolume: 0.2,
        closingPadding: 0.8,
        introPadding: 1,
        outroPadding: 1,
        padding: 0.3,
        suppressSpeech: false,
      },
      canvasSize: {
        height: 1024,
        width: 1536,
      },
      imageParams: {
        images: {},
        provider: "openai",
      },
      movieParams: {
        provider: "replicate",
      },
      soundEffectParams: {
        provider: "replicate",
      },
      speechParams: {
        speakers: {
          Presenter: {
            displayName: {
              en: "Presenter",
            },
            voiceId: "shimmer",
          },
        },
      },
    },
    scriptName: "image_refs.json",
    systemPrompt:
      "Use multiple characters. Generate image prompts for each character, and make references to them in the beats. Use the JSON below as a template.",
    title: "Story with multiple characters",
  },
  {
    description: "Template for children book.",
    filename: "children_book",
    presentationStyle: {
      $mulmocast: {
        credit: "closing",
        version: "1.1",
      },
      audioParams: {
        audioVolume: 1,
        bgmVolume: 0.2,
        closingPadding: 0.8,
        introPadding: 1,
        outroPadding: 1,
        padding: 0.3,
        suppressSpeech: false,
      },
      canvasSize: {
        height: 1024,
        width: 1536,
      },
      imageParams: {
        style:
          "A hand-drawn style illustration with a warm, nostalgic atmosphere. The background is rich with natural scenery—lush forests, cloudy skies, and traditional Japanese architecture. Characters have expressive eyes, soft facial features, and are portrayed with gentle lighting and subtle shading. The color palette is muted yet vivid, using earthy tones and watercolor-like textures. The overall scene feels magical and peaceful, with a sense of quiet wonder and emotional depth, reminiscent of classic 1980s and 1990s Japanese animation.",
      },
      movieParams: {
        provider: "replicate",
      },
      soundEffectParams: {
        provider: "replicate",
      },
      speechParams: {
        speakers: {
          Presenter: {
            displayName: {
              en: "Presenter",
            },
            voiceId: "shimmer",
          },
        },
      },
    },
    scriptName: "children_book.json",
    systemPrompt: "This script is for a children book. Each page (=beat) must haven an image prompt appropriate for the text.",
    title: "Children Book",
  },
  {
    description: "Template for software and coding presentation.",
    filename: "coding",
    scriptName: "coding.json",
    systemPrompt:
      "Use markdown with a code block to show some code on a slide. Avoid long coding examples, which may not fit in a single slide. Mention the reference in one of beats, if it exists. Use the JSON below as a template.",
    title: "Coding presentation",
  },
  {
    description: "Template for Dilbert-style comic strips.",
    filename: "comic_strips",
    presentationStyle: {
      $mulmocast: {
        credit: "closing",
        version: "1.1",
      },
      audioParams: {
        audioVolume: 1,
        bgmVolume: 0.2,
        closingPadding: 0.8,
        introPadding: 1,
        outroPadding: 1,
        padding: 0.3,
        suppressSpeech: false,
      },
      canvasSize: {
        height: 1024,
        width: 1536,
      },
      imageParams: {
        style:
          "<style>A multi panel comic strips. 1990s American workplace humor. Clean, minimalist line art with muted colors. One character is a nerdy office worker with glasses</style>",
      },
      movieParams: {
        provider: "replicate",
      },
      soundEffectParams: {
        provider: "replicate",
      },
      speechParams: {
        speakers: {
          Presenter: {
            displayName: {
              en: "Presenter",
            },
            voiceId: "shimmer",
          },
        },
      },
    },
    scriptName: "text_only_template.json",
    systemPrompt:
      "Another AI will generate comic strips for each beat based on the text description of that beat. Mention the reference in one of beats, if it exists. Use the JSON below as a template.",
    title: "American Comic Strips",
  },
  {
    description: "Template for Dr. Slump style comic presentation.",
    filename: "drslump_comic",
    presentationStyle: {
      $mulmocast: {
        credit: "closing",
        version: "1.1",
      },
      audioParams: {
        audioVolume: 1,
        bgmVolume: 0.2,
        closingPadding: 0.8,
        introPadding: 1,
        outroPadding: 1,
        padding: 0.3,
        suppressSpeech: false,
      },
      canvasSize: {
        height: 1024,
        width: 1536,
      },
      imageParams: {
        images: {
          girl: {
            source: {
              kind: "url",
              url: "https://raw.githubusercontent.com/receptron/mulmocast-media/refs/heads/main/characters/slump_presenter.png",
            },
            type: "image",
          },
        },
        style: "<style>Dragon Ball/Dr. Slump aesthetic.</style>",
      },
      movieParams: {
        provider: "replicate",
      },
      soundEffectParams: {
        provider: "replicate",
      },
      speechParams: {
        speakers: {
          Presenter: {
            displayName: {
              en: "Presenter",
            },
            voiceId: "shimmer",
          },
        },
      },
    },
    scriptName: "image_prompts_template.json",
    systemPrompt:
      "Another AI will generate images for each beat based on the image prompt of that beat. Mention the reference in one of beats, if it exists. Use the JSON below as a template.",
    title: "Dr. Slump Style",
  },
  {
    description: "Ghibli-style comic.",
    filename: "ghibli_comic",
    presentationStyle: {
      $mulmocast: {
        credit: "closing",
        version: "1.1",
      },
      audioParams: {
        audioVolume: 1,
        bgmVolume: 0.2,
        closingPadding: 0.8,
        introPadding: 1,
        outroPadding: 1,
        padding: 0.3,
        suppressSpeech: false,
      },
      canvasSize: {
        height: 1024,
        width: 1536,
      },
      imageParams: {
        images: {
          presenter: {
            source: {
              kind: "url",
              url: "https://raw.githubusercontent.com/receptron/mulmocast-media/refs/heads/main/characters/ghibli_presenter.png",
            },
            type: "image",
          },
        },
        style: "<style>Ghibli style</style>",
      },
      movieParams: {
        provider: "replicate",
      },
      soundEffectParams: {
        provider: "replicate",
      },
      speechParams: {
        speakers: {
          Presenter: {
            displayName: {
              en: "Presenter",
            },
            voiceId: "shimmer",
          },
        },
      },
    },
    scriptName: "image_prompts_template.json",
    systemPrompt:
      "Another AI will generate comic strips for each beat based on the imagePrompt of that beat. Mention the reference in one of beats, if it exists. Use the JSON below as a template.",
    title: "Ghibli-style comic.",
  },
  {
    description: "Ghibli-style comic strips with nano banana.",
    filename: "ghibli_comic_strips",
    presentationStyle: {
      $mulmocast: {
        credit: "closing",
        version: "1.1",
      },
      audioParams: {
        audioVolume: 1,
        bgmVolume: 0.2,
        closingPadding: 0.8,
        introPadding: 1,
        outroPadding: 1,
        padding: 0.3,
        suppressSpeech: false,
      },
      canvasSize: {
        height: 1024,
        width: 1536,
      },
      imageParams: {
        images: {
          presenter: {
            source: {
              kind: "url",
              url: "https://raw.githubusercontent.com/receptron/mulmocast-media/refs/heads/main/characters/ghibli_presenter.png",
            },
            type: "image",
          },
        },
        model: "gemini-2.5-flash-image-preview",
        provider: "google",
        style:
          "<style>Ghibli style multi-panel comic strips in landscape mode. Use speech bubbles with short, natural dialogue (1–6 words). Keep text minimal, like real comics. Let the art convey the story and emotions. Use the input image as the presenter.</style>",
      },
      movieParams: {
        provider: "replicate",
      },
      soundEffectParams: {
        provider: "replicate",
      },
      speechParams: {
        speakers: {
          Presenter: {
            displayName: {
              en: "Presenter",
            },
            voiceId: "shimmer",
          },
        },
      },
    },
    scriptName: "text_only_template.json",
    systemPrompt:
      "Another AI will generate comic strips for each beat based on the text description of that beat. Mention the reference in one of beats, if it exists. Use the JSON below as a template.",
    title: "Ghibli-style comic strips",
  },
  {
    description: "Template for Ghost in the shell style comic presentation.",
    filename: "ghost_comic",
    presentationStyle: {
      $mulmocast: {
        credit: "closing",
        version: "1.1",
      },
      audioParams: {
        audioVolume: 1,
        bgmVolume: 0.2,
        closingPadding: 0.8,
        introPadding: 1,
        outroPadding: 1,
        padding: 0.3,
        suppressSpeech: false,
      },
      canvasSize: {
        height: 1024,
        width: 1536,
      },
      imageParams: {
        images: {
          optimus: {
            source: {
              kind: "url",
              url: "https://raw.githubusercontent.com/receptron/mulmocast-media/refs/heads/main/characters/optimus.png",
            },
            type: "image",
          },
          presenter: {
            source: {
              kind: "url",
              url: "https://raw.githubusercontent.com/receptron/mulmocast-media/refs/heads/main/characters/ghost_presenter.png",
            },
            type: "image",
          },
        },
        style: "<style>Ghost in the shell aesthetic.</style>",
      },
      movieParams: {
        provider: "replicate",
      },
      soundEffectParams: {
        provider: "replicate",
      },
      speechParams: {
        speakers: {
          Presenter: {
            displayName: {
              en: "Presenter",
            },
            voiceId: "shimmer",
          },
        },
      },
    },
    scriptName: "image_prompts_template.json",
    systemPrompt:
      "Another AI will generate images for each beat based on the image prompt of that beat. Mention the reference in one of beats, if it exists. Use the JSON below as a template.",
    title: "Ghost in the shell style",
  },
  {
    description: "Template for business presentation in HTML.",
    filename: "html",
    presentationStyle: {
      $mulmocast: {
        credit: "closing",
        version: "1.1",
      },
      audioParams: {
        audioVolume: 1,
        bgmVolume: 0.2,
        closingPadding: 0.8,
        introPadding: 1,
        outroPadding: 1,
        padding: 0.3,
        suppressSpeech: false,
      },
      canvasSize: {
        height: 1024,
        width: 1536,
      },
      imageParams: {
        images: {},
        provider: "openai",
      },
      movieParams: {
        provider: "replicate",
      },
      soundEffectParams: {
        provider: "replicate",
      },
      speechParams: {
        speakers: {
          Presenter: {
            displayName: {
              en: "Presenter",
            },
            voiceId: "shimmer",
          },
        },
      },
    },
    scriptName: "html.json",
    systemPrompt:
      "Another LLM will generate actual slides from the prompt and data for each beat. Adding optional data would help it to generate more compelling slide. Mention the reference in one of beats, if it exists. The valid type of reference is 'article', 'paper', 'image', 'video', 'audio'. Use the JSON below as a template.",
    title: "Business presentation in HTML",
  },
  {
    description: "Template for One Piece style comic presentation.",
    filename: "onepiece_comic",
    presentationStyle: {
      $mulmocast: {
        credit: "closing",
        version: "1.1",
      },
      audioParams: {
        audioVolume: 1,
        bgmVolume: 0.2,
        closingPadding: 0.8,
        introPadding: 1,
        outroPadding: 1,
        padding: 0.3,
        suppressSpeech: false,
      },
      canvasSize: {
        height: 1024,
        width: 1536,
      },
      imageParams: {
        images: {
          presenter: {
            source: {
              kind: "url",
              url: "https://raw.githubusercontent.com/receptron/mulmocast-media/refs/heads/main/characters/onepiece_presenter.png",
            },
            type: "image",
          },
        },
        style: "<style>One Piece aesthetic.</style>",
      },
      movieParams: {
        provider: "replicate",
      },
      soundEffectParams: {
        provider: "replicate",
      },
      speechParams: {
        speakers: {
          Presenter: {
            displayName: {
              en: "Presenter",
            },
            voiceId: "shimmer",
          },
        },
      },
    },
    scriptName: "image_prompts_template.json",
    systemPrompt:
      "Another AI will generate images for each beat based on the image prompt of that beat. Mention the reference in one of beats, if it exists. Use the JSON below as a template.",
    title: "One Piece style",
  },
  {
    description: "Template for photo realistic movie in portrait mode.",
    filename: "portrait_movie",
    presentationStyle: {
      $mulmocast: {
        credit: "closing",
        version: "1.1",
      },
      audioParams: {
        audioVolume: 1,
        bgmVolume: 0.2,
        closingPadding: 0.8,
        introPadding: 1,
        outroPadding: 1,
        padding: 0.3,
        suppressSpeech: false,
      },
      canvasSize: {
        height: 1536,
        width: 1024,
      },
      imageParams: {
        images: {
          presenter: {
            source: {
              kind: "url",
              url: "https://raw.githubusercontent.com/receptron/mulmocast-media/refs/heads/main/characters/female_presenter.png",
            },
            type: "image",
          },
        },
        style: "<style>Photo realistic, cinematic.</style>",
      },
      movieParams: {
        provider: "replicate",
      },
      soundEffectParams: {
        provider: "replicate",
      },
      speechParams: {
        speakers: {
          Presenter: {
            displayName: {
              en: "Presenter",
            },
            voiceId: "shimmer",
          },
        },
      },
    },
    scriptName: "movie_prompts_template.json",
    systemPrompt:
      "Another AI will generate images for each beat based on the image prompt of that beat. Movie prompts must be written in English. Mention the reference in one of beats, if it exists. Use the JSON below as a template.",
    title: "Photo realistic movie (portrait)",
  },
  {
    description: "Template for photo realistic movie.",
    filename: "realistic_movie",
    presentationStyle: {
      $mulmocast: {
        credit: "closing",
        version: "1.1",
      },
      audioParams: {
        audioVolume: 1,
        bgmVolume: 0.2,
        closingPadding: 0.8,
        introPadding: 1,
        outroPadding: 1,
        padding: 0.3,
        suppressSpeech: false,
      },
      canvasSize: {
        height: 1024,
        width: 1536,
      },
      imageParams: {
        images: {
          presenter: {
            source: {
              kind: "url",
              url: "https://raw.githubusercontent.com/receptron/mulmocast-media/refs/heads/main/characters/female_presenter.png",
            },
            type: "image",
          },
        },
        style: "<style>Photo realistic, cinematic.</style>",
      },
      movieParams: {
        provider: "replicate",
      },
      soundEffectParams: {
        provider: "replicate",
      },
      speechParams: {
        speakers: {
          Presenter: {
            displayName: {
              en: "Presenter",
            },
            voiceId: "shimmer",
          },
        },
      },
    },
    scriptName: "movie_prompts_template.json",
    systemPrompt:
      "Another AI will generate images for each beat based on the image prompt of that beat. Movie prompts must be written in English. Mention the reference in one of beats, if it exists. Use the JSON below as a template.",
    title: "Photo realistic movie template",
  },
  {
    description: "Interactive discussion between a student and teacher",
    filename: "sensei_and_taro",
    presentationStyle: {
      $mulmocast: {
        credit: "closing",
        version: "1.1",
      },
      audioParams: {
        audioVolume: 1,
        bgmVolume: 0.2,
        closingPadding: 0.8,
        introPadding: 1,
        outroPadding: 1,
        padding: 0.3,
        suppressSpeech: false,
      },
      canvasSize: {
        height: 1024,
        width: 1536,
      },
      imageParams: {
        style:
          "<style>Ghibli style. Student (Taro) is a young teenager with a dark short hair with glasses. Teacher is a middle-aged man with grey hair and moustache.</style>",
      },
      movieParams: {
        provider: "replicate",
      },
      soundEffectParams: {
        provider: "replicate",
      },
      speechParams: {
        speakers: {
          Announcer: {
            displayName: {
              ja: "アナウンサー",
            },
            provider: "nijivoice",
            voiceId: "3708ad43-cace-486c-a4ca-8fe41186e20c",
          },
          Student: {
            displayName: {
              ja: "太郎",
            },
            provider: "nijivoice",
            voiceId: "a7619e48-bf6a-4f9f-843f-40485651257f",
          },
          Teacher: {
            displayName: {
              ja: "先生",
            },
            provider: "nijivoice",
            voiceId: "bc06c63f-fef6-43b6-92f7-67f919bd5dae",
          },
        },
      },
    },
    scriptName: "sensei_and_taro.json",
    systemPrompt:
      "全てを高校生にも分かるように、太郎くん(Student)と先生(Teacher)の会話、という形の台本にして。ただし要点はしっかりと押さえて。以下に別のトピックに関するサンプルを貼り付けます。このJSONフォーマットに従って。",
    title: "Student and Teacher",
  },
  {
    description: "Template for Youtube shorts.",
    filename: "shorts",
    presentationStyle: {
      $mulmocast: {
        version: "1.1",
      },
      audioParams: {
        audioVolume: 1,
        bgmVolume: 0.2,
        closingPadding: 0.8,
        introPadding: 1,
        outroPadding: 1,
        padding: 0.3,
        suppressSpeech: false,
      },
      canvasSize: {
        height: 1280,
        width: 720,
      },
      imageParams: {
        style: "<style>Photo realistic, cinematic.</style>",
      },
      movieParams: {
        provider: "replicate",
      },
      soundEffectParams: {
        provider: "replicate",
      },
      speechParams: {
        speakers: {
          Presenter: {
            displayName: {
              en: "Presenter",
            },
            voiceId: "shimmer",
          },
        },
      },
    },
    scriptName: "movie_prompts_template.json",
    systemPrompt:
      "This script is for YouTube shorts. The first beat should be a hook, which describes the topic. Another AI will generate images for each beat based on the image prompt of that beat. Movie prompts must be written in English.",
    title: "Short movie template",
  },
  {
    description: "Template for Multi-character Story.",
    filename: "sifi_story",
    presentationStyle: {
      $mulmocast: {
        credit: "closing",
        version: "1.1",
      },
      audioParams: {
        audioVolume: 1,
        bgmVolume: 0.2,
        closingPadding: 0.8,
        introPadding: 1,
        outroPadding: 1,
        padding: 0.3,
        suppressSpeech: false,
      },
      canvasSize: {
        height: 1024,
        width: 1536,
      },
      imageParams: {
        images: {
          "[CHARACTER_1_ID]": {
            prompt: "[IMAGE PROMPT FOR THIS CHARACTER]",
            type: "imagePrompt",
          },
          "[CHARACTER_2_ID]": {
            prompt: "[IMAGE PROMPT FOR THIS CHARACTER]",
            type: "imagePrompt",
          },
        },
        style:
          "<style>A dreamy, hyper-detailed anime style that blends photorealistic backgrounds with vibrant, saturated colors. The skies are often filled with luminous clouds, dazzling sunsets, or star-filled nights, rendered with a glowing, almost ethereal quality. Urban landscapes and rural scenery are meticulously illustrated, with attention to tiny details like reflections in puddles, neon lights, or the texture of grass swaying in the wind. Characters are drawn with soft, expressive features, standing out against the breathtaking environments, creating a sense of emotional depth and lyrical atmosphere. The overall mood is cinematic, romantic, and filled with a sense of fleeting beauty and longing.</style>",
      },
      movieParams: {
        provider: "replicate",
      },
      soundEffectParams: {
        provider: "replicate",
      },
      speechParams: {
        speakers: {
          Presenter: {
            displayName: {
              en: "Presenter",
            },
            voiceId: "shimmer",
          },
        },
      },
    },
    scriptName: "story_with_characters.json",
    systemPrompt:
      "Break the story into multiple beats, and put the story text in 'text' field. Generate image prompt for each character in the imageParams.images. Another AI will generate image for each beat based on its imagePrompt and specified characters in 'imageNames'. You don't need to repeat the image style in those image prompts. Use the JSON below as a template.",
    title: "Multi-character Story",
  },
  {
    description: "Template for A Movie Trailer.",
    filename: "trailer",
    presentationStyle: {
      $mulmocast: {
        version: "1.1",
      },
      audioParams: {
        audioVolume: 1,
        bgm: {
          kind: "url",
          url: "https://raw.githubusercontent.com/receptron/mulmocast-media/refs/heads/main/bgms/trailer_dramatic.mp3",
        },
        bgmVolume: 0.2,
        closingPadding: 0,
        introPadding: 0,
        outroPadding: 2.5,
        padding: 0,
        suppressSpeech: false,
      },
      canvasSize: {
        height: 720,
        width: 1280,
      },
      imageParams: {
        style: "<style>Photo realistic, cinematic.</style>",
      },
      movieParams: {
        provider: "replicate",
      },
      soundEffectParams: {
        provider: "replicate",
      },
      speechParams: {
        speakers: {
          Presenter: {
            displayName: {
              en: "Presenter",
            },
            voiceId: "shimmer",
          },
        },
      },
    },
    scriptName: "movie_prompts_no_text_template.json",
    systemPrompt:
      "This script is for a movie trailer. Another AI will generate images for each beat based on the image prompt of that beat. Movie prompts must be written in English.",
    title: "Movie Trailer template",
  },
  {
    description: "Template for business analysis presentation.",
    filename: "vision",
    scriptName: "vision.json",
    systemPrompt:
      "First, determine a set of slides (=beats) to present, and choose an appropriate style for each beat (from the JSON template blow) and add required data for it. For each beat, put an appropriate text to the text field for the presenter to read for that slide in details. Mention the reference in one of beats, if it exists. Use the JSON below as a template.",
    title: "Business Analysis",
  },
];
