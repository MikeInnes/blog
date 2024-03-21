---
aliases:
- /2014/05/26/speed
date: '2014-05-26'
description: Performance matters, even if you don't write fast code
tags:
- languages
title: Speed in Programming Languages
---

Computers are more powerful than ever before. Now that you can buy watches which outpace the earliest supercomputers, it seems logical to think that the efficiency of your software no longer matters. And yet, performance is the new black, with recent languages like Go, Julia and Rust aiming to provide expressive power and ease of use without compromising on CPU cycles.

Julia is probably the most extreme example of this trend, with its lofty goal of being as dynamic and expressive as languages like Python, Ruby or R while still traveling at the speed of C. At the moment it’s mostly aimed at number crunchers for whom raw FLOPS are the holy grail, but I would suggest that it’s also relevant to the exact opposite camp — even if you happily use languages like Python and never even think about performance.

If you’re this kind of coder, your reaction to these languages may well be something like: "So what? My language is already productive, and my code is never the bottleneck anyway."

This is a perfectly valid stance. Realistically, if you do fairly standard things in your language and can delegate most of your work to the libraries (which are probably written in C anyway) you’re not going to see any immediate benefit from languages like Julia.

But there’s an interesting point there: libraries with any kind of performance sensitivity are indeed written in C (they have to be, or the language would be unbearably slow) and at some point, someone had to write those libraries.

I think we can all agree on the benefits of Python and friends; the time taken to write usable programs is reduced to a fraction, ideas are easier to express and the resulting code easier to reason about. Most importantly, these benefits lead to better software and more of it.

And yet, the benefits that dynamic languages are designed to provide often aren’t available to library developers, and thus often don’t benefit the libraries themselves. The respective ecosystems of Python, Ruby, R, etc. are huge and wonderful, largely as a result as the enormous effort that has gone into them — but every time C is used instead of R, for example, means wasted man-hours that could have been spent making even more awesome tools. Worse, the barrier for entry to developing efficient libraries is much higher — which unfortunately for many people means they just won’t bother. Libraries in general must make the unfortunate choice between requiring contributors to have arcane C knowledge or inevitably suffering from performance issues.

The value of languages like Julia, then, isn’t in their raw speed (which is often important, but generally not all that interesting) but in what that speed enables. All of Julia’s packages are written in Julia itself, and that’s been a huge factor in its quickly growing ecosystem. Consider that relative newcomers to the language have implemented low-level constructs like subarrays for the standard library — how often do people who’ve just learnt Python start hacking NumPy?

Plenty of the Julia community’s contributions simply wouldn’t have been made if performance wasn’t so accessible within the language, and this combined with the language’s emphasis on small, composable pieces means that the barrier to entry for making useful packages is lower than ever — and in turn, Julia’s libraries tend to be high-quality, too.

You may not care about performance directly, but you’ll always depend on software that other people have built — so a better, more productive experience for them means a better experience for you, too. Julia’s combination of ease-of-use and performance means that it has one of the best stories around for library developers, and long-term that will be its real value.