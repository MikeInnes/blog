---
date: '2025-12-01'
tags: [raven]
title: Advent of Code
notebook: true
---

I'm taking a crack at solving [Advent of Code](https://adventofcode.com/) using [Raven](https://github.com/unkindnesses/raven), a little programming language I'm working on which compiles to WebAssembly. This post is my notebook as I go along, and the code cells are editable, so you can play with the solutions yourself.

Raven's standard library is, uh, reasonably sparse at the moment. So the solutions will tend to rely on JavaScript interop, or involve rewriting basic functionality, and it's not all that representative of how I'd like Raven to look. But it might be fun to see some of the nuts and bolts.

Jump to [Day One](#day-one), [Day Two](#day-two), [Day Three](#day-three), [Day Four](#day-four), [Day Five](#day-five), [Day Six](#day-six), [Day Seven](#day-seven).

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
    if pos > 0 && pos2 <= 0 { zs = zs + 1 }
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
    i = argmax(slice(digits, 1, length(digits) - n + 1))
    j = 10*j + digits[i]
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

fn paper?(ch: Char) { ch == c"@" }

count(flatMap(box), paper?)-1
```

We subtract `1` so that we're only counting the neighbours, not the paper in the middle of the box. Now we can loop over the coordinates in the grid:

```raven
fn accessible(input) {
  N = length(input)
  M = length(input[1])
  total = 0
  for i = range(1, N) {
    for j = range(1, M) {
      if !paper?(input[i][j]) { continue }
      box = slice(input, neighbours(i, N), neighbours(j, M))
      if count(flatMap(box), paper?) - 1 < 4 { total = total + 1 }
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
      if paper?(input[i][j]) {
        if count(flatMap(box), paper?) < 5 {
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

This would all be a lot nicer if we had a matrix type!

## Day Five

[The puzzle](https://adventofcode.com/2025/day/5). Given a set of ranges (the first list), we need to check which IDs (the second list) are included.

```raven
input = """
  3-5
  10-14
  16-20
  12-18

  1
  5
  8
  11
  17
  32
  """
```

```raven
fn parseInt(s) { Int64(js.parseInt(s)) }

fn split(string, by) {
  map(js(string).split(by).filter(js.Boolean), String)
}

fn parse(input) {
  [ranges, ids] = split(input, "\n\n")
  ids = map(split(ids, "\n"), parseInt)
  ranges = (for line = split(ranges, "\n") {
    map(split(line, "-"), parseInt)
  })
  return [ranges, ids]
}

[ranges, ids] = parse(input)
show ranges
show ids
```

There are cleverer methods, but for now it's entirely reasonable to check every ID against every range, which gets us our answer.

```raven
fn fresh?(ranges, id) {
  for range = ranges {
    [a, b] = range
    if a <= id && id <= b { return true }
  }
  return false
}

fn countFresh(ranges, ids) {
  total = 0
  for id = ids {
    if fresh?(ranges, id) { total = total + 1 }
  }
  return total
}

show countFresh(parse(input)...)
show countFresh(parse(load("05.txt"))...)
```

**Part two** makes things trickier – we now have to count how many valid IDs there are in total, and brute force is no longer an option. (There are up to 562,817,005,870,729 IDs in my input file, which would take a week to check even at a nanosecond each.)

So we instead need to add up the length of all the ranges. That should be simple, but the problem is double counting: in our original input, ranges `10-14` (length 5) and `12-18` (length 7) only contribute 9 total IDs (not 12), because IDs `12`, `13` and `14` are covered by both.

We can address this by filtering out all the ranges that overlap the one we're interested in.

```raven
fn disjoint?([a1, a2], [b1, b2]) {
  b2 < a1 || b1 > a2
}

fn overlapping(rs, range) {
  no = []
  yes = [range]
  for r = rs {
    if disjoint?(r, range) {
      append(&no, r)
    } else {
      append(&yes, r)
    }
  }
  return [no, yes]
}

[no, yes] = overlapping([[3, 5], [10, 14], [16, 20]], [12, 18])
show no
show yes
```

Then we merge the overlapping ranges into one.

```raven
fn merge(rs) {
  [a, b] = rs[1]
  for r = rs {
    if r[1] < a { a = r[1] }
    if r[2] > b { b = r[2] }
  }
  return [a, b]
}

merge(yes)
```

We can use this to consolidate all ranges in the set. We are essentially just transfering the ranges from one list to another, but we filter out overlapping ranges from the output list and merge as we go.

```raven
fn consolidate(ranges) {
  rs = []
  for r = ranges {
    [rs, os] = overlapping(rs, r)
    append(&rs, merge(os))
  }
  return rs
}

consolidate(parse(input)[1])
```

That significantly simplifies our original set of ranges, and finally we can count them up!

```raven
fn count(ranges) {
  ranges = consolidate(ranges)
  total = 0
  for r = ranges {
    [a, b] = r
    total = total + (b - a) + 1
  }
  return total
}

show count(parse(input)[1])
show count(parse(load("05.txt"))[1])
```

Raven's lack of built-in data structures, or library functions like `sort`, is starting to feel limiting – though that perhaps inspires more creative solutions, too. We'll see how much further we can get.

## Day Six

[The puzzle](https://adventofcode.com/2025/day/6). We're doing a bunch of sums which, for inconvenience, are stored as columns.

```raven
input = """
  123 328  51 64
   45 64  387 23
    6 98  215 314
  *   +   *   +
  """
```

It's easiest to parse this as a table (list of rows) as normal:

```raven
fn split(string, by) {
  map(js(string).split(by).filter(js.Boolean), String)
}

fn parse(input) {
  lines = split(input, "\n")
  for i = range(1, length(lines)) {
    split(lines[i], r`\s+`)
  }
}

parse(input)
```

Then we transpose the table, going from lists of rows to lists of columns.

```raven
fn transpose(xs) {
  for col = range(1, length(xs[1])) {
    for row = range(1, length(xs)) {
      xs[row][col]
    }
  }
}

transpose(parse(input))
```

Then we do our sums, parsing integers and operators as we go.


```raven
fn parseInt(s) { Int64(js.parseInt(s)) }

fn total(ps) {
  sum = 0
  for p = ps {
    result = parseInt(p[1])
    for i = range(2, length(p)-1) {
      if p[length(p)] == "+" {
        result = result + parseInt(p[i])
      } else {
        result = result * parseInt(p[i])
      }
    }
    sum = sum + result
  }
  return sum
}

show total(transpose(parse(input)))
show total(transpose(parse(load("06.txt"))))
```

**Part two** tells us the numbers themselves are in columns, top to bottom. So the first result is not $123 \times 45 \times 6$ but $1 \times 24 \times 356$. (The puzzle specifies right-to-left, but that's a red herring – for addition and multiplication, the order doesn't matter.)

In this case, it's easiest to transpose the entire string character by character, to turn those columns into rows.[^cheat]

[^cheat]: I'm cheating the tiniest bit here. The length of the input rows is uneven due to spaces at the end getting trimmed; we should really find the max length across all lines. But `lines[3]` happens to be longest in both the dummy and real input data, so we can just use that.

```raven
fn transpose(s) {
  lines = split(s, "\n")
  t = ""
  for col = range(1, length(lines[3])) {
    for row = range(1, length(lines)) {
      if col <= length(lines[row]) {
        t = concat(t, string(lines[row][col]))
      }
    }
    t = concat(t, "\n")
  }
  return t
}

print(transpose(input))
```

That output is weird-looking, but it's easy enough to parse out the numbers and operators for the result.

```raven
fn first(xs) { nth(xs, 1) }

fn total(input) {
  sum = 0
  ps = split(input, r`\n\s*\n`)
  for p = ps {
    [op] = first(matches(p, r`[+*]`))
    xs = for m = matches(p, r`\d+`) { parseInt(m[1]) }
    result = xs[1]
    for i = range(2, length(xs)) {
      if op == "+" {
        result = result + xs[i]
      } else {
        result = result * xs[i]
      }
    }
    sum = sum + result
  }
  return sum
}

show total(transpose(input))
show total(transpose(load("06.txt")))
```

This code is getting real ugly, though. I'm looking forward to having more collection operators and such, so I can rewrite this in a less low level style.

## Day Seven

[The puzzle](https://adventofcode.com/2025/day/7). We have to simulate the path of a light beam which starts at `S` and gets split at every `^`.

```raven
input = """
  .......S.......
  ...............
  .......^.......
  ...............
  ......^.^......
  ...............
  .....^.^.^.....
  ...............
  ....^.^...^....
  ...............
  ...^.^...^.^...
  ...............
  ..^...^.....^..
  ...............
  .^.^.^.^.^...^.
  ...............
  """
```

We don't need to generate the fancy diagrams the puzzle demo uses. It's enough to keep a single state vector which represents where the beam is at each row; a boolean tells us if the beam exists in a given cell. Here's the logic:

```raven
fn split(string, by) {
  map(js(string).split(by).filter(js.Boolean), String)
}

fn run(input) {
  layout = split(input, "\n")
  next = for i = range(1, length(layout[1])) { widen(false) }
  split = 0
  for row = layout {
    last = next
    for i = range(1, length(row)) {
      if row[i] == c"S" {
        next[i] = true
      } else if row[i] == c"^" && last[i] {
        next[i] = false
        next[i-1] = true
        next[i+1] = true
        split = split + 1
      }
    }
  }
  return split
}

show run(input)
show run(load("07.txt"))
```

**Part two** is for once a simple extension. To count the number of paths, we just replace the boolean with a count of all the paths up to that point. `S` of course starts with one path; if $N$ paths hit a splitter, it creates $N$ ways to get to either side; and if there are already $M$ paths in that spot, it just accumulates, $N + M$. The code is if anything a little simpler for being more general.

```raven
fn run(input) {
  layout = split(input, "\n")
  next = for i = range(1, length(layout[1])) { widen(0) }
  for row = layout {
    last = next
    for i = range(1, length(row)) {
      if row[i] == c"S" {
        next[i] = 1
      } else if row[i] == c"^" {
        next[i] = 0
        next[i-1] = next[i-1] + last[i]
        next[i+1] = next[i+1] + last[i]
      }
    }
  }
  return next
}

run(input)
```

Then we sum.

```raven
fn sum(xs) {
  total = 0
  for x = xs { total = total + x }
  return total
}

show sum(run(input))
show sum(run(load("07.txt")))
```

That's all for now!
