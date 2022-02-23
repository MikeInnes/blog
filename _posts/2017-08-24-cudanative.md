---
title: Generic GPU Kernels
---

Julia has a library called [CUDAnative](https://github.com/JuliaGPU/CUDAnative.jl), which hacks the compiler to run your code on GPUs.

```julia
using CuArrays, CUDAnative

xs, ys, zs = CuArray(rand(1024)), CuArray(rand(1024)), CuArray(zeros(1024))

function kernel_vadd(out, a, b)
  i = (blockIdx().x-1) * blockDim().x + threadIdx().x
  out[i] = a[i] + b[i]
  return
end

@cuda (1, length(xs)) kernel_vadd(zs, xs, ys)

@assert zs == xs + ys
```

Is this better than writing CUDA C? At first, it’s easy to mistake this for simple syntactic convenience, but I’m convinced that it brings something fundamentally new to the table. Julia’s powerful array abstractions turn out to be a great fit for GPU programming, and it should be of interest to GPGPU hackers regardless of whether they use the language already.

## A New Dimension

For numerics experts, one of Julia’s killer features is its powerful N-dimensional array support. This extends not just to high-level “vectorised” operations like broadcasting arithmetic, but also to the inner loops in the lowest-level kernels. For example, take a CPU kernel that adds two 2D arrays:

```julia
function add!(out, a, b)
  for i = 1:size(a, 1)
    for j = 1:size(a, 2)
      out[i,j] = a[i,j] + b[i,j]
    end
  end
end
```

This kernel is fast, but hard to generalise across different numbers of dimensions. The change needed to support 3D arrays, for example, is small and mechanical (add an extra inner loop), but we can’t write it using normal functions.

Julia’s code generation enables an elegant, if slightly arcane, solution:

```julia
using Base.Cartesian

@generated function add!(out, a, b)
  N = ndims(out)
  quote
    @nloops $N i out begin
      @nref($N, out, i) = @nref($N, a, i) + @nref($N, b, i)
    end
  end
end
```

The `@generated` annotation allows us to hook into Julia’s code specialisation; when the function receives matrices as input, our custom code generation will create and run a twice-nested loop. This will behave the same as our `add!` function above, but for arrays of any dimension. If you remove `@generated` you can see the internals.

```julia
julia> using MacroTools
julia> add!(zs, xs, ys) |> macroexpand |> MacroTools.prettify
quote
    for i_2 = indices(out, 2)
        nothing
        for i_1 = indices(out, 1)
            nothing
            out[i_1, i_2] = a[i_1, i_2] + b[i_1, i_2]
            nothing
        end
        nothing
    end
end
```

If you try it with, say, a seven dimensional input, you'll be glad you didn't have to write the code yourself.

```julia
for i_7 = indices(out, 7)
  for i_6 = indices(out, 6)
    for i_5 = indices(out, 5)
      for i_4 = indices(out, 4)
        for i_3 = indices(out, 3)
          for i_2 = indices(out, 2)
            for i_1 = indices(out, 1)
              out[i_1, i_2, i_3, i_4, i_5, i_6, i_7] = a[i_1, i_2, i_3, i_4, i_5, i_6, i_7] + b[i_1, i_2, i_3, i_4, i_5, i_6, i_7]
# Some output omitted
```

`Base.Cartesian` is a powerful framework and has many more elegant tools, but that illustrates the core point.

Here's a bonus. Addition clearly makes sense over any number of input arrays. The same tools we used for generic dimensionality can be used to generalise the number of inputs, too:

```julia
@generated function addn!(out, xs::Vararg{Any,N}) where N
  quote
    for i = 1:length(out)
      out[i] = @ncall $N (+) j -> xs[j][i]
    end
  end
end
```

Again, remove the `@generated` to see what's happening:

```julia
julia> addn!(zs, xs, xs, ys, ys) |> macroexpand |> MacroTools.prettify
quote
  for i = 1:length(out)
    out[i] = (xs[1])[i] + (xs[2])[i] + (xs[3])[i] + (xs[4])[i]
  end
end
```

If we put this together we can make an N-dimensional, N-argument version of `kernel_vadd` on the GPU (where `@cuindex` hides the messy ND indexing):

```julia
@generated function kernel_vadd(out, xs::NTuple{N}) where N
  quote
    I = @cuindex(out)
    out[I...] = @ncall $N (+) j -> xs[j][I...]
    return
  end
end

@cuda (1, length(xs)) kernel_vadd(zs, (xs, ys))
```

This short kernel can now add any number of arrays of any dimension; is it still just "CUDA with Julia syntax", or is it something more?

## Functions for Nothing

Julia has more tricks up its sleeve. It automatically specialises higher-order functions, which means that if we write:

```julia
function kernel_zip2(f, out, a, b)
  i = (blockIdx().x-1) * blockDim().x + threadIdx().x
  out[i] = f(a[i], b[i])
  return
end

@cuda (1, length(xs)) kernel_zip2(+, zs, xs, ys)
```

It behaves and performs *exactly* like `kernel_vadd`; but we can use any binary function without extra code. For example, we can now subtract two arrays:

```julia
@cuda (1, length(xs)) kernel_zip2(-, zs, xs, ys)
```

Combining this with the above, we have all the tools we need to write a generic `broadcast` kernel (if you’re unfamiliar with array broadcasting, think of it as a slightly more general `map`). This is implemented in the [CuArrays](https://github.com/FluxML/CuArrays.jl) package loaded earlier, so you can immediately write:

```julia
julia> σ(x) = 1 / (1 + exp(-x))

julia> σ.(xs)
1024-element CuArray{Float64,1}:
 0.547526
 0.6911  
 ⋮       
```

(Which, if we generalise `kernel_vadd` in the ways outlined above, is just an "add" using the `σ` function and a single input.)

There’s no hint of it in our code, but Julia will compile a custom GPU kernel to run this high-level expression. Julia will also fuse multiple broadcasts together, so if we write an expression like

    y .= σ.(Wx .+ b)

This creates a single kernel call, with no memory allocation or temporary arrays required. Pretty cool – and well out of the reach any other system I know of.

## & Derivatives for Free

If you look at the original `kernel_vadd` above, you’ll notice that there are no types mentioned. Julia is duck typed, even on the GPU, and this kernel will work for anything that supports the right operations.

For example, the inputs don’t *have* to be `CuArray`s, as long as they look like arrays and can be transferred to the GPU. If we add a range of numbers to a `CuArray` like so:

```julia
@cuda (1, length(xs)) kernel_vadd(xs, xs, 1:1024)
```

The range `1:1024` is never actually allocated in memory; the elements `[1, 2, ..., 1024]` are computed on-the-fly as needed on the GPU. The element type of the array is also generic, and only needs to support `+`; so `Int + Float64` works, as above, but we can also use user-defined number types.

A powerful example is the dual number. A dual number is really a pair of numbers, like a complex number; it’s a value that carries around its own derivative.

```julia
julia> using ForwardDiff
julia> f(x) = x^2 + 2x + 3

julia> x = ForwardDiff.Dual(5, 1)
Dual{Void}(5,1)

julia> f(x)
Dual{Void}(38,12)
```

The final `Dual` carries the value that we expect from `f` (`5^2 + 2*x + 3 == 38`), but *also* the derivative (`2x + 2 == 12`).

Dual numbers have an amazingly high power:simplicity ratio and are *really* fast, but are completely impractical in most languages. Julia makes it simple, and moreover, a vector of dual numbers will transparently do the derivative computation on the GPU.

```julia
julia> xs = CuArray(ForwardDiff.Dual.(1:1024, 1))

julia> f.(xs)
1024-element CuArray{ForwardDiff.Dual{Void,Int64,1},1}:
          Dual{Void}(6,4)
         Dual{Void}(11,6)
         Dual{Void}(18,8)
                        ⋮

julia> σ.(xs)
1024-element CuArray{ForwardDiff.Dual{Void,Float64,1},1}:
 Dual{Void}(0.731059,0.196612)   
 Dual{Void}(0.880797,0.104994)   
 Dual{Void}(0.952574,0.0451767)  
            ⋮                    
```

Not only is there no overhead compared to hand-writing the necessary cuda kernel for this; there's no overhead at all! In my benchmarks, taking a derivative using dual numbers is *just as fast as computing only the value* with raw floats. Pretty impressive.

In machine learning frameworks, it’s common to need a “layer” for each possible activation function: `sigmoid`, `relu`, `tanh` etc. Having this trick in our toolkit means that backpropagation through *any* scalar function will work for free.

Overall, GPU kernels in Julia are amazingly generic, across types, dimensions and arity. Want to broadcast an integer range, a dual-number matrix, and a 6D array of floats? Go ahead, and a single, extremely fast GPU kernel will give you the result.

```julia
xs = CuArray(ForwardDiff.Dual.(randn(100,100), 1))
ys = CuArray(randn(1, 100, 5, 5, 5))
(1:100) .* xs ./ ys
100×100×5×5×5 Array{ForwardDiff.Dual{Void,Float64,1},5}:
[:, :, 1, 1, 1] =
   Dual{Void}(0.0127874,-0.427122)  …   Dual{Void}(-0.908558,-0.891798)
   Dual{Void}(0.97554,-2.56273)     …   Dual{Void}(-8.22101,-5.35079)  
  Dual{Void}(-7.13571,-4.27122)          Dual{Void}(2.14025,-8.91798)  
              ⋮                     ⋱                             
```

The full broadcasting machinery in CuArrays is [*60 lines long*](https://github.com/FluxML/CuArrays.jl/blob/9a2eafa19966cf5613308bbcda1db0e1c3e95358/src/broadcast.jl#L4-L64). While not completely trivial, this is an incredible amount of functionality to get from this much code. CuArrays itself is under 400 source lines, while providing almost all general array operations (indexing, concatenation, permutedims etc) in a similarly generic way.

Julia’s ability to spit out specialised code is unprecedented, and I’m excited to see where this leads in future. For example, it would be relatively easy to build a Theano-like framework in Julia, and create specialised kernels for larger computations. Either way, I think we’ll be hearing more about Julia and GPUs as time goes on.

*Full credit for the work behind this to [Tim Besard](https://github.com/maleadt) and [Jarrett Revels](https://github.com/jrevels), respective authors of the amazing [CUDAnative](https://github.com/JuliaGPU/CUDAnative.jl) and [ForwardDiff](https://github.com/JuliaDiff/ForwardDiff.jl).*
