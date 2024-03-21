---
title: Stack Shuffling
tags: [languages]
date: "2024-03-21"
draft: true
---

WebAssembly is an odd compiler target, because of its unusual mix of high- and low-level style. It gives you pointers and a flat array for your heap memory, yet no access to the program stack. It uses jump instructions for control flow, while only allowing the structured kind. It has local variables and even expressions, but instructions take and produce values through a data stack.

There are well-known ways to deal with most of these peculiarities: you can create a shadow stack to model C-like stack pointers, or turn jump-based control flow back into loops and conditions with the "stackifier" algorithm.[^stack] A less-discussed topic is how to manage the wasm data stack. How should we generate concise instruction sequences that put the right values in the right place?

[^stack]: Unfortunately the word "stack" is overloaded, and will come up a lot in this note.

For example, say we have a function `$foo` which generates two values we'll call `x` and `y`, placing them on top of the stack. Another function `$bar` wants to accept the same values `(x, y)` as a pair of arguments. Ok, pretty easy:

```clojure
(call $foo)
(call $bar)
```

Oh wait, what if we need to use `y` later on?[^ssa] We better save it in a local:

[^ssa]: I'm going to gloss over some details, like how we know which variables are live. Use SSA and that stuff is easy.

```clojure
(call $foo)
(local.tee $y)
(call $bar)
```

What if we'll need `x` again too?

```clojure
(call $foo)
(local.set $y)
(local.tee $x)
(local.get $y)
(call $bar)
```

What if the arguments to `$bar` are `(y, x)`? What if they are `(y, z)`, but we need `x` on the stack for later? Things get hairy.

The easiest solution is to dump all variables into locals immediately, and load them back whenever you need them. But this is pretty unsatisfying. To go back to our original example:

```clojure
(call $foo)
(local.set $y)
(local.set $x)
(local.get $x)
(local.get $y)
(call $bar)
```

If you work with functions of more than a few arguments, a horrifying amount of your code becomes `get`/`set` instructions, and many will be redundant.

One option is to recognise this as a path-finding problem. Think of a set of variables on the stack, like `(x, y, z)` as a coordinate on a map. If our starting point is `(x, y)` and our destination is `(x, z, y)`, then a path from A to B is `[set y, set x, get x, get z, get y]`. Or `[set y, get y, drop, get z, get y]`. Those are both valid paths, but we specifically want the shortest, which is `[set y, get z, get y]`. Then we can turn any path into wasm instructions.

Lucky for us there are good, fast path-finding algorithms out there, like A* Search. Here's a little implementation of A* in stack space, in Julia.

<details><summary>A* in Julia</summary>

```julia
# Tested on Julia 1.9.2, DataStructures v0.18.15
using DataStructures: PriorityQueue, dequeue!

struct State
  stack::Vector{Union{Symbol,Number}}
  store::Set{Symbol}
end

State(x::State) = x
State(stack, store::AbstractVector = []) = State(stack, Set(store))
Base.:(==)(a::State, b::State) = (a.stack, a.store) == (b.stack, b.store)
Base.hash(ls::State, h::UInt64) =
  hash((ls.stack, ls.store), h ⊻ 0x205dbdcc02f546cb)

top(ls::State) = ls.stack[end]
top(ls::State, n) = ls.stack[max(1,end-n+1):end]
drop(ls::State) = State(ls.stack[1:end-1], ls.store)
set(ls::State) = State(ls.stack[1:end-1], push!(copy(ls.store), top(ls)))
tee(ls::State) = State(ls.stack, push!(copy(ls.store), top(ls)))
load(ls::State, v) = State([ls.stack..., v], ls.store)

matches(state::State, target::State) =
  top(state, length(target.stack)) == target.stack &&
  all(v -> v in state.store || v in state.stack[1:end-length(target.stack)],
      target.store)

heuristic(state::State, target::State) = 0

function stackshuffle(locals::State, target::State)
  implicit = filter(x -> x isa Symbol, setdiff(target.stack, locals.stack))
  nums = filter(x -> x isa Number, target.stack)
  locals = State(locals.stack, union(locals.store, implicit))
  paths = Dict{State,Vector{Tuple}}()
  q = PriorityQueue{State,Tuple{Int,Int,Int}}()
  function mark!(locals, path)
    sc = (length(path) + heuristic(locals, target),
          length(locals.stack),
          length(locals.store))
    if !haskey(paths, locals) || (haskey(q, locals) && sc < q[locals])
      paths[locals] = path
      q[locals] = sc
    end
  end
  mark!(locals, [])
  while true
    locals = dequeue!(q)
    path = paths[locals]
    matches(locals, target) && return paths[locals], locals
    if !isempty(locals.stack)
      mark!(drop(locals), [path..., (:drop,)])
      if !(top(locals) isa Number)
        mark!(set(locals), [path..., (:set, top(locals))])
        mark!(tee(locals), [path..., (:tee, top(locals))])
      end
    end
    for v in union(locals.store, nums)
      mark!(load(locals, v), [path..., (:get, v)])
    end
  end
end

stackshuffle(locals, target) = stackshuffle(State(locals), State(target))
```

</details>

The components of this are a model of wasm's local state (variables stored in local slots or on the stack), in `struct State`, and a model of the path between states (a sequence of wasm instructions), as a list of tuples. We `mark!` each `State` as we find it, assigning a score to the path that got us there. At each iteration we grab the marked state with the lowest score, then mark its neighbours – the states reachable by a new wasm instruction. For example, if the state of the stack is `(x, y)`, then `drop` gets us to the state `(x)`, while `get z` reaches the state `(x, y, z)`. Eventually we will find the state we are looking for, via the lowest-scoring path.[^heuristic]

[^heuristic]: You may also notice the `heuristic` function, which is there to estimate the remaining cost. At the cost of performance we can ignore this for now, setting it to `0`.

The score is not just the number of instructions in the path, but the tuple `(length(path), length(locals.stack), length(locals.store))`. If two paths are of equal length, the one that does less redundant work is better. This ensures we prefer `drop` over `set`, and `set` over `tee`, where possible.

Hey presto:

```julia
julia> stackshuffle(State([:x, :y]), State([:x, :y]))[1]
Tuple[]
```

Ok, easier to see it if we keep some variables around. The second argument to `State` describes what is store in local slots:

```julia
julia> stackshuffle(State([:x, :y]), State([:x, :y], [:x, :y]))[1]
3-element Vector{Tuple}:
 (:set, :y)
 (:tee, :x)
 (:get, :y)
```

If there are no locals we can use a shorthand:

```julia
julia> stackshuffle([:x, :y, :z], [:y, :y, :z])[1]
4-element Vector{Tuple}:
 (:set, :z)
 (:tee, :y)
 (:get, :y)
 (:get, :z)
```

(The second return value, which we ignore here, is the resulting state of the stack; in this case it would indicate that `x` remains at the bottom of the stack, even though we didn't ask for it.)

## Generalising it

The neat thing about the search approach is how declarative it is. Our goal is simply a predicate, `matches`, and we can tweak it to say that we want an exact match, or that we don't care about ordering, without touching the algorithm. Likewise we don't explain how to use wasm's instructions, just to say when they apply and what effect they have. We can just as easily extend the code to use hypothetical new [stack shuffling ops](https://docs.factorcode.org/content/article-tour-stack-shuffling.html) like `dup`, `swap`, `over`, `dupd`, `nip`.[^dsl]

[^dsl]: Eventually you'd want to abstract over operations themselves, combining the "when" and the "what" into one object, and having A* iterate over a list of them. And you could use a DSL to define these ops by their stack shape, eg `swap` is `x y -- y x`.

<details><summary>Extended A*</summary>

```julia
dup(ls::State) = typeof(ls)([ls.stack..., ls.stack[end]], ls.store)
swap(ls::State) = typeof(ls)([ls.stack[1:end-2]..., ls.stack[end], ls.stack[end-1]], ls.store)
over(ls::State) = typeof(ls)([ls.stack[1:end-2]..., ls.stack[end-1], ls.stack[end], ls.stack[end-1]], ls.store)
dupd(ls::State) = typeof(ls)([ls.stack[1:end-2]..., ls.stack[end-1], ls.stack[end-1], ls.stack[end]], ls.store)
nip(ls::State) = typeof(ls)([ls.stack[1:end-2]..., ls.stack[end]], ls.store)

function stackshuffle2(locals::State, target::State)
  implicit = filter(x -> x isa Symbol, setdiff(target.stack, locals.stack))
  nums = filter(x -> x isa Number, target.stack)
  locals = State(locals.stack, union(locals.store, implicit))
  paths = Dict{State,Vector{Tuple}}()
  scores = Dict{State,Tuple{Int,Int,Int}}()
  q = PriorityQueue{State,Tuple{Int,Int,Int}}()
  function mark!(locals, path)
    sc = (length(path) + heuristic(locals, target),
          length(locals.stack),
          length(locals.store))
    if haskey(paths, locals) && (!haskey(q, locals) || q[locals] < sc)
      return
    end
    paths[locals] = path
    scores[locals] = q[locals] = sc
  end
  mark!(locals, [])
  while true
    locals = dequeue!(q)
    path = paths[locals]
    matches(locals, target) && return paths[locals], locals
    if !isempty(locals.stack)
      mark!(drop(locals), [path..., (:drop,)])
      mark!(dup(locals), [path..., (:dup,)])
      if !(top(locals) isa Number)
        mark!(set(locals), [path..., (:set, top(locals))])
        mark!(tee(locals), [path..., (:tee, top(locals))])
      end
    end
    if length(locals.stack) >= 2
      mark!(swap(locals), [path..., (:swap,)])
      mark!(over(locals), [path..., (:over,)])
      mark!(dupd(locals), [path..., (:dupd,)])
      mark!(nip(locals), [path..., (:nip,)])
    end
    for v in union(locals.store, nums)
      mark!(load(locals, v), [path..., (:get, v)])
    end
  end
end

stackshuffle2(locals, target) = stackshuffle2(State(locals), State(target))
```

</details>

A* will use these like it was born with them, finding even nicer paths for us:

```julia
julia> stackshuffle([:x, :y, :z], [:z, :y, :z, :z])[1]
6-element Vector{Tuple}:
 (:set, :z)
 (:set, :y)
 (:get, :z)
 (:get, :y)
 (:get, :z)
 (:get, :z)

julia> stackshuffle2([:x, :y, :z], [:z, :y, :z, :z])[1]
3-element Vector{Tuple}:
 (:swap,)
 (:over,)
 (:dup,)
```

## Specialising it

If you play around with larger stack inputs, you'll find that it gets slow pretty quickly. The nature of search is that the number of possible paths increases exponentially with length. We can address this with the `heuristic` function we ignored earlier, which should give an estimate of the remaining distance from the current stack state to the target. Despite the name, if the heuristic is "admissible" – it never overestimates the cost – the search still guarantees optimal results.

You can get pretty fancy here, but I had good results by finding the longest matching prefix of the target stack:

```julia
function prefix(xs, ys)
  dp = zeros(Int, length(ys)+1)
  len, pos = 0, length(ys)
  for i in 1:length(xs), j in length(ys):-1:1
    if xs[i] == ys[j]
      dp[j+1] = dp[j] + 1
      if i == dp[j+1] && dp[j+1] > len
        len = dp[j+1]
        pos = j
      end
    else
        dp[j+1] = 0
    end
  end
  return len, pos
end

function heuristic(state::State, target::State)
  l, i = prefix(target.stack, state.stack)
  rm = length(state.stack) - i
  add = length(target.stack) - l
  return min(rm + add, length(target.stack))
end
```

This makes the search pretty fast for the sizes of stacks you're likely to see. However, if you continue down the heuristic-improvement path (and have admissible gut instincts) you'll realise that writing an ideal heuristic is the same as knowing which path to take in the first place. Can we use this to write a more direct algorithm?

Looking at the results of the search, we can see that there are basically two states: either we need more information, in which case we should consume the stack (using `set` or `drop` depending on whether a variable is used later), or we have everything and should simply `get` any remaining variables onto the stack in sequence. Collapse `set, get` into `tee` on the fly and you're sorted. Here's code for that:

```julia
function stackshuffle3(locals::State, target::State)
  implicit = filter(x -> x isa Symbol, setdiff(target.stack, locals.stack))
  locals = State(copy(locals.stack), union(locals.store, implicit))
  needed = union(target.store, target.stack)
  path = Tuple[]
  function load(x)
    !isempty(path) && path[end] == (:set, x) ? (path[end] = (:tee, x)) : push!(path, (:get, x))
    push!(locals.stack, x)
  end
  while true
    len, pos = prefix(target.stack, locals.stack)
    live = union(locals.store, locals.stack[1:end-len])
    if pos == length(locals.stack) &&
        all(x -> x isa Number || x in locals.store, target.stack[len+1:end]) &&
        all(x -> x in live, target.store)
      foreach(load, target.stack[len+1:end])
      break
    else
      v = pop!(locals.stack)
      if v isa Number || v in locals.store || !(v in needed)
        push!(path, (:drop,))
      else
        push!(path, (:set, v))
        push!(locals.store, v)
      end
    end
  end
  return path, locals
end

stackshuffle3(locals, target) = stackshuffle3(State(locals), State(target))
```

Pleasingly, this almost always returns the same results as `stackshuffle`, and it's tons faster, scaling up to hundreds of variables. But – we do give up optimal results in an edge case, because the code will always drop down to a prefix even if it's deep in the stack.

```julia
julia> stackshuffle([:a, :x, :y, :z, :a], [:a, :a])[1]
2-element Vector{Tuple}:
 (:tee, :a)
 (:get, :a)

julia> stackshuffle3([:a, :x, :y, :z, :a], [:a, :a])[1]
5-element Vector{Tuple}:
 (:set, :a)
 (:drop,)
 (:drop,)
 (:drop,)
 (:get, :a)
```

We could get the best of both worlds here by going back to search, but using `mark!` on a single route in most cases, and only splitting the path when there is a genuine ambiguity. But we don't need to. In my case I'll never generate unused duplicate variables on the stack, and some fuzzing suggests that for everything else the direct approach gives the same results as the much more expensive search.

Though I didn't end up using A* search, it was an important step on the route to a solution. It inspired the manual code, helped me find tricky bugs and corner cases, and validated the final result.

Any time you're carrying out a complicated task, it's useful to have a simple and general (if slow) solution to complement your fast, specialised one, because you can test them side by side. Here we had search and a direct approach; in programming languages you might have an interpreter and a compiler. Even if both methods are complicated and buggy, they are unlikely to have identical bugs, so you can solidify everything by fuzzing for behaviour differences. It's a good trick.
