---
title: Notes on Zig
date: 2024-10-09
tags: [languages]
---

[The Zig language](https://ziglang.org/) begins with a barebones C-like system. Functions, structs, numbers and pointers are standard. Tagged unions, some syntax sugar (`try`, `defer`) and safer defaults alone make Zig a pleasant but unremarkable improvement, like many of the C challengers that seem to be cropping up lately. What does make Zig remarkable is its compile-time evaluation. You can run basically any code at build time, and that gives you a lot of C++'s templating power without feeling nearly as complex. A simple example:

```zig
fn foo(comptime N: i64) void {
    inline for (0..N) |i| {
        std.debug.print("{}\n", .{i});
    }
}
```

`foo` must be called with a statically-known integer, a literal like `5` or something computed from other `comptime` variables. The `for` loop is marked `inline`, which means it will be unrolled; the code is equivalent to `print(0); print(1); ...`.

This feature is useful mainly because types are also (`comptime`-only) values. You can use them to implement generic functions:

```zig
fn max(comptime T: type, x: T, y: T) T {
    return if (x > y) x else y;
}
```

You'd call this like `max(i64, 2, 3)` and get back the right `i64` answer of `3`. This looks weird at first, but it's not really any different to a parametric signature in any typical typed language, eg `max<i64>(2, 3)`. In effect those languages split the argument list, writing `comptime T` as `<T>`. You can make Zig look more familiar with explicit currying: write `max` as a function that takes a type `T` and returns a function of two `T`s, and you can call it as `max(i64)(2, 3)`.

More interesting than generic functions are generic types. Types in Zig are created with the `struct` keyword, and are always anonymous, like `struct { x: i64, y: i64 }`. What if we want a named type? Well, types are just (`comptime`) values, so we can assign to a variable!

```zig
const Point = struct { x: i64, y: i64 };
```

What if we want a family of `Point`s using different number types for storage? Something similar applies: just write a function that returns a `struct` for each type you want.

```zig
fn Point(comptime T: type) type {
    return struct { x: T, y: T };
}
```

Now our original `Point` type is called `Point(i64)`. Notice what's happened here: we have a small set of simple language features – functions, structs, and the `comptime` keyword. They are independent, but work nicely together. Compose them and out pop more advanced tools that are usually built in, like generic functions and parametric types. Now that's design I can get behind! It's rare to see a systems language providing expressive power alongside minimalism, avoiding the temptation to bolt on endless features.

`Point(T)`, a function that produces a type, looks a bit more like the usual parametric type syntax from other languages. You can take that further: [Mojo](https://www.modular.com/mojo) seems to [take inspiration](https://docs.modular.com/mojo/manual/parameters/) from Zig, and does use currying, calling `comptime` variables "parameters" and keeping them in a separate argument list like `max[T](x: T, y: T)`. I probably prefer that approach, though I can appreciate that Zig's syntax emphasises the differences from typical parametric polymorphism.

Namely, most typed languages' equivalent of `comptime` (type parameters) only supports a limited set of compile-time values (types) and a limited set of operations on those values. In practice that means working with a compile-time meta-language with weird rules, high complexity (both [Rust types](https://sdleffler.github.io/RustTypeSystemTuringComplete/) and [C++ templates](https://citeseerx.ist.psu.edu/document?repid=rep1&type=pdf&doi=55a1417c034899636e736cfb168071555641dece) are unintentionally Turing complete) and awful debugging tools. With Zig, the meta language is also Zig, which you already know how to use; `comptime` values are any Zig value, and you have the full language at your disposal, including reflection.

This is powerful. In my recent project, I had a trie data structure with different types at each level of the trie, corresponding to different columns of output. It's possible to specialise the trie on both the tuple of column types and the current depth, using the depth to compute the element type. It's normally hard to do this while keeping the type system happy, if it can be expressed at all.

Zig makes it work partly by being lazy about type checking. Notice that in the definition of `max(T: type, x: T, y: T)`, there's no restriction on `T`. This makes it impossible to check `max` in isolation. Rather than trying to prove the code correct for all `T`, Zig waits until a given `T` is known, as in the `max(i64, 2, 3)` call, and checks that specific signature for errors. You'll get an error if you call `max` with strings (since they don't support `<`) but otherwise the compiler is happy. The result is a kind of compile-time duck typing. This is a tradeoff, but in practice I think it's a great sweet spot. A code path may not be type checked, but if so then it won't be executable, and can't produce a run-time type error anyway. And it's still possible to implement safeguards in the form of compile-time checks on input types.

There are bigger downsides to Zig's approach. The system feels straightforward when it's working, but there are signs we may not have escaped Template Hell. Here's an error I ran into in my first version of the specialised trie structure:

```zig
rt/join.zig:184:36: error: expected type '@typeInfo(@typeInfo(@TypeOf(join.Unbound(&.{ i64 }[0..1]).open)).Fn.return_type.?).ErrorUnion.error_set!join.Trie(@as([*]const type, @ptrCast(@as([*]type, @ptrCast(@as([1]type, .{ ... })))[1]))[0..0])', found '@typeInfo(@typeInfo(@TypeOf(join.Trivial().create)).Fn.return_type.?).ErrorUnion.error_set!join.Trie(&.{}[0..0])'
rt/join.zig:184:36: note: error union payload 'join.Trie(&.{}[0..0])' cannot cast into error union payload 'join.Trie(@as([*]const type, @ptrCast(@as([*]type, @ptrCast(@as([1]type, .{ ... })))[1]))[0..0])'
```

Elegant though it is to build everything out of simple pieces, it makes it harder to communicate intent. Zig generally does a good job of figuring out names for things – printing structs as `Point(i64)` rather than `struct { ... }` for example – but it's fallen over on this otherwise-simple `Allocator.Error!Trie(&.{})` type (the `&.{}` being an empty array of column types).

But there's a deeper issue with Zig as the meta-language. A type system is the one place you absolutely want tools from functional programming: values are just data, functions are referentially transparent, etc (imagine if `Point(i64)` could return multiple results!). But Zig is a low level language, which means arrays are not values, they are pointers to mutable memory. Which means `comptime` calls are cached by reference, which can lead to [surprising behaviour](https://github.com/ziglang/zig/issues/7948). (I ran into a similar [compiler segfault](https://github.com/ziglang/zig/issues/21324) myself, which also brings up tricky problems around compiler state.)

I actually think the code that led to my error was correct, at least insofar as both types represent a trie with an empty array parameter `Trie(&.{})`. But for reasons beyond my ken, one array is represented by `&.{}[0..0]` and the other by `@as([*]const type, @ptrCast(@as([*]type, @ptrCast(@as([1]type, .{ ... })))[1]))[0..0]`. And these have different pointers, or the compiler can't see that they're equivalent, or something. In the end I avoided using arrays in type parameters, but this has harmed my confidence to specialise on any more complex inputs, which should otherwise be Zig's superpower. Futamura projections are probably a no-go.[^zest]

[^zest]: But [Zest's](https://www.scattered-thoughts.net/writing/zest-dialects-and-metaprogramming/) design is exciting on this front: with value semantics and a guarantee that `comptime` has the same behaviour as run time, it could make this kind of thing painless.

Polymorphism is also difficult for more prosaic reasons. The advantage of minimalism is the ability to build whatever you want, from classic vtable-based run-time dispatch to [multiple dispatch](https://www.scattered-thoughts.net/writing/open-multiple-dispatch-in-zig/) or [struct-of-arrays transforms](https://www.scattered-thoughts.net/writing/assorted-thoughts-on-zig-and-rust/). The downside is having to build it – from scratch – which is both verbose and finicky. Zig is a manual-memory language, and pointers are a booby trap. This isn't helped by `comptime` interactions, which alter what counts as correct.[^gc] For example, I don't understand why [this library code](https://github.com/ziglang/zig/blob/ea527f7a850f0200681630d8f36131eca31ef48b/lib/std/heap/general_purpose_allocator.zig#L322) works; my equivalent was crashing until I explicitly made the vtable `comptime`. It'd be safer and easier if some standard patterns had syntax sugar. Better yet, provide macros (as in Lisp, not C) so that polymorphism can come as a library.

[^gc]: My understanding is that `comptime` pointers are garbage collected by the compile-time interpreter, but can be referenced at run-time as static memory. It's also notable that said interpreter "emulates the target architecture" – imagine a world where some detail of your target CPU can affect your type system!

I suspect that won't happen, because Zig is nothing if not syntactically minimalist; it doesn't even have inner functions. I mentioned earlier that you could write a curried `max(T)(x, y)`, but here's what that looks like:

```zig
fn max(comptime T: type) fn (T, T) T {
    const m = struct {
        fn m(x: T, y: T) T {
            return if (x > y) x else y;
        }
    }.m;
    return m;
}
```

I get that Zig can't naturally do closures over run-time variables (because they'd have to allocate) and I understand that its creator [personally despises the functional style](https://github.com/ziglang/zig/issues/1717#issuecomment-1627790251) and [sees no need for tools to be fun](https://github.com/ziglang/zig/issues/3320#issuecomment-884478906). But you have to pass functions around when making vtables, and even for parts of the standard library, like `sort`. Making you wrap everything in a `struct`, just to pull it out again, borders on bloody-minded.

Zig's compiler is fussy in general. The experience is not totally unlike Rust, except that the rules give no help whatsoever towards safety. Instead the errors are focused on code cleanup, making sure you use all named arguments, don't shadow bindings, mark variables as `const` if the stack part of their contents is never mutated, and so on. These rules may make sense in isolation. Yet it's jarring, in the middle of tracking a hair-pulling bug, to have your flow interrupted by the almost-but-not-quite-entirely meaningless `var` vs `const` distinction. It's like having someone correct your grammar while you're doing open-heart surgery. _Sorry, "scalpel, stat"? Are you talking to me? Perhaps you're not aware that sentences are supposed to have verbs in them?_[^go]

[^go]: Evan Miller's [autistic gopher hypothesis](https://www.evanmiller.org/four-days-of-go.html) applies. But Go helps you with more of the important stuff – memory safety! – so its "help" with the unimportant stuff can feel perfectionist rather than myopic.

At times Zig's compiler is almost a static language parody. I'm afraid can't allow that, Dave, until I've made sure that you know the things that I already know.[^const] But it's worse than usual: normally I can comment out code to focus the compiler (and myself) on the important part; in Zig this leads to a mini-refactor of the very details I'm trying to ignore.[^editor] I'm left with the feeling that Zig is nitpicking at the cost of helpfulness. A clearer mistake, like forgetting to `try` a throwing function call, won't give a direct warning but instead an inscrutable template error down the line. I'm still not confident my vtable code is correct – perhaps it's coincidence that it hasn't crashed so far. But at least I can be sure that my whitespace is impeccable.

[^const]: The [defence](https://github.com/ziglang/zig/issues/224#issuecomment-450754721) of explicit `const` annotation is not that it's the right interface, but that it's tricky to implement `const` inference. I don't buy the technical reasoning (why isn't this a standard fixpoint analysis?) but either way it's notable that in this case, implementation convenience trumps user experience.

[^editor]: I've seen talk of editor tooling to ease the endless fiddling, but I couldn't find any such option if it exists. If anything the current Code plugin makes things worse: it too suffers from dogmatism, making sweeping changes to layout based on comma placement. Imagine a reviewer rewording your essay while you're still writing the first draft, and you get the feeling.

Despite the gripes, I like Zig. Its "C with `comptime`" approach to generics is a breakthrough, and one I hope other languages take on. Its tooling seems solid and practical. It joins the short list of languages I'd use again in a heartbeat for the right problem: that includes anything for which C/++ would usually fit, such as embedded development, but also more exotic projects, like writing a fast runtime that can be heavily specialised to data by another compiler. (There aren't a lot of good options for this admittedly small niche.)

The compiler takes pedantry to an art form, which will lead to a smaller, more focused and certainly neater community, rather than a sprawling free for all. That's a valid authorial choice, even if it harms my personal enjoyment. At the same time, a successful system must solve problems its creators never accounted for. So I hope the design will be allowed room to breathe. Zig is already a good language; it is so close to being a great one.
