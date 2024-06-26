---
aliases:
- /2023/06/06/mojo
- /2023/06/06/mojo.html
date: '2023-06-06'
tags: [languages, popular]
title: Finding Your Mojo
---

Last month a startup called Modular released a new language called [Mojo](https://www.modular.com/mojo) (not to be confused with the [existing indigenous one](https://www.everyculture.com/South-America/Mojo.html)). Based on Python and designed for ML hardware and models, Mojo’s goals (“the usability of Python with the performance of C”) coincide with those of the Julia language, so I’m interested to compare notes.[^1]

Some throat-clearing to start. I’ve done a bit of work on Julia, particularly on its support for ML hardware and models, though it’s a few years since I've been directly affiliated. You decide if that makes me a more or a less reliable narrator. I’m basing this on the limited publicly-available material, I haven’t used Mojo deeply, and the design could well change before the full release – so some of this is forced to be speculative, and I may well have misunderstandings.

And my impressions are not meant as value judgements. Language design is about tradeoffs. You can’t generally pick two languages and say which is better (even if you did try them both). Languages make different choices, and those choices have far-reaching consequences both good and bad. Seemingly small decisions refract through the system like light like through a diamond, inevitable yet only half-predictable, sensitive to the slightest movement. The result will surprise you with subtle merits and blemishes. That is what makes design interesting.

This exercise is worthwhile because Julia and Mojo are quite distinct, and I’m glad they’re exploring different parts of the design space.

## Sugar, spice, and everything nice

First things first: Mojo uses Python syntax and is intended to be broadly compatible. And you can indeed run some Python code, even if a few things (classes, lists and dicts, comprehensions, generators and so on) are not done. So far as I can tell, this untyped code is compiled simply – boxed objects, dynamic dispatches etc – so there’s nothing fancy, just less interpreter overhead. That can get you a small speedup, if nowhere near C-like performance.

This is already quite different to Julia, which will type-infer and specialise every line of code. That’s not necessarily a good thing: the compiler spends time on code that might not benefit, and it requires Julia’s signature “method JIT” approach where compilation may have to jump in at runtime.[^charlotte] Mojo’s approach is better for compile times and separate / standalone compilation, and notebooks already feel notably snappy. On the other hand, it might limit the optimisation of unadorned Python code.

[^charlotte]: I've [argued before](https://github.com/MikeInnes/Charlotte.jl#design) that Julia would benefit from a more Mojo-like hybrid compilation model (in that case for web browsers, but any kind of deployment brings up similar issues).

It’s unclear whether we’ll get a “strict superset” of Python. While official sources say so, the docs also discuss “mechanical migration” (eg to add the `@dynamic` annotation for `class` compatibility, or to fix “identifier names that match Mojo keywords”). In my eyes full support means compiling any code CPython can run, without changes, with the same behaviour.[^2] (Running a CPython interpreter for interop doesn’t count, unless Julia too is a Python superset.) Notably, CPython will happily run code with incorrect or imprecise type hints, which would seem to be a challenge; even in checked code, Mypy’s structural protocols could be at odds with Mojo’s upcoming traits.

Then there’s the issue of “ownership and no GC [garbage collector]”. I don’t think this can be literally true either, or at least not in the strict sense of Rust, because dealing with lifetimes, borrowing and boxes in Python code would be onerous. Instead I imagine objects defined with `class` in Mojo (and lists, dicts, lambdas) will get a transparent ref-counted box, and skip the “mutable xor shared” policy. If so this may be a nice middle ground; it won’t be as watertight as Rust (more implicit and no guarantee against races) but it won’t be as awkward either, and you’ll be able to write Pythonic code without worrying about it.


## Groovy, baby, yeah

So you can run some Python code, but it won’t be fast on its own. To really [get your Mojo on](https://www.youtube.com/watch?v=pUJCNoLmRO4) you need its added ingredients, its Chemical X. And oh boy you’ll be adding some 🔥annotations🔥. Type annotations, variable declarations, compile time parameters, calling conventions, you name it.

What strikes me most about Mojo’s new features is how systems-oriented they feel. The Rust-style ownership model and Zig-like compile time values are a dead giveaway. Aside from that you’re dealing with value vs reference types, references to either, move / copy / borrow semantics, time-jumping `alias` definitions, various low-level calling conventions, some as-yet-unimplemented trait system for typed (/unboxed/fast) polymorphism, and so on. I can only draw impressions, but it’s probably somewhere between Swift and Rust in complexity.

If you strip out the Python parts, Mojo is a complete language in itself. More than that, it’s a systems language, not merely a fast one. The developers clearly wanted something with total control, down to the metal, as in Rust and C++. This contrasts starkly with Julia, which by default abstracts over those details. (For example, structs are just values, not active participants with `move` and `copy` behaviour; the compiler decides how things are shuffled in memory.) Julia finds a compromise between control and ease of use, while Mojo embraces both the learning curve and the awesome power of micromanagement. This will be a boon for writing accelerator kernels, which can be sensitive to the finer details of an algorithm, even if it’s overkill elsewhere.

It goes without saying that your typical Python programmer, who may not know what a “pointer” or “compile time” is, could find those details intimidating. Indeed Python’s great strength is in hiding the terrible machine, entombing it beneath mild-mannered objects that say please and thank you and don’t [messily sacrifice animals](https://scholar.harvard.edu/files/mickens/files/thenightwatch.pdf) in your home office. So my assumption is that the new features will mostly be hidden from end-users, in the same way that C is (mostly) hidden in CPython. Most people will carry on happily using plain old objects, dynamically typed and GCd, and not worry about the internals; low-level `struct`s will be wrapped in `class`es to make APIs, and so on.[^3] But the user can drop down (in the debugger, or with custom code) easily, even writing fast extensions from the same notebook. That’s compelling.


## Float like a serpent, sting like a C

I suspect there'll be a fairly clear line between the Python and the Mojo-extension parts of a codebase, and those parts are going to look and feel quite different. Making your code fast is a translation process, which involves moving from dynamic to static typing, changing GCd `class`es into borrow-checked `struct`s, using new keywords and annotations, swapping Python constructs like `int` for faster equivalents like `Int`, buying into a new trait system, moving work to compile time, and so on. (Conversely, to create an interface to your fast code, you’ll be doing a bit of wrapping.) These are deep changes – not mere extensions, but radical differences in programming model – and Mojo and Python are, if arguably not separate languages, at least two rather different dialects. The sense is less “Python with benefits” and more “Cython++”.[^4]

Julia doesn’t wholly avoid this two-dialect problem. It isn’t always fast by default, and you can generally tell whether code was written for performance or for fun. But Fast Julia is essentially the same dynamically-typed, garbage-collected language, with all the same keywords, data types and so on, as Flexible Julia. This reduces the learning curve and conceptual overhead, which is a major reason to avoid two disparate systems in the first place. Such stark differences make Mojo, in its current form, look less like a single, unified and coherent language, and a little more like the traditional way of combining “the usability of Python with the performance of C”: using Python and C.

Mojo’s approach is interesting nonetheless. That Slow Julia looks similar to Fast Julia can be unhelpful. Where a static language will yell if you do something dumb, Julia gets borderline passive-aggressive when it simply slows down a bit, waiting for you to dig into type inference results to figure out the problem. (“But you _look_ mad at me.”) In general, different tasks have different tooling needs, and tools that adapt to your goal (performance or simplicity), or even distinct tools that work well together, can be a good solution. Addressing the two-language problem by accepting them both, and annihilating the barriers between them, is an unorthodox but logical approach.[^5]

And the two sides, Python and the Mojo extensions, are indeed well integrated. You can of course share data types seamlessly, but you can also write `def`s that mix and match styles (even if this will feel like using Python interop in a static language, with casts etc). I’d like for future demos to make more use of this, rather than showing flexibility in one example and performance in the next. Finally, unlike Cython (which otherwise has a similar approach),[^6] Mojo is a single compiler with visibility into the entire codebase. That may open up some opportunities – like optimisation or autodiff across a neural network, both architecture and kernels together – which aren’t practical across separate language implementations.[^7] For me this is where Mojo shows the most promise and potential for novelty, and I’ll be eagerly following along.


## Loco Mojo promo

Finally, well, it’s not for me to give marketing advice, and personally I’m glad the Modular team are proud of their work. If they think Mojo is an “incredible breakthrough”, “the biggest programming language advance in decades”, etc etc, then more power to them. Even if it’s sometimes like a Jehovah’s Witness got into venture capital.

> Share the incredible news of Mojo 🔥 - a revolutionary new programming language that will change the nature of AI and compute altogether.

Good news indeed!

Burning-bush emoji aside, I think the team is calling victory a little prematurely. Modular adviser Jeremy Howard channels his inner Wolfram when he [proclaims](https://www.fast.ai/posts/2023-05-03-mojo-launch.html):

> There has, at this point, been hundreds of attempts over decades to create programming languages which are concise, flexible, fast, practical, and easy to use – without much success. But somehow, Modular seems to have done it.

In recent years several nice languages with these goals – not only Julia – have garnered popularity, and I’m not sure what makes them unsuccessful. That they don’t have a Python-sized user base? Quite obviously, neither does Mojo.

Unfortunately there’s no test suite you can pass or benchmark you can run to check if you’ve built a good language. Design is a technical feat measured by a social yardstick. Modular have a stellar team, a promising approach and a lot of hurdles to jump; they have not quite proved they can build a pleasant accelerator language of broad application, big advantages over the competition, and few enough design warts to gain widespread adoption, and time will be the only test of this.

I leave aside the appeal to the broader Python community, which reaches far beyond those who know or care what a GPU is. The most telling thing about Python users is that, in a growing world of fast and friendly languages, they still choose Python.

[^1]:
     I’m late to the party because I somehow missed the announcement until this week.

[^2]:
     [This talk](https://www.youtube.com/watch?v=qCGofLIzX6g) describes just how complex the Python interpreter is. You can’t change any of this without breaking stuff, and the more you emulate the slower everything gets. This is largely why Python doesn’t have a bunch of excellent, mainstream JIT implementations like JavaScript does.

[^3]:
     Though it isn’t always easy to hide the dragons. For example, even if a differential equation solver in Mojo has a Pythonic API, a user-supplied function will have to be written in the low level style for performance. The more complex the function, the more Mojo the user is exposed to, and the trickier the translation.

[^4]:
     And indeed being able to package and call Mojo easily from CPython, rather than replacing it per se, might be a good future direction.

[^5]:
     It’s not my aesthetic preference, of course. I like my languages like I like my coffee: achieving the maximum power with the fewest orthogonal components. (Ok, not a coffee expert.) But that lisp-ish sort of design minimalism seems to be out of fashion.

[^6]:
     “Cython aims to become a superset of the Python language which gives it high-level, object-oriented, functional, and dynamic programming. Its main feature on top of these is support for optional static type declarations as part of the language.”

[^7]:
     It’s easy in principle to do cross-language AD, including Python/C, but fiddly in practice.
