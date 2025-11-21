---
aliases:
- /2017/11/15/turingception
- /2017/11/15/turingception.html
date: '2017-11-15'
title: Recursive Self-Simulation
tags: [infodump]
---

Can the Universe Simulate Itself?

I’m not merely asking if we can simulate the laws of Physics, nor whether we can simulate them with such fidelity that they give rise to life. Those are pansy questions.

I’m asking if the universe can simulate itself *exactly* – so exactly that, if the simulation were left running long enough, it would give rise to humans just like us, who would then initiate the same simulation! Which of course would then contain a simulation of *itself*, and so on ad infinitum.

At first this sounds like philosophical nonsense, perhaps so flagrantly paradoxical that it’s not worth taking seriously at all. It turns out that with some reasonable assumptions and simple computer science, we can gather some interesting insights into the problem.

## Turingception

We can see the universe itself as a kind of computation: the “universe program” $F$ takes some input $x$ (the starting conditions of the universe), churns away for a few billions of years, and produces an output $F(x) = y$ (the final state of the universe). At the end of it all, God gets a shocking electricity bill.

This lets us frame the problem in terms of Turing machines,[^turing] and try to answer a simpler question: Is it possible to build a machine that simulates itself exactly?

[^turing]: We need not necessarily assume the Church-Turing thesis. If the universe turns out to be a hypercomputer, we just need to be able to abuse its laws in order to create the same kind of hypercomputer, and replace the Turing machines of the argument with Hyper-Turing machines.

We know that we can make machines to simulate other machines. A Universal Turing machine $U$ accepts any other machine $T$ and an input, and simulates it (or equivalently, acts as an interpreter for its code). If $T$ is a simple machine that accepts an integer and adds $1$, like

$$
\begin{aligned}
  T(3) &= 4 \\
  T(6) &= 7
\end{aligned}
$$

Then $U$ can take a description of $T$ and produce the same results.

$$
\begin{aligned}
  U(T,3) = 4 \\
  U(T,6) = 7
\end{aligned}
$$

Because $U$ will accept any Turing machine, including itself, this immediately opens the possibility of self-simulation. If we execute:

$$U(U, (T, 3)) = 4$$

Then $U$ simulates itself, simulating $T$. But while we can easily make this deeper, $U$ still isn’t carrying out a perfect self simulation. What we need is some way to inject recursion, such that each simulated machine is launched with itself as an input.

One way to do this is to do modify $U$ to create $U\prime$, which, instead of taking both a program and an input, takes a single program and runs it with itself as input.

$$U\prime(T) = U(T, T)$$

What initial input will be give to $U\prime$? Why, $U\prime$ itself of course!

$$U\prime(U\prime)$$

This program has the desired behaviour; it begins to simulate $U\prime$, which runs the original expression, which begins to simulate $U\prime$ … Here’s what it looks like expanded out, with square brackets denoting the depth of simulation.

$$
U\prime(U\prime) = U(U\prime, U\prime) = [ U\prime(U\prime) ] = [ U(U\prime, U\prime) ] = [[ U\prime(U\prime) ]] = …
$$

(The astute reader may notice that, replacing machines and simulation with functions and invocations, this program is the same as Lambda Calculus' basic infinite loop: $(\lambda x . x x) (\lambda x . x x)$. This has deep connections with many forms of self-replication, including quines.)

## Implementation Details

At this point, this probably seems like an abstract mathematical hack, but it’s easy to make it work in practice. For example, take a Python interpreter written in Python, write down $U\prime$ and go to town. If Python isn’t close enough to the metal to qualify as a “self-simulating machine”, you can do it with a CPU: write an emulator in machine code and feed it to the processor and itself.[^cpu] Congratulations, you now have a real machine that’s simulating a copy of itself, simulating itself, simulating itself…

[^cpu]: In the Turing machine description we glossed over the distinction between the physical machine $U$ and the description of $U$ that we can feed to other machines – the CPU example makes it clear that we two implementations, one in hardware and one in software.

It might seem paradoxical that the simulation is infinitely nested, since that seems to result in infinite virtual machines (or simulated universes). This is resolved by that fact that each level of simulation adds an interpreter overhead, resulting in exponential slowdown. To simulate a single instruction at depth 3, you need to run, say, 10 instructions at depth 2, which takes 100 instructions at depth one – and so on. If you could watch each simulation “booting up” you’d see each take longer and longer, until you run out of patience (or the real universe ends).

Here’s a thought. Our self-interpreter (let’s say a Python interpreter in Python) is only ever going to run a single program (itself) so it doesn’t need to be fully featured. If the interpreter doesn’t make use of classes, for example, it doesn’t need to implement them either. We can probably pare it down to something pretty minimal and still get the self-simulation working.

If you want to make your head spin, consider what the minimal language and self interpreter would be – bearing in mind that it only needs to implement features that it uses itself (!). Should the language be high-level like a lisp, or low-level like a stack machine? It may make less difference than you think; low-level languages are easier to write an interpreter for, but harder to write an interpreter in.

## Back to the Universe

So does any of this answer our original question?

The logic above makes a number of assumptions about the universal machine; a certain degree of determinism, or that it contains all the information needed to reconstruct its “program” (the laws of physics) and its “input” (conditions at the big bang). Most physicists would not bet money on both, ruling out an exact self-simulation.

What’s more likely is an approximate simulation. And this might have some probability of becoming nested, depending of the philosophical moods of its inhabitants.

What we can say is that (1) each sub-universe would run in eerily slowed-down time compared to its parent,[^bostrom] and (2) because of that, we would certainly never live to see it forming life (let alone grow up and have little baby universes).

[^bostrom]: Assuming that the simulation is a faithful recreation of the laws of physics, as opposed to a Bostrom-style mind game.

All of this is to say – Christopher Nolan was right on the money.
