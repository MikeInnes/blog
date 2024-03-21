---
aliases:
- /2017/06/05/lazy
date: '2017-06-05'
title: The Lazy List
---

"Any sufficiently advanced technology is indistinguishable from magic," go the famous words of Arthur C. Clarke. Often with seemingly-magical technology, a small dose of knowledge is enough to wash away our wide-eyed awe and bring us back to sweet, comfortable cynicism. Yet some ideas don't lose their lustre so easily; it can be a little hard to believe they work even once you understand them.

Laziness is one such idea. Today I'd like to give you a taste of the borderline-magical things that lazy sequences can do. But we'll also peek under the hood of the abstraction, and understand what's *really* going on. By the end you should have the foundations to implement them yourself.

## The Gateway

Here's a motivating example to whet your appetite, written using [Julia](https://julialang.org). You've probably already seen functions defined recursively, in terms of themselves.

```julia
fib(n) = n ≤ 1 ? n : fib(n-1) + fib(n-2)
```

Have you ever seen a piece of data defined in terms of itself? Here's the same sequence of numbers, but instead of a function `fib(n)` we get a list `fibs = (0 1 1 2 ...)`.

```julia
julia> using Lazy

julia> fibs = @lazy 0:1:(fibs + tail(fibs));

julia> take(10, fibs)
(0 1 1 2 3 5 8 13 21 34)

julia> fibs[100]
218922995834555169026
```

`:` means prepend, so `4:[5,6]` gives you `[1,2,3]`, and `tail([4,5,6])` gives us `[5,6]`. So ignoring the `@lazy` for now, we can roughly translate this definition into English: The fibonacci sequence consists of the number zero, followed by the number one, followed by the entire fibonacci sequence (added to itself).

Now, if I'd told you this definition up front, you probably wouldn't think it was overly helpful. Yes, you say, but now to find out fibonacci numbers, I need to know the fibonacci numbers!

And yet, here they are, appearing before us as plainly and reliably as a nos cannister in a quiet London side street. As if that weren't enough, this list is also *infinite*; we can index into the list to get any fibonacci number we want[^infinite], despite the fact that there's no control flow, variables, or visible computation to speak of. How?

[^infinite]: Note that machine integers will overflow pretty quickly. You can replace `0` with `big(0)` to fix that.

## The Rationalisation

I want to convince you that this at least makes *some* sort of sense before moving on. It's not magic, even if we don't understand the concrete steps yet. Suppose you wanted only to work out the sequence by hand – we can reason it through by enumerating elements one by one.

```julia
fibs[1] = (0:1:[...])[1] = 0
fibs[2] = (0:1:[...])[2] = 1

fibs[3] = (0:1:(fibs + tail(fibs)))[3] =
  (fibs + tail(fibs))[1] = fibs[1] + fibs[2] = 1

fibs[4] = (fibs + tail(fibs))[2] = fibs[2] + fibs[3] = 2
```

For the first two elements we can ignore most of the definition and just look at the beginning; those are trivial. For element `3` we simply want the *first* element of the *rest* of the definition. We can treat both sides of the `+` independently – since it acts element-wise – and calling `tail` is effectively the same as adding one to the index.

All the elements above `2` follow the same logic. It turns out that if we work it through, calculating the next element only ever requires elements we already know, so there's no paradox.

This proves that `fibs` is enough to define, unambiguously, the sequence of fibonacci numbers. That's a start. But it still seems pretty suspect that our dumb machine can do all of this reasoning on its own; to understand how that happens, we have to *go deeper*.

## The Enabler

Like so many great ideas, linked lists originate in functional languages like lisps, while the lazy variety was pioneered by Haskell. In functional languages we like recursion and can't mutate things, which motivates our way of representing lists.

We'll start with a non-lazy list, which we can think of as a pair containing a "head" – the first element of the list – and a "tail" – the list of elements after the first. We also have a special case for the empty list, `()`.

Here's enough of a linked list to illustrate the ideas[^julia].

[^julia]: I've used Julia for these examples, but they only require closures and tuples. It should be trivial to try them in a another language like Python.

```julia
x ∘ xs = (x,xs) # prepend
head(xs) = xs[1]
tail(xs) = xs[2]
isnull(xs) = xs == ()

range(n, m) = n > m ? () : (n ∘ range(n+1, m))

range(1, 3) == (1, (2, (3, ())))

map(f, xs) = isnull(xs) ? () : f(head(xs)) ∘ map(f, tail(xs))

map(x -> x^2, range(1, 5)) == (1, (4, (9, (16, (25, ())))))

reduce(f, x, xs) = isnull(xs) ? x : reduce(f, f(x, head(xs)), tail(xs))
sum(xs) = reduce(+, 0, xs)

# Sum of the first 5 square numbers
sum(map(x->x^2, range(1,5))) == 55
```

This code is about as functional as it gets. Lots of recursion, no mutable state, and really terse – we can start doing pretty high-level things in a few lines of code. Crucially, while this kind of code can seem magical at first, it's also pretty easy to operationalise. Just expand the inner calls:

```julia
range(1, 2) = 1 ∘ range(2, 2)
  = 1 ∘ (2 ∘ range(3, 2))
  = 1 ∘ (2 ∘ ())
```

So that's a list. Unfortunately, as it stands it has an unfortunate constraint: it must be computable in finite time and memory. This is clearly not acceptable in the era of *Big Data*, so let's work around it.

## The Spiral

In order to make our lists infinite we need to avoid calculating all the elements up front, and wait until they are needed. Languages generally give us a single primitive for this kind of delayed evaluation, the *thunk* (or, a function of no arguments):

```julia
julia> thunk = () -> println("computing...")

julia> thunk()
computing...
```

We can make use of thunks in a simple way; we just require that all lists be wrapped in thunks, and evaluate them when we need actual values.

```julia
head(xs) = xs()[1]
tail(xs) = xs()[2]
isnull(xs) = xs() == ()

range(n, m) = () -> n > m ? () : n ∘ range(n+1, m)
map(f, xs) = () -> isnull(xs) ? () : f(head(xs)) ∘ map(f, tail(xs))
```

Remarkably, these are the only changes we need to make, and we can do things like sum-of-squares just as before. But now we can play around with infinite lists:

```julia
# Get the nth element of a list
nth(xs, n) = n == 1 ? first(xs) : nth(rest(xs), n-1)

xs = map(x -> x^2, range(1, Inf))
nth(xs, 5) == 25
nth(xs, 15) == 225

# (x, x, x, ...)
cycle(x) = () -> x ∘ cycle(x)

xs = cycle("foo")
nth(xs, 10) == "foo"
nth(xs, 99999) == "foo"

# A mind-bending way to define the natural numbers
nats = () -> 1 ∘ map(x -> x + 1, nats)
```

Usually when we recurse, we require a *base case* to break out of the recursion (like `0` or the empty list). But `cycle` doesn't even have a base case, it just calls itself regardless of the input![^cycle] Fortunately, we are not logicians or philosophers but Computer Scientists, and stand resolute in the face of this circular reasoning. At the least, we will run out of RAM long before the existential angst sets in.

[^cycle]: If this still seems magical, just try operationalising it as before.

This toy example is not that far from the real deal. Of course, a full implementation (like [Lazy.jl](https://github.com/MikeInnes/Lazy.jl) or [Clojure's lazy seq](https://clojure.org/reference/sequences)) will hide the innards and behave more like a regular list. `@lazy foo` simply becomes `LazyList(() -> foo)`, where `LazyList` wraps the thunk, caches its result (so that it only ever gets called once), and implements utilities like indexing and display.

## The User

So far I have used lazy lists mainly for mathematical tricks. But lazy lists are not just a mechanism for Haskell programmers to impress each other. Imagine if, instead of an infinite list of numbers, we had one of recent tweets.

```julia
@>> tweets filter(tw -> contains(tw, "julia")) map(author) first
```

Given a list of all tweets, we can easily map and filter to get a list of authors of tweets about Julia. If we grab the first then the list will be realised and we'll get the most recent author. Page loads and pagination are abstracted over and we only do the minimum work necessary to get the result we need.

This reveals the true purpose of lazy lists: they serve as the functional form of a generator or iterator. In true functional style they are often wildly more concise and modular than the equivalent loop, and things like `map` and `filter` are themselves very easy to define.

We aren't even limited to tweets from the *past*, but can make ourselves an infinite list of future tweets as well.

```julia
take(filter(tw -> contains(tw, "julia"), futureTweets), 5)
```

This line should wait until 5 tweets containing "julia" are posted and return them. There's really quite a lot of orchestration going on here, but it's hidden behind very intuitive abstractions.

Streams-as-data-structures have correctness benefits, too. Imagine you're implementing a parser. In pseudocode:

```julia
function parse_markdown(stream)
  either:
    parse_italic(stream)
    parse_bullets(stream)
    ...
```

Sub-parsers will need to peek at the token stream for things like digits or brackets, which indicate that it's their turn. But they might also need to look arbitrarily far ahead to see if a `*` starts an italic word or a bulleted list. *Then* they need to make sure that the stream is put back to how it started, so the next parser can check it.

Lists just don't have this issue; `stream` cannot be modified at all, so we can pass it around with careless abandon. We can run multiple parsers concurrently, or parse multiple alternatives on a single stream, or `take(stream, n)` to limit lookahead, or `filter(whitespace, stream)`; in general, complex stream-processing logic can become a lot simpler.

## The Comedown

Clojure is the only language I know of that makes full use of laziness in this way. (Haskell's inability to abstract over I/O blocks many of the non-mathematical uses.) Given all the benefits, why aren't they more popular?

Well, probably for the same reasons functional programming isn't more widely spread in general. Loops remain a local optimum for throwing something together that works, without needing to learn the vocabulary of `map`s and `filter`s. Lists are also not zero-cost abstractions, and are hard to make efficient without GHC or the JVM behind you. On top of that, pervasive laziness can make it pretty hard to reason about code complexity and performance characteristics.

So not all is roses. But, regardless of whether you find a use for them, laziness is a cool abstraction that's worth knowing about.

Here's one final example, just for you: an indirectly recursive definition of the prime numbers.

```julia
isprime(n) = !any(map(x -> n % x == 0, takewhile(x -> x<=sqrt(n), primes)))

primes = filter(isprime, Lazy.range(2)) # == (2 3 5 7 11 ...)
```

You can decide for yourself whether lazy lists are sufficiently advanced technology, but I hope that they still seem just a little magical.