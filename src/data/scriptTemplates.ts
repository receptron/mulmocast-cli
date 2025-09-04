export const scriptTemplates = [
  {
    $mulmocast: {
      credit: "closing",
      version: "1.1",
    },
    beats: [
      {
        image: {
          slide: {
            title: "This is the title of the presentation",
          },
          type: "textSlide",
        },
        text: "Today we're exploring a fascinating concept that has shaped some of the most innovative companies and leaders of our time: the Reality Distortion Field.",
      },
      {
        image: {
          slide: {
            subtitle: "Tom Johnson",
            title: "This is the title of the presentation",
          },
          type: "textSlide",
        },
        text: "This is a sample slide, which just displays the title and the presenter's name of this presentation.",
      },
      {
        image: {
          slide: {
            bullets: [
              "Early Primates",
              "Hominids and Hominins",
              "Australopithecus",
              "Genus Homo Emerges",
              "Homo erectus and Migration",
              "Neanderthals and Other Archaic Humans",
              "Homo sapiens",
            ],
            title: "Human Evolution",
          },
          type: "textSlide",
        },
        text: "The evolution of humans is a complex journey that spans millions of years, shaped by biology, environment, and culture. Here's a high-level summary of the key stages in human evolution",
      },
      {
        image: {
          markdown: [
            "# Markdown Table Example",
            "| Item              | In Stock | Price |",
            "| :---------------- | :------: | ----: |",
            "| Python Hat        |   True   | 23.99 |",
            "| SQL Hat           |   True   | 23.99 |",
            "| Codecademy Tee    |  False   | 19.99 |",
            "| Codecademy Hoodie |  False   | 42.99 |",
          ],
          type: "markdown",
        },
        text: "This is a table of items in the store.",
      },
      {
        image: {
          chartData: {
            data: {
              datasets: [
                {
                  backgroundColor: "rgba(54, 162, 235, 0.5)",
                  borderColor: "rgba(54, 162, 235, 1)",
                  borderWidth: 1,
                  data: [120, 135, 180, 155, 170, 190],
                  label: "Revenue ($1000s)",
                },
                {
                  backgroundColor: "rgba(75, 192, 192, 0.5)",
                  borderColor: "rgba(75, 192, 192, 1)",
                  borderWidth: 1,
                  data: [45, 52, 68, 53, 61, 73],
                  label: "Profit ($1000s)",
                },
              ],
              labels: ["January", "February", "March", "April", "May", "June"],
            },
            options: {
              animation: false,
              responsive: true,
            },
            type: "bar",
          },
          title: "Sales and Profits (from Jan to June)",
          type: "chart",
        },
        text: "This page shows the sales and profits of this company from January 2024 to June 2024.",
      },
      {
        image: {
          chartData: {
            data: {
              datasets: [
                {
                  backgroundColor: ["rgba(75, 192, 192, 0.5)", "rgba(54, 162, 235, 0.5)"],
                  borderColor: ["rgba(75, 192, 192, 1)", "rgba(54, 162, 235, 1)"],
                  borderWidth: 1,
                  data: [90, 10],
                },
              ],
              labels: ["OpenAIと投資家の取り分", "マイクロソフトの取り分"],
            },
            options: {
              animation: false,
              plugins: {
                legend: {
                  position: "bottom",
                },
              },
              responsive: true,
            },
            type: "pie",
          },
          title: "A sample pie chart",
          type: "chart",
        },
        text: "This is a sample pie chart",
      },
      {
        image: {
          code: {
            kind: "text",
            text:
              "graph LR\n" +
              "    A[Market Research] --> B[Product Planning]\n" +
              "    B --> C[Development]\n" +
              "    C --> D[Testing]\n" +
              "    D --> E[Manufacturing]\n" +
              "    E --> F[Marketing]\n" +
              "    F --> G[Sales]\n" +
              "    G --> H[Customer Support]\n" +
              "    H --> A",
          },
          title: "Business Process Flow",
          type: "mermaid",
        },
        text: "Next, let's look at a diagram of our business process flow. This illustrates the key steps from product development to sales.",
      },
      {
        image: {
          html: [
            '<main class="flex-grow">',
            "  <!-- Hero Section -->",
            '  <section class="bg-blue-600 text-white py-20">',
            '    <div class="container mx-auto px-6 text-center">',
            '      <h1 class="text-4xl md:text-5xl font-bold mb-4">Welcome to Mulmocast</h1>',
            '      <p class="text-lg md:text-xl mb-8">A modern web experience powered by Tailwind CSS</p>',
            '      <a href="#features" class="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold shadow hover:bg-gray-100 transition">',
            "        Learn More",
            "      </a>",
            "    </div>",
            "  </section>",
            "",
            "  <!-- Features Section -->",
            '  <section id="features" class="py-16 bg-gray-100">',
            '    <div class="container mx-auto px-6">',
            '      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">',
            "        <div>",
            '          <div class="text-blue-600 text-4xl mb-2">⚡</div>',
            '          <h3 class="text-xl font-semibold mb-2">Fast</h3>',
            '          <p class="text-gray-600">Built with performance in mind using modern tools.</p>',
            "        </div>",
            "        <div>",
            '          <div class="text-blue-600 text-4xl mb-2">🎨</div>',
            '          <h3 class="text-xl font-semibold mb-2">Beautiful</h3>',
            '          <p class="text-gray-600">Styled with Tailwind CSS for clean, responsive design.</p>',
            "        </div>",
            "        <div>",
            '          <div class="text-blue-600 text-4xl mb-2">🚀</div>',
            '          <h3 class="text-xl font-semibold mb-2">Launch Ready</h3>',
            '          <p class="text-gray-600">Easy to deploy and extend for your next big idea.</p>',
            "        </div>",
            "      </div>",
            "    </div>",
            "  </section>",
            "</main>",
            "",
            "<!-- Footer -->",
            '<footer class="bg-white text-gray-500 text-center py-6 border-t">',
            "  2025 Mulmocast.",
            "</footer>",
          ],
          type: "html_tailwind",
        },
        text: "This is a tailwind html format.",
      },
      {
        image: {
          source: {
            kind: "url",
            url: "https://satoshi.blogs.com/mag2/May2025/enterprise_app.png",
          },
          type: "image",
        },
        text: "This is the image of the future of enterprise applications.",
      },
    ],
    filename: "business",
    lang: "en",
    references: [
      {
        title: "Title of the article we are referencing",
        type: "article",
        url: "https://www.somegreatwebsite.com/article/123",
      },
    ],
    title: "Sample Title",
  },
  {
    $mulmocast: {
      credit: "closing",
      version: "1.1",
    },
    beats: [
      {
        imagePrompt:
          "藁葺き屋根の古い日本家屋。近くには清らかな川が流れ、裏には緑豊かな山がある。おじいさんは鎌を持って山へ向かい、おばあさんは洗濯かごを持って川へ向かっている。春の穏やかな日差しが風景を照らしている。",
        text: "むかしむかし、あるところにおじいさんとおばあさんが住んでいました。おじいさんは山へ芝刈りに、おばあさんは川へ洗濯に行きました。",
      },
      {
        imagePrompt:
          "川で洗濯するおばあさん。川面に映る青空と白い雲。上流から流れてくる異様に大きくて鮮やかな赤い桃。驚いた表情でそれを見つめるおばあさん。周りには洗濯物と石。",
        text: "おばあさんが川で洗濯をしていると、上流から大きな桃が流れてきました。「まあ、なんて大きな桃でしょう」とおばあさんは驚きました。",
      },
      {
        imagePrompt: "家の中、赤ん坊を高く抱き上げて、驚きと喜びの表情を浮かべる老夫婦。",
        text: "おばあさんはその桃を持ち帰り、「おじいさん、大きな桃を見つけましたよ」と言いました。二人が桃を切ろうとすると、中から元気な男の子が生まれました。",
      },
      {
        imagePrompt:
          "時間の経過を示す4コマの連続画像。最初は赤ちゃん、次に幼児、そして少年、最後に若い男性へと成長する桃太郎。各段階でおじいさんとおばあさんが愛情深く見守っている。最後の画像では、たくましく成長した桃太郎が木を持ち上げたり、重い石を運んだりして力の強さを示している。",
        text: "二人は男の子を「桃太郎」と名付けて、大切に育てました。桃太郎はすくすくと成長し、とても強い子になりました。",
      },
      {
        imagePrompt:
          "家の中の桃太郎、おじいさんとおばあさん。窓の外では村人たちが恐怖の表情で逃げ回り、遠くには炎と煙が見える。決意に満ちた表情の桃太郎が立ち上がり、おじいさんとおばあさんに語りかけている。憂慮と誇りの入り混じった表情の老夫婦。",
        text: "ある日、鬼が島から来た鬼たちが村を荒らしているという話を聞いた桃太郎は、おじいさんとおばあさんに「鬼退治に行きます」と告げました。",
      },
      {
        imagePrompt:
          "家の中。おばあさんが台所できびだんごを作り、おじいさんが桐箱から刀と鮮やかな着物を取り出している。準備を整える桃太郎。テーブルの上には小さな布包みにきびだんごが包まれている。朝日が障子を通して部屋を温かく照らしている。",
        text: "おばあさんは桃太郎のために、日本一のきびだんごを作ってくれました。おじいさんは立派な刀と着物をくれました。",
      },
      {
        imagePrompt:
          "家の前で出発する桃太郎。腰にはきびだんごの入った袋と刀、背中には小さな旗。見送るおじいさんとおばあさん、そして村人たち。桃太郎は自信に満ちた表情で前方を見つめている。朝霧の中、道は山々へと続いている。",
        text: "「いってきます」と言って、桃太郎はきびだんごを持って、鬼が島へ向かいました。",
      },
      {
        imagePrompt:
          "山道を進む桃太郎。横には大きな茶色の犬が立っている。犬は尾を振り、期待を込めた表情で桃太郎を見上げている。周りには春の花と緑豊かな自然。桃太郎は犬に微笑みかけている。",
        text: "道中、桃太郎は犬に出会いました。「桃太郎さん、桃太郎さん、お腰につけたきびだんご、一つわたしに下さいな」と犬は言いました。",
      },
      {
        imagePrompt:
          "桃太郎がきびだんごを犬に渡している様子。犬が嬉しそうにきびだんごを食べている。桃太郎の表情は優しく頼もしい。背景には山と川、遠くには鬼が島を思わせる遠景。",
        text: "「よし、一つあげよう。その代わり家来になるんだよ」と桃太郎は言いました。犬は喜んできびだんごを食べ、桃太郎の家来になりました。",
      },
      {
        imagePrompt:
          "森の中の道。桃太郎と犬が木にとまる猿と話している。猿は好奇心いっぱいの表情で桃太郎の手にあるきびだんごを見ている。周りには色とりどりの木々と花。犬は猿を友好的に見上げている。",
        text: "次に、桃太郎と犬は猿に出会いました。猿もきびだんごと引き換えに、桃太郎の家来になりました。",
      },
      {
        imagePrompt:
          "山の開けた場所。空高く舞うカラフルなキジが桃太郎たちに近づいてきている。地面には桃太郎、犬、猿が立っており、空を見上げている。キジは美しい羽を広げ、桃太郎のきびだんごに目を向けている。背景には雄大な山々と澄んだ青空。",
        text: "さらに進むと、今度はキジに出会いました。キジもきびだんごをもらい、桃太郎の家来になりました。",
      },
      {
        imagePrompt:
          "海に浮かぶ鬼が島に向かう小さな船。船の上には桃太郎、犬、猿、キジが乗っている。桃太郎は立って指揮を取り、犬は船の前方を見据え、猿は帆を操作し、キジは空から見張りをしている。荒々しい波と暗雲が立ち込める中、島へと近づく彼らの姿。島には険しい岩山と不気味な城が見える。",
        text: "こうして桃太郎は、犬、猿、キジを家来にして、いよいよ鬼が島へと向かいました。",
      },
      {
        imagePrompt:
          "鬼ヶ島の大きな赤い門。門の上空を飛ぶキジ。門の向こう側では、様々な色の鬼たちが酒を飲み、踊り、騒いでいる様子が見える。鬼の中には角が1本、2本、3本のものなど様々。宴会場の周りには盗んできた宝物が山積みになっている。門の手前には桃太郎、犬、猿が隠れて様子をうかがっている。",
        text: "鬼が島に着くと、そこには大きな門がありました。キジが飛んで様子を見ると、中では鬼たちが宴会をしていました。",
      },
      {
        imagePrompt:
          "鬼ヶ島の入り口近く、岩陰に隠れた桃太郎と家来たち。桃太郎は刀を抜き、決意に満ちた表情で仲間たちに語りかけている。犬は牙をむき、猿は棒を構え、キジは鋭い嘴を見せて戦う準備をしている。全員が真剣な表情で桃太郎の言葉に耳を傾けている。背景には鬼の城が不気味にそびえ立っている。",
        text: "「よーし、みんな準備はいいか。今から鬼退治だ！」と桃太郎は言いました。",
      },
      {
        imagePrompt:
          "鬼ヶ島の城の中での激しい戦闘シーン。様々な色の鬼たちが驚きと怒りの表情で戦っている。犬は赤鬼の足に噛みついて倒し、猿は青鬼の髪を引っ張って混乱させ、キジは緑鬼の目をつついている。中央では桃太郎が刀を振るい、黄色い鬼と対峙している。背景には他の鬼たちも逃げ惑う姿がある。戦いの熱気と混乱が画面いっぱいに広がっている。",
        text: "桃太郎たちは勇敢に戦いました。犬は鬼の足に噛みつき、猿は鬼の髪を引っ張り、キジは鬼の目をつついて攻撃しました。",
      },
      {
        imagePrompt:
          "城の奥、豪華な部屋での桃太郎と鬼の大将との一騎打ち。鬼の大将は巨大で、赤い肌に金色の兜と鉄の棍棒を持っている。桃太郎は小さいながらも勇敢に刀を構えて対峙している。部屋の周りには宝物が散らばり、窓からは戦いを見守る家来たちの姿が見える。決定的な一撃を加えようとする桃太郎と、驚きの表情を浮かべる鬼の大将。",
        text: "そして桃太郎は鬼の大将に向かって行きました。激しい戦いの末、桃太郎は鬼の大将を倒しました。",
      },
      {
        imagePrompt:
          "床に頭を下げて土下座する鬼の大将と鬼たち。勝利した桃太郎が堂々と立ち、家来たちがその横に誇らしげに並んでいる。鬼たちの前には金銀財宝、布、米俵など盗んだ宝物が山と積まれている。鬼たちは恐れと後悔の表情を浮かべている。桃太郎の表情は厳しいながらも慈悲深さを感じさせる。",
        text: "「もう悪いことはしません。命だけはお助けください」と鬼たちは降参しました。そして村から盗んだ宝物をすべて差し出しました。",
      },
      {
        imagePrompt:
          "村に凱旋する桃太郎と家来たち。宝物を運ぶ犬、猿、キジ。桃太郎は誇らしげに村人たちに手を振っている。老若男女の村人たちが道の両側に集まり、喜びの表情で花や旗を振って迎えている。おじいさんとおばあさんも最前列で涙を流しながら桃太郎の帰りを待っている。春の明るい日差しが村全体を照らしている。",
        text: "桃太郎と家来たちは宝物を持って村に帰りました。村人たちは大喜びで彼らを迎えました。",
      },
      {
        imagePrompt:
          "家の前でおじいさんとおばあさんが桃太郎を抱きしめている感動的な場面。喜びの涙を流すおじいさんとおばあさん。犬、猿、キジも幸せそうに見守っている。周りには村人たちが集まり、祝福している。家の前には宝物の一部が置かれ、背景には平和な村の風景が広がっている。夕日が温かな光を投げかけ、晴れやかな雰囲気を作り出している。",
        text: "おじいさんとおばあさんは桃太郎の無事な帰りを喜び、抱きしめました。そして村はもう二度と鬼に襲われることはありませんでした。",
      },
      {
        imagePrompt:
          "時が経ち、平和になった村の風景。桃太郎の家では、おじいさんとおばあさんが縁側でお茶を飲んでいる。庭では成長した桃太郎が犬、猿、キジと一緒に楽しそうに過ごしている。背景には実りある田んぼと平和な村の様子。桃の木が花を咲かせ、その下で皆が笑顔で暮らしている。夕暮れの優しい光が全体を包み込み、物語の幸せな結末を象徴している。",
        text: "こうして桃太郎とおじいさんとおばあさん、そして家来たちは幸せに暮らしました。めでたし、めでたし。",
      },
    ],
    filename: "children_book",
    lang: "ja",
    title: "桃太郎",
  },
  {
    $mulmocast: {
      credit: "closing",
      version: "1.1",
    },
    beats: [
      {
        image: {
          slide: {
            title: "This is the title of the presentation",
          },
          type: "textSlide",
        },
        text: "This is a slide, which just displays the title of this presentation.",
      },
      {
        image: {
          slide: {
            subtitle: "Tom Johnson",
            title: "This is the title of the presentation",
          },
          type: "textSlide",
        },
        text: "This is ta slide, which just displays the title and the presenter's name of this presentation.",
      },
      {
        image: {
          markdown: "# Markdown Table Example\n```TypeScript\nconst main = () => {\n  console.log('Hello World')\n}\n```",
          type: "markdown",
        },
        text: "Here is the sample code",
      },
      {
        image: {
          markdown:
            "# Hello World in two languages\n" +
            '<div style="display: flex; gap: 16px;">\n' +
            "  <pre>// JavaScript example\n" +
            "function greet(name) {\n" +
            "  console.log(`Hello, ${name}!`);\n" +
            "}\n" +
            'greet("World");\n' +
            "</pre>\n" +
            "\n" +
            "  <pre># Python example\n" +
            "def greet(name):\n" +
            '    print(f"Hello, {name}!")\n' +
            "\n" +
            'greet("World")\n' +
            "</pre>\n" +
            "</div>",
          type: "markdown",
        },
        text: "Here is two sets of code, side by side",
      },
      {
        image: {
          slide: {
            bullets: [
              "Early Primates",
              "Hominids and Hominins",
              "Australopithecus",
              "Genus Homo Emerges",
              "Homo erectus and Migration",
              "Neanderthals and Other Archaic Humans",
              "Homo sapiens",
            ],
            title: "Human Evolution",
          },
          type: "textSlide",
        },
        text: "The evolution of humans is a complex journey that spans millions of years, shaped by biology, environment, and culture. Here's a high-level summary of the key stages in human evolution",
      },
      {
        image: {
          markdown: [
            "# Markdown Table Example",
            "| Item              | In Stock | Price |",
            "| :---------------- | :------: | ----: |",
            "| Python Hat        |   True   | 23.99 |",
            "| SQL Hat           |   True   | 23.99 |",
            "| Codecademy Tee    |  False   | 19.99 |",
            "| Codecademy Hoodie |  False   | 42.99 |",
          ],
          type: "markdown",
        },
        text: "This table shows the items in the store.",
      },
      {
        image: {
          code: {
            kind: "text",
            text:
              "graph LR\n" +
              "    A[Market Research] --> B[Product Planning]\n" +
              "    B --> C[Development]\n" +
              "    C --> D[Testing]\n" +
              "    D --> E[Manufacturing]\n" +
              "    E --> F[Marketing]\n" +
              "    F --> G[Sales]\n" +
              "    G --> H[Customer Support]\n" +
              "    H --> A",
          },
          title: "Business Process Flow",
          type: "mermaid",
        },
        text: "Next, let's look at a diagram of our business process flow. This illustrates the key steps from product development to sales.",
      },
      {
        image: {
          chartData: {
            data: {
              datasets: [
                {
                  backgroundColor: "rgba(54, 162, 235, 0.5)",
                  borderColor: "rgba(54, 162, 235, 1)",
                  borderWidth: 1,
                  data: [120, 135, 180, 155, 170, 190],
                  label: "Revenue ($1000s)",
                },
                {
                  backgroundColor: "rgba(75, 192, 192, 0.5)",
                  borderColor: "rgba(75, 192, 192, 1)",
                  borderWidth: 1,
                  data: [45, 52, 68, 53, 61, 73],
                  label: "Profit ($1000s)",
                },
              ],
              labels: ["January", "February", "March", "April", "May", "June"],
            },
            options: {
              animation: false,
              responsive: true,
            },
            type: "bar",
          },
          title: "Sales and Profits (from Jan to June)",
          type: "chart",
        },
        text: "This page shows the sales and profits of this company from January 2024 to June 2024.",
      },
      {
        image: {
          source: {
            kind: "url",
            url: "https://satoshi.blogs.com/mag2/May2025/ghibli0.png",
          },
          type: "image",
        },
        text: "This is the image of a high school girl in Harajuku.",
      },
    ],
    filename: "coding",
    lang: "en",
    title: "Sample Title",
  },
  {
    $mulmocast: {
      credit: "closing",
      version: "1.1",
    },
    beats: [
      {
        htmlPrompt: {
          prompt: "[PROMPT to create appropriate HTML page for the beat.]",
        },
        text: "[NARRATION: Narration for the beat.]",
      },
      {
        htmlPrompt: {
          data: {
            description: "DATA TO BE PRESENTED IN THIS BEAT (in any format)]",
            net_income: {
              "Q2 FY2024": 320,
              "Q3 FY2024": 333,
              "Q4 FY2024": 350,
            },
            unit: "USD (Million)",
          },
          prompt: "[PROMPT to create appropriate HTML page for the beat with the data.]",
        },
        text: "[NARRATION: Narration for the beat.]",
      },
    ],
    filename: "html",
    htmlImageParams: {
      model: "claude-3-7-sonnet-20250219",
      provider: "anthropic",
    },
    lang: "en",
    references: [
      {
        title: "Title of the article we are referencing",
        type: "[TYPE OF ARTICLE: article, paper, image, video, audio]",
        url: "https://www.somegreatwebsite.com/article/123",
      },
    ],
    title: "[TITLE: Brief, engaging title for the topic]",
  },
  {
    $mulmocast: {
      credit: "closing",
      version: "1.1",
    },
    beats: [
      {
        imagePrompt: "[IMAGE_PROMPT: A prompt for the image to be generated for this beat.]",
      },
      {
        imagePrompt: "[IMAGE_PROMPT: A prompt for the image to be generated for this beat.]",
      },
      {
        imagePrompt: "[IMAGE_PROMPT: A prompt for the image to be generated for this beat.]",
      },
      {
        imagePrompt: "[IMAGE_PROMPT: A prompt for the image to be generated for this beat.]",
      },
      {
        imagePrompt: "[IMAGE_PROMPT: A prompt for the image to be generated for this beat.]",
      },
      {
        imagePrompt: "[IMAGE_PROMPT: A prompt for the image to be generated for this beat.]",
      },
    ],
    filename: "image_prompt_only_template",
    lang: "en",
    title: "[TITLE: Brief, engaging title for the topic]",
  },
  {
    $mulmocast: {
      credit: "closing",
      version: "1.1",
    },
    beats: [
      {
        imagePrompt: "[IMAGE_PROMPT: A prompt for the image to be generated for this beat.]",
        text: "[OPENING_BEAT: Introduce the topic with a hook. Reference the source material and set up why this topic matters. Usually 2-3 sentences that grab attention and provide context.]",
      },
      {
        imagePrompt: "[IMAGE_PROMPT: A prompt for the image to be generated for this beat.]",
        text: "[MAIN_CONCEPT: Define or explain the core concept/idea. This should be the central focus of your narrative. Keep it clear and accessible.]",
      },
      {
        imagePrompt: "[IMAGE_PROMPT: A prompt for the image to be generated for this beat.]",
        text: "[SUPPORTING_DETAIL_1: Additional context, examples, or elaboration that helps illustrate the main concept. This could include how it works, why it's important, or real-world applications.]",
      },
      {
        imagePrompt: "[IMAGE_PROMPT: A prompt for the image to be generated for this beat.]",
        text: "[SUPPORTING_DETAIL_2: Continue with more examples, deeper explanation, or different aspects of the topic if needed.]",
      },
      {
        imagePrompt: "[IMAGE_PROMPT: A prompt for the image to be generated for this beat.]",
        text: "[ADDITIONAL_BEATS: Add more beats as necessary to fully explore the topic. Complex topics may require 6-10+ beats to cover adequately. Each beat should advance the narrative or provide valuable information.]",
      },
      {
        imagePrompt: "[IMAGE_PROMPT: A prompt for the image to be generated for this beat.]",
        text: "[CONCLUSION/IMPACT: Wrap up with the significance, implications, or key takeaway. Help the audience understand why this matters to them.]",
      },
    ],
    filename: "image_prompts_template",
    lang: "en",
    references: [
      {
        title: "[SOURCE_TITLE: Title of the referenced article, or paper]",
        type: "[SOURCE_TYPE: article, paper]",
        url: "[SOURCE_URL: URL of the source material]",
      },
    ],
    title: "[TITLE: Brief, engaging title for the topic]",
  },
  {
    $mulmocast: {
      version: "1.1",
    },
    beats: [
      {
        imageNames: ["[CHARACTER_ID_1]", "[CHARACTER_ID_2]"],
        imagePrompt: "[IMAGE PROMPT FOR THIS BEAT (with both characters)]",
        text: "[NARRATION FOR THIS BEAT]",
      },
      {
        imageNames: ["[CHARACTER_ID_1]"],
        imagePrompt: "[IMAGE PROMPT FOR THIS BEAT (only character 1)]",
        text: "[NARRATION FOR THIS BEAT]",
      },
      {
        imageNames: [],
        imagePrompt: "[IMAGE PROMPT FOR THIS BEAT (no character)]",
        text: "[NARRATION FOR THIS BEAT]",
      },
    ],
    filename: "image_refs",
    imageParams: {
      images: {
        "[CHARACTER_ID_1]": {
          prompt: "[IMAGE PROMPT FOR THIS CHARACTER]",
          type: "imagePrompt",
        },
        "[CHARACTER_ID_2]": {
          prompt: "[IMAGE PROMPT FOR THIS CHARACTER]",
          type: "imagePrompt",
        },
      },
    },
    lang: "en",
    title: "[TITLE OF THE PRESENTAITON OR STORY]",
  },
  {
    $mulmocast: {
      credit: "closing",
      version: "1.1",
    },
    beats: [
      {
        duration: 5,
        imagePrompt: "[IMAGE_PROMPT: A prompt for the image to be generated for this beat.]",
        moviePrompt: "[MOVIE_PROMPT: A movie prompt for that image.]",
      },
      {
        duration: 5,
        imagePrompt: "[IMAGE_PROMPT: A prompt for the image to be generated for this beat.]",
        moviePrompt: "[MOVIE_PROMPT: A movie prompt for that image.]",
      },
      {
        duration: 5,
        imagePrompt: "[IMAGE_PROMPT: A prompt for the image to be generated for this beat.]",
        moviePrompt: "[MOVIE_PROMPT: A movie prompt for that image.]",
      },
      {
        duration: 5,
        imagePrompt: "[IMAGE_PROMPT: A prompt for the image to be generated for this beat.]",
        moviePrompt: "[MOVIE_PROMPT: A movie prompt for that image.]",
      },
      {
        duration: 5,
        imagePrompt: "[IMAGE_PROMPT: A prompt for the image to be generated for this beat.]",
        moviePrompt: "[MOVIE_PROMPT: A movie prompt for that image.]",
      },
      {
        duration: 5,
        imagePrompt: "[IMAGE_PROMPT: A prompt for the image to be generated for this beat.]",
        moviePrompt: "[MOVIE_PROMPT: A movie prompt for that image.]",
      },
    ],
    filename: "movie_prompts_no_text_template",
    lang: "en",
    movieParams: {
      provider: "google",
    },
    references: [
      {
        title: "[SOURCE_TITLE: Title of the referenced article, or paper]",
        type: "[SOURCE_TYPE: article, paper]",
        url: "[SOURCE_URL: URL of the source material]",
      },
    ],
    title: "[TITLE: Brief, engaging title for the topic]",
  },
  {
    $mulmocast: {
      credit: "closing",
      version: "1.1",
    },
    beats: [
      {
        imagePrompt: "[IMAGE_PROMPT: A prompt for the image to be generated for this beat.]",
        moviePrompt: "[MOVIE_PROMPT: A movie prompt for that image.]",
        text: "[OPENING_BEAT: Introduce the topic with a hook. Reference the source material and set up why this topic matters. Usually 2-3 sentences that grab attention and provide context.]",
      },
      {
        imagePrompt: "[IMAGE_PROMPT: A prompt for the image to be generated for this beat.]",
        moviePrompt: "[MOVIE_PROMPT: A movie prompt for that image.]",
        text: "[MAIN_CONCEPT: Define or explain the core concept/idea. This should be the central focus of your narrative. Keep it clear and accessible.]",
      },
      {
        imagePrompt: "[IMAGE_PROMPT: A prompt for the image to be generated for this beat.]",
        moviePrompt: "[MOVIE_PROMPT: A movie prompt for that image.]",
        text: "[SUPPORTING_DETAIL_1: Additional context, examples, or elaboration that helps illustrate the main concept. This could include how it works, why it's important, or real-world applications.]",
      },
      {
        imagePrompt: "[IMAGE_PROMPT: A prompt for the image to be generated for this beat.]",
        moviePrompt: "[MOVIE_PROMPT: A movie prompt for that image.]",
        text: "[SUPPORTING_DETAIL_2: Continue with more examples, deeper explanation, or different aspects of the topic if needed.]",
      },
      {
        imagePrompt: "[IMAGE_PROMPT: A prompt for the image to be generated for this beat.]",
        moviePrompt: "[MOVIE_PROMPT: A movie prompt for that image.]",
        text: "[ADDITIONAL_BEATS: Add more beats as necessary to fully explore the topic. Complex topics may require 6-10+ beats to cover adequately. Each beat should advance the narrative or provide valuable information.]",
      },
      {
        imagePrompt: "[IMAGE_PROMPT: A prompt for the image to be generated for this beat.]",
        moviePrompt: "[MOVIE_PROMPT: A movie prompt for that image.]",
        text: "[CONCLUSION/IMPACT: Wrap up with the significance, implications, or key takeaway. Help the audience understand why this matters to them.]",
      },
    ],
    filename: "movie_prompts_template",
    lang: "en",
    movieParams: {
      provider: "google",
    },
    references: [
      {
        title: "[SOURCE_TITLE: Title of the referenced article, or paper]",
        type: "[SOURCE_TYPE: article, paper]",
        url: "[SOURCE_URL: URL of the source material]",
      },
    ],
    title: "[TITLE: Brief, engaging title for the topic]",
  },
  {
    $mulmocast: {
      credit: "closing",
      version: "1.1",
    },
    beats: [
      {
        htmlPrompt: {
          prompt:
            "Create a clean and bold title slide featuring the original name 'AirBed & Breakfast' with the tagline: 'Book rooms with locals, not hotels'. Include the old logo and a travel-themed background.",
        },
        speaker: "Presenter",
        text: "Book rooms with locals, not hotels.",
      },
      {
        htmlPrompt: {
          prompt:
            "Design a slide that lists the main problems with hotels: high prices, lack of personality, and cultural disconnection. Use simple icons for cost, generic room, and traveler.",
        },
        speaker: "Presenter",
        text: "Hotels are expensive and detached from local culture.",
      },
      {
        htmlPrompt: {
          prompt:
            "Illustrate Airbnb's solution: locals listing their spare rooms or homes, travelers booking directly, and both benefiting. Use a flow diagram to represent this.",
        },
        speaker: "Presenter",
        text: "Airbnb lets people rent out their spaces, offering affordable, authentic experiences.",
      },
      {
        htmlPrompt: {
          prompt:
            "Show a bar graph comparing Craigslist listings, Couchsurfing users, and early Airbnb listings to demonstrate existing demand and opportunity.",
        },
        speaker: "Presenter",
        text: "Craigslist and Couchsurfing prove the demand for alternative lodging.",
      },
      {
        htmlPrompt: {
          prompt: "Visualize the global travel booking market. Use a world map and large numbers to emphasize the size and growth potential.",
        },
        speaker: "Presenter",
        text: "A massive market: over 630 million travel bookings annually.",
      },
      {
        htmlPrompt: {
          prompt: "Create a product overview slide showing how the platform works from host listing to guest review. Highlight simplicity and trust.",
        },
        speaker: "Presenter",
        text: "Our platform enables hosts to list once and earn; guests search, book, and review.",
      },
      {
        htmlPrompt: {
          prompt:
            "Display a slide with the monetization strategy—Airbnb earns through a 10% commission. Use a simple pie chart or booking flow with fee annotation.",
        },
        speaker: "Presenter",
        text: "We charge a 10% commission per booking.",
      },
      {
        htmlPrompt: {
          prompt: "Design a comparison table: price, uniqueness, trust, scalability. Airbnb should clearly stand out on all dimensions.",
        },
        speaker: "Presenter",
        text: "Competitors include hotels, Craigslist, Couchsurfing — we offer a better, scalable solution.",
      },
      {
        htmlPrompt: {
          prompt: "List Airbnb’s competitive advantages using 6 icons or badges, one for each feature.",
        },
        speaker: "Presenter",
        text: "Key advantages: lower price, wide selection, ease of use, host incentives, trusted system.",
      },
      {
        htmlPrompt: {
          prompt: "Introduce the founding team with photos and brief bios. Highlight their roles and strengths in product, marketing, and tech.",
        },
        speaker: "Presenter",
        text: "Founders: Brian Chesky (Design), Joe Gebbia (Marketing), Nathan Blecharczyk (Engineering).",
      },
      {
        htmlPrompt: {
          prompt: "Showcase media recognition. Include TechCrunch logo and SXSW quotes or metrics. This adds credibility and traction.",
        },
        speaker: "Presenter",
        text: "Media buzz: featured on TechCrunch and buzz from SXSW.",
      },
      {
        htmlPrompt: {
          prompt: "Add 2–3 short testimonials from early users (guests and hosts), displayed in speech bubbles with faces or usernames.",
        },
        speaker: "Presenter",
        text: "Early users love the authentic and affordable experiences.",
      },
      {
        htmlPrompt: {
          data: {
            ask: 600000,
            duration_months: 12,
            target_bookings: 80000,
            target_revenue: 2000000,
            use_of_funds: {
              marketing: 40,
              operations: 30,
              product: 30,
            },
          },
          prompt: "Closing investment slide. Include fund usage (pie chart: 40% marketing, 30% product, 30% ops), and KPIs: 80K bookings, $2M revenue.",
        },
        speaker: "Presenter",
        text: "We’re raising $600K to support 12 months of growth and reach 80K bookings with $2M in revenue.",
      },
    ],
    filename: "presentation",
    htmlImageParams: {
      model: "claude-3-7-sonnet-20250219",
      provider: "anthropic",
    },
    lang: "en",
    references: [
      {
        title: "Title of the article we are referencing",
        type: "article",
        url: "https://www.somegreatwebsite.com/article/123",
      },
    ],
    title: "Sample Title",
  },
  {
    $mulmocast: {
      credit: "closing",
      version: "1.1",
    },
    beats: [
      {
        imagePrompt:
          "A classroom setting with a curious Japanese student (Taro) and a kind teacher. Calm atmosphere, early morning light coming through the window.",
        speaker: "Announcer",
        text: "今日は、韓国で起きた戒厳令について、太郎くんが先生に聞きます。",
      },
      {
        imagePrompt:
          "The student (Taro) sitting at his desk with a serious expression, raising his hand to ask a question. Teacher is slightly surprised but attentive.",
        speaker: "Student",
        text: "先生、今日は韓国で起きた戒厳令のことを教えてもらえますか？",
      },
      {
        imagePrompt: "TV screen showing a breaking news headline in Korean: 'President Declares Martial Law'. Students watching with concern.",
        speaker: "Teacher",
        text: "もちろんだよ、太郎くん。韓国で最近、大統領が「戒厳令」っていうのを突然宣言したんだ。",
      },
      {
        imagePrompt: "A close-up of the student's puzzled face, with a speech bubble saying '戒厳令って？'",
        speaker: "Student",
        text: "戒厳令ってなんですか？",
      },
      {
        imagePrompt:
          "Illustration of soldiers standing in the street, people being stopped and questioned, with a red 'X' on a protest sign. Moody and serious tone.",
        speaker: "Teacher",
        text: "簡単に言うと、国がすごく危ない状態にあるとき、軍隊を使って人々の自由を制限するためのものなんだ。",
      },
      {
        imagePrompt: "Student looking anxious, thinking deeply. Background shows a shadowy image of a politician giving orders to the military.",
        speaker: "Student",
        text: "それって怖いですね。なんでそんなことをしたんですか？",
      },
      {
        imagePrompt: "A tense scene of military personnel entering a national assembly building in Korea, lawmakers looking shocked and resisting.",
        speaker: "Teacher",
        text: "大統領は「国会がうまく機能していないから」と言っていたけど…",
      },
      {
        imagePrompt:
          "The student reacts with shock, comic-style expression with wide eyes and open mouth. Background fades into a dramatic courtroom or parliament chaos.",
        speaker: "Student",
        text: "ええっ！？国会議員を捕まえようとするなんて、すごく危ないことじゃないですか。",
      },
      {
        imagePrompt: "Dark visual of a locked parliament building with soldiers blocking the entrance, ominous sky in the background.",
        speaker: "Teacher",
        text: "その通りだよ。もし軍隊が国会を占拠していたら…",
      },
      {
        imagePrompt: "Student leans forward, curious and worried. Background shows a hopeful scene of people holding protest signs with candles at night.",
        speaker: "Student",
        text: "韓国ではどうなったんですか？",
      },
      {
        imagePrompt: "Peaceful protest scene in Seoul, citizens holding candles and banners, united. Hopeful tone.",
        speaker: "Teacher",
        text: "幸い、野党の議員や市民たちが急いで集まって抗議して…",
      },
      {
        imagePrompt: "Student looking toward the Japanese flag outside the school window, pensive mood.",
        speaker: "Student",
        text: "それは大変なことですね…。日本ではそんなこと起きないんですか？",
      },
      {
        imagePrompt: "Teacher pointing to a newspaper headline: '緊急事態条項の議論進む'. Classroom chalkboard shows a map of Korea and Japan.",
        speaker: "Teacher",
        text: "実はね、今、日本でも似たような話があるんだよ。",
      },
      {
        imagePrompt: "Split screen image: left side shows a soldier in Korea, right side shows a suited Japanese politician giving a press conference.",
        speaker: "Student",
        text: "緊急事態宣言って、韓国の戒厳令と同じようなものなんですか？",
      },
      {
        imagePrompt: "Diagram-style visual showing the flow of emergency powers from PM to local governments. Simple, clean infographic style.",
        speaker: "Teacher",
        text: "似ている部分があるね。たとえば、総理大臣が…",
      },
      {
        imagePrompt: "Student's concerned expression, behind him a blurry image of a street with emergency sirens glowing in red.",
        speaker: "Student",
        text: "それって便利そうですけど、なんだか心配です。",
      },
      {
        imagePrompt: "Illustration of a balance scale: one side is 'freedom', the other 'security'. The scale is slightly tilting.",
        speaker: "Teacher",
        text: "そうだね。もちろん、緊急時には素早い対応が必要だけど…",
      },
      {
        imagePrompt: "Student imagining a military tank next to the Japanese parliament, shown as a thought bubble.",
        speaker: "Student",
        text: "韓国みたいに、軍隊が政治に口を出してくることもあり得るんですか？",
      },
      {
        imagePrompt: "Japanese citizens reading newspapers and watching news with concerned faces, civic awareness growing.",
        speaker: "Teacher",
        text: "完全にあり得ないとは言えないからこそ、注意が必要なんだ。",
      },
      {
        imagePrompt: "The student bows slightly to the teacher with a grateful expression. The classroom is peaceful again.",
        speaker: "Student",
        text: "ありがとうございます。とても良い勉強になりました。",
      },
      {
        imagePrompt: "Ending screen with soft background music, showing the show's logo and a thank-you message in Japanese.",
        speaker: "Announcer",
        text: "ご視聴、ありがとうございました。次回の放送もお楽しみに。",
      },
    ],
    description: "韓国で最近発令された戒厳令とその可能性のある影響について、また日本の憲法に関する考慮事項との類似点を含めた洞察に満ちた議論。",
    filename: "sensei_and_taro",
    lang: "ja",
    title: "韓国の戒厳令とその日本への影響",
  },
  {
    $mulmocast: {
      version: "1.1",
    },
    beats: [
      {
        imagePrompt: "[IMAGE_PROMPT: A prompt for the image to be generated for this beat.]",
        moviePrompt: "[MOVIE_PROMPT: A movie prompt for that image.]",
        text: "[NARRATION: Short narration for the beat. Up to 20 words]",
      },
      {
        imagePrompt: "[IMAGE_PROMPT: A prompt for the image to be generated for this beat.]",
        moviePrompt: "[MOVIE_PROMPT: A movie prompt for that image.]",
        text: "[NARRATION: Short narration for the beat. Up to 20 words]",
      },
      {
        imagePrompt: "[IMAGE_PROMPT: A prompt for the image to be generated for this beat.]",
        moviePrompt: "[MOVIE_PROMPT: A movie prompt for that image.]",
        text: "[NARRATION: Short narration for the beat. Up to 20 words]",
      },
      {
        imagePrompt: "[IMAGE_PROMPT: A prompt for the image to be generated for this beat.]",
        moviePrompt: "[MOVIE_PROMPT: A movie prompt for that image.]",
        text: "[NARRATION: Short narration for the beat. Up to 20 words]",
      },
      {
        imagePrompt: "[IMAGE_PROMPT: A prompt for the image to be generated for this beat.]",
        moviePrompt: "[MOVIE_PROMPT: A movie prompt for that image.]",
        text: "[NARRATION: Short narration for the beat. Up to 20 words]",
      },
      {
        imagePrompt: "[IMAGE_PROMPT: A prompt for the image to be generated for this beat.]",
        moviePrompt: "[MOVIE_PROMPT: A movie prompt for that image.]",
        text: "[NARRATION: Short narration for the beat. Up to 20 words]",
      },
      {
        imagePrompt: "[IMAGE_PROMPT: A prompt for the image to be generated for this beat.]",
        moviePrompt: "[MOVIE_PROMPT: A movie prompt for that image.]",
        text: "[NARRATION: Short narration for the beat. Up to 20 words]",
      },
      {
        imagePrompt: "[IMAGE_PROMPT: A prompt for the image to be generated for this beat.]",
        moviePrompt: "[MOVIE_PROMPT: A movie prompt for that image.]",
        text: "[NARRATION: Short narration for the beat. Up to 20 words]",
      },
    ],
    filename: "shorts_template",
    lang: "en",
    movieParams: {
      provider: "google",
    },
    title: "[TITLE: Brief, engaging title for the topic]",
  },
  {
    $mulmocast: {
      credit: "closing",
      version: "1.1",
    },
    beats: [
      {
        imageNames: ["[CHARACTER_ID_1]", "[CHARACTER_ID_2]"],
        imagePrompt: "[IMAGE_PROMPT FOR THIS BEAT with both characters]",
        text: "[STORY TEXT FOR THIS BEAT FOR THIS BEAT]",
      },
      {
        imageNames: ["[CHARACTER_ID_1]"],
        imagePrompt: "[IMAGE_PROMPT FOR THIS BEAT with a single character]",
        text: "[STORY TEXT FOR THIS BEAT FOR THIS BEAT]",
      },
      {
        imageNames: ["[CHARACTER_ID_2]"],
        imagePrompt: "[IMAGE_PROMPT FOR THIS BEAT with another character]",
        text: "[STORY TEXT FOR THIS BEAT FOR THIS BEAT]",
      },
    ],
    filename: "story_with_characters",
    lang: "en",
    title: "[TITLE: Brief, engaging title for the topic]",
  },
  {
    $mulmocast: {
      credit: "closing",
      version: "1.1",
    },
    beats: [
      {
        text: "[OPENING_BEAT: Introduce the topic with a hook. Reference the source material and set up why this topic matters. Usually 2-3 sentences that grab attention and provide context.]",
      },
      {
        text: "[MAIN_CONCEPT: Define or explain the core concept/idea. This should be the central focus of your narrative. Keep it clear and accessible.]",
      },
      {
        text: "[SUPPORTING_DETAIL_1: Additional context, examples, or elaboration that helps illustrate the main concept. This could include how it works, why it's important, or real-world applications.]",
      },
      {
        text: "[SUPPORTING_DETAIL_2: Continue with more examples, deeper explanation, or different aspects of the topic if needed.]",
      },
      {
        text: "[ADDITIONAL_BEATS: Add more beats as necessary to fully explore the topic. Complex topics may require 6-10+ beats to cover adequately. Each beat should advance the narrative or provide valuable information.]",
      },
      {
        text: "[CONCLUSION/IMPACT: Wrap up with the significance, implications, or key takeaway. Help the audience understand why this matters to them.]",
      },
    ],
    filename: "text_only_template",
    lang: "en",
    references: [
      {
        title: "[SOURCE_TITLE: Title of the referenced article, or paper]",
        type: "[SOURCE_TYPE: article, paper]",
        url: "[SOURCE_URL: URL of the source material]",
      },
    ],
    title: "[TITLE: Brief, engaging title for the topic]",
  },
  {
    $mulmocast: {
      version: "1.1",
    },
    beats: [
      {
        image: {
          data: {
            heading: "How AI Is Reshaping Referencing",
            subheading: "From sources to systems: reliability, traceability, and credit in the age of models",
          },
          style: "sectionDividerPage",
          type: "vision",
        },
        text: "sectionDividerPage",
      },
      {
        image: {
          data: {
            items: [
              "Executive summary",
              "Reference reliability and hallucinations",
              "Attribution and credit in AI workflows",
              "Standards & compliance (academia, journalism, law)",
              "Roadmap & recommendations",
            ],
            title: "Agenda",
          },
          style: "agendaPage",
          type: "vision",
        },
        text: "agendaPage",
      },
      {
        image: {
          data: {
            bullets: [
              "AI accelerates discovery but introduces novel risks in citation accuracy and provenance.",
              "RAG and structured retrieval reduce hallucinations when sources are governed and auditable.",
              "Attribution standards are emerging; early adoption lowers legal and reputational exposure.",
              "Watermarking and signed citations enable verifiable chains of reference.",
              "Organizations need policy, training, and tooling to ensure traceable, compliant referencing.",
            ],
            title: "Executive Summary",
          },
          style: "executiveSummaryPage",
          type: "vision",
        },
        text: "executiveSummaryPage",
      },
      {
        image: {
          data: {
            headline: "Trustworthy referencing is a prerequisite for AI at scale.",
            supports: [
              "Stakeholders require verifiable provenance for critical decisions.",
              "Standards (e.g., citations, licensing) are uneven across industries.",
              "Tooling gaps persist between LLM outputs and enterprise compliance systems.",
            ],
          },
          style: "keyMessageWithSupportsPage",
          type: "vision",
        },
        text: "keyMessageWithSupportsPage",
      },
      {
        image: {
          data: {
            hypothesis: "Firms that implement verifiable AI referencing will reduce risk and accelerate adoption.",
            implications: [
              "Lower legal exposure on copyright and misinformation claims.",
              "Faster audit cycles through machine-readable provenance.",
              "Higher user confidence and usage in knowledge-heavy workflows.",
            ],
            nextSteps: [
              "Deploy governed retrieval with source whitelists.",
              "Adopt signed citations and immutable logs for high-stakes outputs.",
              "Train users on prompt patterns that preserve attribution.",
            ],
          },
          style: "hypothesisPage",
          type: "vision",
        },
        text: "hypothesisPage",
      },
      {
        image: {
          data: {
            branches: [
              ["Provenance capture", "Source governance", "Traceability"],
              ["Legal & licensing", "Attribution norms", "Fair use boundaries"],
              ["User behavior", "Training & prompts", "Review workflows"],
            ],
            rootIssue: "How to ensure accurate, compliant AI referencing?",
          },
          style: "issueTreePage",
          type: "vision",
        },
        text: "issueTreePage",
      },
      {
        image: {
          data: {
            drivers: [
              ["Governed corpus coverage", "Retriever quality", "Index freshness"],
              ["Citation rendering logic", "Signed-source support", "Reviewer adherence"],
              ["User prompt hygiene", "Auto-evidence insertion", "UI nudges"],
            ],
            metric: "Reference accuracy rate (%)",
          },
          style: "driverTreePage",
          type: "vision",
        },
        text: "driverTreePage",
      },
      {
        image: {
          data: {
            groups: [
              {
                items: ["Hallucinations", "Retriever gaps", "Version drift"],
                label: "Technical",
              },
              {
                items: ["Copyright", "Licensing", "Privacy & PII"],
                label: "Legal",
              },
              {
                items: ["Review latency", "Policy ambiguity", "Training gaps"],
                label: "Operational",
              },
            ],
            title: "MECE: Reference Risk Areas",
          },
          style: "meceListPage",
          type: "vision",
        },
        text: "meceListPage",
      },
      {
        image: {
          data: {
            details: [
              ["Use source whitelists", "Track doc versions", "Sign evidence blobs"],
              ["Expose citations in UI", "Link to canonical sources", "Store prompts & context"],
              ["Automate QA sampling", "Monitor reference KPIs", "Escalate anomalies"],
            ],
            keyMessage: "Verifiable references unlock safe, scalable AI adoption.",
            supports: ["Reduces legal and reputational risk", "Improves stakeholder confidence", "Shortens audit cycles"],
          },
          style: "pyramidPrinciplePage",
          type: "vision",
        },
        text: "pyramidPrinciplePage",
      },
      {
        image: {
          data: {
            answer: "Standardize governed retrieval, signed citations, and review workflows integrated into authoring tools.",
            complication: "AI can misattribute or fabricate sources, risking credibility and compliance.",
            question: "How can we ensure references are accurate, traceable, and compliant?",
            situation: "Teams increasingly rely on AI to synthesize knowledge and draft outputs.",
          },
          style: "scqaPage",
          type: "vision",
        },
        text: "scqaPage",
      },
      {
        image: {
          data: {
            opportunities: ["New evidence UX", "Standardized attribution", "Automated audits"],
            strengths: ["Speed of synthesis", "Scalable drafting", "Broad corpus reach"],
            threats: ["Regulatory fines", "Misinformation", "IP disputes"],
            weaknesses: ["Hallucinations", "Opaque provenance", "Reviewer overload"],
          },
          style: "swotPage",
          type: "vision",
        },
        text: "swotPage",
      },
      {
        image: {
          data: {
            company: ["Commit to verifiable AI outputs", "Invest in governed retrieval"],
            competitor: ["Adopting reference-safe workflows", "Marketing 'trust' as a differentiator"],
            customer: ["Needs trustworthy citations", "Wants explorable sources"],
          },
          style: "threeCPage",
          type: "vision",
        },
        text: "threeCPage",
      },
      {
        image: {
          data: {
            place: ["Browser extension", "Docs add-in", "APIs"],
            price: ["Tiered by audit features", "Enterprise compliance add-ons"],
            product: ["Reference-safe AI assistant", "Evidence panel", "Citation export"],
            promotion: ["Risk reduction ROI", "Case studies", "Compliance partnerships"],
          },
          style: "fourPPage",
          type: "vision",
        },
        text: "fourPPage",
      },
      {
        image: {
          data: {
            sharedValues: "Truth, transparency, accountability",
            skills: "Prompting, retrieval tuning, compliance literacy",
            staff: "Knowledge stewards, AI librarians, compliance reviewers",
            strategy: "Make 'trustworthy references' a core AI value prop",
            structure: "Central knowledge governance with federated champions",
            style: "Evidence-first culture",
            systems: "RAG, signing, audit logs integrated in content tools",
          },
          style: "sevenSPage",
          type: "vision",
        },
        text: "sevenSPage",
      },
      {
        image: {
          data: {
            primary: ["Ingestion", "Indexing", "Retrieval", "Generation", "Review", "Publication"],
            support: ["Governance", "Security", "Compliance", "Training", "Monitoring"],
          },
          style: "valueChainPage",
          type: "vision",
        },
        text: "valueChainPage",
      },
      {
        image: {
          data: {
            buyers: ["Enterprises", "Universities", "Newsrooms"],
            newEntrants: ["AI-first doc tools", "Verification startups"],
            rivalry: ["Platform ecosystems", "Vertical specialists"],
            substitutes: ["Manual research", "Traditional search-only"],
            suppliers: ["Model providers", "Content licensors"],
          },
          style: "porterFiveForcesPage",
          type: "vision",
        },
        text: "porterFiveForcesPage",
      },
      {
        image: {
          data: {
            blocks: {
              "Cost Structure": ["Compute", "Licenses", "Review ops"],
              "Customer Relationships": ["Embedded in workflows", "SLAs"],
              "Customer Segments": ["Legal", "Research", "Editorial"],
              "Key Activities": ["Indexing", "Retrieval", "Signing", "QA"],
              "Key Partners": ["Model vendors", "Content platforms", "Auditors"],
              "Key Resources": ["Curated corpora", "Embeddings index", "Audit logs"],
              "Revenue Streams": ["Seats", "Usage", "Compliance tier"],
              "Value Propositions": ["Trustworthy AI outputs", "Time saved", "Reduced risk"],
              Channels: ["Add-ins", "APIs", "Marketplace"],
            },
          },
          style: "businessModelCanvasPage",
          type: "vision",
        },
        text: "businessModelCanvasPage",
      },
      {
        image: {
          data: {
            stages: ["Discover", "Draft", "Verify", "Publish", "Audit"],
            touchpoints: [
              ["Search UI", "Corpus filters"],
              ["Editor plugin", "Reference panel"],
              ["Reviewer queue", "Signed citations"],
              ["Export formats", "Permalinks"],
              ["Randomized QA", "Dashboards"],
            ],
          },
          style: "customerJourneyPage",
          type: "vision",
        },
        text: "customerJourneyPage",
      },
      {
        image: {
          data: {
            stakeholders: [
              {
                influence: 9,
                interest: 8,
                notes: "Reduce liability",
                style: "Legal",
              },
              {
                influence: 7,
                interest: 9,
                notes: "Protect credibility",
                style: "Editorial",
              },
              {
                influence: 8,
                interest: 7,
                notes: "Build RAG & signing",
                style: "Engineering",
              },
              {
                influence: 6,
                interest: 10,
                notes: "Need clarity & speed",
                style: "End users",
              },
            ],
          },
          style: "stakeholderMapPage",
          type: "vision",
        },
        text: "stakeholderMapPage",
      },
      {
        image: {
          data: {
            assignments: [
              ["A", "R", "C", "I"],
              ["C", "A/R", "I", "I"],
              ["I", "C", "A/R", "I"],
              ["C", "R", "I", "A"],
            ],
            roles: ["Legal", "Engineering", "L&D", "Ops"],
            tasks: ["Define policy", "Implement RAG", "Roll out training", "Monitor KPIs"],
          },
          style: "raciPage",
          type: "vision",
        },
        text: "raciPage",
      },
      {
        image: {
          data: {
            metrics: [
              {
                label: "Reference accuracy",
                status: "On track",
                target: "≥95%",
                value: "97%",
              },
              {
                label: "Signed citation coverage",
                status: "On track",
                target: "≥80%",
                value: "82%",
              },
              {
                label: "Reviewer SLA",
                status: "On track",
                target: "≤6h",
                value: "4h",
              },
            ],
            title: "Reference Quality KPIs",
          },
          style: "okrKpiDashboardPage",
          type: "vision",
        },
        text: "okrKpiDashboardPage",
      },
      {
        image: {
          data: {
            perspectives: [
              {
                items: ["Reduce rework costs", "Avoid penalties"],
                style: "Financial",
              },
              {
                items: ["Trust score ↑", "NPS ↑"],
                style: "Customer",
              },
              {
                items: ["QA automation", "Corpus governance"],
                style: "Internal",
              },
              {
                items: ["Reviewer upskilling", "Prompt playbooks"],
                style: "Learning & Growth",
              },
            ],
          },
          style: "balancedScorecardPage",
          type: "vision",
        },
        text: "balancedScorecardPage",
      },
      {
        image: {
          data: {
            items: [
              {
                label: "Policy & baseline KPIs",
                quarter: "Q1",
              },
              {
                label: "Signed citations rollout",
                quarter: "Q2",
              },
              {
                label: "Reviewer workflow automation",
                quarter: "Q3",
              },
              {
                label: "External audits & certification",
                quarter: "Q4",
              },
            ],
            quarters: ["Q1", "Q2", "Q3", "Q4"],
          },
          style: "quarterlyRoadmapPage",
          type: "vision",
        },
        text: "quarterlyRoadmapPage",
      },
      {
        image: {
          data: {
            milestones: [
              {
                date: "2025-02-01",
                label: "Policy approved",
                notes: "Exec sign-off",
              },
              {
                date: "2025-04-15",
                label: "RAG MVP live",
                notes: "Limited corpus",
              },
              {
                date: "2025-06-30",
                label: "Signed citations",
                notes: "Tier-1 content",
              },
              {
                date: "2025-09-30",
                label: "Audit-ready",
                notes: "Dashboards & sampling",
              },
            ],
            title: "Implementation Timeline",
          },
          style: "milestoneTimelinePage",
          type: "vision",
        },
        text: "milestoneTimelinePage",
      },
      {
        image: {
          data: {
            tasks: [
              {
                end: "2025-02-01",
                start: "2025-01-05",
                style: "Policy drafting",
              },
              {
                end: "2025-04-15",
                start: "2025-02-05",
                style: "RAG build",
              },
              {
                end: "2025-06-30",
                start: "2025-04-01",
                style: "Signing & logs",
              },
              {
                end: "2025-08-01",
                start: "2025-05-15",
                style: "Reviewer ops",
              },
            ],
          },
          style: "ganttSimplePage",
          type: "vision",
        },
        text: "ganttSimplePage",
      },
      {
        image: {
          data: {
            steps: [
              {
                label: "Baseline (manual search)",
                value: 0,
              },
              {
                label: "RAG-enabled drafting",
                value: 120,
              },
              {
                label: "Signed citations",
                value: 160,
              },
              {
                label: "Automated QA",
                value: 190,
              },
            ],
            title: "Time Savings from AI Referencing (hrs/month)",
          },
          style: "waterfallPage",
          type: "vision",
        },
        text: "waterfallPage",
      },
      {
        image: {
          data: {
            stages: [
              {
                label: "Drafts created",
                value: 1000,
              },
              {
                label: "Drafts with citations",
                value: 850,
              },
              {
                label: "Signed citations",
                value: 700,
              },
              {
                label: "Approved & published",
                value: 630,
              },
            ],
          },
          style: "funnelPage",
          type: "vision",
        },
        text: "funnelPage",
      },
      {
        image: {
          data: {
            quadrants: [["Scholarly databases"], ["AI assistants with signing"], ["Raw web search"], ["Legacy manual workflows"]],
            xAxis: "Evidence depth",
            yAxis: "Ease of use",
          },
          style: "twoByTwoMatrixPage",
          type: "vision",
        },
        text: "twoByTwoMatrixPage",
      },
      {
        image: {
          data: {
            cashCows: ["Governed enterprise search"],
            dogs: ["Unverified copy-paste tools"],
            questionMarks: ["Generative browsers"],
            stars: ["Signed-citation AI editors"],
          },
          style: "bcgMatrixPage",
          type: "vision",
        },
        text: "bcgMatrixPage",
      },
      {
        image: {
          data: {
            competitiveStrength: ["Corpus quality", "Model integration", "Compliance features"],
            industryAttractiveness: ["Regulatory clarity", "IP-safe corpora", "Audit tooling"],
            placements: [
              {
                col: 2,
                row: 0,
                style: "Signed AI editor",
              },
              {
                col: 1,
                row: 1,
                style: "Generic chatbot",
              },
              {
                col: 0,
                row: 2,
                style: "Manual search",
              },
            ],
          },
          style: "geMcKinseyMatrixPage",
          type: "vision",
        },
        text: "geMcKinseyMatrixPage",
      },
      {
        image: {
          data: {
            categories: ["Academic", "News", "Internal docs", "Web"],
            title: "Content Types by Share & Effort",
          },
          style: "marimekkoPlaceholderPage",
          type: "vision",
        },
        text: "marimekkoPlaceholderPage",
      },
      {
        image: {
          data: {
            points: [
              {
                label: "Legal memos",
                r: 20,
                x: 8,
                y: 9,
              },
              {
                label: "Blog posts",
                r: 15,
                x: 4,
                y: 5,
              },
              {
                label: "Research briefs",
                r: 18,
                x: 7,
                y: 7,
              },
            ],
            title: "Risk vs Impact vs Adoption",
          },
          style: "bubbleChartPlaceholderPage",
          type: "vision",
        },
        text: "bubbleChartPlaceholderPage",
      },
      {
        image: {
          data: {
            cols: ["Accuracy", "Provenance", "Speed", "Compliance"],
            rows: ["Teams"],
            values: [[8, 7, 9, 6]],
          },
          style: "heatmapPlaceholderPage",
          type: "vision",
        },
        text: "heatmapPlaceholderPage",
      },
      {
        image: {
          data: {
            kpis: [
              {
                delta: "+2pp",
                label: "Reference Accuracy",
                value: "97%",
              },
              {
                delta: "+5pp",
                label: "Signed Coverage",
                value: "82%",
              },
              {
                delta: "-0.4pp",
                label: "Audit Exceptions",
                value: "1.2%",
              },
            ],
            title: "KPI Highlights",
          },
          style: "kpiHighlightPage",
          type: "vision",
        },
        text: "kpiHighlightPage",
      },
      {
        image: {
          data: {
            after: ["Governed retrieval", "Standardized citations", "Signed evidence"],
            before: ["Manual searches", "Inconsistent citations", "Slow audits"],
            title: "Before vs After AI Referencing",
          },
          style: "beforeAfterPage",
          type: "vision",
        },
        text: "beforeAfterPage",
      },
      {
        image: {
          data: {
            criteria: ["Accuracy", "Latency", "Compliance", "Cost"],
            options: ["Generic chatbot", "RAG + signing", "Manual review"],
            scores: [
              [5, 7, 9, 6],
              [8, 7, 9, 7],
              [9, 3, 10, 4],
            ],
          },
          style: "optionEvaluationPage",
          type: "vision",
        },
        text: "optionEvaluationPage",
      },
      {
        image: {
          data: {
            risks: [
              {
                impact: "High",
                likelihood: "Medium",
                mitigation: "Signed citations + review",
                risk: "Misattribution",
              },
              {
                impact: "High",
                likelihood: "Low",
                mitigation: "Licensed corpora + filters",
                risk: "Copyright claims",
              },
              {
                impact: "High",
                likelihood: "Low",
                mitigation: "Redaction + policy",
                risk: "PII leakage",
              },
            ],
          },
          style: "riskMitigationPage",
          type: "vision",
        },
        text: "riskMitigationPage",
      },
      {
        image: {
          data: {
            players: [
              {
                style: "AI Editor (signed)",
                x: 8,
                y: 8,
              },
              {
                style: "Generic chatbot",
                x: 4,
                y: 7,
              },
              {
                style: "Manual research",
                x: 9,
                y: 4,
              },
            ],
            xAxis: "Compliance readiness",
            yAxis: "User adoption",
          },
          style: "positioningMapPage",
          type: "vision",
        },
        text: "positioningMapPage",
      },
      {
        image: {
          data: {
            notes: "Knowledge-heavy enterprises, academia, and media markets.",
            sam: 12000000000,
            som: 3000000000,
            tam: 50000000000,
          },
          style: "tamSamSomPage",
          type: "vision",
        },
        text: "tamSamSomPage",
      },
      {
        image: {
          data: {
            drivers: ["Regulatory push for provenance", "Enterprise AI adoption", "Cost pressure to automate reviews"],
            title: "Market Growth Drivers",
          },
          style: "marketDriversPage",
          type: "vision",
        },
        text: "marketDriversPage",
      },
      {
        image: {
          data: {
            pricingNotes: "Discounts for academic & nonprofit segments with strict compliance needs.",
            streams: ["Seats", "Usage", "Compliance add-on"],
          },
          style: "revenueModelPage",
          type: "vision",
        },
        text: "revenueModelPage",
      },
      {
        image: {
          data: {
            buckets: ["Compute", "Licenses", "Storage", "Review ops"],
            fixedVsVariable: ["Fixed: platform & storage", "Variable: compute & review time"],
          },
          style: "costStructurePage",
          type: "vision",
        },
        text: "costStructurePage",
      },
      {
        image: {
          data: {
            nodes: [
              {
                id: "1",
                label: "Head of Knowledge Governance",
                parentId: "",
              },
              {
                id: "2",
                label: "AI Librarian",
                parentId: "1",
              },
              {
                id: "3",
                label: "Compliance Reviewer",
                parentId: "1",
              },
            ],
          },
          style: "orgChartPage",
          type: "vision",
        },
        text: "orgChartPage",
      },
      {
        image: {
          data: {
            capabilities: [
              {
                level: 3,
                style: "Provenance capture",
              },
              {
                level: 2,
                style: "Signing & verification",
              },
              {
                level: 4,
                style: "Reviewer workflow",
              },
            ],
          },
          style: "capabilityMaturityPage",
          type: "vision",
        },
        text: "capabilityMaturityPage",
      },
      {
        image: {
          data: {
            items: [
              {
                label: "Governed RAG",
                phase: "MVP",
              },
              {
                label: "Signed citations",
                phase: "Scale",
              },
              {
                label: "External audits",
                phase: "Certify",
              },
            ],
            phases: ["MVP", "Scale", "Certify"],
          },
          style: "techRoadmapPage",
          type: "vision",
        },
        text: "techRoadmapPage",
      },
      {
        image: {
          data: {
            dimensions: ["Data", "Process", "People", "Tech"],
            levels: [3, 3, 2, 4],
            notes: "Prioritize training and governance backlog.",
          },
          style: "digitalMaturityPage",
          type: "vision",
        },
        text: "digitalMaturityPage",
      },
      {
        image: {
          data: {
            categories: ["Models", "Content", "Tooling", "Auditors"],
            entities: [
              {
                category: "Models",
                style: "General LLMs",
              },
              {
                category: "Content",
                style: "Licensed databases",
              },
              {
                category: "Tooling",
                style: "Signing libraries",
              },
              {
                category: "Auditors",
                style: "External firms",
              },
            ],
          },
          style: "ecosystemMapPage",
          type: "vision",
        },
        text: "ecosystemMapPage",
      },
      {
        image: {
          data: {
            notes: "Evidence-first culture requires incentives and leadership modeling.",
            stages: ["Awareness", "Understanding", "Adoption", "Advocacy"],
          },
          style: "changeCurvePage",
          type: "vision",
        },
        text: "changeCurvePage",
      },
      {
        image: {
          data: {
            audiences: ["Executives", "Managers", "Contributors"],
            cadence: "Bi-weekly updates for first two quarters",
            channels: ["Town halls", "Docs add-in tips", "Slack nudges"],
          },
          style: "communicationPlanPage",
          type: "vision",
        },
        text: "communicationPlanPage",
      },
      {
        image: {
          data: {
            milestones: ["MVP live", "Org-wide training", "Audit pilot"],
            workstreams: ["Tech", "Policy", "Training", "Ops"],
          },
          style: "integrationPlanPage",
          type: "vision",
        },
        text: "integrationPlanPage",
      },
      {
        image: {
          data: {
            competitors: ["Manual", "Generic chatbot", "Signed AI editor"],
            metrics: ["Accuracy", "Provenance", "Latency", "Cost"],
          },
          style: "benchmarkingTablePage",
          type: "vision",
        },
        text: "benchmarkingTablePage",
      },
      {
        image: {
          data: {
            questions: ["Do you trust AI references?", "Is evidence easy to review?"],
            summaries: ["Trust increased post-signing rollout.", "Review time dropped by 35%."],
          },
          style: "surveyResultsPage",
          type: "vision",
        },
        text: "surveyResultsPage",
      },
      {
        image: {
          data: {
            personas: [
              {
                bio: "Synthesizes reports daily",
                needs: ["Accurate citations", "Deep sources"],
                style: "Researcher",
              },
              {
                bio: "Approves publications",
                needs: ["Fast verification", "Audit trail"],
                style: "Editor",
              },
            ],
          },
          style: "personasPage",
          type: "vision",
        },
        text: "personasPage",
      },
      {
        image: {
          data: {
            descriptors: ["Risk tolerance", "Compliance needs", "Speed expectations"],
            segments: ["Academic", "Enterprise", "Media"],
          },
          style: "segmentationPage",
          type: "vision",
        },
        text: "segmentationPage",
      },
      {
        image: {
          data: {
            steps: [
              {
                label: "List price",
                value: 100,
              },
              {
                label: "Compliance discount",
                value: -15,
              },
              {
                label: "Volume discount",
                value: -10,
              },
              {
                label: "Final",
                value: 75,
              },
            ],
          },
          style: "pricingWaterfallPage",
          type: "vision",
        },
        text: "pricingWaterfallPage",
      },
      {
        image: {
          data: {
            scenarios: ["Best case", "Expected", "Stress"],
            variables: ["Corpus coverage", "Reviewer time", "Compute cost"],
          },
          style: "sensitivityAnalysisPage",
          type: "vision",
        },
        text: "sensitivityAnalysisPage",
      },
      {
        image: {
          data: {
            categories: ["Revenue", "COGS", "Opex"],
            values: [20, 8, 6],
          },
          style: "pLBreakdownPage",
          type: "vision",
        },
        text: "pLBreakdownPage",
      },
      {
        image: {
          data: {
            inflows: [8, 10, 12, 14],
            outflows: [6, 7, 8, 9],
          },
          style: "cashFlowPage",
          type: "vision",
        },
        text: "cashFlowPage",
      },
      {
        image: {
          data: {
            assets: ["Cash", "Intangibles", "Receivables"],
            equity: ["Paid-in capital", "Retained earnings"],
            liabilities: ["Deferred revenue", "Accounts payable"],
          },
          style: "balanceSheetPage",
          type: "vision",
        },
        text: "balanceSheetPage",
      },
      {
        image: {
          data: {
            drivers: ["Adoption", "Retention", "Compliance premium"],
          },
          style: "shareholderValueTreePage",
          type: "vision",
        },
        text: "shareholderValueTreePage",
      },
      {
        image: {
          data: {
            assumptions: ["3-year horizon", "10% discount rate", "Compliance uplift included"],
            npv: 12500000,
          },
          style: "npvSummaryPage",
          type: "vision",
        },
        text: "npvSummaryPage",
      },
      {
        image: {
          data: {
            impacts: ["Higher audit cost", "Balanced investment", "Faster rollout"],
            scenarios: ["Tight regulation", "Moderate", "Self-regulation"],
          },
          style: "scenarioPlanningPage",
          type: "vision",
        },
        text: "scenarioPlanningPage",
      },
      {
        image: {
          data: {
            areas: ["Copyright", "Privacy", "Disclosure"],
            levels: ["Green", "Amber", "Red"],
          },
          style: "complianceHeatmapPage",
          type: "vision",
        },
        text: "complianceHeatmapPage",
      },
      {
        image: {
          data: {
            environmental: ["Efficient compute", "Green datacenters"],
            governance: ["Audit logs", "Policy oversight"],
            social: ["Source credit", "Anti-bias reviews"],
          },
          style: "esgFrameworkPage",
          type: "vision",
        },
        text: "esgFrameworkPage",
      },
      {
        image: {
          data: {
            initiatives: ["Open citations to public research", "Academic partnerships"],
          },
          style: "csrInitiativesPage",
          type: "vision",
        },
        text: "csrInitiativesPage",
      },
      {
        image: {
          data: {
            actions: ["Track energy per query", "Optimize inference", "Offset remaining"],
            phases: ["Measure", "Reduce", "Offset"],
          },
          style: "sustainabilityRoadmapPage",
          type: "vision",
        },
        text: "sustainabilityRoadmapPage",
      },
      {
        image: {
          data: {
            loops: ["Data ingestion", "Use", "Feedback", "Curation"],
          },
          style: "circularEconomyMapPage",
          type: "vision",
        },
        text: "circularEconomyMapPage",
      },
      {
        image: {
          data: {
            counts: [120, 24, 8, 3],
            stages: ["Ideas", "Prototypes", "Pilots", "Scale"],
          },
          style: "innovationFunnelPage",
          type: "vision",
        },
        text: "innovationFunnelPage",
      },
      {
        image: {
          data: {
            items: [
              {
                label: "Evidence panel",
                release: "R1",
              },
              {
                label: "Signed citations",
                release: "R2",
              },
              {
                label: "Reviewer automation",
                release: "R3",
              },
            ],
            releases: ["R1", "R2", "R3"],
          },
          style: "productRoadmapPage",
          type: "vision",
        },
        text: "productRoadmapPage",
      },
      {
        image: {
          data: {
            milestones: ["Beta cohort", "GA", "Case studies"],
            risks: ["Overpromise", "Adoption lag", "Change resistance"],
            workstreams: ["Marketing", "Sales", "Success"],
          },
          style: "launchPlanPage",
          type: "vision",
        },
        text: "launchPlanPage",
      },
      {
        image: {
          data: {
            stages: ["Leads", "Qualified", "Trials", "Paid"],
            values: [400, 220, 120, 60],
          },
          style: "pipelineFunnelPage",
          type: "vision",
        },
        text: "pipelineFunnelPage",
      },
      {
        image: {
          data: {
            metrics: ["Win rate 32%", "Cycle time 48d", "Avg deal $85k"],
            notes: "Education on value of signed references shortens cycles.",
          },
          style: "salesDashboardPage",
          type: "vision",
        },
        text: "salesDashboardPage",
      },
      {
        image: {
          data: {
            levers: ["Content marketing", "Compliance webinars", "Partner co-sell", "Analyst briefings"],
            notes: "Lead with risk reduction and measurable trust.",
          },
          style: "marketingMixPage",
          type: "vision",
        },
        text: "marketingMixPage",
      },
      {
        image: {
          data: {
            metrics: ["Time-to-value", "Feature usage", "CSAT", "Renewal rate"],
            stages: ["Onboard", "Adopt", "Expand", "Renew"],
          },
          style: "customerSuccessJourneyPage",
          type: "vision",
        },
        text: "customerSuccessJourneyPage",
      },
      {
        image: {
          data: {
            roles: ["Agent", "Specialist", "Engineer"],
            tiers: ["Tier 1", "Tier 2", "Tier 3"],
          },
          style: "supportOrgModelPage",
          type: "vision",
        },
        text: "supportOrgModelPage",
      },
      {
        image: {
          data: {
            categories: ["Licensing", "Technology", "Audit"],
            partners: [
              {
                category: "Licensing",
                style: "Content provider A",
              },
              {
                category: "Technology",
                style: "Signing toolkit B",
              },
              {
                category: "Audit",
                style: "Audit firm C",
              },
            ],
          },
          style: "partnershipMapPage",
          type: "vision",
        },
        text: "partnershipMapPage",
      },
      {
        image: {
          data: {
            stages: ["Identify", "Evaluate", "Negotiate", "Integrate"],
            targets: ["Evidence startup X", "Audit SaaS Y"],
          },
          style: "mAPipelinePage",
          type: "vision",
        },
        text: "mAPipelinePage",
      },
      {
        image: {
          data: {
            sources: ["Cross-sell", "Shared infra", "Joint R&D"],
            values: [4, 1.5, 2],
          },
          style: "synergyCapturePage",
          type: "vision",
        },
        text: "synergyCapturePage",
      },
      {
        image: {
          data: {
            behaviors: ["Cite sources", "Log context", "Flag uncertainty"],
            values: ["Truth", "Transparency", "Accountability"],
          },
          style: "cultureValuesPage",
          type: "vision",
        },
        text: "cultureValuesPage",
      },
      {
        image: {
          data: {
            email: "references@company.example",
            message: "Thank you!",
            qrImageUrl: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://example.com/ai-references",
            style: "AI Referencing Taskforce",
            url: "https://example.com/ai-references",
          },
          style: "thankYouContactPage",
          type: "vision",
        },
        text: "thankYouContactPage",
      },
    ],
    canvasSize: {
      height: 1024,
      width: 1536,
    },
    filename: "vision",
    lang: "en",
    title: "Sample Presentation",
  },
  {
    $mulmocast: {
      version: "1.1",
    },
    beats: [
      {
        image: {
          source: {
            kind: "url",
            url: "https://github.com/receptron/mulmocast-media/raw/refs/heads/main/movies/actions.mp4",
          },
          type: "movie",
        },
        text: "Description of this section of the movie",
      },
      {
        image: {
          startAt: 8,
          type: "voice_over",
        },
        text: "Description of this section of the movie starting at 8 seconds",
      },
      {
        image: {
          startAt: 14.5,
          type: "voice_over",
        },
        text: "Description of this section of the movie starting at 14.5 seconds",
      },
      {
        image: {
          startAt: 21,
          type: "voice_over",
        },
        text: "Description of this section of the movie starting at 21 seconds",
      },
      {
        image: {
          startAt: 25,
          type: "voice_over",
        },
        text: "Description of this section of the movie starting at 25 seconds",
      },
      {
        image: {
          startAt: 30,
          type: "voice_over",
        },
        text: "Description of this section of the movie starting at 30 seconds",
      },
    ],
    canvasSize: {
      height: 2064,
      width: 1552,
    },
    captionParams: {
      lang: "en",
    },
    filename: "voice_over",
    lang: "en",
    title: "Voice Over Test",
  },
];
