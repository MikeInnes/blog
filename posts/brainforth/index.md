---
aliases:
- /2017/09/13/brainforth
- /2017/09/13/brainforth.html
date: '2017-09-13'
description: Building abstractions in brainfuck
title: Taming the Tarpit
tags: [infodump, code]
---

Have you ever seen a programming language like this?

```brainfuck
++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.>
---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++.
```

What you’re looking at is the “hello, world!” program of a language called [brainfuck](https://en.wikipedia.org/wiki/Brainfuck). Brainfuck is a sort of postmodern approach to language design, the kind of thing that Jackson Pollock’s evil digital twin would have used. It has only eight instructions for moving around an array of bytes, adding and subtracting one as you go. Yet surprisingly enough, it’s just as powerful as a full programming language like Python.

Lacking variables, conditionals, objects, functions, or anything that seems like a remotely useful programming construct, coding in brainfuck poses challenges. Even [very simple algorithms](http://esolangs.org/wiki/Brainfuck_algorithms) can become staggeringly complex, earning it the moniker of [“Turing Tarpit”](https://en.wikipedia.org/wiki/Turing_tarpit). Yet, it *is* possible to tame it; with enough will you can even write sensible programs, like this [50-thousand-character behemoth](https://pastebin.com/3bd0AETu) that implements a guessing game.

<script type="text/javascript" src="https://asciinema.org/a/RZsEQFxk8wJtsPcjNi90AiOR0.js" id="asciicast-RZsEQFxk8wJtsPcjNi90AiOR0" async></script>

To do this, I implemented a simple Forth-like language, [brainforth](https://github.com/MikeInnes/BrainForth), that compiles to brainfuck. There [are](http://esolangs.org/wiki/BFBASIC) a [few](http://esolangs.org/wiki/C2BF) compile-to-brainfuck languages, but to the best of my knowledge this is the only functional one, and the only one that supports dynamically-sized arrays and higher-order functions. Let’s see how it works!

## The Forth Element

The Forth family of languages is also fascinating (for different reasons to brainfuck). They are famous for being low level and simple to implement, like assembly, yet having a very flexible high-level feel.

Forth is [stack based](https://en.wikipedia.org/wiki/Stack-oriented_programming_language), meaning there’s a global stack which you can push and pull values from, and this is used instead of named arguments to functions. For example, an addition might look like this:

```julia
1 2 +
```

Which pushes 1 and 2 onto the stack, then adds the top two values, and pops the result (3) onto the stack. If we want to then multiply by 3 we could write:

```julia
1 2 + 3 *
```

Which would leave 9 on the stack. We can also manipulate the stack in various ways, for example:

```julia
4 dup *
```

`dup` copies the topmost item on the stack, resulting in `4 4`, allowing us to square a number and return `16`. Likewise, `swap` swaps the two topmost values, and so on.

There’s much more to Forth, of course, but implementing this subset is a simple way to get going.

## Trivial Pursuits

First, some preliminaries.

```julia
julia> using BrainForth: interpret, compile, @bf, @run
```

In order to actually run programs we’ll need a brainfuck interpreter. This is easy, and a [simple Julia implementation](https://github.com/MikeInnes/BrainForth/blob/master/src/brainfuck.jl) gets a very respectable 370Mhz.

```julia
julia> interpret("+++>++")
[6] 3 2*
```

The interpreter returns the tape; the `*` represents the current location of the pointer and the `[6]` is the number of instructions executed. I’ve added a conventional debugging instruction, `#`, which prints the full tape:

```julia
julia> interpret("+++>#++")
[5] 3 0*
[7] 3 2*
```

You can also run brainfuck code interactively [here](http://fatiherikli.github.io/brainfuck-visualizer/).

We also need to establish a syntax for our Forth-like. Traditional Forth would have words separated by spaces, but I didn’t feel like writing a parser, so I just reused Julia array syntax inside a macro. The addition example above would be written as:

```julia
@bf [1, 2, +]
# or, to compile and execute it:
@run [1, 2, +]
```

We can define “words” -- or functions -- which will simply be inlined where they are called.

```julia
@bf sq = [dup, *]
@run [4, sq]
```

When we compile the last line it becomes `@bf [4, dup, *]`, which then inlines the definition of `*`, and so on. Of course, we haven’t defined either of these yet, but we will. To bootstrap, we create aliases for the basic brainfuck instructions; `+` is `inc!`, `<` is `left!`, etc. The example `+++>++` can be written as:

```julia
julia> @bf inc3 = [inc!, inc!, inc!]
julia> @bf inc2 = [inc!, inc!]
julia> @run [inc3, right!, inc2]
[6] 3 2*
```

## Cut Me Some Stack

The first order of business is representing the stack that’s so central to Forth. You might imagine using contiguous values on the tape, like this:

```julia
julia> @run [inc!, right!, inc!, inc!, right!, inc!, inc!, inc!]
[8] 1 2 3*
```

But this has an issue: how can we tell where the stack ends? Is this `[1, 2, 3]`, or `[0, 1, 2, 3, 0, 0]`, or something else? If we ever move the pointer away from the end of the stack we won’t know how to get back. To solve this, we pad each stack value with a `1`:

```julia
julia> @run [1, 2, 3]
[15] 1 1 2 1 3 1*
```

With that in mind it’s easy to compile numbers, they just have to push themselves onto the stack.

```julia
julia> compile(@bf [3])
">+++>+"
julia> compile(@bf [4])
">++++>+"
julia> @run [4]
[7] 4 1*
```

With numbers in place, we can use the [canonical implementations](http://esolangs.org/wiki/Brainfuck_algorithms) of basic algorithms like addition and copying almost directly; we just need to make sure that the inputs and outputs are correctly positioned as part of the stack.

```julia
julia> @bf + = Native("-<[-<<+>>]<")
julia> compile(@bf [3, 4, +])
">+++>+>++++>+-<[-<<+>>]<"
julia> @run [3, 4, +]
[45] 7 1*
```

[See it running.](http://fatiherikli.github.io/brainfuck-visualizer/#PisrKz4rPisrKys+Ky08Wy08PCs+Pl08)

We can already write some reasonably complex programs that compile to efficient code. Here’s the polynomial `x^2 + 2x + 3`:

```julia
julia> @bf poly = [dup, sq, swap, 2, *, +, 3, +]
julia> @run [5, poly]
[1197] 38 1*
```

[See it running.](http://fatiherikli.github.io/brainfuck-visualizer/#PisrKysrPistPFstPis8XT5bLTwrPj4rPF0rPj4rLTxbLT4rPF0+Wy08Kz4+KzxdKz4+Ky08PC08Wy0+KzxdPlstPlstPis8PDwrPj5dPlstPCs+XTw8XT5bLV08Kzw8LTxbLT4rPF0+PlstPDwrPj5dPFstPis8XSs+Pj4rKz4rLTw8LTxbLT4rPF0+Wy0+Wy0+Kzw8PCs+Pl0+Wy08Kz5dPDxdPlstXTwrLTxbLTw8Kz4+XTw+KysrPistPFstPDwrPj5dPA==) For now, we’re doing more explicit stack manipulation than is ideal, but it gets the job done.

## Take a Dip

[Factor](http://factorcode.org/), a more modern stack-based language, pioneered a feature called *quotations* – the Forth-y equivalent of an anonymous function. We can push a piece of code onto the stack, and then use `call` to invoke it.

```julia
julia> @run [3, 5, 7, [1, +], call]
[1132] 3 1 5 1 8 1*
```

This is not a particularly interesting example, behaving identically to `[3, 5, 7, 1, +]`, but it gets interesting when we get to *combinators*. These are simply variations on `call` that can, for example, apply a function to two different items on the stack:

```julia
julia> @run [3, 5, 7, [1, +], bia]
[13629] 3 1 6 1 8 1*
```

Or call a quote while hiding the top item in the stack:

```julia
julia> @run [3, 5, 7, [1, +], dip]
[3428] 3 1 6 1 7 1*
```

Quotations will also enable the much more advanced things we want to do later on, like recursion and higher-order functions. That’s all well and good, but how are we ever going to get this working in brainfuck?

To start thinking about this, consider how `dip` might work. Ignoring how we actually invoke the `[1, +]`, we know that when it does execute it needs to see a tape that looks like this:

```julia
... 0 3 1 5 1* ...
```

So we temporarily need to hide the `7` from the top of the stack. It might occur to you to simply put the `7` somewhere on the right, away from the end of the stack, and bring it back later on:

```julia
0 3 1 5 1* 0 0 0 0 7
```

But the quotation we call next could do *anything*, including growing the stack and overwriting our hidden value, so that’s no good. Instead, we can put the hidden value in front of the stack.

```julia
7 0 3 1 5 1*
```

Ok, here’s a harder example:

```julia
julia> @run [3, 5, 7, [[1, +], dip], dip]
[7697] 4 1 5 1 7 1*
```

What happened here? We hid the `7` and then called the outer quotation (effectively the same as `[3, 5, [1, +], dip]`) which then hides the `5` and adds `1` to `3`. While `[1, +]` is running we’ve temporarily hidden *two* values. In the general case we might hide any number of items on the stack, and we’ll need to pad them again to see where the end is:

```julia
1 5 1 7 0 3 1*
```

This is starting to look a lot like a second stack, extending to the left! Indeed, all Forth implementations have a secret second “rstack” used for storing the program state. It’s straightforward to write an `rpush` and `rpop` routine to move values to and from the rstack, which lets us implement `dip` like behaviour in a low-level way.

```julia
julia> @run [3, 5, 7, rpush, debug!, 1, +, rpop]
[321] 1 7 0 3 1 5 1*
[632] 3 1 6 1 7 1*
```

[See it running.](http://fatiherikli.github.io/brainfuck-visualizer/#Pj4+Pj4rKys+Kz4rKysrKz4rPisrKysrKys+Ky08Wy08Wzw8XTw8Wzw8XT4+PCs+Wz4+XT4+Wz4+XTw8Pl08Wzw8XTw8Wzw8XT4+PDwrWz4+XT4+Wz4+XTw8Pis+Ky08Wy08PCs+Pl08Wzw8XTw8Wzw8XT4+LT5bLT5bPj5dPj5bPj5dPDw+KzxbPDxdPDxbPDxdPj48XT5bPj5dPj5bPj5dPDw+Pis=)

## Famous Quotations

We have a good plan for `dip`, but to implement it properly we still need quotations and `call` as above. Given that the stack can only store bytes, deciding how to represent quotations is pretty easy; each one has to be assigned a unique numeric ID, which is what actually gets pushed onto the stack.

```julia
julia> @run [5, [1, +], [2, +]]
[18] 5 1 2 1 1 1*
```

The first quotation from the end, `[2, +]`, is labelled `1`; the second, `[1, +]`, is `2`, and so on.

The basic approach to `call` is then fairly straightforward; the compiler builds up an `if-else` chain in brainfuck code. In pseudo code it looks like:

```julia
if code == 1
  add 2
elseif code == 2
  add 1
...
```

If we use more quotations in our program, the compiler just adds more branches.

This is a straightforward scheme, but rapidly hits snags as we try to support more complex cases, like nested `call`s.

```julia
[[5, [1, +], call], call]
```

`call` works by writing the body of the quotation into the `if` branch above, but we clearly can’t inline `call` – which contains that same `if` branch – into itself. If we hit a nested `call`, we need to find some way to pass control back to the currently-running version. To do *that* we need some way to store the program state; the set of code quotations that we are currently running through.

Turns out this is an excellent use for the `rstack` we created above. Instead of `call` reading code directly off the data stack, it will first push it to the `rstack` and then loop until that stack is empty again. Nested `call`s are simply `rpush`, which queues a quote to be run next. You can see the example above running [here](http://fatiherikli.github.io/brainfuck-visualizer/#Pj4+Pj4+Pis+Ky08Wy08Wzw8XTw8Wzw8XT4+PCs+Wz4+XT4+Wz4+XTw8Pl08Wzw8XTw8Wzw8XT4+PDwrWzwrPCstPlstPj4tPDxdPj5bPC1dPFstPlstXT5bPj5dPj5bPj5dPDw+KysrKys+Kz4rKz4rLTxbLTxbPDxdPDxbPDxdPj48Kz5bPj5dPj5bPj5dPDw+XTxbPDxdPDxbPDxdPj48PCtbPj5dPj5bPj5dPDxbPDxdPDxbPDxdPj48PCstPF0+KzwrPCstPlstPj4tPDxdPj5bPC1dPFstPlstXT5bPj5dPj5bPj5dPDw+Kz4rLTxbLTw8Kz4+XTxbPDxdPDxbPDxdPj48PCstPF0+Ky0+Wy1dPl1bPj5dPj5bPj5dPDw=), or you can manipulate the rstack directly:

```julia
julia> @run [5, [1, +, debug!], rpush, [2, *, debug!], rpush, [debug!], call];
[1615] 1 3 1 4 0 5 1*
[2945] 1 4 0 10 1*
[4053] 11 1*
```

The `debug!` trace shows the data stack (`5`) along with the `[2, *]` and `[1, +]` instructions (`3`, `4`). Once we’ve launched `call` the instructions will be popped and run one by one, altering the value of the stack as they go. If you shift your head a little, this looks a lot like a bytecode interpreter[^interp].

[^interp]: People occasionally believe that, since all languages are Turing equivalent, it makes no difference what they look like. Brainfuck suggests otherwise. We essentially have an extreme form of [Greenspun’s Tenth Rule](https://en.wikipedia.org/wiki/Greenspun%27s_tenth_rule), where anything remotely complex requires an interpreter for a totally different language. Basically, it’s a red herring; Turing completeness affects language design like the presence of oxygen affects interior design.

With all that in place, we can finally write `dip`.

```julia
@bf dip = [swap, rpush, [rpop], rpush, call]
```

We do something interesting here – rather than just `rpush`ing the value and then popping it later, we actually push the `[rpop]` instruction onto the rstack (the `3` below).

```julia
julia> @run [5, 7, [1, +, debug!], dip]
[1883] 1 3 1 7 0 6 1*
[3257] 6 1 7 1*
```

This instruction effectively guards the data value, preventing `call` from trying to interpret it as code. When `call` hits the `rpop` instruction it will immediately move the value back to the data stack.

Despite its simplicity, `dip` exercises most of the compiler, and we can use this foundation to implement more powerful functions.

## Level Up

Forth comes with many [stack shufflers](http://wiki.laptop.org/go/Forth_stack_operators), which make it easier to write readable code. Pleasingly, we can [implement all of these](https://github.com/MikeInnes/BrainForth/blob/b78ab4c183586f82c23bb57624ca12c542e5e2ad/src/forth.jl#L48-L65) with only the `swap`, `dup` and `dip` functions that we defined above. (Note the use of [stack effect](https://www.complang.tuwien.ac.at/forth/gforth/Docs-html/Stack_002dEffect-Comments-Tutorial.html) notation to describe what the functions are doing.)

```julia
# x y -- x x y
@bf dupd = [[dup], dip]
# x y -- x y x
@bf over = [dupd, swap]
# x y -- x y x y
@bf dup2 = [over, over]
# and so on
```

Factor also extends this with its quotation mechanism to produce [combinators](http://elasticdog.com/2008/12/beginning-factor-shufflers-and-combinators/). For example, `keep` applies a quotation while preserving the top item on the stack.

```julia
julia> @bf keep = [dupd, dip]

julia> @run [5, 7, [+], keep]
[11055] 12 1 7 1*
```

While `bi` applies two functions to a single value.

```julia
julia> @bf bi = [[keep], dip, call]

julia> @run [8, [1, +], [1, -], bi]
[26791] 9 1 7 1*
```

[Implementing these](https://github.com/MikeInnes/BrainForth/blob/b78ab4c183586f82c23bb57624ca12c542e5e2ad/src/forth.jl#L67-L78) is a nice puzzle in itself.

Control flow constructs are also implemented as higher order functions. For example, `iff` takes a true and false clause from the top of the stack.

```julia
julia> @run [10, 10, ==, [25], [50], iff]
[9685] 25 1*
```

We can also implement recursive functions at this point[^rec]. Here’s a recursive factorial function. If the input `n` is one, we’re done; if not, we take the factorial of `n+1` and multiply the two together.

[^rec]: An interesting property is that tail recursive functions will use constant stack space, automatically. This isn't something the compiler optimises, it just falls right out of the programming model.

```julia
julia> @bf factorial = [dup, 1, ==, [dup, 1, -, factorial, *], unless]

julia> @run [5, factorial]
[69372] 120 1*
```

Here’s the doubly-recursive fibonacci function. Brainforth may yet have a future in number theory; there can only be so many interesting integers, so I doubt you’d need any larger than 255 anyway.

```julia
julia> @bf fib = [dup, [1, ==], [0, ==], bi, or,
                  [[1, -, fib], [2, -, fib], bi, +], unless]

julia> @run [10, fib]
[23252448] 55 1*
```

Stepping through brainfuck instructions is not so useful when we’re running 23 million of them. Instead, we can insert tactical `debug!` statements to see the state of the stack.

```julia
julia> @bf factorial = [debug!, dup, 1, ==, [dup, 1, -, factorial, *], unless, debug!]

julia> @run [3, factorial];
[2627] 1 7 1 8 0 3 1*
[14971] 1 7 1 10 1 8 0 3 1 2 1*
[26872] 1 7 1 10 1 10 1 8 0 3 1 2 1 1 1*
[39465] 1 10 1 8 0 3 1 2 1 1 1*
[41123] 1 8 0 3 1 2 1*
[42362] 6 1*
```

The stack expands to `3`, `2`, `1`, and those values are then multiplied together in turn. The instruction `10` effectively tracks the number of multiplies that we need to carry out, so the `rstack` also expands on the left. You can see that our forth would be pretty crippled without the two stacks. I’m sure that you could prove this formally; pushdown automata are also only Turing complete if they have more than one stack available, and this is a very similar model.

## Array With Words

Being able to write recursive functions opens up an interesting possibility. Could we represent lists on our stack, and use recursive functions to manipulate them?

Since there’s no such thing as a pointer in brainforth-land, we’ll have to store all list elements directly on the stack. We’ll also need to know how long it is, so we’ll store the length on top of the elements. There’s an `iota` function which creates a range array for you.

```julia
julia> @run [3, iota]
[343027] 3 1 2 1 1 1 3 1*
```

Arrays are stored “head-first”, so this is actually the 3-element list `1, 2, 3`. It’s simple to implement some basic functionality, like `length`, `isempty` and `push`, as aliases to basic brainforth commands.

List operations take the classical recursive approach.

* If the list is empty, stop.
* If not,
	* Pop the first element, and do something with it,
	* Recurse into the rest of the list, and
	* Push the modified element back into the modified list.

I won’t go over how [all of these are implemented](https://github.com/MikeInnes/BrainForth/blob/b78ab4c183586f82c23bb57624ca12c542e5e2ad/src/array.jl) – at this point it’s fairly standard stuff – but here’s a simple function that adds `1` to each element of a list:

```julia
julia> @bf incv = [isempty, [pop, 1, +, [incv], dip, push], unless]

julia> @run [3, iota, incv]
[644830] 4 1 3 1 2 1 3 1*
```

So now we have the 3-element list `2, 3, 4`. We can [generalise this a little](https://github.com/MikeInnes/BrainForth/blob/b78ab4c183586f82c23bb57624ca12c542e5e2ad/src/array.jl#L50-L52) to implement `map`:

```julia
julia> @run [3, iota, [1, +], map]
[1139034] 4 1 3 1 2 1 3 1*
```

And get a list of square numbers:

```julia
julia> @run [5, iota, [dup, *], map]
[1910094] 25 1 16 1 9 1 4 1 1 1 5 1*
```

Or get factorial numbers again:

```julia
julia> @run [5, iota, 1, [*], fold]
[2105444] 120 1*
```

Nice – this is starting to look a lot like a relatively high-level language. I also went to the trouble to implement the vector equivalents of stack-shuffling functions (e.g. `dupv` to duplicate a list) so you can, for example, copy a list, reverse the original, and concatenate them to get `1, 2, 3, 2, 1`.

```julia
julia> @run [3, iota, dupv, [reverse, pop, drop], dipv, cat]
[6803230] 1 1 2 1 3 1 2 1 1 1 5 1*
```

If you think about what’s happening in the stacks to achieve a list reversal, you should be either impressed or horrified[^weak].

[^weak]: This is what real weak typing looks like. We rely entirely on the programmer to separate arrays from bytecodes from data by convention, and if you get it wrong you just get a messed up state. If the compiler knew a bit more about the language, it could enforce more correctness with a static type system; but that would ruin the beauty of bootstrapping the stack abstraction with the language itself. Alternatively, we could have all data be tagged for a dynamic type system, though it would be extremely inefficient.

Arrays give us everything we need to implement usable I/O, e.g. `readln` that reads with `,` until a newline, or `println` that prints each character in a list with `.`.

```julia
julia> @run [readln, reverse, println]
hello world
dlrow olleh
[30419408] 0*
```

We finally have all the pieces we need to implement the guessing game I showed above.

```julia
# --
@bf intro = ["The Guessing Game: Guess a number from 0-255!", println]

# -- name
@bf getname = [["Enter your name: ", prompt], whileempty]
# -- n
@bf getnum = [["Enter your guess: ", prompt], whileempty, parseint]
# --
@bf greeting = ["Hello, ", print, print, "!", println]

# Lacking an RNG, we come up with a number based on the user's name.
# s -- s n
@bf roll = [[1, +], map, dupv, prod]

# n --
@bf game = [[dup, getnum, tuck, !=],
            [dupd, <, ["Too high!"], ["Too low!"], iff, println],
            loop, drop, drop,
            "Correct!", println]

@bf main = [intro, getname, dupv, greeting,
            [1], [roll, game, "", println], loop]
```

The code is thoroughly weird – like a sort of ML-based assembly language – but it’s pretty readable once you’re used to the syntax. Certainly more so than the fifty thousand characters of brainfuck that it generates[^complex].

[^complex]: I was surprised by how well this system held up as the complexity grew. I was fully expecting to have to debug off-by-one errors in kilobytes of brainfuck code, but the approach is remarkably solid. I think that’s a testament to the power of Forth’s philosophy, to gradually layer small abstractions that are simple and obviously correct.

There’s one bonus feature: a primitive Rust-style [`panic` function](https://github.com/MikeInnes/BrainForth/blob/b78ab4c183586f82c23bb57624ca12c542e5e2ad/src/text.jl#L23) for error handling, which will kill the script with an error message. I leave its implementation as an exercise for the reader.

## Closure

That escalated quickly. We bootstrapped a high-level system, unrecognisable from brainfuck, in only a couple hundred lines of code. It was also pretty fun to build; this kind of task is a fractal of interesting little logic puzzles. Of course, it’s not without limitations. For example, it doesn’t support closures, so you can’t use `map` if you want to (say) add a user input integer to every item in a list.

Is there any point to this at all? Aside from wanting to have a side project that couldn’t *possibly* be successful and therefore turn into real work, I think there’s real value in thinking about strange Turing machines. The world is full of computers that aren’t CPUs – biological cells, quantum circuits, [fractions](https://en.wikipedia.org/wiki/FRACTRAN) – and programming them is currently much closer to brainfuck than to Python. Finding programming models that are intuitive while exploiting the hardware (or wetware) well is an important unsolved problem.

Of course, brainforth contributes nothing of value to any of these efforts.

Join us next week, when we’ll be compiling Erlang to [Piet](https://esolangs.org/wiki/Piet), for fault-tolerant yet picturesque distributed systems!

<div class="fill">
  <img src="pollock.jpg" />
</div>
