---
date: '2025-12-01'
tags: [raven]
title: Advent of Code
notebook: true
---

I'm taking a crack at solving [Advent of Code](https://adventofcode.com/) using [Raven](https://github.com/unkindnesses/raven), a little programming language I'm working on which compiles to WebAssembly. This post is my notebook as I go along, and the code cells are editable, so you can play with the solutions yourself.

Raven's standard library is, uh, reasonably sparse at the moment. So the solutions will tend to rely on JavaScript interop, or involve rewriting basic functionality, and it's not all that representative of how I'd like Raven to look. On the other hand, it might be fun to see some of the nuts and bolts.

## Day One

[The puzzle](https://adventofcode.com/2025/day/1). We'll start with the demo input.

```raven
input = """
  L68
  L30
  R48
  L5
  R60
  L55
  L1
  L99
  R14
  L82
  """
```

Moving the dial right amounts to adding a number to the current position, while moving left subtracts. We can simplify things by replacing left-moves with negative ones, with a quick wrapper for JS's regex replace.

```raven
fn replace(&s, r, t) {
  s = String(js(s).replace(r, t))
}

replace(&input, r`L`, "-")
replace(&input, r`R`, "")

input
```

Split these into lines and parse (again using a JS function), so that we have a list of integers rather than a big string.

```raven
fn parseInt(s) { Int64(js.parseInt(s)) }

input = map(js(input).split("\n"), parseInt)
```

Now we need to work out where the dial lands after each move. This is as simple as starting at $p = 50$ and adding each number in turn; we handle the circularity by taking the modulus $p \mod 100$, which wraps eg $114$ back to $14$. (We have to implement `mod` on top of the wasm primitive `rem`, to make sure the output is in 0-99 even when $p$ is negative).

```raven
fn mod(a: Int, b: Int) {
  r = rem(a, b)
  if r < 0 { r = r + b }
  return r
}

fn positions(xs) {
  pos = 50
  for x = xs {
    pos = mod(pos + x, 100)
  }
}

positions(input)
```

We don't need to explicitly build a list here, because Raven's `for` loop behaves like a list comprehension, returning `pos` for each iteration.

Finally, we count the number of zeros. Finally something Raven has a built-in function for! (Although we still need to write `count`).

```raven
fn count(xs, f) {
  c = 0
  for x = xs {
    if f(x) { c = c + 1 }
  }
  return c
}

count(positions(input), zero?)
```

`6` is the answer to the demo version of the puzzle. Now we just run the whole process on the full version of the data.

```raven
fn load(data) {
  url = concat("/posts/advent-2025/input/", data)
  String(await(await(js.fetch(url)).text()))
}

fn parseInput(s) {
  replace(&s, r`L`, "-")
  replace(&s, r`R`, "")
  map(js(s).split("\n").filter(js.Boolean), parseInt)
}

input = parseInput(load("01.txt"))
count(positions(input), zero?)
```

Ok, pretty straightforward! **Part Two** adds a new wrinkle: we have to count the number of times the dial crosses zero, rather than just how many times it lands there. We'll load the demo data again for this.

```raven
input = parseInput("L68\nL30\nR48\nL5\nR60\nL55\nL1\nL99\nR14\nL82")
```

We can look at the dial's position before we wrap it with `mod` – if we start at $p = 50$ and turn rightwards by $200$, we end up at position $250$. The question now is how many times we have to subtract $100$ again to get back to our 0-99 range, which is given by truncated division `div`: $p \div 100 = 2$.

There are two wrinkles. Firstly, for negative $p$, the result will be negative ($250 \div 100 = -2$) so we have to take the absolute value with `abs` (in effect, it doesn't matter which direction we're going when we cross zero). Secondly, $-50 \div 100 = 0$, but if we started at $p > 0$ and end up with $p <= 0$ then we've crossed zero, so we have to add one in that case.

```raven
fn abs(x) {
  if x < 0 { x = 0 - x }
  return x
}

fn password(codes) {
  pos = 50
  zs = 0
  for x = codes {
    pos2 = pos + x
    zs = zs + abs(div(pos2, 100))
    if ((pos > 0) && (pos2 <= 0)) { zs = zs + 1 }
    pos = mod(pos2, 100)
  }
  return zs
}

password(input)
```

$6$ is the correct result for the test data, so once again we just run the real thing.

```raven
password(parseInput(load("01.txt")))
```

And that's it for day one!
