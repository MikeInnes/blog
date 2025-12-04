---
date: '2025-12-01'
tags: [raven]
title: Advent of Code
notebook: true
---

I'm taking a crack at solving [Advent of Code](https://adventofcode.com/) using [Raven](https://github.com/unkindnesses/raven), a little programming language I'm working on which compiles to WebAssembly. This post is my notebook as I go along, and the code cells are editable, so you can play with the solutions yourself.

Raven's standard library is, uh, reasonably sparse at the moment. So the solutions will tend to rely on JavaScript interop, or involve rewriting basic functionality, and it's not all that representative of how I'd like Raven to look. But it might be fun to see some of the nuts and bolts.

Go straight to [Day One](#day-one), [Day Two](#day-two), [Day Three](#day-three), [Day Four](#day-four).

## Day One

Preamble: We'll use this `load` function later, to get inputs for the final answer. You should be able to run each day's code seperately, but all of them need this function.

```raven
fn load(data) {
  url = concat("/posts/advent-2025/input/", data)
  String(await(await(js.fetch(url)).text()))
}
```

[The first puzzle](https://adventofcode.com/2025/day/1). We'll start with the demo input.

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
fn parseInput(s) {
  replace(&s, r`L`, "-")
  replace(&s, r`R`, "")
  map(js(s).split("\n").filter(js.Boolean), parseInt)
}

input = parseInput(load("01.txt"))
count(positions(input), zero?)
```

(`.filter(js.Boolean)` removes empty lines from the file – an empty string casts to boolean `false` in JS.)

Ok, pretty straightforward! **Part two** adds a new wrinkle: we have to count the number of times the dial crosses zero, rather than just how many times it lands there. We'll load the demo data again for this.

```raven
input = parseInput("L68\nL30\nR48\nL5\nR60\nL55\nL1\nL99\nR14\nL82")
```

We can look at the dial's position before we wrap it with `mod` – if we start at $p = 50$ and turn rightwards by $200$, we end up at position $p = 250$. The question now is how many times we have to subtract $100$ again to get back to our 0-99 range, which is given by truncated division `div`: $p \div 100 = 2$.

There are two wrinkles. Firstly, for negative $p$, the result will be negative ($-250 \div 100 = -2$) so we have to take the absolute value with `abs` (in effect, it doesn't matter which direction we're going when we cross zero). Secondly, $-50 \div 100 = 0$, but if we started at $p > 0$ and end up with $p <= 0$ then we've crossed zero, so we have to add one in that case.

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

## Day Two

[The puzzle](https://adventofcode.com/2025/day/2). We have to find numbers that match a pattern, out of a set of ranges.

```raven
input = "11-22,95-115,998-1012,1188511880-1188511890,222220-222224,1698522-1698528,446443-446449,38593856-38593862,565653-565659,824824821-824824827,2121212118-2121212124"
```

An "invalid" number is made of repeated digits, eg `55`, `6464` or `123123`. We can check this by splitting the string in two (using JS, since Raven doesn't have range indexing yet), and seeing if the first half matches the second.

```raven
fn invalid?(id) {
  id = js(string(id))
  mid = div(Int64(id.length), 2)
  start = id.substring(0, mid)
  end = id.substring(mid)
  return start == end
}

show invalid?(6464)
show invalid?(101)
```

(This works on odd-length strings because the "halves" of `12345` are `12` and `345`, and they can never be equal.)

Now we just need to loop over the ranges we're given. We'll match ranges like `11-22` using a regex, parse to integers as before, then loop over the range and sum up.

```raven
fn parseInt(s) { Int64(js.parseInt(s)) }

total = 0
for m = matches(input, r`(\d+)-(\d+)`) {
  [_, a, b] = m
  for id = range(parseInt(a), parseInt(b)) {
    if invalid?(id) { total = total + id }
  }
}

total
```

(`for [_, a, b] = ...` should really work here. One for the to-do list!)

`1227775554` is the right answer for the dummy data, so now the real thing.

```raven
fn answer(input) {
  total = 0
  for m = matches(input, r`(\d+)-(\d+)`) {
    [_, a, b] = m
    for id = range(parseInt(a), parseInt(b)) {
      if invalid?(id) { total = total + id }
    }
  }
  return total
}

answer(load("02.txt"))
```

**Part two** extends the definition of "invalid" to cover any number made up of repeating sequences of digits, like `123123123`. The easiest way to check for a more complex pattern like this is with a regex. In this case:

```raven
fn invalid?(id) {
  contains?(string(id), r`^(\d+)\1+$`)
}

show invalid?(123)
show invalid?(1231230)
show invalid?(123123123)
```

`^` and `$` mark the start and end (so we don't match repeating digits within a longer string). `(\d+)` matches a group of digits, and `\1+` means that original group (`\1`) repeated at least once (`+`). (We could have matched the original condition with `^(\d+)\1$`, rather than splitting the string.)

Because we've updated `invalid?`, the rest of the `answer` code is identical – so we run it again for our final answer.

```raven
answer(load("02.txt"))
```

## Day Three

[The puzzle](https://adventofcode.com/2025/day/3). We need to find the largest two-digit number hidden in a sequence.

```raven
input = """
  987654321111111
  811111111111119
  234234234234278
  818181911112111
  """
```

We don't need to brute force this. The first digit of the answer will always be the largest one on the line (excluding the final digit, which we can't start with). The second digit will be the largest one that follows.

We need a way to slice arrays, so we can look at parts of the sequence separately.

```raven
fn slice(xs, start, end) {
  for i = range(start, end) { xs[i] }
}

slice([6, 8, 7, 9, 10], 2, 4)
```

Then we write an `argmax` function to get the index of the biggest digit in a list.

```raven
fn argmax(xs) {
  i = 1
  for j = range(2, length(xs)) {
    if xs[j] > xs[i] { i = j }
  }
  return i
}

xs = [1, 2, 9, 4, 5]
show argmax(xs)
show xs[3]
```

Now we can get the `joltage` of a digit sequence, by finding the max among all the digits (save the last), and then the max that follows.

```raven
fn joltage(digits) {
  a = argmax(slice(digits, 1, length(digits)-1))
  b = argmax(slice(digits, a+1, length(digits)))
  return 10*digits[a] + digits[a+b]
}

joltage([8,1,8,1,8,1,9,1,1,1,1,2,1,1,1])
```

Now it's just a case of looping over the lines and adding up the joltage (with our good friend `parseInt`).

```raven
fn parseInt(s) { Int64(js.parseInt(s)) }

total = 0
for line = js(input).split("\n") {
  total = total + joltage(map(line, parseInt))
}
total
```

Now the real thing.

```raven
input = load("03.txt")
input = js(input).split("\n").filter(js.Boolean)
total = 0
for line = input {
  total = total + joltage(map(line, parseInt))
}
total
```

**Part two** extends takes us from finding a two-digit number to a twelve-digit one. It's easiest to rewrite `joltage` to work with `N` digits. The logic is identical: find the largest digit in the list (making sure there's enough left over), then use rest of the list as candidates for the next digit.

```raven
fn joltage(digits, n) {
  j = 0
  while n > 0 {
    i = argmax(slice(digits, 1, length(digits) - (n - 1)))
    j = (10*j) + digits[i]
    digits = slice(digits, i+1, length(digits))
    n = n - 1
  }
  return j
}

show joltage([8,1,8,1,8,1,9,1,1,1,1,2,1,1,1], 2)
show joltage([8,1,8,1,8,1,9,1,1,1,1,2,1,1,1], 12)
```

And the real thing:

```raven
total = 0
for line = input {
  total = total + joltage(map(line, parseInt), 12)
}
show total
```

## Day Four

[The puzzle](https://adventofcode.com/2025/day/4). We need to count the rolls of paper (`@`) which are surrounded by less than four other rolls in a grid.

```raven
input = """
  ..@@.@@@@.
  @@@.@.@.@@
  @@@@@.@.@@
  @.@@@@..@.
  @@.@@@@.@@
  .@@@@@@@.@
  .@.@.@.@@@
  @.@@@.@@@@
  .@@@@@@@@.
  @.@.@@@.@.
  """

fn lines(s: String) {
  ls = js(s).split("\n").filter(js.Boolean)
  map(ls, String)
}

input = lines(input)
```

Here's code for a 2D slice.

```raven
fn slice(xs, is, js) {
  for i = is {
    for j = js { xs[i][j] }
  }
}

slice(input, range(2, 4), range(5, 7))
```

Which lets us get the box around a given cell.

```raven
fn max(x, y) { if x >= y { x } else { y } }
fn min(x, y) { if x <= y { x } else { y } }

fn neighbours(i, N) { range(max(1, i-1), min(N, i+1)) }

N = length(input)
M = length(input[1])
box = slice(input, neighbours(2, N), neighbours(2, M))
```

Then we can count the amount of paper in the neighbourhood.

```raven
fn flatMap(xss, f) {
  ys = []
  for xs = xss {
    for x = xs { append(&ys, f(x)) }
  }
  return ys
}

fn flatMap(xss) { flatMap(xss, identity) }

fn count(xs, f) {
  c = 0
  for x = xs {
    if f(x) { c = c + 1 }
  }
  return c
}

fn isPaper(ch: Char) { ch == c"@" }

count(flatMap(box), isPaper)-1
```

We subtract `1` so that we're only counting the neighbours, not the paper in the middle of the box. Now we can loop over the coordinates in the grid:

```raven
fn accessible(input) {
  N = length(input)
  M = length(input[1])
  total = 0
  for i = range(1, N) {
    for j = range(1, M) {
      if not(isPaper(input[i][j])) { continue }
      box = slice(input, neighbours(i, N), neighbours(j, M))
      if (count(flatMap(box), isPaper)-1) < 4 { total = total + 1 }
    }
  }
  return total
}

accessible(input)
```

The real deal:

```raven
accessible(lines(load("04.txt")))
```

**Part two** has us removing rolls of paper, which makes more rolls accessible, and so we repeat until we can go no further. The code to do that is structurally similar to `accessible`, but we build the output as we go.

```raven
@extend, fn js(ch: Char) { js(string(ch)) } # A conversion we need

fn remove(input) {
  N = length(input)
  M = length(input[1])
  output = []
  total = 0
  for i = range(1, N) {
    row = []
    for j = range(1, M) {
      box = slice(input, neighbours(i, N), neighbours(j, M))
      if isPaper(input[i][j]) {
        if count(flatMap(box), isPaper) < 5 {
          total = total + 1
        } else {
          append(&row, c"@")
          continue
        }
      }
      append(&row, c".")
    }
    append(&output, String(js(row).join("")))
  }
  return [output, total]
}

[output, total] = remove(input)
println(js(output).join("\n"))
total
```

We can `remove` in a loop, until there's nothing to remove.

```raven
fn removeAll(input) {
  total = 0
  while true {
    [input, removed] = remove(input)
    if removed == 0 { break }
    total = total + removed
  }
  return [input, total]
}

[output, total] = removeAll(input)
println(js(output).join("\n"))
total
```

And the real deal:

```raven
removeAll(lines(load("04.txt")))[2]
```

This would all be a lot nicer if we had a matrix type! Another one for the to-do list.

That's all for now!
