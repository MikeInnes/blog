---
date: '2025-04-20'
tags: [raven]
title: A Language for Sorcery
---

I've been working on a new programming language, called [Raven](https://github.com/Unkindnesses/raven). It's still experimental, and not ready for serious (or even silly) users. But curious language nerds such as yourself may find it interesting. If you want to follow along then [sponsor me](https://github.com/sponsors/MikeInnes), and I'll give you early access to the repo along with regular behind-the-scenes updates.

*Update: Raven's [repo](https://github.com/Unkindnesses/raven) is now open to everyone!*

Raven is small but smart. It should feel tight and intuitive, lightweight enough for interactive notebooks and scripting, yet capable and adaptable for big projects with hard constraints. It's difficult to summarise an entire language, so here's a small snippet to warm up with:

```raven
fn fib(n) { fib(n-1) + fib(n-2) }
fn fib(1) { 1 }
fn fib(0) { 0 }

fn fibSequence(n) {
  xs = []
  for i = range(1, n) {
    append(&xs, fib(i))
  }
  return xs
}

show fibSequence(10)
```

(For more samples try my [brainfuck interpreter](https://gist.github.com/MikeInnes/825c7bc5439f06054ea8bac8cc80aa80#file-brainfuck-rv), the [current malloc](https://gist.github.com/MikeInnes/825c7bc5439f06054ea8bac8cc80aa80#file-malloc-rv) or [complex numbers](https://gist.github.com/MikeInnes/825c7bc5439f06054ea8bac8cc80aa80#file-complex-rv).)

If you save this in a file like `test.rv`, compile it and run it you'll get the output:

```raven
fibSequence(10) = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55]
```

Despite the familiar C-ish look, Raven is primarily a functional language, and a Lisp. It comes with [fast multi-dispatch](https://mikeinnes.io/sponsor/posts/dispatch/), as in the overloaded `fib` function. Basic types are defined as [Haskell](https://www.haskell.org/)-y ADTs which you can pattern match on, as in:

```raven
bundle Optional[T] { Some(x: T), Nil() }
```

But the standard library will also provide Python-like dictionaries and lists, which most users will stick to. It's geared towards seamless metaprogramming and DSLs, and in fact has no built-in keywords: `fn`, `for`, `show` and co are technically macros, and could have been user-defined.

Raven is inspired by [Clojure](https://clojure.org/)'s ideas about state and change, and borrows its convenient persistent data structures (without modifying theirs, of course). We're not zealous about functional purity, but you have to go out of your way to get shared mutable state. Unlike Clojure we embrace control flow: what looks like mutation is syntax sugar, and `append(&xs, x)` is equivalent to `xs = append(xs, x)`.[^ssa] This shortcut helps programmers, making it easier to express certain algorithms, but also aids the compiler, enabling [Swift](https://www.swift.org/)-style "copy on write" optimisations. I think we can embrace values without unduly harming performance.

[^ssa]: The first thing the compiler does is convert code to SSA form, whose "basic blocks" are equivalent to a set of mutually recursive functions with immutable variables. You don't have to use mutable locals, but if so you're only doing SSA conversion by hand, so there's no benefit to abstaining.

And performance is a priority, despite Raven's high-level feel. Immutability and pattern matching mix wonderfully with [Julia](https://julialang.org/)-like dataflow type inference, allowing Raven to generate skinny [WebAssembly](https://webassembly.org/) code without needing type annotations.[^array] The abstract interpreter is free to specialise on values and unroll loops, for powers similar to [Zig](https://ziglang.org/)'s `comptime` or [Jax](https://github.com/jax-ml/jax)'s partial evaluation. The compiler is incremental and demand-driven, enabling [live coding](https://www.scattered-thoughts.net/writing/there-are-no-strings-on-me/) and interactive use ([browser demo](https://code.mikeinnes.io/) for sponsors). Meanwhile batch mode produces minimal `.wasm` binaries that run anywhere. The plan is to support separate compilation, too, so that (for example) a compiled plotting library can be streamed to a browser-based notebook on the fly, instantly.

[^array]: For example, the `fibSequence` output above is inferred as a list of machine integers and stored contiguously in memory, rather than as Python-style pointers to arbitrary objects.

There's a programming aphorism that a language must be at least ten times better than its predecessors in order to take off. I think Raven's combination of features makes that goal feasible – support for web browsers alone cuts all the friction usually suffered to get to "hello, world". I see the future of programming in terms of apps like Notion or Figma: rather than traditional source repos and editors, think interactive, collaborative, canvas-style workspaces that live on any device, accessible by the billion or so people who access the internet only through a smartphone, creating shards of logic that run at [zero marginal cost in the cloud](http://mikeinnes.io/sponsor/posts/wasm/). My highest ambition is for Raven to be the default choice both when prototyping ideas in a notebook and when publishing those ideas as [explorable explanations](https://distill.pub/).

But I also don't want people to be limited as prototype evolves into practice, which means having excellent tools for deployment, performance tuning and managing large codebases. Like [TypeScript](https://www.typescriptlang.org/), Raven can turn its analysis into great tooling, and many errors can be found ahead of time. But rather than building on untyped JavaScript, Raven was designed for flow-based inference, making it easier to get precise results. As one example, Raven discourages `if` statements in favour of `match` clauses which ensure all cases are covered (and [narrow types](http://mikeinnes.io/sponsor/posts/narrowing/) more effectively too). As another, we have no trouble inferring recursive functions, like one that builds a linked list out of tuples:

```raven
fn foo(n: Int) {
  if n == 0 {
    return nil
  } else {
    return [n, foo(n-1)]
  }
}
```

No system I'm aware of can infer code like this, without an explicitly-defined recursive type.[^crash] Raven [can compute](https://mikeinnes.io/sponsor/posts/recursion/) the type `(T = nil | [Int64, T])`, and this will work however complex your code gets, whether producing trees containing linked lists or whatever. Which is great for prototyping – but you can still spec out the recursive type and check `foo` conforms, if you want.

[^crash]: In fact similar examples crash the compiler in [Mojo](https://github.com/modular/mojo/issues/3471) and [Crystal](https://github.com/crystal-lang/crystal/issues/11940).

Underneath, there isn't really such a thing as a user-defined "type" at all. In a definition like `bundle Complex(re, im)`, the `bundle` keyword is really a macro that generates constructors like `fn Complex(re, im) { pack(tag"Complex", re, im) }` (alongside hooks for printing and pattern matching). `pack` is Raven's primitive tuple type and `tag`s are symbols used to distinguish different tuples. Just as in Smalltalk [everything is an object](https://courses.cs.washington.edu/courses/cse505/99au/oo/smalltalk-concepts.html), or in Mathematica [everything is an expression](https://reference.wolfram.com/language/tutorial/Expressions.html), in Raven everything is a `pack` – [even basic numbers](http://mikeinnes.io/sponsor/posts/bits/). User-defined values are just as good as built-in ones, because the compiler infers structure, noticing when the tag is constant and storing only the contents on the stack.

```raven
raven> showPack Complex(1, 2)
Complex(1, 2) = pack(tag"common.Complex", 1, 2)

raven> showPack [1, 2, 3]
[1, 2, 3] = pack(tag"common.List", 1, 2, 3)

raven> showPack 1/3
(1 / 3) = pack(tag"common.core.Float64", bits"0011111111010101010101010101010101010101010101010101010101010101")
```

Raven does rely on implicit runtime support for things like memory management. But what it needs is predictable and generated on the fly, so you can write code comparable to [Rust](https://www.rust-lang.org/)'s `#[no_std]`. The language's own [memory allocator](https://gist.github.com/MikeInnes/825c7bc5439f06054ea8bac8cc80aa80) is part of the standard library. I wouldn't sell Raven to Linux kernel maintainers, but it's capable of low-level work when needed.

But the usual approach to abstraction is flipped around. Rather than a set of CPU-specific primitives upon which more abstract data structures are built, Raven starts with an abstract core and treats the CPU like an optional library. Interfacing with the hardware or operating system is not logically different to using a web API.[^cpu] By making the CPU less of a special case, it's easier to work with other hardware, or even different programming models entirely. It should be more feasible to do compiler-supported autodiff (like [Zygote](https://github.com/FluxML/Zygote.jl)) or probabilistic programming (like [Stan](https://mc-stan.org/) or [Infer.net](https://dotnet.github.io/infer/)) in Raven than anywhere else.[^ad] Factor graphs, differential equations and logical query languages can all be viewed as alternative "backends" for a single source language, just like WebAssembly, SPIR-V or XLA are today.

[^cpu]: In the default configuration everything ends up on the CPU: the hardware is accessible to user code (eg via explicit pointers), and it's _also_ the backend for the abstract core (eg lists turn into pointers). But these are subtly distinct roles! Raven code might equally compile for a [TPU](https://cloud.google.com/tpu/docs/intro-to-tpu) (via [XLA](https://openxla.org/)), or to logic gates (like [Verilog](https://en.wikipedia.org/wiki/Verilog)), or to a set of differential equations (like [Modelica](https://modelica.org/)), and in those cases the CPU "library" would not be available.

[^ad]: A good way for the language to differentiate itself.

So that's a whirlwind tour of Raven's ideas and goals. To be clear, the project is still a proof-of-concept rather than a practical tool. But the foundations are just about laid, which means things are just getting interesting. I'm ready for early poking and feedback on its designs, which is why I've written about topics like [syntax](https://mikeinnes.io/sponsor/posts/syntax/), the [type system](http://mikeinnes.io/sponsor/posts/recursion/), or why I'm using [reference counting](https://mikeinnes.io/sponsor/posts/memory/) and [targeting WebAssembly](https://mikeinnes.io/sponsor/posts/wasm/). And there's much more to talk about still, including ideas for [structured concurrency](https://vorpus.org/blog/notes-on-structured-concurrency-or-go-statement-considered-harmful/), [the error model](https://joeduffyblog.com/2016/02/07/the-error-model/) and [effect handlers](https://mikeinnes.io/posts/transducers/).

In time Raven will, of course, be completely open source (it's already MIT licensed, despite the hidden repo). But for now I'm looking for a small, focused audience I can engage fully with. I also want to figure out sustainable funding so that I can commit to this work. Hence the sponsorship model. It's early days and I'm still figuring this all out, but wherever the road leads, I hope you'll [join me](https://github.com/sponsors/MikeInnes) for the ride – it's going to be fun.
