---
aliases:
- /2020/07/29/mjolnir
- /2020/07/29/mjolnir.html
date: '2020-07-29'
tags: [languages]
title: Partial Evaluation & Abstract Interpretation
---

[Mjolnir](https://github.com/MikeInnes/Mjolnir.jl) is, one the one hand, a library implementation of Julia’s type inference engine. On the other, it’s a version of the computation-graph-tracing technique used by [JAX](https://github.com/google/jax/).[^1] Those might seem like quite different things, but they’re really two sides of the same coin. Understanding that relationship is enlightening in itself, but more interestingly, it leads to some ideas for getting the best of both systems.


## Abstract Interpretation

Julia uses an [abstract interpretation approach to type inference](https://juliacomputing.com/blog/2016/04/04/inference-convergence.html). The high-level intuition is that Julia walks over your code much like an interpreter would, except that variables are assigned to abstract sets of values (like `Int64`, representing all the whole numbers you can squeeze into 64 bits) rather than actual values (like `3`, a particular one of those numbers).

For example, looking at the code below we first hit the line `result = 0` and note to ourselves that `result` is an `Int64` (forgetting what specific number it is assigned to).

```julia
function sum(xs)
  result = 0
  for x in xs
    result = result + x
  end
  return result
end
```

What happens next depends on what `xs` is. If `xs` is a `Vector{Int64}`, we can see that `result + x` will also be an `Int64`, which means that `result` is still `Int64` after the second assignment. We see the `return result`, note that the function as a whole returns `Int64`, and we’re done.

If `xs` isa a `Vector{Float64}`, the addition `+` returns a `Float64`, so the second assignment to `result` conflicts with the first. That’s ok; we just note that `result` can be either `Int64` or `Float64`, represented as `Union{Int64,Float64}`. The subtlety here is that we now need to go back to the start of the loop, because the changed type of `result` might change the behaviour of other functions like `+`. Luckily, `+` still returns a `Float64` in all cases, so no more changes to the type of `result` are needed. We can stop, noting the return type `Union{Float64,Int64}`.[^2]


## Partial Evaluation

It’s common for Python libraries, especially in ML, to build up graph representations of programs. A special `tensor` type is overloaded so that operations like `c = a + b` don’t just carry out tensor addition, but also record the operation (`+`) and its inputs (`a, b`) in a _trace_. So as the Python code executes, it records, and the final recording can be analysed or transformed as needed.[^3]

<div class="fill">
  <img src="https://raw.githubusercontent.com/pytorch/pytorch/master/docs/source/_static/img/dynamic_graph.gif">
</div>

It’s a good trick. By default, the recorded trace is free of source language constructs (control flow, data structures, functions calls etc) and only has simple numerical operations in it, making it trivial to convert the trace even to a limited backend like XLA.

Besides sharing the high-level goal of Julia’s abstract interpreter – compiling a high-level array language to fast machine code – both techniques share a deep structure. The tensors used by JAX are effectively types, representing the set of all arrays with a certain shape and element type. The Python interpreter takes on the role of compiler, optimising the code once and then taking a back seat while the compiled model runs. They are, of course, very different technical approaches, and end up with some different properties: among other things the tracing approach unrolls all loops and recursion by default, which can generate unruly volumes of code in some cases.

While many of the tradeoffs are right for the context, the tracing approach does have [some clear downsides](https://jax.readthedocs.io/en/latest/notebooks/Common_Gotchas_in_JAX.html). The trace does not have debug info, so good luck figuring out any run-time errors. Python control flow (`if`, `for`, `while`) is not traceable, so programs that branch on input data will have to be rewritten. Array mutation cannot typically be traced. It is cumbersome to add new traceable types, so only arrays (and not strings etc) are supported. Side-effecting functions like `print` confusingly get evaluated once at model compile time, rather than when the model actually runs. It’d be nice to avoid some of these pitfalls while still getting the benefits of a tracing-like compiler.


## The Hovis Compiler

Enter Mjolnir, which reproduces the results of a tracing-like pass by extending type inference with constants (sets of just one value) and array shapes:

```julia
julia> using Mjolnir

julia> function pow(x, n)
         r = 1
         while n > 0
           n -= 1
           r *= x
         end
         return r
       end

julia> @trace pow(Int, 3)
1: (%1 :: const(pow), %2 :: Int64, %3 :: const(3))
  %4 = (*)(1, %2) :: Int64
  %5 = (*)(%4, %2) :: Int64
  %6 = (*)(%5, %2) :: Int64
  return %6
```

(`@trace` is analogous to `make_jaxpr`. The resulting code is represented in SSA form, where variables have names like `%x` and each function call gets its own line.)

Because Mjolnir has its own (abstract) interpreter built for purpose, it can preserve debug info and side effects in the trace:

```julia
julia> function pow(x, n)
         r = 1
         while n > 0
           n -= 1
           r *= x
           @show r
         end
         return r
       end

julia> @trace pow(2, 3)
1: (%1 :: const(pow), %2 :: const(2), %3 :: const(3))
  %4 = (println)("r = ", "2")
  %5 = (println)("r = ", "4")
  %6 = (println)("r = ", "8")
  return 8
```

More interesting is what happens when we don’t know how many loop iterations there will be. Instead of borking on the control flow, Mjolnir just preserves it in the trace.

```julia
julia> @trace pow(Int, Int)
1: (%1 :: const(pow), %2 :: Int64, %3 :: Int64)
  %4 = (>)(%3, 0) :: Bool
  br 3 (1) unless %4
  br 2 (%3, 1)
2: (%5 :: Int64, %6 :: Int64)
  %7 = (-)(%5, 1) :: Int64
  %8 = (*)(%6, %2) :: Int64
  %9 = (>)(%7, 0) :: Bool
  br 3 (%8) unless %9
  br 2 (%7, %8)
3: (%10 :: Int64)
  return %10
```

(Control flow makes this example a little more complex. Each _basic block_, labelled like `1: (args…)` is like a function, which may call another block with arguments. So SSA is like a set of Jaxprs that call each other. In full generality you’d have to deal with a set of functions, each with a set of basic blocks, that call each other.)

How does this work? Simple: if we hit a branch we’ll usually just interpret it abstractly, following both branches as usual. But if we happen to know the target of the branch already, just inline its code into the current block and carry on. This both unrolls loops and elides unused `if`/`else` branches, where possible. This is effectively the same thing that Julia already does when it knows the target of a method dispatch ahead of time; to the extent that branches are like functions, method specialisation, loop unrolling and eliding branches are all the same kind of operation.[^4]


## Data Structures

Aside from unrolling and inlining, JAX has another trick up its sleeve, which is to elide Python data structures in the trace. This is not strictly correct (since these data structures are mutable and could be modified at any time, by anyone). But a fairly intuitive and empirically reasonable assumption, that the traced function is _referentially transparent_, is enough to make the simplification valid. The same holds for Mjolnir, meaning that we can take this over-engineered `relu` and produce code equivalent to `myrelu(x) = x > 0 ? x : 0`, evaluating the dictionary operations at compile time.

```julia
julia> function updatezero!(env)
         if env[:x] < 0
           env[:x] = 0
         end
       end

julia> function myrelu(x)
         env = Dict()
         env[:x] = x
         updatezero!(env)
         return env[:x]
       end

julia> @trace myrelu(Int)
1: (%1 :: const(myrelu), %2 :: Int64)
  %3 = (<)(%2, 0) :: Bool
  br 2 (%2) unless %3
  br 2 (0)
2: (%4 :: Int64)
  return %4
```

The major trick that powers this is type inference over partial, mutable data structures, which basically means treating dictionary slots like `env[:x]` as if they were local variables. Doing this properly depends on being able to insert back edges across function boundaries, so that the type of `env[:x]` can be updated if a different function inserts to `env` (or if it inserts a key with non-constant value, which would widen types across all keys).

The minor trick is that we generally do inference with a _node_ object that represents both the type of a variable and where it was created in the trace. If we pull a node out of a data structure, we can just insert a reference to the original variable directly, rather than a `getindex` instruction. This mimics the way that OO tracing elides data structures, which is really easy to implement (we could get the same effect with a post-inference optimisation pass).


## Futamura Projections

As a fun example of these ideas in practice, we can see what happens when we apply Mjolnir to a programming language interpreter. [Brainfuck](https://esolangs.org/wiki/Brainfuck) is a handy language as we can interpret it with a [very simple loop](https://github.com/FluxML/Mjolnir.jl/blob/9435d98673752cec4e222e31a6b9f38edcd7d5e0/examples/futamura/brainfuck.jl#L56-L73). By specialising this interpreter on a particular brainfuck program, we effectively have a compiler – spitting out minimal, equivalent Julia code for the input program. This is known as the first [Futamura projection](http://blog.sigfpe.com/2009/05/three-projections-of-doctor-futamura.html). It’s an appealing idea because writing an interpreter is often far easier than writing a compiler, but Futamura promises us one from the other, for free.

[This notebook](https://github.com/FluxML/Mjolnir.jl/blob/9435d98673752cec4e222e31a6b9f38edcd7d5e0/examples/futamura/futamura.ipynb) goes through the process in detail, but the upshot is that this actually works. The brainfuck program `++` gets compiled to the Julia IR equivalent of `tape[1] += 1; tape[1] += 1`, as if you’d translated the BF code by hand. A program computing addition,

```brainfuck
[->>+<<]>[->+<]
```

gets compiled to the equivalent Julia loops,

```julia
while tape[1] != 0
    tape[1] -= 1
    tape[3] += 1
end
while tape[2] != 0
    tape[2] -= 1
    tape[3] += 1
end
```

Even better, compiling this Julia code results in a single machine integer addition instruction, because LLVM is able to simplify the two loops. So a simple interpreter and Mjolnir give us a (fairly dumb) optimising brainfuck compiler.

Brainfuck is a silly example, but it’s worth remembering that any program that accepts a data structure can be viewed as an ‘interpreter’ for the ‘language’ the data type defines. Machine learning models often ‘interpret’ a configuration object, for example, and ideally we’d ‘compile’ that bulky configuration into a skinny set of numerical operations needed to do training or inference. For domains like this, Futamura projections make sense, and indeed are already used by major ML frameworks. Notwithstanding differences in terminology, this is what a system like JAX does.


## Future Work

We have a proof-of-concept hybrid system that can carry out both abstract interpretation (propagating types and following multiple branches) and partial evaluation (propagating values and following single branches) together. Of course, building this out for a reasonably complex language like Julia is a big task, but there are already prototypes in constrained domains, like [extracting symbolic expressions](https://github.com/JuliaSymbolics/SymbolicUtils.jl/pull/78) from code (effectively, compiling Julia to LaTeX) or compiling [Julia to XLA](https://github.com/FluxML/XLA.jl). Eventually, such a system could potentially get even deeper compiler integration via [Julia’s AbstractInterpreter work](https://github.com/JuliaLang/julia/pull/33955).

Of course, this idea is not necessarily that Julia specific. The referential transparency assumption opens doors in pretty much any language, and in particular support for dictionaries can likely be extended to Python’s object model quite easily. As in Julia you can grab Python bytecode at runtime and run passes like this, analyse control flow and so on, which may make it possible to build ever more flexible and intuitive high-performance systems.

[^1]:
     JAX is my favourite example, but you could largely also substitute TensorFlow Graph or Torch Script. I usually call the operator-overloading approach ‘tracing’ but it also gets variously referred to as ‘partial evaluation’, ‘staged programming’ or ‘building a computation graph’.

[^2]:
     Those with the gnarled hands of a compiler developer might recognise this as a dataflow analysis.

[^3]:
     In PyTorch this technique was originally used just for AD (for which the graph effectively gets interpreted back-to-front) but recent frameworks reuse the same graph for compilation (as in Torch Script).

[^4]:
     Notably, Julia’s type inference treats recursive loops and iterative ones differently, which matters if you want tuple operations to be unrolled, for example. In Mjolnir this distinction doesn’t exist.
