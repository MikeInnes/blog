---
aliases:
- /2020/06/04/iterate
date: '2020-06-04'
tags: [languages]
title: Iterate on it
---

When you write a `for` loop in Julia, like

```julia
for x in xs
  # do something with x
end
```

this expands to

```julia
next = iterate(xs)
while next != nothing
  x, state = next
  # do something with x
  next = iterate(xs, state)
end
```

Any Julia object – an array, a linked list, an infinite generator, whatever – [can then implement](https://docs.julialang.org/en/v1.4/manual/interfaces/) `iterate(xs)` and `iterate(xs, state)` to make iterating over it with `for` possible, as well as getting a few other utilities like `collect`.

This is a lot nicer than Julia’s original, [pre-1.0 iteration protocol](https://docs.julialang.org/en/v0.6/manual/interfaces/) which used `start`, `next` and `done` instead of the current `Optional`/`Maybe`-like pattern. The problem with the former approach is that some iterators, like `Channel`s, don’t know whether they have a next value or not [until you try them](https://github.com/JuliaLang/julia/issues/8149), which meant that many iterators awkwardly [did all their work in `done`](https://github.com/JuliaLang/julia/issues/6125). So the 1.0 design above made it far easier to define asynchronous iterators like channels.

Unfortunately, the new protocol still has an issue: it can leak memory. Notice that `xs` must remain alive over the entire loop. In many cases that makes total sense (if you iterate over an array, you want the array to stick around so you can index it). If you have a linked list, though, it’s unnecessary: you only need the current element of the list, not the first, to carry on iterating, and if you let go of the head you can let the GC clean up the list as you go along.

In many cases, this is a minor missed optimisation opportunity. If you have very large functional data structures, [even infinite ones](https://github.com/MikeInnes/Lazy.jl) (the functional equivalent of an indefinitely long generator / channel), it’s a disaster.

Compare this to the Rust- or Swift-like protocol ([inspired by Python](https://github.com/rust-lang/rust/pull/5810), though that language uses exceptions to simulate `Optional`), which we can represent in Julia as:

```julia
itr = iterator(xs)
while true
  next = iterate(itr)
  next == nothing && break
  x, itr = next
  # do something with x
end
```

This is arguably a more elegant meaning for `for`, especially since in Rust and Swift it can be written something like `while let x = itr.iterate() { ...` to handle both the optional and the modification of `itr`. It also provides more flexibility; for arrays, `itr` can be a reference to an array and a current index, but for lists it can just be the current element, avoiding the memory leak.

It’s unclear why a Swift/Rust/Python-style iteration protocol wasn’t considered for Julia. While [one of many issues on multi-line comment syntax](https://github.com/JuliaLang/julia/issues/69) has 121 comments, the [iteration overhaul proposal](https://github.com/JuliaLang/julia/issues/18823) just says ‘we hashed it out at JuliaCon’ and there’s no mention of alternatives or tradeoffs considered.

Iteration seems to be a solved problem in modern, high-level, performance-sensitive languages, and it’s strange that Julia didn’t just copy the standard solution word-for-word, let alone that other languages were not mentioned at all during the design process. My best guess is that it came down to time constraints imposed by an impending feature freeze. The current protocol already required an extensive compiler overhaul, further delaying a beleaguered 1.0 release. Swift/Rust-style iteration additionally requires at least stack allocation of structs containing references to be efficient, an optimisation which [only just landed recently](https://github.com/JuliaLang/julia/pull/33886).

In a language with rampant mutation, this issue isn’t that big of a deal. It’s easy to write large/indefinite generators that simply self-destruct as you iterate over them, as is standard in many imperative programming languages. But it’s a shame not to have the choice.
