---
aliases:
- /2021/03/23/colours
- /2021/03/23/colours.html
date: '2021-03-23'
description: Language analysis helps explain how the blind understand colour
tags: [general]
title: Colouring by numbers
---

An astronomer might say that blue is the warmest colour, and red the coolest. Lukewarm stars, at a temperature of around 3500K, give a gentle red glow. Truly hot ones, at about 6000K, become brilliant white, and above that blue and ultraviolet. Yet in most cultures red and orange stand in for heat, while white and blue mean cold. If this rule isn't given by the laws of physics, how do we learn it?

Most people have seen examples that fit the pattern, like embers or snow. But less obviously, we can also draw associations from language, and might gain a lot of our chromatic intuition that way. The idea of learning about sight through words may seem odd, but it could go a long way to explaining a paradox: why those born blind have a surprisingly good handle on colour.

<div class="fill">
  <img src="colours.png" />
</div>

<div class="caption">
Chromatography: Which colour words are associated with which adjectives? The horizontal axis shows the distance of each colour from either of a given adjective pair, in the embedding space, in relative units. Derived from <a href="https://nlp.stanford.edu/projects/glove/">GloVe word embeddings</a> trained on the Common Crawl corpus.
</div>

In surveys of colour association, the blind make largely the same connections as the sighted: “hot” and “cold” are red and blue, “ripe” and “unripe” are often green and black, “clean” and “dirty” are white and brown, and so on. What’s more, they have a good sense of the relationship between colours. [Asked to rate](https://www.tandfonline.com/doi/abs/10.1080/13506285.2018.1465148?journalCode=pvis20) the similarity of many pairs of colour words, their answers are consistent enough to reproduce a colour wheel. Vision can't, of course, explain this result, but implicit learning from language might.

A [recent working paper](https://psyarxiv.com/vyxpq/) proves the concept. The authors found that they could recover those same word associations from mathematical analysis of a large body of written work. In principle humans, sighted or not, might learn colourful connotations in a similar way.

The key was a technique known as "word embedding", which can discern a term’s meaning from the way it is used – as opposed to an explicit definition. The idea is that words are defined by the company they keep. “Furry”, for example, tends to appear near words like “cat”, “bunny” and “hair”, giving an idea of what it represents. “Fluffy” appears in similar contexts, suggesting an overlapping meaning.

To see how computers can exploit this idea, imagine pinning thousands of words at random over a cork board. When two show up in similar sentences in a source text, an algorithm moves them closer on the board. Eventually, interchangeable terms are pinned together; those that coincide rarely (and so have very different meanings) are remote.

Words can be similar in some ways, yet different in others. “Hot” and “cold” might be distant on the board horizontally (because they are antonyms) but nearby vertically (both being thermal). Researchers use a pinboard with more than two dimensions – often around 500 – so that words can be discriminated in multiple ways. For example, drawing a line from “man” to “woman” gives a direction for gender. Starting at “king” and following that same line results in “queen”. The meaning of the royal titles overlaps with that of gender terms, and the embeddings show how they are connected.

## The Colour Out of (Vector) Space

The same trick applies to colours and adjectives. You just have to [find the relevant direction](https://arxiv.org/abs/1802.01241) for a pair like hot/cold, and see where colour words turn up (see graphic). Refracting colours across adjective pairs like exciting/dull, selfless/jealous and relaxed/tense in this way revealed arrangements that lined up with both blind and sighted survey answers.

Repeating the experiment with different sources of text, the algorithm’s results were most human-like when it had access to fiction. Sentences about particularly vivid objects (eg embers, both red and hot, or bananas, both ripe and yellow) boosted the result, suggesting they were the main route for colours and adjectives to become linked.

Despite this evidence, the authors didn’t find that bookworms report stronger associations. But the participating students were a well-read bunch, so if they learned the associations from reading they may have been saturated.

Reading fiction is not the only way the blind could learn about colour; a handful in an earlier study had reviewed the spectrum in science lessons. Yet language must play a part, and word embeddings can untangle meaning that speakers take for granted. Such studies may illuminate how black-and-white text can convey sensory experiences. A picture may be worth a thousand words – but those words are no less vibrant.
