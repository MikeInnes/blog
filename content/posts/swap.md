---
aliases:
- /2022/06/24/swap
date: '2022-06-24'
tags:
- languages
title: Imperative Syntax, Functional Semantics
---

I just put up a [draft paper](https://arxiv.org/abs/2206.11192) with a proposal for mixing imperative and functional styles of programming. The gist of it is that we can write code like this:

```rust
fn arange(start, end) {
  result = []
  for i in start:end {
    push(&result, i)
  }
  return result
}
```

or this:

```rust
fn matmul(A, B) {
  [m, n] = size(A)
  [n, p] = size(B)
  C = zeros(m, p)
  for i in 1:m, j in 1:p {
    sum = 0
    for k in 1:n {
        sum += A[i, k]*B[k, j]
    }
    C[i, j] = sum
  }
  return C
}
```

and these can in fact be functional programs (at least for any definition of "functional programming" that isn't based on syntax).

How can that be? This kind of code would usually involve mutation, but it doesn't have to. We can instead see it as syntactic sugar over immutable values. Control flow and mutable locals are turned into a bundle of recursive functions with immutable bindings (this is the standard SSA transformation). Notation like `push(&xs, x)` can be a shorthand for `xs = push(xs, x)` and similarly for `A[i, j] = x`. In other words variables change, but not values.

Combine this with techniques for updating in place where it's safe to do so, and you can recover the feel and performance of an imperative numerical language, while being robust to program transformations like autodiff.