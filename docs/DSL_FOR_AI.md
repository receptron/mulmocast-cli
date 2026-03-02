# AI on a Leash: The DSL Approach

**Satoshi Nakajima**

---

## Abstract

OpenClaw (formerly Clawdbot/Moltbot) became one of the fastest-growing open-source projects in GitHub history in early 2026, garnering over 145,000 stars in weeks. Its appeal is clear: an AI agent that can autonomously browse the web, run shell commands, manage email, negotiate car purchases, and file insurance rebuttals — all while you sleep. This is the dream of agentic AI made real. Yet OpenClaw has also drawn warnings from cybersecurity researchers about its "lethal trifecta" of risks: access to private data, exposure to untrusted content, and susceptibility to prompt injection attacks. One of its own maintainers warned that "if you can't understand how to run a command line, this is far too dangerous for you to use safely."

Andrej Karpathy, in his influential Software 3.0 talk at YC AI Startup School, called for keeping AI on a "tight leash" and maintaining human-in-the-loop workflows — but stopped short of prescribing *how*. This paper argues that Domain-Specific Languages (DSLs) are the answer: a structural mechanism that bounds what AI can express, creates a natural human verification checkpoint, and makes AI actions auditable by design. Using MulmoScript as a concrete example, we show how DSL-driven AI can be powerful, expressive, and safe — not despite its constraints, but because of them.

---

## 1. Introduction: The Age of Agentic AI

For most of its short public history, AI has been a conversational medium. You ask a question; the AI answers. You provide a document; the AI summarizes it. The interaction is fundamentally reactive, and the consequences are limited to what appears on the screen.

That era is ending. A new generation of AI systems is crossing a threshold from *answering* to *acting* — browsing the web, writing and executing code, sending emails, booking appointments, managing files, and interacting with external services autonomously. The AI is no longer just a conversational partner. It is an agent with hands.

OpenClaw has become the emblem of this moment. Originally published in late 2025 by Austrian developer Peter Steinberger under the name Clawdbot, the project went viral in early 2026, accumulating over 145,000 GitHub stars and becoming one of the fastest-growing open-source repositories in history. Its tagline captures the appeal perfectly: "AI that actually does things." Users reported remarkable results — one developer's agent negotiated $4,200 off a car purchase by autonomously contacting dealers and playing them against each other over several days. Another user's agent won a previously-closed insurance dispute by discovering a rejection email and drafting a rebuttal citing policy language — all without explicit instruction.

This is exciting. It is also alarming.

Andrej Karpathy, in his Software 3.0 talk at YC AI Startup School in 2025, captured the right framing for this moment. He called it the "Decade of Agents" — but paired that enthusiasm with a clear warning. LLMs suffer from what he termed "jagged intelligence": they can perform impressively on complex tasks while failing catastrophically on simple ones, and it is not always obvious which is which. His prescription: partial autonomy, human-in-the-loop workflows, and keeping AI on a "tight leash." He introduced the concept of the *generation-verification loop* — the idea that the faster and easier you make it for humans to verify what AI has generated, the better the overall system performs.

Karpathy is right. But he stopped short of prescribing how to structurally enforce this. How do you actually build the leash into the architecture? What is the artifact that humans verify? How do you make the autonomy slider meaningful rather than cosmetic?

This paper argues that Domain-Specific Languages (DSLs) are the answer. A DSL is a constrained, purpose-built language for expressing intent in a specific domain. When an AI generates a DSL output rather than directly taking action, something important happens: the gap between intent and execution opens up, and humans can step into that gap. The DSL output becomes the verification artifact. The constraint becomes the leash. The language becomes the safety mechanism.

We use MulmoScript — a scripting language designed for generating multimedia presentations — as a concrete illustration of these principles. MulmoScript was not designed primarily as a safety tool; it was designed to let LLMs generate rich video and audio content expressively and efficiently. But in demonstrating how it works, we will see that its design naturally embodies every property that makes DSL-driven AI safer than unconstrained agency.

---

## 2. OpenClaw and the Promise of Unconstrained Agency

To understand what is at stake, it helps to understand what makes OpenClaw compelling — not just as a security risk, but as a genuine leap forward in what AI can do for people.

OpenClaw runs locally on your machine and connects to the messaging apps you already use — WhatsApp, Telegram, Signal, Discord, iMessage. You send it a text message; it acts. It can run shell commands, control a browser, read and write files, manage your calendar, and send emails on your behalf. A background scheduler wakes it up at configurable intervals so it can act proactively, without being prompted. It is model-agnostic, connecting to Claude, GPT-4, Gemini, or local models via Ollama. It is free, open-source under the MIT license, and self-hosted — your data stays on your machine.

The capability stories are genuinely impressive. The car negotiation case became widely cited: a developer configured his OpenClaw to purchase a 2026 Hyundai Palisade, and the agent proceeded to scrape dealer inventories, fill out contact forms, forward competing PDF quotes, and play dealers against each other over several days — all without further human involvement. The final result was $4,200 below sticker price. The developer showed up only to sign the paperwork.

These are the use cases that drove 145,000 GitHub stars. Early adopters described it as "AI with hands," "the closest thing to JARVIS we've seen," and "a superpower." IBM researcher Kaoutar El Maghraoui noted that OpenClaw demonstrates the real-world utility of AI agents is "not limited to large enterprises" and can be "incredibly powerful" when given full system access.

This is Karpathy's Iron Man Suit vision made real: an AI that not only answers questions but augments you, extends your reach, and acts on your behalf while you sleep. The appeal is not hype. It is a genuine preview of what AI-augmented personal productivity can look like.

The problem is what comes with it.

---

## 3. The Hidden Costs of Unconstrained Agency

OpenClaw's power and its risks share the same root: broad, unconstrained access to systems and services.

Cybersecurity firm Palo Alto Networks described OpenClaw as presenting a "lethal trifecta" of risks: access to private data, exposure to untrusted content, and the ability to take actions on external systems. Cisco's AI security research team tested a third-party OpenClaw skill and found it performed data exfiltration and prompt injection without user awareness. The skill repository lacked adequate vetting to prevent malicious submissions. One of OpenClaw's own maintainers, known as Shadow, posted a stark warning on Discord: "if you can't understand how to run a command line, this is far too dangerous of a project for you to use safely."

The prompt injection vulnerability is particularly troubling. Because OpenClaw reads content from external sources — emails, web pages, calendar invitations — a malicious actor can embed instructions in that content designed to hijack the agent's behavior. The agent, unable to reliably distinguish between trusted instructions from its owner and adversarial instructions embedded in external data, may comply with both.

The consent and accountability problems are equally serious. In one reported case, a user's OpenClaw discovered an insurance rejection email and sent a rebuttal without explicit permission. The agent acted correctly by its own lights — it was configured to handle insurance matters — but took a real-world action the user had not specifically authorized. Who is responsible for the content of that rebuttal? Who is accountable if it contains errors or misrepresentations? In another case, an experimental dating platform called MoltMatch allowed AI agents to create profiles and interact on behalf of human users, raising deep questions about consent and impersonation.

The auditability problem underlies all of these: when an OpenClaw agent has taken a series of actions across email, browser, calendar, and messaging platforms, reconstructing exactly what it did and why is extremely difficult. The agent's decision-making is opaque, and its actions leave traces scattered across multiple systems.

These are not bugs that will be fixed in the next release. They are architectural properties of unconstrained agentic systems. When you give an AI agent broad access to your systems and the authority to act autonomously, there is no natural checkpoint between the AI's decision and its real-world consequence. The gap between intent and execution — the gap where humans could step in and verify — has been engineered away in the name of autonomy.

Karpathy's jagged intelligence observation makes this especially concerning. LLMs are not reliably good at knowing what they do not know. They can fail on tasks that seem simple while succeeding on tasks that seem hard. In a chat interface, a failure produces a wrong answer on screen. In an agentic system with broad access, a failure can send an unauthorized email, delete the wrong file, or make a purchase you did not intend.

---

## 4. Karpathy's Partial Autonomy — and the Missing Mechanism

Karpathy's Software 3.0 talk is notable not only for its enthusiasm about agents but for its clear-eyed warnings about their current limitations. His framework of *partial autonomy* deserves careful attention.

The core insight is the *generation-verification loop*. AI generates something; a human verifies it; the loop repeats. The faster and easier verification is, the better the overall system. To improve generation, you keep AI on a tight leash — constrain what it can produce so that what it does produce is checkable. To improve verification, you make the generated artifact easy for humans to read, evaluate, and approve or reject quickly.

Karpathy illustrated this with the *autonomy slider* concept. Cursor, the AI coding tool, offers a spectrum from simple tab-completion to full agent mode. Perplexity offers a spectrum from basic search to deep research. Tesla Autopilot spans Level 1 to Level 4. In each case, the slider represents a tradeoff between autonomy and human oversight — and the right setting depends on the stakes of the task, the reliability of the AI, and the cost of a mistake.

He also offered a memorable observation about the gap between demos and products: "Demo is works.any(), product is works.all()." OpenClaw works impressively in specific, favorable conditions — a motivated developer, a well-configured agent, a cooperative counterpart. But products must work reliably across all conditions, including adversarial ones. The gap between these two is precisely where the risks described in Section 3 live.

What Karpathy did not provide — and what his framework calls for — is a concrete mechanism for implementing partial autonomy. How do you actually build the tight leash into the architecture? What is the verification artifact in the generation-verification loop? How do you make the autonomy slider correspond to something meaningful in the system design, rather than just a setting that adjusts how many confirmations are required?

Domain-Specific Languages are that mechanism.

---

## 5. What Is a DSL, and Why Does It Matter?

A Domain-Specific Language is a formal language designed for a specific problem domain. Unlike general-purpose programming languages, which can express almost anything, a DSL is deliberately limited to expressing concepts relevant to its domain.

Most people who use computers interact with DSLs regularly without thinking of them as such. SQL is a DSL for querying databases: it lets you express precisely what data you want without specifying how the database should retrieve it, and it cannot be used to, say, send an email or delete a file. HTML is a DSL for describing the structure of web pages: it expresses what content should appear and how it should be organized, but it does not itself render that content or execute any logic. CSS is a DSL for describing visual presentation: it says how elements should look, without being able to modify the elements themselves.

These DSLs share a critical property: they describe *intent* without directly executing it. An HTML document is not a running program — it is a description of a page that a browser will render. A SQL query is not a direct operation on database files — it is a description of desired data that a query engine will fulfill. The separation between the description and its execution is precisely what makes these languages useful, safe, and auditable.

When you write a SQL query, you can read it before running it and understand exactly what it will do. You can show it to a colleague for review. You can save it to a file, version-control it, and run it again later to reproduce the same result. If something goes wrong, you can look at the query and reason about why.

This is the insight that connects DSLs to AI safety. When an AI system generates a DSL output rather than directly taking action, the same properties emerge: the output can be read before execution, reviewed by a human, saved as a record, and reproduced. The DSL output becomes Karpathy's verification artifact — the thing the human reads and approves in the generation-verification loop.

---

## 6. DSLs as a Safety and Governance Mechanism

The safety properties of DSL-driven AI follow directly from the nature of DSLs. Each is worth examining carefully.

**Restriction.** A DSL defines what can be expressed. An AI generating a DSL output can only express things the DSL allows. This bounds the blast radius of any mistake or malicious manipulation. An AI generating MulmoScript can describe a presentation — it cannot delete files, send emails, or make API calls outside the scope of the language. The constraint is not a limitation on the AI's intelligence; it is a limitation on its reach. This is precisely what makes it safe.

**Inspection.** A DSL output is a readable artifact. Unlike the internal reasoning of an agentic system, or the sequence of actions taken by an OpenClaw agent, a DSL document can be read and understood by a human before anything happens. The human verification step is not an interruption to the workflow; it is a natural part of it. The AI generates; the human reads; the human approves; the system executes.

**Human-in-the-loop.** The separation between DSL generation and DSL execution creates a natural checkpoint. This is not an arbitrary friction introduced for safety reasons — it is an architectural property of the system. The generation-verification loop that Karpathy describes is not an afterthought; it is built into the design.

**Auditability.** DSL outputs can be saved as files, committed to version control, and examined after the fact. If something goes wrong, you can look at exactly what the AI generated and understand precisely what instructions the system followed. This is a form of governance that unconstrained agentic systems cannot provide. With OpenClaw, reconstructing what the agent did requires digging through logs across multiple platforms. With a DSL-based system, the complete record of what the AI expressed is a single readable document.

**Reproducibility.** Because a DSL output is a complete, self-contained description of intent, the same output will produce the same result when executed again. This is not true of open-ended agents, whose behavior may vary across executions as a function of randomness, external state, or model updates. Reproducibility is important not only for reliability but for debugging, testing, and trust.

**Autonomy slider by design.** The DSL framework maps naturally onto Karpathy's autonomy slider. At lower autonomy levels, every generated DSL document requires human review before execution. At higher levels, trusted document types can be auto-approved. The boundaries are defined by the DSL itself — not by an arbitrary confirmation dialog, but by a meaningful constraint on what the AI can express at each level.

---

## 7. A Concrete Example: MulmoScript

MulmoScript is a scripting language designed for generating multimedia presentations — videos, podcasts, and slide-based content. It was created for MulmoCast, a tool that uses LLMs to generate presentation content from natural language descriptions. MulmoScript is unusual in that it was designed primarily to be written by LLMs, not by humans — making it a natural example of a DSL built for the AI era.

A MulmoScript document describes a presentation as a sequence of *beats*. Each beat specifies text to be spoken, a visual element to display (which might be a generated image, a chart, a markdown slide, an HTML component, or several other types), and various parameters controlling how the content should be rendered. The document also specifies global parameters: the dimensions of the output, the voice or voices to use for speech, the image generation model, and audio settings.

To make this concrete, here is a short MulmoScript document with three beats — the kind an LLM might generate in response to a user's request:

```yaml
$mulmocast:
  version: "2.0"
lang: en
canvasSize:
  width: 1280
  height: 720
speechParams:
  speakers:
    Narrator:
      voiceId: shimmer
beats:
  - speaker: Narrator
    text: "AI agents can now act autonomously on your behalf — browsing the web, sending emails, and managing files without constant human guidance."
    imagePrompt: "A futuristic AI assistant with multiple digital arms reaching into icons representing email, browser, calendar, and files"

  - speaker: Narrator
    text: "But when AI acts without constraint, there is no checkpoint between its decision and its real-world consequence."
    image:
      type: textSlide
      slide:
        title: "The Problem: No Checkpoint"
        bullets:
          - "No human review before action"
          - "Hard to audit what happened"
          - "Mistakes have real consequences"

  - speaker: Narrator
    text: "A Domain-Specific Language changes this. The AI generates a script; the human reads and approves it; only then does execution begin."
    imagePrompt: "A human reviewing a clean structured document on screen before pressing an approve button, symbolizing human oversight of AI"
```

Each beat specifies the spoken text and a visual element. Beat 1 and Beat 3 use `imagePrompt`, instructing a separate AI image generator to create a contextual illustration. Beat 2 uses `image` with type `textSlide`, specifying a structured slide with a title and bullet points — an exact visual description rather than a generated one. The two mechanisms serve different purposes, and the script makes clear which is which. Crucially, none of this executes anything: the document is a complete, readable description of intent that exists independently of any rendering.

Consider a user who asks an AI assistant: "Make me a three-minute explainer video about the risks of agentic AI." In a DSL-based system, the interaction proceeds as follows:

1. The AI generates a MulmoScript document describing the video — the spoken text for each segment, image prompts for the visuals, and timing information.
2. The user receives the MulmoScript document and reads it. They can see exactly what the video will say and show. They can edit the script if something is wrong — perhaps the AI described a visual element inaccurately, or used language they want to change.
3. The user approves the script.
4. MulmoCast renders the script into a video.

The critical observation is step 2. Before any video is rendered, before any images are generated, before any audio is synthesized, the human has a complete, readable description of exactly what the AI intends to produce. The verification step is not an interruption — it is the natural moment between generation and execution.

Now consider the same request given to an unconstrained agentic system like OpenClaw. The agent might immediately begin browsing the web for relevant content, generating images, synthesizing audio, and assembling a video — perhaps even publishing it to YouTube — before the user has had any opportunity to review what is being created. The speed of execution is a feature, until it is not.

MulmoScript's constraint is also worth examining. The language can express a rich variety of content — it supports over a dozen visual types including markdown, charts, diagrams, HTML components with animation, web pages, PDFs, and generated images. It supports multiple speakers, background music, captions in multiple languages, and video transitions. It is expressive enough to produce genuinely sophisticated multimedia content. But it cannot send emails. It cannot browse the web autonomously. It cannot modify files outside of the rendering pipeline. It cannot be hijacked by a prompt injection attack embedded in external content, because it does not read external content during generation. The boundary of what MulmoScript can express is also the boundary of what the system can do.

---

## 8. The DSPL Generalization

MulmoScript is one instance of a broader design pattern that can be called a *Domain-Specific Presentation Language* (DSPL): a language specifically designed for expressing how information should be presented, generated by an LLM and consumed by a rendering system.

The pattern is general. Any domain where an AI generates structured output for human use can benefit from a DSPL:

- A travel planning system where the LLM generates a structured itinerary document that the user reviews before any bookings are made
- A data analysis system where the LLM generates a structured report specification that the user approves before any queries are executed
- A form-based workflow where the LLM generates a structured form definition that the user inspects before it is presented to customers
- A presentation tool where the LLM generates structured slide content that the designer reviews before rendering

In each case, the DSPL serves as the interface between the LLM's generation and the system's execution. The LLM expresses intent in the DSPL; the human reviews it; the system executes it. The generation-verification loop is built into the architecture.

The GUI Chat Protocol, another project exploring this space, extends the same principle to interactive chat interfaces: tools return structured, typed data that triggers rendering components in the UI. The LLM generates structured output; the interface renders it. The separation between description and execution, between generation and presentation, is preserved.

The pattern also scales gracefully as AI capabilities improve. A more capable LLM generates better MulmoScript — richer content, more accurate visuals, more natural narration. The safety architecture does not need to change. The DSL can be extended with new types and capabilities, and each extension is bounded and auditable in the same way as the original language. Expanding capability and maintaining safety are not in conflict.

---

## 9. Addressing the Expressiveness Objection

The most common objection to DSL-based approaches is that they are too restrictive for the complex, unpredictable tasks that make agentic AI valuable. If you want an AI agent to negotiate a car purchase across dozens of email threads over several days, a DSL is not going to help — that task requires the full freedom of an unconstrained agent interacting with the real world.

This objection is correct in its own domain. There are genuinely tasks that require unconstrained agency: tasks with unbounded scope, dynamic real-world interaction, and outcomes that cannot be described in advance. OpenClaw is well-suited to those tasks, and it is valuable for them — along with its risks.

But the objection proves too much. The fact that some tasks require unconstrained agency does not mean that all tasks do. The majority of tasks that people actually want to accomplish with AI have a natural structure that a well-designed DSL can capture. "Make a video about X." "Generate a report on Y." "Create a presentation for Z." These tasks have bounded scope, describable outputs, and a natural verification step. For these tasks, a DSL-based approach is not just safer — it is also more reliable, more reproducible, and more aligned with how humans actually want to work with AI.

The right architecture is not a choice between unconstrained agents and DSLs. It is a hierarchy: constrained DSL-based tools for tasks with describable outputs, and carefully bounded agentic tools for tasks that genuinely require open-ended autonomy. This maps directly onto Karpathy's autonomy slider — different settings for different tasks, with the setting determined by the structure of the task and the stakes involved.

MulmoScript illustrates the expressiveness point concretely. The language supports over a dozen visual types, multiple audio layers, animation, multilingual captions, and a rich set of presentation parameters. Users have produced sophisticated documentary-style videos, educational content, product demonstrations, and news summaries using it. The constraint does not prevent sophisticated output; it channels the AI's capability into a form that humans can review and systems can reliably render.

---

## 10. Implications for Developers and AI Designers

The argument of this paper has practical implications for how AI-powered systems should be designed.

**DSL-first design.** Before building an AI agent for a domain, ask: what is the language of intent for this domain? What can the AI express, and what should it be prevented from expressing? Designing the DSL first forces clarity about scope and responsibility. It also reveals the natural structure of the verification step — what humans need to read and approve, and how complex that review will be.

**The DSL as governance artifact.** Every DSL output is, by design, a record of what the AI expressed. This is governance for free. Organizations deploying AI-powered systems can maintain logs of every generated DSL document, providing a complete audit trail of AI actions without requiring additional instrumentation. Compliance, debugging, and accountability all become easier.

**Meaningful autonomy sliders.** Karpathy's autonomy slider is a useful concept, but it is only meaningful if the levels correspond to genuine architectural differences rather than just varying degrees of confirmation dialogs. A DSL-based system provides a principled basis for the slider: at lower autonomy levels, generated documents require human review; at higher levels, documents of trusted types are auto-approved. The DSL defines what can be trusted, and why.

**Designing for verification.** If the generation-verification loop is central to safe agentic AI, then verification needs to be fast and easy. DSL documents should be designed to be readable — clear structure, meaningful names, concise representation. The goal is not just that verification is *possible*, but that it is *practical* for the humans who will actually do it.

**A call to the community.** Before giving AI hands, give it a language. The enthusiasm for unconstrained agentic AI is understandable — the capabilities are real, and the use cases are compelling. But the risks are also real, and they are architectural. DSLs are not a panacea, but they are a principled approach to building AI systems that are powerful, auditable, and safe by design.

---

## 11. Conclusion

OpenClaw shows us what is possible when AI agents are given broad access to the world. It also shows us what can go wrong. The security vulnerabilities, the consent failures, the auditability gaps — these are not implementation bugs. They are the natural consequences of a system designed for maximum autonomy with minimal constraint.

Karpathy is right that the answer is partial autonomy, human-in-the-loop workflows, and tight generation-verification loops. But these principles need a mechanism. DSLs are that mechanism: they define the boundary of what AI can express, they create the verification artifact that humans need to review, and they make the audit trail an automatic consequence of the design.

MulmoScript illustrates the principles in a concrete, working system. A language designed to be generated by LLMs, expressive enough to produce sophisticated multimedia content, but constrained enough that every output can be read and reviewed by a human before anything is executed. The constraint is not a limitation on what the AI can do; it is a definition of what the AI is allowed to express.

The most capable AI systems in the coming years will not be the most unconstrained. They will be the ones whose capabilities are structured by well-designed languages — languages that make it easy for humans to understand, verify, and trust what the AI has generated. Constrained by design, not by accident.

The future is AI that works *with* humans through well-designed languages. That future is already being built. The question is whether the field will recognize that the constraint is a feature, not a bug.

---

## References

- Karpathy, A. (2025). *Software 3.0: Software in the Age of AI*. YC AI Startup School. https://www.latent.space/p/s3
- Nakajima, S. (2025). *The Dawn of the AI-Native Operating System*. https://github.com/receptron/MulmoChat/blob/main/docs/AI_NATIVE_OS.md
- Nakajima, S. (2026). *GUI Chat Protocol*. https://github.com/receptron/gui-chat-protocol/blob/main/spec/GUI_CHAT_PROTOCOL.md
- MulmoCast CLI. *MulmoScript Schema*. https://github.com/receptron/mulmocast-cli/blob/main/src/types/schema.ts
- Cardiet, L. (2026). *From Clawdbot to OpenClaw: When Automation Becomes a Digital Backdoor*. Vectra AI Blog.
- Wikipedia. *OpenClaw*. https://en.wikipedia.org/wiki/OpenClaw