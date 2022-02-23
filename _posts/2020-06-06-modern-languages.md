---
title: The Modern Language Designer
---

Programming language design and implementation is, always has been, and likely always will be, hard. But it’s hard today for completely different reasons to those fifty years ago, when the PL field first bloomed. In the past a budding language designer more or less just had to hack together a parser, throw out machine code and call it a day (albeit this is harder than it sounds with then-current tools). In 2020 such a language could be a weekend project – but in turn, language designers face many new challenges and a much higher bar for success.

In the 70s, choosing syntax was (I imagine) quite a big deal, with little in the way of prior art to guide your choices. In the 2020s programmers have a shared intuition for syntax that transcends languages. Basic ideas like block structure, lexical scope and use of indentation are universal and aren’t going anywhere. More specifically, C-like syntax (via its modern incarnations in Rust and Swift) is taking over, even influencing [new functional languages](https://github.com/koka-lang/koka/blob/c87c060a8ef5770f0dda9a3c795b1024c020a017/lib/std/async.kk) that use effect handlers. Still, Pascal-, ML- and Lisp-like notations aren’t dead yet. Realistically you’re going to choose one of these syntax families as a base and make minor adjustments. There’s a little room for innovation here and there, but the biggest decisions about syntax are made for you.[^1]

Turning syntax into runnable machine code used to mean reading a dense manual, possibly specific to your make of PC, and staring a _lot_ at your code to figure out the inevitable bugs. At the least you’d have to do register allocation and expand your language primitives into machine code sequences; more advanced compilers would do peephole optimisations, removing redundant instructions or even pattern matching to reorder and replace code for best performance on the target hardware. Then you’d have to do it again for a different kind of computer, not to mention other tooling like linkers and debuggers.

Nowadays, all of this work – and a lot more besides – is taken care of by [LLVM](https://llvm.org/). With some caveats, you can casually spit out LLVM IR and get great performance on every major hardware platform, as well as a comprehensive toolchain.

Given all this tooling, can language designers finally move to a three-day working week? For better or worse, the actual result is ever-higher user expectations. In the last two decades, expansive cross-platform standard libraries, featureful runtimes, memory safety, language interop and concurrency support became table stakes for languages of all stripes. 2020 will only add to this list, with responsive, powerful IDE tooling becoming a new priority.


## Modern Compilers

Implementers don’t have to think too hard about native code generation, but do have to choose what route they will take to native code. The two major options are (1) to use LLVM to compile native code ahead of time, or (2) to ship bytecode for a virtual machine like the JVM, Dotnet CLR or WebAssembly which can be compiled on-device.

VMs have a lot of nice advantages in theory, chiefly that they are very cross-platform and come with state-of-the-art runtime tools (like garbage collection) that you’d otherwise have to build yourself. Unfortunately, they traditionally have some _weird_ problems that are showstoppers for many languages, such as the lack of value types on the JVM. No major VM supports coroutines, the clear winner in approaches to composable concurrency, so if you want this feature you’re back to building your own runtime. [Project loom](https://wiki.openjdk.java.net/display/loom/Main) and the [Wasm effect handlers proposal](https://github.com/effect-handlers/wasm-effect-handlers) are exciting here, though. If and when wasm achieves [its ambitious goals](https://github.com/WebAssembly/proposals)[^2] there will be far fewer reasons left to go native, and VMs have every chance to play a starring role in future language innovation – much as LLVM has over the last decade.

To be clear, targeting a VM (or LLVM) is not a silver bullet, and does not absolve you of having to write a good compiler. Recent high-performance languages like Swift, Rust and Julia all have an advanced mid-level compiler whose IR closely reflects the high-level language’s semantics (as opposed to LLVM’s). This layer can optimise much more aggressively than LLVM in many cases, particularly in terms of stripping away dynamism and deciding how things are laid out in memory, before letting LLVM do lower-level work. Compiler skills are therefore as valuable as ever, even if the level of abstraction has changed.

Compiling to a machine-code intermediate is not the only option, but it’s probably the only one that matters.[^3] Compiling to JavaScript was fruitful in the last decade but its time has passed. That is largely because of the inexorable onward march of the ECMA standards committee, which has assimilated the best ideas from upstarts like [CoffeeScript](http://coffeescript.org/) rather than succumbing to them. To get the benefits of V8 (free optimisations and tooling) your language has to be pretty similar to JS, and the cost of retooling for something only a little better is not worth it for users. So the JS community has settled on a few blessed extensions to the language (TypeScript, JSX) while evolving the core through official channels. Languages that are very different from JS, like Elm, use it mainly to get into the browser, and will benefit from WebAssembly in the long run.

Of course, you can also just write an interpreter, but this too seems passé. Dynamic typing and interactivity are good things, but we know how to get both without the high overhead that interpretation imposes. The PL arena is competitive enough that new contenders need to fight on multiple fronts, and reasonable performance is just too valuable to pass up. The exception might be a language with [radical new abstractions](http://witheve.com/) that enable mind-exploding productivity improvements. But the last decade of successful languages have been evolutionary, not revolutionary, gradually dismantling tradeoffs in existing tools. At this point a buck in that trend would be surprising.

In short, the last decade saw a renaissance for fast, high-level, compiled languages that get the best of all worlds (Rust, Swift, Julia, Nim, Crystal, Go, Zig, etc), and I fully expect that trend to continue.


## Modern IDEs

Turning high-level abstractions in high-performance machine code seems like more than enough work to be getting on with. But it’s really only half of the story. Modern languages have a compiler that can be turned back towards the user in order to provide help while coding. Editor support is no longer just a separate add-on that the IDE people worry about, but a fundamental job of a language’s compiler stack.

If it isn’t already, it will become a faux pas to launch a language without basic editor support. At the least this means syntax highlighting, but really includes context-sensitive autocompletion, inline diagnostics for parse and type errors, refactoring, jump-to-definition, the works. This is a trend buoyed by generic editors and standards like [VS Code](https://code.visualstudio.com/) and the [Language Server Protocol](https://microsoft.github.io/language-server-protocol/), which mean that implementers only need to expose the information rather than build an IDE.

What’s most surprising about building these tools is the deep effect they have on compiler architecture. For starters you have to [open up the black box](https://github.com/dotnet/roslyn/wiki/Roslyn-Overview#exposing-the-compiler-apis), ensuring that there are APIs for the information at each stage of the compiler. But you’ll probably also want to extend your AST to make sure it can [round-trip back to readable text](https://github.com/dotnet/roslyn/wiki/Roslyn-Overview#working-with-syntax), preserving comments and whitespace even after programmatic edits to the tree. And make sure to use [persistent data structures throughout](https://docs.microsoft.com/en-gb/archive/blogs/ericlippert/persistence-facades-and-roslyns-red-green-trees) so that multiple threads can analyse changing code robustly and efficiently. Of course, it goes with saying that your parser should be [fault-tolerant](http://duriansoftware.com/joe/Constructing-human-grade-parsers.html), so that a single problem doesn’t bork editor support everywhere, and [incremental](https://news.ycombinator.com/item?id=13915150), so it doesn’t have to re-parse everything on every edit. Remember, you’re aiming to update your entire view of the world and re-compute whatever a user needs in 100 milliseconds, before they enter a rage over editor sluggishness.

Getting this stuff right is hard – really hard. But I don’t think it’s so hard that it’s better to write your compiler twice. I expect that smart language designers will begin to make their compilers work this way from day one, rather punting on it and hoping for a do-over ten years down the line. And PL history suggests that we’ll figure out how to share and reuse a lot of this tooling. It will get easier.


## Modern Debuggers

Outside of large industrial projects, debugging is an oddly neglected part of language implementation. Debugging experiences seem to fall roughly into three categories:

1. Systems programmers, who can use a [time-travelling debugger](https://github.com/mozilla/rr) on a project with seven different languages, followed by a few other impossible things before breakfast.
2. Web developers (and other VM users), who have solid and much more accessible, but quite language-specific, debuggers.
3. Everyone else, who gets told to use `print` and deal with it.[^4]

I suspect really solid debugging is uncommon partly because it requires a deep, idiosyncratic understanding of both a particular compiler and a particular debugger. That only reliably describes systems programmers working on systems languages. JS presumably has good debugging because that’s the kind of thing a tracing JIT developer does to relax over a lunch break.[^5]

Unlike other areas of language implementation, debugging doesn’t seem to have gotten a whole lot easier over the last decade. The basic task, associating compiled instructions with source line numbers, is pretty easy, provided you can carry this information through compiler passes that reorder, shuffle and shake your code to optimise it – a small matter of programming.

The really hard part is understanding where your data is in the running program. A variable might live in registers, on the stack, or on the heap through a series of pointers. Different parts of a structure might live in different places. Parts might not be there at all, if the compiler decides they are redundant. Data layouts might change over time, and they might even depend on _other_ data. For this reason the major format used to track this information, [Dwarf](http://www.dwarfstd.org/), is less like simple metadata and more like yet another low-level programming language you have to compile your code to, alongside the regular one. While optimisation passes are putting your code through a blender, you carefully watch everything that happens, and emit Dwarf code that carefully undoes it all, turning low-level registers back into high-level objects at runtime. This is, as you can imagine, not that easy, and Dwarf is a complex format with many deep, dark depths.

VMs have made this easier only by cheating; they just assume that all source languages have roughly the same object model, and therefore only require the simpler source mapping. So if you debug Elm code, for example, you’ll see Elm source with JavaScript values. Likewise for the ugly Java stack traces and classes that show up during Clojure debugging. VMs often have flexible-enough object models that this is a nuisance rather than a showstopper, but it can still be a significant limitation.

The good news is that WebAssembly VMs are taking this problem seriously and beginning to [support](https://developers.google.com/web/updates/2019/12/webassembly) [Dwarf](https://hacks.mozilla.org/2019/09/debugging-webassembly-outside-of-the-browser/). This is another step towards making VMs viable for a wider range of languages, and getting cross-platform support by default goes a long way to justifying the effort a debugger takes. Even better, what the web supports tends to get great tooling and become more accessible very rapidly. With any luck, this leads to a virtuous cycle where language developers take debugging seriously and make use of the tools, which leads to more tooling development, and so on. 2020 could be the decade of near-universal, high-quality cross-language debugging.


## Modern Conclusions

The fact that new languages can target an optimising backend like LLVM or WebAssembly might make compilers seem like a largely solved problem. This could not be further from the truth, even if the challenges have changed a lot over the last five decades. Designers of new languages will have to deeply intertwine their desired abstractions with ways of producing highly optimised low-level (intermediate) code, providing comprehensive and fast editor support, and ensuring a great debugging experience – and they’ll have to dive deep into the guts of a compiler to execute their ideas. And that goes on top of all the usual stuff a language needs to thrive.

I don’t know if these things will be any easier in 2030, or what challenges language designers in that decade will face. But I expect their jobs will still be pretty hard.


## Modern Notes

[^1]:
     A possible recent exception is Clojure, whose marriage of Lisp s-exprs with JSON-like data notation has been influential.

[^2]:
     The wasm developers even take seriously the idea of [supporting JIT compilers written in wasm](https://github.com/WebAssembly/design/issues/1227), which would put a really high ceiling on what VM languages are capable of.

[^3]:
     It’s not completely infeasible to build your own native toolchain; Google did it for Go. But I’m betting you don’t have as much engineering money as Google.

[^4]:

     There are exceptions to this, but they tend to either use interpreters for debugging (Python, R, Ruby, Julia, Haskell), be at the very highest tier of popularity (Java, C#), or otherwise have an unusually strong (and expensive) compiler/systems effort behind them (Swift, Go).

[^5]:
     Partly kidding, but a tracing JIT requires a lot of the same functionality (eg interrupting code, decompiling it and replacing it with an interpreter) that a debugger requires, so it’s quite a different challenge compared to an ahead-of-time compiled language.
