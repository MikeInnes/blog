---
aliases:
- /2023/05/30/data
- /2023/05/30/data.html
date: '2023-05-30'
tags: [languages]
title: Data Structures, Data Modelling
---

Most programming languages conflate the building of data structures and the modelling of information.

Of course, you need data structures to store information, but there are two different levels of abstraction. On one level are pointers and structs and B-Trees and so on, on another the user models of a dictionary, list or relational table, built on the first. The former uses finicky, low-level tools to create the neat internal logic of the system. The latter uses (conceptually) simple, flexible tools to represent the messy outside world.

A good system is a complexity sandwich with the physical world on both sides (the hardware on one, the outside world on the other), and simplicity in the middle. Data structures connect the hardware and data modelling connects the world. Increasingly, different people work on each side, and they have different needs.

Both functional and OO languages get this wrong by default. Functional ones have nice features for making data structures (ADTs), but the introductory examples all create `Employee`s or animals, and it's common to store everything in linked lists. Meanwhile OO languages were designed for simulation (ie modelling), but then classes are the only tool for building anything, and it becomes unwieldy.

(As it happens, OO is not that good for modelling the world either, but I digress.)

This leads to talking at cross purposes. Rich Hickey's criticism of strongly-typed FP is on target, *in the context of modelling information*. Many of the rebuttals are also sensible, *in the context of building internal structures and interfaces*. Compiler writers often don't interact with the outside world enough (I include myself here), so it's easy to miss the point.

One reason for Python's success, I think, is that it's one of the few to get this broadly right: although nominally an OO language, its data libraries don't require anything like defining a schema using classes. Many users won't create classes at all; instead they store information in simple, obvious data structures like dictionaries, data frames and arrays.

Clojure takes this a step further by jettisoning classes. While one can define new datatypes, that is an advanced feature that most users won't bother with. Instead you represent information using dictionaries with namespaced keys (which are pretty close to entities in a database).

Further still, logic languages – known and used well in the world of databases, and too little outside of it – put information entirely first in the form of the table or relation. And that works well, despite lacking custom data types altogether.

A general-purpose programming language should of course be able to describe advanced data structures, which is essential to building good libraries. But as programming's user base expands, it is right to view this as an advanced feature that most people need not touch. Instead, think in terms of good tools for modelling information.
