---
aliases:
- /2020/05/19/types
- /2020/05/19/types.html
date: '2020-05-19'
tags: [languages]
title: The Many Types of Types
---

Julia programmers love nothing like a good polysemy. One of the more extreme examples is the community’s use of the word "type", which refers to a cluster of related, but subtly distinct, features and their roles in the language. Ambiguity can provide a useful shorthand, but it can also be confusing to newcomers and those outside the community, so it might be useful to disambiguate a bit.

In short, types are Julia values that can play in one of the following parts: as tags for identifying meaning, selectors for dynamic dispatch, descriptions of data layout, annotations provided by type inference, hints for compiler specialisation, and constraints for compile-time correctness checking. These are all largely separate concerns that aren’t as tied together as they may seem.


## Data Tags

The most important use of types is to tell us what kind of data we have. If we have a pair of numbers it’s important to know whether it represents "an `(x, y)` cartesian coordinate" or "total assets and liabilities for a balance sheet", which should probably be treated very differently. The original and simplest way to do this is by [naming our variables carefully](https://en.wikipedia.org/wiki/Hungarian_notation):

```julia
weightInKilos = 10.0
```

This can get unwieldy when we have lots of data flowing through a system, though. It’s easy to lose track of what everything represents, and accidentally mix pounds with kilos, resulting in bugs. Instead, we can associate the raw value with a name that tells us what it’s for:

```julia
struct Kilograms
  value::Float64
end

weight = Kilograms(10.0)
```

In dynamic languages we have access not just to the value `weight.value == 10.0` but also to the name `typeof(weight) == Kilograms`, which I’ll call the _tag_. In more common OO languages the tag is provided by the _class_. While our program runs we can look at the tag and choose appropriate behaviour. Most languages provide shortcuts for this pattern, which brings us to –


## Dispatch

To bring meaning to our programs we usually want not just plain information, but a set of verbs we can use on it, like _adding_ two numbers or _writing_ to a file handle. Verbs are only applicable to some things (you can’t write bytes into a cartesian coordinate) and may behave differently in different contexts (writing bytes requires quite a different skillset to writing calligraphy). So almost all languages have some notion of _dispatch_ that routes a high-level verb to the right implementation.

```julia
write(f::File, bytes) = # ... complicated hijinks ...

write(f::Socket, bytes) = # ... inscrutable nonsense ...
```

`File` and `Socket` might have the same underlying representation (a pointer), and writing bytes to them is conceptually the same. But carrying out the operation might be quite different; in that case when you write `write(io, bytes)`, Julia can check what `io` is and go to the right implementation.[^1] Dispatch involves a surprising amount of machinery: the notions of _subtyping_ (which dispatch selector matches which data tags) and _specificity_ (which selector should take priority if multiple match, like CSS selectors) are some of the hairier parts of the whole system.

Note that although the notation `f(::T) = ...` resembles standard function argument types, it has a completely different meaning to most languages, which refer to compile-time types rather than runtime tags. It is arguably closer to pattern matching (with only the tag available for destructuring).


## Data Layouts

If we only cared about what our programs did – arguing semantics, if you will – we could stop there. If we care about performance and what our programs do under the hood, Julia’s types have a bit more to say. Say we define a complex number type:

```julia
struct Complex
  real::Float64
  imag::Float64
end
```

We know this creates a tag, a constructor that creates objects with that tag from two floats, and a selector which matches those objects. But it also defines a [composite data type](https://en.wikipedia.org/wiki/Composite_data_type) made of two floating point values, associated with the tag. This is important because we (and Julia) can predict how an object will be represented in memory from the tag – heap memory layout doesn’t depend on type inference. For example, the size of this object in bytes is `sizeof(Complex) == 16`. This feels fairly obvious, especially given the resemblance to C structs, but certainly isn't inevitable.


## Type Inference

Julia's performance depends heavily on its type inference. Inference is the only thing close to a type system in the formal programming-language-theorist’s sense[^2] – a way of statically working out of the sort of values that a program can produce. Normally, you’d use this to check for correctness. Julia uses it for performance. If we know a variable will always be a complex number, we can avoid the rigmarole of checking its type tag and selecting the right method every time the code runs.

I want to emphasise the difference between (static) types and tags. If you have a function `x = f()` that returns an integer or a string at random, the inferred type might be `x::Union{Int,String}`. But `typeof(x)` won’t be `Union{Int,String}`; it will either be `Int` or `String`, because that’s the tag of the actual object that `f()` returned in that moment. The variable `x` is like a hole that we’re trying to put something into. It has to have the right shape, but it doesn’t have to have _exactly_ the right shape, it just has to have space for whatever you might put in it. The static _type_ of `x` is the shape of the hole, and the dynamic _tag_ of x is the shape of whatever’s inside right now. These are very different concepts and, confusingly, Julia uses the same term for both.[^4]

<div class="fill">
  <img src="types.png" style="width: 60%" />
  <div class="caption">
    You can't fit a square peg in a round hole, but you can fit a square peg in a <code>round ∪ square</code> hole.
  </div>
</div>

It’s also worth pointing out that the `typeof(x)` function is nonsensical from the PLT / static typing point of view. A given object can fit into any number of holes; and the number `1` fits the types `Int64` (the set of all integers representable in a certain 64-bit format), or `{1}` (the set containing just the number `1`, and nothing else), or "1:100 ∪ _Heloderma suspectum_" (either a number from one to a hundred, or a spitting lizard).

To some extent, this reflects how we use the word in language. We might ask about "type", but to make the question meaningful we have to imply a set of possible answers. You’d ask "What type of animal is that?" or "What type of dog is that?", but you won’t get far by pointing at someone’s Dachshund and shouting "What type is this!?" Moreover, while we see "type of dog" as sort-of dynamic (a property of the thing itself), we also say things like "he’s not my type" which are sort-of static (a property of the hole you’re putting it into).


## Specialisation

Once we have type information, we can specialise, to avoid carrying around type tags and doing dispatch at runtime.

One thing I haven’t mentioned so far is type parameters, like `Complex{Int}`; these are key to telling Julia’s JIT what to specialise on and what work to leave to run time. Although they are superficially modelled on generics from static type systems, type parameters are really just fields that happen to get stored in the data tag. You can store an array size, for example, just as well in a normal field or in the tag, and semantically it gets carried around at runtime as usual. The difference is that Julia’s JIT will take it as a strong hint to specialise on that information: effectively assuming that it is constant, removing branches and dispatch that depend on it. In this way types (and particularly type parameters) have an important role in finessing Julia's compiler.

Note that Julia conflates properties we want to dispatch on with those we want to specialise on. This is a common design decision that turns out to work well in practice, but again, it's not inevitable.

## Checking

An honourable mention for the one thing Julia doesn’t do, which probably has the strongest association with the word "type" in programming languages: static checking for correctness. Despite gleaning a wealth of information through its compiler analysis, Julia goes out of its way to _avoid_ errors at compile time even if it can prove the code will throw up, in order to prevent compiler heuristics from affecting the behaviour of your code. This may become a role for Julia’s types in future.[^3]


## So, what is a "type"?

Having teased apart the role of types in Julia a little, here’s a little higher-level commentary.

In Julia we tend to describe objects like `Complex{Int}`, which are instances of `Type`, as types. But this is fraught. On their own, `Type`s are just objects like any other. We can use the same `Complex{Int}` object in a bunch of different type-like ways (as a tag, as a dispatch selector, as a result of type inference etc), and indeed in some non-type-like-ways (as a constructor function, or by printing it). But some "types" are only used as dispatch selectors (there is no `x` for which `typeof(x) == AbstractArray{T} where T<:Integer`) and some are only used as compile time annotations (there is no `x` for which `typeof(x) == Const(1)`). In fact, some of Julia’s static type assignments (like `Const`) are not even `Type`s! This definition of "type" is at best very Julia-specific, and doesn’t even cover its own use of types completely.

These issues are not unique to Julia. Every language I can think of tangles these ideas together in its own way. C’s `struct` primarily defines a fixed data layout, giving no dispatch options and creating no runtime-accessible objects. Java’s `class` gives no options for data layout; used as a type annotation, a class includes its sub-classes, allowing for dispatch and leaving it wide open what will be present at runtime. All C and Java's definitions have in common is that they define a compile-time name that can be used for type checking, which is the one thing Julia’s `struct` _doesn’t_ do.

Functional languages like ML and Haskell do dynamic dispatch very explicitly (by case-splitting of ADTs/enums) and sometimes have an entirely different mechanism for the static kind (modules or typeclasses). Ironically, the bolted-on TypeScript system is perhaps the cleanest one here: types used purely for compile-time checking with no impact on the runtime at all. If you want ADTs, [just create the tags explicitly](https://www.typescriptlang.org/docs/handbook/advanced-types.html#discriminated-unions), SICP-style. Then where do CSS selectors, which only influence dispatch (of styling rules), fall?

I’m not really answering the question. But it seems that we either put up with the ambiguity, or we define "type" in such a narrow way that it captures neither the intuitive understanding of type, nor much of the interesting parts of how programming languages represent different bits of data – something of a dilemma. Perhaps "type" is an inherently fuzzy concept, and when we want to talk precisely we have to pick something concrete out of the cluster of ideas that come with it.

Hopefully, when you hear the word "type", the ambiguity won’t pose too much of an issue. Just dispatch to the right meaning from the context.

[^1]:
     Incidentally, Julia distinguishes between polysemes (different methods of the same function) and homonyms (different functions with the same name). `reverse(::String)` and `reverse(::SelfDrivingCar)` should be different functions, because they represent different concepts, even though they happen to share a spelling. This is meant to make reading code easier – the _meaning_ of `f(x, y)` depends only on what `f` is, not on all the types of its arguments.

[^2]:
     The PLT view on this is very simple: type systems are compile-time theorem provers, and languages without such provers are unityped and therefore uninteresting. I have no issue with the PLT definition of "type" in itself, but am not convinced that it’s the only useful one, or that other ways of describing and organising information can be dismissed out of hand. Most languages mix compile- and run-time approaches to organisation in one system, so compile time alone gives an unhelpfully incomplete picture.

[^3]:
     The usual static/dynamic language distinction seems limited here. Does applying a sufficiently smart linter to Julia (or JavaScript, via TypeScript) suddenly make the _language_ static? Does over-using the `Object` type risk turning Java dynamic? Perhaps it’d be more correct to say a language _has_ a static checker, or is designed for static checking, than that it simply _is_ a statically typed language. Of course, languages can be easier or harder to effectively check, in the same way that it can be easier or harder to make them run fast.

[^4]:
    In theory, Julia's type inference is an implementation detail. In practice, users spend a lot of time looking at `@code_typed`, modify code to mollify inference, and depend on it doing its job in a predictable way for their code to continue working. Common terms in the community like "type stable" refer to this kind of type, rather than the tag kind.
