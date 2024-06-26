---
aliases:
- /2016/03/21/sorting
- /2016/03/21/sorting.html
date: '2016-03-21'
tags: [infodump, popular, code]
title: Sorting a Billion Numbers
---

This post gives an overview of working with larger-than-memory data in the Julia language. I don't have any particular use for this, but was curious about the problem as the current tools for [out-of-core analysis](https://en.wikipedia.org/wiki/Out-of-core_algorithm) seem to be pretty lacking. I've attempted to come up with a basic implementation of an array backed by persistent storage, and this post explains how I've put it together.

Aside from any insights about the problem itself, I'm going to write a lot about some of Julia's more unusual features and how they lock together. If you're a beginner Julian or are interested in becoming one, it might be instructive to see these in action – feature lists look great on paper but can't give a good sense of how things feel in practice, especially when it comes to working with larger codebases. Be warned, though, that this post is pretty technical and isn't a tutorial; I'll link to more beginner-friendly materials where they might be useful.

As a rough outline, we'll cover:

* Preliminaries – properties of out-of-core data and the results we can expect
* `DiskVector`s – the primitive type used to store data on disk, and its failings
* `ChunkedVector`s and `CacheVector`s – the features we need to add to the `DiskVector` for performance, with detours into Julia features like generated functions
* Sorting, and the algorithm used to do it efficiently
* Results, and whether or not all this is remotely useful.

The disclaimer is that I'm not an expert in any of this stuff, and many would call my Julia code, er, *idiosyncratic*, so take it all with a healthy pinch of salt.

## Preliminaries

We'll start with some quick benchmarks to figure out what we're aiming for. The results were somewhat surprising to me – I was fully expecting that disk access would be the number one bottleneck throughout, but modern SSDs are so fast that this isn't really the case. Writing and reading 150 MiB arrays on my Macbook Pro resulted in speeds of 500 MiB/s and 3750 MiB/s (!) respectively.

Let's try to put those numbers in perspective. How about computing a simple statistic like `sum`? If we have an array of a billion floating point numbers – 8 GB of data – we should be able to read out all the data in about two seconds. Summing an array in memory takes about half a second, so *in the absolute best case* summing our disk array could take about 2.5 seconds – only 5× slower than normal arrays, which is not bad at all.

Of course, it's not that simple; our disk arrays are necessarily going to be more complicated internally than simple in-memory ones. If we're looping a billion times over, then even operations that take only a nanosecond – like dereferencing a pointer, invoking a function, or adding numbers together – will suddenly take a second each. Our baseline target of 2.5 seconds is going to blow up pretty quickly unless our code is really parsimonious.

I'll set my target time for summing a billion elements on disk as 5 seconds. Sorting raises some different issues, but doing it in-place and in-memory (on a much beefier machine) gives a baseline of around a few minutes. I'll be happy if we're within an order of magnitude here.

Let's see how it goes.

## Disk Vectors

The [initial implementation](https://github.com/MikeInnes/DiskData.jl/blob/a6e1b94421c02771c138194b5c4d77c34556bb7e/src/vectors/disk.jl) of the `DiskVector` type is going to be pretty simple. We want to create a file in a temporary location to store the elements of a vector[^vectors], so we'll store the file's name and handle. As a convenience we also store a couple of properties like the length of the array, which are expensive to calculate from the file itself.

[^vectors]: I use the term *vector* to refer to what might in other languages be called an *array* or *list*. In Julia, `Array`s are multi-dimensional containers, and `Vector`s are the one-dimensional special case. For our purposes, the distinction doesn't matter and I'll use both terms interchangeably.

```julia
type DiskVector{T} <: AVector{T}
  length::Int
  file::UTF8String
  handle::IOStream
  pos::Int
end
```

The code defines some constructors which initialise the temporary file and ensure that it is deleted when Julia exits (or before if possible). Implementing the `push!` function gives us a way to append elements to the end of the array:

```julia
function Base.push!{T}(v::DiskVector{T}, x::T)
  seekto(v, :end)
  if isbits(T)
    write(v.handle, x)
  else
    serialize(v.handle, x)
  end
  v.length += 1
  v.pos += 1
  return v
end
```

To put it more simply: go to the end of the file, write the value to disk there, and update the length and position metadata accordingly.

Fast array implementations usually limit the contents of the array to being simple primitive types that C can handle, like floats and integers. Our `DiskVector` type can handle *any* Julia type, using some reflection to do the appropriate thing in each case. For simple, immutable types like floats or complex numbers we just write the bytes directly to disk. For more complex, mutable types like arrays or strings, we use Julia's built-in `serialize` function, which writes out the data along with its type and any other metadata needed to read it back in.[^types]

[^types]: For arbitrary types, not knowing the size (in bytes) of the object does make it harder to do things like random access efficiently. Luckily, our final implementation will only need to read `DiskVector` data sequentially.

It's surprising how little we need to do in order to create a functional array substitute. `push!`, `getindex` and `setindex!`[^indexing] are all we need to implement to start doing things like calculating statistics and sorting, using Julia's built-in functions:

[^indexing]:
    Overloading `getindex` and `setindex!` allows us to override array indexing syntax: `getindex(xs, i) ↔ xs[i]` and `setindex!(xs, x, i) ↔ (xs[i] = x)`.

```julia
julia> xs = DiskVector(rand(10^5)) # An array of 10^5 random numbers
100000-element DiskData.DiskVector{Float64}:
 0.130597
 0.734377
 0.39972
 ...

julia> xs[10]
0.02083898835760145

julia> @time sum(xs)
  0.002482 seconds (5 allocations: 176 bytes)
50037.060433322506

julia> @time sort!(xs)
 30.307018 seconds (88.32 k allocations: 4.147 MB)
100000-element DiskVector{Float64}:
 1.3818e-5
 2.39059e-5
 2.41424e-5
 ...
```

Creating the array and summing it perform *ok* because they involve reading the file sequentially, though they're still a long way from our target. Sorting, however, is awful – at that speed we can expect to sort a billion numbers in about three and a half days. Reaching our target will require speeding this up about 100,000 times; seems doable, right?

The basic issue here is that we have to make a call into the file system every time we access an element – file systems are slow, and we're going to be accessing elements a *lot*. Solving this will take a couple of strategies. The first is to *chunk* the array; instead of reading one element at a time, we'll read `N` elements at a time, which reduces our file system calls. We also need to think about *caching* these chunks; new chunks should be loaded and kept in memory when they are accessed, and old chunks should unload themselves so that we don't fill up our memory.

Adding chunking and caching to our already not-uncomplicated `DiskVector` sounds like hard work. Let's avoid that by playing around with each feature independently, and we'll see how we can fit everything together later on.

## Chunked Vectors

[Chunked vectors](https://github.com/MikeInnes/DiskData.jl/blob/a6e1b94421c02771c138194b5c4d77c34556bb7e/src/vectors/chunked.jl) are a simple enough concept. Instead of storing a list of numbers `[1,2,3,4,5,6,7,8,9]` in a single big array, we store it in a set of arrays like `[[1,2,3],[4,5,6],[7,8,9]]`. Of course, we want to pretend that this is just a single, contiguous list, so we create a simple wrapper for the raw data and override indexing so that `element 8` maps to `element 2 of chunk 3`, for example. The wrapper:

```julia
immutable ChunkedVector{T,A<:AVector,N} <: AVector{T}
  data::Vector{A} # e.g. [[1,2,3],[4,5,6],[7,8,9]]
end
```

Like most wrapper types this is really simple structurally; the most abstruse part is actually the [type parameters](http://docs.julialang.org/en/latest/manual/types/#man-parametric-types). `T` is the element type, which is pretty standard. `A` parametises the type of array used as a backing storage, which will come in handy later. `N` is the size of the chunks. The type for the example above would be `ChunkedVector{Int64,Vector{Int64},3}([[1,2,3]...])`; this seems verbose, but the type would usually be inferred rather than written out by hand.

So we need to translate `element i` into `element i′ of chunk j`. We just need to divide `i` by the chunksize and grab the remainder:

```julia
function index_slow(xs::ChunkedVector, i)
  j, i′ = divrem(i-1, chunksize(xs))
  j + 1, i′ + 1
end

function Base.getindex(xs::ChunkedVector, i::Integer)
  j, i′ = index_slow(xs, i)
  return xs.data[j][i′]
end
```

Simple enough, although this is one of the cases where Julia's one-based indexing makes things uglier than they could be.[^one]

[^one]: In my experience, one-based indexing reduces cognitive overhead often enough to make tradeoffs like this well worthwhile, though I'm aware that not everyone agrees on this point.

This code is essentially simple arithmetic and doesn't look like it'd be low-hanging fruit for some optimisation, but it turns out that `divrem` is fairly expensive (on the scale of CPU operations). If we could replace it with one or two instructions to do the same thing, the (very small) gain would be multiplied a billion times over.

It turns out that we can do exactly that in some cases, taking a little advantage of the way these numbers are stored. If our chunk size is a power of two, `N == 2^p` (e.g. `128 == 2^7`) then `div(i, N) == i >> p` and `rem(i, N) == i & N-1`, and these simple bit operations are really fast.

However, there's a cost to this approach. Usually, to get really good performance you'd have to limit the chunk size to powers of two, and ideally you'd completely hard-code it. This is horrible for reusability and makes it more difficult to choose a size programmatically.

Luckily, Julia has a very unique and elegant way around this problem, in the form of generated functions.

### Aside: Generated Functions

In order to understand generated functions it helps to grok how Julia compiles and optimises code. Roughly speaking, Julia waits until each function is first called and generates specialised code based on the types flowing through the function. For example, take the trivial:

```julia
add(a, b) = a + b
```

`add` is completely generic and could take integers, strings, bigfloats, currencies, or anything else – so you can't generate fast code that handles all of those cases straight away. But when we actually invoke the function via `add(1,2)`, for example, Julia can see that two integers are going in, and knows another integer is going to come out. So we don't need to handle all the other cases at all; we can generate machine code that just calls the CPU's add instruction.

That's all well and good, but the compiler can only do so much, and sometimes we'll have special-purpose ways of optimising our code. [Generated functions](http://docs.julialang.org/en/latest/manual/metaprogramming/#generated-functions) are basically a way to hook into the above process – we can take a look at the types coming into our function and generate custom code for them.

In our case, our type looks like `ChunkedVector{Int, 128}` – notice how our chunk size is part of the type, rather than a run time value. What this means is that we can actually generate custom indexing code based on this chunk size, as follows:

```julia
@generated function index_fast(xs::ChunkedVector, i)
  pow = round(Int, log2(chunksize(xs)))
  :((i-1) >> $pow + 1, (i-1) & $(2^pow-1) + 1)
end

@generated function index(xs::ChunkedVector, i)
  ispow2(chunksize(xs)) ?
    :(index_fast(xs, i)) :
    :(index_slow(xs, i))
end
```

In words: peek at the chunk size of the vector, if it's not a power of two call the slow `index` function above, if it is return fast indexing code. Operations like `log2`, rounding and branching are expensive, but crucially *they all happen at compile time*. In effect, if we call `getindex` on, say, a `ChunkedVector{Int, 128}`, it looks as if we'd written:

```julia
getindex(xs, i) = xs.data[(i-1) >> 7 + 1][(i-1) & 127 + 1]
```

This is very fast. But more importantly, it's fast while still being flexible – we have complete freedom to choose whatever chunk size we want and still get good performance, even dynamically choosing an optimal size at run time. I don't know of any other language that can do this.

Generated functions have all kinds of other interesting use cases. [Cxx.jl](https://github.com/Keno/Cxx.jl) embeds C++ functions in Julia by taking the input type information and actually invoking the Clang compiler to instantiate C++ templates and so on – and at runtime the call is just invoking a function pointer. Another nice one is bit operations; an operation like "reverse the bits in this word" is usually (a) special cased to a particular word size and (b) full of meaningless magic constants. Generated functions can encode the *logic* of a bit reverse while specialising for a particular word size, so that you have one readable definition for all cases.

In short, generated functions are pretty cool and I don't think we've seen all that they can do yet.

### Aside: Iteration

[Iterating](http://docs.julialang.org/en/latest/manual/interfaces/) sequentially over a chunked vector (`for x in xs`) already works once we have `getindex`, but we can optimise this case further by avoiding the indexing calculations completely (regardless of whether `N` is a power of two). In this case we can just store the indices `j` and `i′` and increment them appropriately. The `ChunkIter` definition implements this by simply producing a sequence of indices `(1, 1), (1, 2), (1, 3), (2, 1) ...`.

This is one area where Julia's current performance limitations made my code less expressive than I would have liked. Given that we can efficiently iterate over the *indices* of a `ChunkedVector` `xs` using the new iterator `ChunkIter(xs)`, I'd like to express iteration over the *values* as a simple map:

```julia
@iter xs::ChunkedVector -> (xs.data[j][i] for (j, i) in ChunkIter(xs))
```

The `@iter xs -> ys` macro essentially says "when iterating over `xs`, iterate over `ys` instead." In this case, `ys` generates values by taking indices from a `ChunkIter` and using them to index `xs`.

Unfortunately, `@iter` is foiled by two of Julia's performance limitations: slowness of anonymous functions and inability to stack-allocate objects containing pointers. Without going into too much detail, the upshot is that using `@iter` often results in memory being allocated on every iteration of the loop, make the loop grindingly slow.

The good news is that both of these issues are on the roadmap and the code above should work in 0.5. For now, the workaround (implementing the iteration protocol methods `start`, `next` and `done` by hand) works fine at the cost of being a bit more verbose.

## Cached Vectors

The [architecture](https://github.com/MikeInnes/DiskData.jl/blob/a6e1b94421c02771c138194b5c4d77c34556bb7e/src/vectors/cached.jl) here is not completely dissimilar to the `ChunkedVector`. `CacheVector`s are wrappers around a backing array of type `A` (and element type `T`). When you "touch" a `CacheVector` (by trying to get or set elements), the entire backing data is loaded into the temporary `view` vector, which is used as a kind of scratchpad. When we're done we can just empty the `view` vector to free up its memory, writing the contents to the backing `data` if they have been modified.

```julia
type CacheVector{T,A} <: AVector{T}
  cache::CacheStack{CacheVector{T,A}}
  data::A
  view::Vector{T}
  state::CacheState
end
```

A group of `CacheVector`s are tied together by a `CacheStack`, a kind of manager object that decides when to load and unload caches. The default implementation is very simple, we just load one vector at a time and throw the last one out, although in practice it'd be better to let a couple of caches be loaded at once.

That's actually about all I have to say about `CacheVector`s – they're that simple, and only around 80 lines. The key optimisation is sharing `view` arrays between vectors where possible to huge memory allocations to often.

## Putting it all together

Ok, so implementing chunking and caching on their own wasn't too bad – but it's still going to be a hassle to add those features to our `DiskVector`, right?

Actually, [our job at this point](https://github.com/MikeInnes/DiskData.jl/blob/a6e1b94421c02771c138194b5c4d77c34556bb7e/src/vectors/bigvector.jl) is pretty simple; we can stack up `DiskVector`, `ChunkedVector` and `CacheVector` like Lego bricks and get the best of all three. We can do this pair-wise, starting by with `CacheChunkVector`:

```julia
immutable CacheChunkVector{T,A,N} <: AbstractVector{T}
  cache::CacheStack{CacheVector{T,A}}
  data::ChunkedVector{T,CacheVector{T,A},N}
end

@forward CacheChunkVector.data Base.size, Base.getindex, Base.setindex!, Base.push!,
  ChunkIter, chunks
```

This data type just represents a vector that's split into a series of contiguous cached chunks, with a single chunk loaded into memory at any given point. (What we're loading chunks *from* isn't specified, yet.) The handling of type info gets a little crazy here, especially in the [constructor](https://github.com/MikeInnes/DiskData.jl/blob/a6e1b94421c02771c138194b5c4d77c34556bb7e/src/vectors/bigvector.jl#L6-L10) – that's something that could hopefully be cleaned up if Julia ever gets triangular type constraints.

`@forward` just means "when calling function `f` on a `CacheChunkVector`, call it on the vector's `data` field instead." In other words `f(x::CacheChunkVector) = f(x.data)`. This is a lot like inheriting from `ChunkedVector` in an object-oriented language. Unlike in those languages, though, the relationship isn't a special case, and being explicit about what methods we want to "inherit" solves issues that arise when combining behaviour from multiple sources. But what's even deeper is that we can actually *paramatise over the parent* (or in this case, the parent's parent) and change our minds about it later on. Being able to inject functionality after the fact makes the `DiskData` code uber-modular.

Now we just create the `BigVector` wrapper which specifies `DiskVector`s as the backing storage for a `CacheChunkVector`:

```julia
immutable BigVector{T,N} <: AVector{T}
  data::CacheChunkVector{T,DiskVector{T},N}
end

call{T}(::Type{BigVector{T}}, chunk::Integer = prevpow2(150*1024^2÷sizeof(T))) =
  BigVector{T,chunk}(CacheChunkVector{T,DiskVector{T},chunk}())

@forward BigVector.data Base.size, Base.getindex, Base.setindex!, Base.push!, chunks
@iter xs::BigVector -> xs.data
```

The constructor again sorts out type info, but also determines a good chunk size, aiming for it to work out at ~150MiB. Forwarding methods to the internal data is also straightforward; `BigVector` is really just a convenient shorthand, so this is the entire definition.

Finally, our creation lives!

```julia
julia> using DiskData

julia> xs = BigVector(rand(10^8))
100000000-element DiskData.BigVector{Float64,16777216}:
 0.378965
 0.245959
 0.350365
 ⋮
 0.634379
 0.753464
 0.983516

julia> sum(xs)
5.000179218867155e7
```

No performance spoilers until the end, but we got there. I hope this also demonstrates that we didn't have to compromise on usability.

At this point it's worth making some notes about how we've built up this data structure. We're taking advantage of a kind of "flat composition" property; just like composing functions together just gives us new functions (which happen be more high-level), composing different vectors together just gives us a more featureful vector. This is a very powerful general principle because it means the combination isn't any harder to reason about than the constituent parts – there's only ever one kind of thing (functions, vectors) and it always has the same key properties. (People who write [parsers](https://wiki.haskell.org/Parsec) know this principle well, too.)

Building up our data structure this way has a ton of advantages. Number one, it's just more modular and composable – we can take apart and recombine the "hierarchy" of types any which way without a refactoring. If we had, say, a `PackedVector{T,A}` type designed to store booleans or enums more efficiently than the default 8-bits per element, it'd be easy to shove it into the tree and get a new `PackedBigVector` type[^packed].

[^packed]: Julia does have a `BitArray` type in its standard library but unfortunately it's boolean-only and isn't parametised over backing storage, making it useless here. I did have an implementation of the bit packing / unpacking logic that was generic over any bitstype (provided you defined a method like `bitwidth(::Nucleotide) = 2`), but I misplaced it.

Number two, debugging (both performance and logic) is a ton easier. It's easy to verify that each individual part of the system is doing its job, and once that's the case the combination just works. Likewise, it's easy to check what the performance overhead of each layer is, and trim down the fat where necessary. If you think about what `BigVector` is doing all at once it's pretty damn complex, but we can eat that complexity for breakfast when each component is simple on its own.

## Sorting

This is arguably the flagship section of this post, but I should probably metre your expectations. I wanted to prove the concept without putting crazy amounts of time into it, since it's not fundamentally that useful. Most people are just going to want to look at the top N elements, which can be done in a single pass like `sum`.

But at the risk of this whole project being more a strange sort of performance art than anything else, lets consider the problem anyway. Since `BigVector` is just a vector, Julia's built-in `sort!` function works out of the box. The problem is that `sort!` is a variant of [quicksort](https://en.wikipedia.org/wiki/Quicksort), which essentially requires fast random-access into the vector to swap elements and so on. Doing this with a `BigVector` is going to result in loading chunks from disk millions of times and take days.

We can use a different sorting approach, based on [merge sort](https://en.wikipedia.org/wiki/Merge_sort), to get around this. Merge sort works by splitting the vector in two, sorting both halves, and interleaving the resulting vectors back together. How do we sort both halves? Well, we can merge sort them, or if the vector is small enough to fit in memory, load it wholesale and use a fast in-place quicksort. The core logic is here:

```julia
function Base.sort(xs::BigVector)
  n = 4*1024^3÷sizeof(eltype(xs)) # 4 GiB
  if length(xs) ≤ n
    return sort_mem(xs)
  else
    left, right = slice(xs, 1:length(xs)÷2), slice(xs, length(xs)÷2+1:length(xs))
    if length(left) ≤ n
      return merge(sort_mem(left), sort_mem(right))
    else
      return merge(sort(BigVector(left)), sort(BigVector(right)))
    end
  end
end
```

`sort_mem` loads the vector into memory, sorts it, and puts it back on disk. `merge` recombines the split halves. The sort isn't in place, of course, but this doesn't matter when we're working on disk, since the cost of "allocating" memory in a new file vs. writing over an old one is about the same.

In theory this should only use up a few gigs of memory at a time, but in practice I had some serious memory management issues, allocating up to 16 GiB (on an 8 GiB machine). Perhaps the recursion is causing a lot of `BigVector` handles to be created (which are 150 MiB each). OS X's memory management impresses here by handling this reasonably well, although I wouldn't want to rely on it for data much larger than memory. Without further ado, then, lets see how this performs.

## Performance

The target we set for summing a billion elements was 5 seconds. On my laptop, doing the sum actually takes around 15 seconds. The basic reason for this is reading chunks of the larger `BigVector` gets poor performance (around 750MiB/s) – much less than the initial benchmark. Strangely, performance is great for a 10<sup>8</sup> element vector, just not for 10<sup>9</sup> elements. To hazard a guess, it may be that the OS struggles with a large number of open file handles, although increasing the chunk size to around 1 GiB didn't seem to help. If I had more time I'd try changing things so that we only have a single `DiskVector`/file as a backing storage and load chunks of that.

Then there's sorting. With the very basic implementation above, we can sort our data in around 500 seconds – or about eight minutes. That's OK, although I think that much better is possible.

Overall I'm pleased with these results, even if they're not wildly surpassing the (fairly ambitious) original targets. There are certainly tweaks to be made to polish things up, but there's also a strong diminishing return on invested effort. It's easy to spend a few hours changing the approach and speeding things up even by several orders of magnitude, but tweaking that approach to get those last two or three times could take days. The key thing is that we've explored the concept enough to have a solid idea of what is and isn't feasible, what kind of problems can be solved using this approach, and the results that we can expect.

## Fin

Whew, that was a long post! We've covered a lot of ground, including:

* Problems and approaches when dealing with larger-than-memory data
* Getting extreme performance out of core code
* "Flat composition" of types as a powerful mechanism for managing complexity
* Generated functions & staged programming for getting both flexibility and performance
* Some of Julia's outstanding performance issues

`DiskData` has a ton of room for improvement, but I'm not sure how useful it will end up being in practice. For now, I'm going to go back to doing real work, but since this code is all [open source](http://github.com/MikeInnes/DiskData.jl), others are free to take up the mantle.
