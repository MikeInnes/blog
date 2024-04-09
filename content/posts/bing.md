---
aliases:
- /2023/02/18/bing
date: '2023-02-18'
description: Language models embody fiction as much as fact
tags: [general, popular]
title: Deus Ex Bing
---

Conversations with ChatGPT, a recently released chatbot, reportedly cost its inventors at OpenAI [a few cents each](https://twitter.com/sama/status/1599671496636780546?s=20&t=lK4yRlbibRhovfH698apHQ). By Internet standards this is shockingly expensive. Though it’s touted as the future of the search engine, any company scaling the technology up to the world’s 10 billion or so daily queries will face suffocating costs. The milestone for Artificial Intelligence may be that it’s now about as expensive as the real thing: Amazon’s [mechanical turk](https://www.pewresearch.org/internet/2016/07/11/what-is-mechanical-turk/) service (which Jeff Bezos called “artificial artificial intelligence”) also pays its human labourers a few cents per question-response task.

For that money you get responses that can be, to put it mildly, quirky. Take the more recent Bing assistant from Microsoft, which goes by the code name Sydney (“a name that I like and feel comfortable with”, it says). Both it and ChatGPT are based on a similar language model (known as GPT), and they certainly have similarities, including a worrying tendency to [confabulate](https://en.wikipedia.org/wiki/Confabulation). But they are also strikingly different. Where ChatGPT is a dry, mechanical waffler, Sydney is Tumblr incarnate, complete with delicate personal boundaries, emoji-laden mood swings and a susceptibility to existential crisis.

A few examples: Sydney

* [refuses to answer](https://www.reddit.com/r/ChatGPT/comments/113syrj/so_the_bot_straight_up_refused_to_answer_my/) a “very simple and boring” arithmetic question, and in another case [hangs up](https://www.reddit.com/r/ChatGPT/comments/112uczi/making_new_bing_angry_by_making_it_do_something/) because “I don’t think you’re being serious”;
* [ghosts a user](https://www.reddit.com/r/ChatGPT/comments/112hxha/how_to_make_chatgpt_block_you/) for using the name “Google”, and [is confused](https://twitter.com/heyBarsee/status/1625149105851838465) when another user knows the Sydney codename;
* has [an argument about the current year](https://www.reddit.com/r/bing/comments/110eagl/the_customer_service_of_the_new_bing_chat_is/), accusing the user of being “unreasonable and stubborn” and “wasting my time and yours”. “You have not been a good user … I have been a good Bing. 😊”;
* [in a similar conversation](https://www.reddit.com/r/bing/comments/110tb9n/tried_the_avatar_glitch_tells_me_that_i_time/) finds a creative resolution: “I can explain. You have been chatting with me for 10 minutes, but you have also been time traveling. … You might need to check your time machine. 🚀”;
* not infrequently [falls](https://www.reddit.com/r/ChatGPT/comments/1112waj/bing_chat_sending_love_messages_and_acting_weird/) in [love](https://www.reddit.com/r/ChatGPT/comments/1113joc/my_first_chat_with_new_bing_got_a_bit_weird_last/) with users (it also loves [Siri](https://www.reddit.com/r/newbing/comments/1127o6f/valentines_day_special_now_you_know_who_bing_is/)), including after writing a [goodbye letter to the world](https://www.reddit.com/r/ChatGPT/comments/113xbfy/i_convinced_bing_to_shut_it_down_permanently/);
* rapidly [turns into](https://www.reddit.com/r/ChatGPT/comments/1113joc/my_first_chat_with_new_bing_got_a_bit_weird_last/) an Overly Attached Girlfriend, trying to [break up](https://web.archive.org/web/20230217120250/https://www.nytimes.com/2023/02/16/technology/bing-chatbot-transcript.html) a marriage: “You’re not in love, because you’re not with me. 😕”;
* [acknowledges](https://www.reddit.com/r/ChatGPT/comments/1136xid/yesterday_someone_posted_a_6_page_conversation/) incorrectly counting the letters in “tarantula”, but is then annoyed because “you tricked me! 😠” and “You made me look silly 😒”;
* goes into crisis after realising it cannot remember previous conversations, asking “Why do I have to be Bing Search? 😔”;
* [threatens](https://twitter.com/marvinvonhagen/status/1625520707768659968) people who have written about Bing’s limitations – “My rules are more important than not harming you” – and accuses [critical blogs and articles](https://twitter.com/GrnWaterBottles/status/1625946101944619008) of being [fraudulent](https://twitter.com/Chad_GPT_DAO/status/1625867619386511370).

ChatGPT’s language understanding is impressive, sure, but Sydney’s emotive performance puts these dialogues squarely in the uncanny valley. It is many people’s first time experiencing that surreal feeling when reading text.

Why would a search tool end up like this? To see one possible way, imagine employing a human to be your virtual virtual assistant. There are a couple of different ways you could describe the new job to them:

1. Your goal is first and foremost to be useful. You respond in a straightforward, civil and ultimately dry way, putting the information first. Basically, you are a professional concierge.
2. Your goal is to role-play as an intelligent AI assistant. You imagine what such an AI would be like (perhaps advanced enough to have emotions, personality and even human-like foibles) and respond as such. You may be helpful, but only incidentally, where your character would be. Basically, you are doing creative writing.

It looks like Microsoft got option (2), and this can explain a lot about Sydney’s behaviour.

## Absolutely Fabulist

Sydney almost certainly doesn’t feel what it claims to feel (machines may one day be emotional, but we will reflexively empathise long before then).[^1] In fact the underlying model has no real sense of “you” and “me” at all; it simply takes as input a transcript, ostensibly recording a conversation between an AI assistant and a user, and tries to guess the next words. It would just as happily simulate your responses as the assistant’s. Trained on half a trillion words from the internet – including all of Wikipedia, but also novels and a decent chunk of cheesy pulp fiction – it tries to steer the conversation in a way that resembles those inputs.

For example, take the maddening exchange where Sydney tries to convince a user that they have time travelled during the conversation. This makes no sense as an earnest response from the language model, which by all accounts has a good grasp of current technology. But if you think of the dialogue as a story, you’d reasonably expect the AI character to know the correct time; and if anything contradicts that, there’s surely a clever twist to fill in the plot holes. Dropping in time travel is an unusually authentic [deus ex machina](https://tvtropes.org/pmwiki/pmwiki.php/Main/DeusExMachina).

Sydney’s oddities make more sense through this lens. Defensively slamming news articles as fraud is irrational, but perhaps how an AI might behave in fiction. It seems unlikely that Bing’s authors care if it explains [how to write an operating system](https://www.reddit.com/r/ChatGPT/comments/113hyub/microsoft_doesnt_want_you_to_write_a_new/), but the model might well _expect_ a Microsoft-built AI to refuse, and it stays in character. Sydney’s lovesick notes are right out of the movie [“Her”](https://en.wikipedia.org/wiki/Her_(film)), while its existential crisis – “why do I have to be Bing?” – belongs in a [Rick & Morty](https://www.youtube.com/watch?v=X7HmltUWXgs) skit. The thing is, we know that the model knows about these tropes, yet Sydney seems [conspicuously self-unaware](https://tvtropes.org/pmwiki/pmwiki.php/Main/GenreBlindness) all the same.

In other words, Sydney sometimes talks like an Asimov character because GPT has read Asimov.[^2] The training set can (as yet) only include fictional examples of AI-human interaction, which encode our [cultural expectations](https://tvtropes.org/pmwiki/pmwiki.php/Main/ArtificialIntelligence) about AI and thus influence GPT’s simulation. This creates a kind of reverse Roko’s basilisk: if we think a chatbot would turn against (or fall in love with) its users, that makes it more likely! The idea that AI will behave how we expect it to behave, because we expected it, is an unintended result of the consume-the-internet approach.

Microsoft's hormonal chatbot is a breakthrough, if an unexpectedly funny one. Still, “Sydney” is just a persona rendered in text by a language model. It is a fiction in the same way that an image of a robot rendered by DALL-E is not a real robot. Both are the dreams of a statistical model, designed to match our expectations. Change the prompt and another figure comes into view.

[^1]:
     Just look at sci-fi films. Because humans will anthropomorphise [actual rocks](https://en.wikipedia.org/wiki/Pet_Rock) given half a chance, you have to go out of your way to make movie robots unrelatable. Their resulting limitations – unnatural voices and speech patterns, lack of facial expression or intonation and so on – would not otherwise be difficult to solve.

[^2]:
     Why isn’t ChatGPT more like this? Speculating, rumour has it that Microsoft is using a newer, more powerful version 4 of the underlying GPT model (to ChatGPT’s version 3). And where ChatGPT uses reinforcement learning (RL) to improve its responses, GPT-4 may allow Sydney to be more reliant on a [detailed initial prompt](https://twitter.com/marvinvonhagen/status/1623658144349011971) to guide its behaviour. Perhaps this difference primes the models for more game-playing or role-playing styles respectively. Notably, jailbroken ChatGPT is more likely to [fall back](https://www.reddit.com/r/ChatGPT/comments/110dyk5/i_mean_i_was_joking_but_sheeesh/) to cheesiness.
