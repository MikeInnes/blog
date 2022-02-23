---
title: Transducers & Effects
---

Clojure has introduced a very interesting idea called ‘transducers’, which decouple sequence transformations (mapping, filtering etc) from sequence implementations like vectors, lazy lists and channels. Transducers and their benefits are well-covered elsewhere, but I’d like to explore some tradeoffs, and compare an alternative (and extremely hypothetical) design based on a staple of the functional programming world, effect handlers.

There are many useful operations that we can carry out on _sequences_, like mapping, filtering, interleaving, partitioning and so on. Ideally, we’d like to apply these tools to any sequence of values, including list data structures and strings but also channels and observables. Unfortunately, it's common to have to [reimplement](https://github.com/ReactiveX/RxClojure) each function we want for new sequences.

Abstracting over sequences is difficult, and requires a significantly more powerful approach than the usual polymorphism and data abstraction. To see why, imagine a somewhat-general `map` using `empty` and `conj`.

```clojure
(defn map' [f xs]
  (loop [xs xs
         ys (empty xs)]
    (if (empty? xs)
      ys
      (recur (rest xs)
             (conj ys (f (first xs)))))))
```

Unfortunately, aside from the fact that this has the wrong ordering for some data structures, and could only work with channels if you have language-level coroutines (which Clojure, thanks to the JVM, doesn’t), this definition of `map` simply can’t be used to produce lazy sequences. Here’s how we implement the lazy version:

```clojure
(defn map' [f xs]
  (lazy-seq
   (when (not (empty? xs))
     (cons (f (first xs)) (map' f (rest xs))))))
```

The problem is that the basic structure of the code has changed, from an iterative (tail recursive) form ideal for eager data structures to the context-preserving recursion needed for laziness. Other constructs, like channels, might require yet different organisation, eg as a state machine.

Clojure resolves this with two insights:

1. A _process_ (eg working with lists or channels in some way) can usually be seen as a kind of `fold`, with an appropriate _step function_ of the form `result –> input –> result`.
2. `map`, `filter` and friends extend processes by _wrapping_ the step function, eg `step' = (result, input) –> step(result, f(input))` to map `f` alongside whatever was happening before.

Processes can therefore accept step-wrapping functions (transducers) to alter their behaviour. The upshot is that you can create and compose objects representing mapping, filtering etc and use them generically on channels, sequences, vectors and so on.

To solve our `map` problem, we can write data structure production or lazy-sequence production (or channel production, or ...) each as one 'transducible process'. Functions like `map` and `filter` become transducers, which we can hand to these processes to modify their behaviour. Thus we can write `map` only once, yet use it with many sequence types.

## A sequence of caveats

The problem that transducers solve is an important one; transducers themselves are elegant in conception and clean to work with as a user. However, if you look into how transducers are put together under the hood – or try to implement one yourself – you might find them less easy on the eyes.

```clojure
;; Guess what this function does for your next lockdown quiz
(defn take [n]
  (fn [rf]
    (let [nv (volatile! n)]
      (fn
        ([] (rf))
        ([result] (rf result))
        ([result input]
          (let [n @nv
                nn (vswap! nv dec)
                result (if (pos? n)
                          (rf result input)
                          result)]
            (if (not (pos? nn))
              (ensure-reduced result)
              result)))))))
```

The elegance of transducers is somewhat eroded as we try to make them more general, and even then they have significant limitations. In particular:

*   Transducers like `dedupe` and `take` create stateful step functions, which adds extra constraints needed for correctness.
*   Others like `take-while` need an explicit cancellation mechanism, and you want to be careful not to double-wrap the cancellation. Handling initialisation and completion adds yet more burden to implementations.
*   Transducible processes themselves [can be hard to implement](https://clojure.org/reference/transducers#_creating_transducible_processes), mainly because of the above concerns, but it’s also because some things (eg lazy sequences) [aren’t naturally built with `fold`](https://github.com/clojure/clojure/blob/30a36cbe0ef936e57ddba238b7fa6d58ee1cbdce/src/jvm/clojure/lang/TransformerIterator.java).
*   There is no support for functions that take or produce multiple sequences (`interleave`, `concat`, `split-with` etc).


## An effective alternative

Consider the following notation for `mapping` and `filtering`, inspired by [F#’s list comprehensions](https://docs.microsoft.com/en-us/dotnet/fsharp/language-reference/sequences). I’m using a hypothetical C/Koka-like syntax here but all my examples could be converted to simple Clojure equivalents (`loop`/`recur` and explicit passing of variables, `for`, etc).

```rust
fn mapping(f, xs) {
  for x in xs {
    yield(f(x))
  }
}

fn filtering(f, xs) {
  for x in xs {
    if f(x) {
      yield(x)
    }
  }
}
```

As a notation, this seems abstract enough. There’s no dependence on how we get values (`xs` could be anything and iteration can use a generic protocol). It avoids expressing how we build an output sequence, or even whether we do, just what values appear in it. F# lets us omit the `yield` (eg `for x in xs –> x^2`), which makes things look more like a traditional list comprehension, but for clarity we’ll keep them explicit.

The key idea is to make this code run via _effect handlers_ (implemented in F#, with lexical scope, as ‘computation expressions’[^1]), which let us plug in a definition of `yield`. Effect handlers have their origin in strongly-typed functional programming but they are really quite lisp-y, and can be thought of as resumable exceptions.[^2]

At the simplest, we can just create an empty array and append to it each time a value is `yield`ed:

```rust
ys = []
handle {
  mapping(f, xs)
} with yield(x) {
  ys = append(ys, x)
  resume()
}
return ys
```

`yield(x)` is a bit like throwing an exception, except that after handling it we can jump back to where we were with `resume`.

Instead of building a list, we can do a map-reduce without any intermediate collection being constructed.

```rust
sum = 0
handle {
  mapping(f, xs)
} with yield(x) {
  sum += x
  resume()
}
return sum
```

This can compile down to the tight loop we want for simple data structures.[^3] But what’s going to be really mind-bending is how straightforwardly we can turn our loop into a lazy sequence.

```rust
ys = handle {
  mapping(f, xs)
  nil
} with yield(x) {
  cons(x, LazySeq(resume))
}
```

What’s happening here is that `yield` doesn’t call `resume`, so the loop gets paused the first time it is called, and the whole block returns a `cons`. `resume` will get called when we try to access the tail of `ys`, restarting the loop. The loop hits the next `yield`, suspends, and returns a new `cons` with item two and a new `resume`, and so on. Eventually the `mapping` will finish and `resume` returns `nil`, completing the list.[^4]

`mapping` here takes on the role of transducer, expressing what `map` does abstractly without nailing down the details. Effect handlers then allow us to instantiate `mapping` as a set of concrete processes, and potentially very different ones depending on the context. In all we can achieve the same core goal in a wonderfully expressive way.

With this in mind, we can blend Clojure’s `into` and F#’s `seq` into one list comprehension construct which picks the appropriate `yield` handler for the kind of sequence we are building.

```rust
fn map(f, xs) {
  into empty(xs) {
    for x in xs {
      yield(f(x))
    }
  }
}
```

This `map` can behave appropriately, and generate efficient code, whether `xs` is a vector, persistent list, lazy list, string, channel, observable, promise or whatever, which solves our generic implementation problem. And we can compose pipelines just like we did before with `(->> xs (map f) (filter g))`.[^5]

As F# has shown, this way of defining sequence transformations is really expressive. If we want to cancel we can just break out of the loop (or the loop/recur equivalent).

```rust
// Take while
for x in xs {
  if f(x) {
    yield(x)
  } else {
    break
  }
}
```

If we need state, a local variable is enough, since the loop has its own scope.

```rust
// Dedupe
last = nil
for x in xs {
  if x != last {
    yield(x)
  }
  last = x
}
```

Concatenating sequences is easy, because we can happily have multiple loops, and `interleave` is easy because we can put `yield` wherever we want. We can even use nested loops, and I’d argue that the intent is clearer in these than even the simplest transducer implementations. They strike close to the essence of the transformation, without any incidental complexity.

```rust
// Concat
for x in xs { yield(x) }
for y in ys { yield(y) }
// Interleave
for (x, y) in zip(xs, ys) {
  yield(x)
  yield(y)
}
// Cartesian Product
for x in xs {
  for y in ys {
    yield((x, y))
  }
}
```

We can even imagine supporting multiple output sequences, so long as there’s some way of identifying them, for example to partition a channel into matching and non-matching events.

```rust
// Split-with
into empty(xs) -> (trues, falses) {
  for x in xs {
    if f(x) {
      yield(trues, x)
    } else {
      yield(falses, x)
    }
  }
}
```


## Asynchronous Evolution

The above examples, taking things from one bunch of sequences and putting them into another bunch, might begin to look familiar. That’s because the Shyamalan-esque twist to this story is that Clojure _already had this abstraction all along_, via the [core.async](https://github.com/clojure/core.async) library. The relationship of `go` blocks to our generalised list comprehensions is that

1. Instead of iterating `for x in xs` we have an explicit `<!` (take) operation, which is itself an effect; it suspends the code and falls back to a handler, which can `resume` with a value when one is available.
2. `yield` is replaced by the `>!` (put) effect.
3. Both `>!` and `<!` are linked to identities (channels), which means multiple inputs and outputs are supported.

So we can draw a clear path from list comprehensions to async blocks, two features which might not seem all that related at first, by generalising in some ways and specialising in others. This suggests a unification is in order; a powerful enough sequence-transformation system could subsume other ways of working with channels. Conversely, graduating core.async to general effects would be one way to build such a system.

Transducers are a neat and ingenious solution to a real issue, but they sit alongside several other abstractions for what is effectively the same problem (list comprehensions, async/channel blocks, generators, direct implementations of `map` etc). With a sufficiently general and unifying sequence-transform abstraction, we might not need them.


## Notes

[^1]:
     F#’s `seq` only supports creating lazy seqs via state machines, though, so it doesn’t support generic sequence transformations on its own.

[^2]:
     Lisps were the original pioneers of this kind of feature, with delimited continuations in Scheme and conditions in Common Lisp. They were concurrently developed in the FP community as ‘monads’ and gradually generalised, with a nicer, more composable programming model and (of course) type checking. Computation expressions generalise Haskell’s `do` syntax, while research languages like Koka provide the same features language-wide.

[^3]:
     Because `resume` is called in the tail position, `yield` is equivalent to a normal function and we don’t need to unwind and reinstate the stack.

[^4]:
     To be pedantic, we should also wrap the entire block in a `LazySeq` to make the first element lazy.

[^5]:
     As written, this won’t always fuse loops and avoid temporaries. As with transducers you can fuse by decoupling the pipeline from its application, eg by composing functions like `mapping`.
