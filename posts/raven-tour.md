---
date: '2025-11-22'
tags: [languages]
title: A Tour of Raven
notebook: true
---

Welcome! [Raven](/posts/raven/) is a small but smart programming language that compiles to WebAssembly. It combines a simple, functional data model, powerful type inference, and flexible syntax. You can learn more from [the GitHub page](https://github.com/Unkindnesses/raven), including how to get set up locally. (But note that the code is currently [sponsors-only](https://github.com/sponsors/MikeInnes).)

Here's "hello world" (or our version of it). Press the play button to run code, or try editing the text! (The compiler is not yet that robust to errors, so if things get funky, just refresh the page.)

```raven
println("Cacaw, World!")
```

The text between quotes `"..."` is a string. We have lots of other useful types, like integers, floats and bytes. The `show` syntax prints an expression and its result.

```raven
show 2+2
show 1/3
show 0xFF
show Complex(1, 2)
```

We can assign values to variables. Here's a list called `xs`. We can check the list with functions like `length`.

```raven
xs = [1, 2, 3]
show xs
show length(xs)
```

We can then do things like `append` to the list.

```raven
append(&xs, 4)
xs
```

Calling `append` looks a bit different to `length` because of the swap operator `&`. The swap tells Raven that we want to change `xs` – it's roughly the same as `xs = append(xs, 4)`. If we didn't use the `&`, `xs` would be unaltered.

```raven
show append(xs, 5)
show xs
```

A possible surprise if you're used to other languages: it is variables that change, not values. Conceptually, `append` updates `xs` to a new list, rather than mutating the list itself, and other variables won't be affected. When we talk about variables changing in Raven, it's in the sense of changing clothes.

```raven
xs = [1, 2, 3]
ys = xs
append(&xs, 4)
show xs
show ys
```

As in all good programming languages, you can define functions. Raven has standard control flow like `for` and `if`/`else`.

```raven
fn sum(xs) {
  total = 0
  for x = xs {
    total = total + x
  }
  return total
}

xs = [1, 2, 3, 4]
sum(xs)
```

`for` loops produce lists.

```raven
for i = range(1, 5) { i^2 }
```

Unlike JavaScript, Raven has no `async`/`await` keywords. Functions that wait for a result will simply pause the program.

```raven
for i = range(1, 5) {
  sleep(1)
  show i
}
```

We can write functions that use `&` swaps.

```raven
fn swap(&x, &y) {
  [x, y] = [y, x]
  return
}

a = "foo"
b = 3.14

swap(&a, &b)

show a
show b
```

You'll notice the syntax `[x, y] = list`, which is a shorthand for `x = list[1], y = list[2]`. This trick is _pattern matching_, and it works on most things.

```raven
a = Complex(3, 4)
b = Complex(2, -1)
x = a * b
Complex(re, im) = x
show [re, im]
```

You can define your own compound types that work with pattern matching, and they work just as well as built-in ones.

```raven
bundle Vec2D(x, y)

fn magnitude(Vec2D(x, y)) {
  # TODO built-in sqrt :)
  Float64(js.Math.sqrt((x^2) + (y^2)))
}

magnitude(Vec2D(2, 3))
```

Raven uses multiple dispatch, which means that we can define multiple signatures for the same function. Here's how we can overload `magnitude`:

```raven
bundle Vec3D(x, y, z)

fn magnitude(Vec3D(x, y, z)) {
  Float64(js.Math.sqrt((x^2) + (y^2) + (z^2)))
}

show magnitude(Vec2D(2, 3))
show magnitude(Vec3D(2, -3, 4))
```

Raven checks the function arguments against the most recent definition first – in this case the one for `Vec3D`. This lets you provide a generic fallback implementation followed by more specific cases. Here's one way to write the fibonacci sequence.

```raven
fn fib(n) { fib(n-2) + fib(n-1) }
fn fib(1) { 1 }
fn fib(0) { 0 }

map(fib, range(1, 10))
```

This lets us easily hook in to existing functions like `+`. In this case, we have to use `@extend` to overload the existing `+` in the standard library (rather than defining a new `+` in the main module).

```raven
@extend
fn Vec2D(xa, ya) + Vec2D(xb, yb) {
  Vec2D(xa + xb, ya + yb)
}

Vec2D(2, 3) + Vec2D(5, -1)
```

In these examples we've used pattern matching right in the argument list. We could equally have written this function as:

```raven
fn magnitude(vec: Vec2D) {
  Vec2D(x, y) = vec
  Float64(js.Math.sqrt((x^2) + (y^2)))
}

magnitude(Vec2D(2, 3))
```

In `x: T`, `T` is a _trait_, which roughly corresponds to a type annotation in other languages. But while traits can represent specific bundle types like `Complex` or `Vec2D`, they can also represent abstract categories (like `Number`) and interfaces. In fact, they are arbitrary predicates, and you can easily define your own.

```raven
Even = tag"Even"

@extend
fn matchTrait(tag"Even", x: Int) {
  if rem(x, 2) == 0 {
    Some(x)
  }
}

fn describe(x) { "not an even number :(" }
fn describe(x: Even) { "an even number!" }

show describe(2)
show describe(3)
```

Nothing about a `bundle` is really built-in. `Vec2D` is just `tag"Vec2D"` (a `tag` is similar to a symbol or string). We can use `pack` and `part`, Raven's primitive tuple operators, to construct bundles, and `showPack` to show the structure. `bundle` just defines a constructor, printing, and some pattern matching hooks (like `matchTrait`).

```raven
showPack Vec2D(2, 3)
show pack(tag"Vec2D", 2, 3)
part(pack(tag"Vec2D", 2, 3), 0)
```

Literally everything in Raven is a `pack` – it's our version of "everything is an object". By convention, the first element of a `pack` is a `tag` used to distinguish different kinds of data. You don't need to know this to use the language (and in fact shouldn't usually reach into internals with `part`) but it's nice to understand the conceptual model.

```raven
showPack Complex(1, 2)
showPack [1, 2, 3]
pack(1, 2, 3)
```

How about primitive types?

```raven
showPack Int32(5)
showPack Float32(1/3)
showPack true
```

Numbers are wrappers around a bit string created with `bits"..."`. You can see the bits, and turn bits of any length back into a number. Here's a five-bit integer, signed and unsigned.

```raven
show UInt(bits"10101")
show Int(bits"10101")
```

Strings are a bit different, because they are backed by JavaScript. `Ref` is an opaque host reference.

```raven
showPack "foo"
```

Strings are sequences of unicode scalars, independent of the storage format. You can get a view corresponding to an encoding with the functions `utf8`, `utf16` and `chars`, which provide constant-time access to code units.

```raven
show utf16("🔥")[1]
show utf16("🔥")[2]
```

There are a couple of ways to write strings. Double quotes `"..."` support escapes like `\n`, but you can also ignore escapes using backticks.

```raven
println("hello,\n world")
println(`hello,\n world`)
```

Use regexes like so:

```raven
show contains?("1, 2, 3", r`\d`)
collect(matches("1, 2, 3", r`\d`))
```

We can grab the JS object to use other APIs.

```raven
js("foo").toUpperCase()
```

Raven's JS interop is convenient, and most Raven types automatically convert to JS. The `js` namespace represents `globalThis`.

```raven
js.Math.sqrt(10)
```

However, JS objects don't automatically convert back, which you'll want to do before continuing in Raven.

```raven
show String(js("foo").toUpperCase())
show Float64(js.Math.sqrt(10))
```

That's all for now! For more background check out the [announcement post](/posts/raven/), or [sponsor me](https://github.com/sponsors/MikeInnes) and you can check out the [repo](https://github.com/Unkindnesses/raven).
