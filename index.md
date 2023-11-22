---
title: Home
---

# Machine Lines

## Some things you should know

* My name is Mike
* I know very little about anything (but I'm working on it)
* As a programmer, I spend most of my time writing pieces of text which solve problems
  * Although the problems are often caused by other pieces of text, which were often also written by me

## Some things I've worked on

* [Julia](https://julialang.org/), a fast programming language
* [Rel](https://relational.ai), a datalog with probabilistic programming
* [Flux](https://en.wikipedia.org/wiki/Flux_(machine-learning_framework)) and [Zygote](https://github.com/FluxML/Zygote.jl), machine learning systems
* [Juno](http://junolab.org), a live-coding IDE (now [Julia VS Code](https://www.julia-vscode.org))
* [Miscellaneous open-source projects](https://github.com/MikeInnes/)

## Some things you can click

[GitHub](https://github.com/MikeInnes), [Twitter](https://twitter.com/MikeJInnes), [Publications](https://scholar.google.co.uk/citations?user=zffDj88AAAAJ&hl=en), [Blog]({{site.url}}), [Email](mailto:complaints@mikeinnes.io)

[Addresses, keys etc.](keys.html)

## Some things you can read

General:
<ul class="posts">
{% for post in site.posts %}
{% if post.tags contains 'general' %}
<li class="post {% if post.tags contains 'popular' %}popular{% endif %}">
  <span class="link"><a href="{{post.url}}">{{post.title}}</a></span>
  <span class="date">{{post.date | date: '%B %Y' }}</span>
</li>
{% endif %}
{% endfor %}
</ul>

Language Design:
<ul class="posts">
{% for post in site.posts %}
{% if post.tags contains 'languages' %}
<li class="post {% if post.tags contains 'popular' %}popular{% endif %}">
  <span class="link"><a href="{{post.url}}">{{post.title}}</a></span>
  <span class="date">{{post.date | date: '%B %Y' }}</span>
</li>
{% endif %}
{% endfor %}
</ul>

Infodumps:
<ul class="posts">
{% for post in site.posts %}
{% assign ntags = post.tags | size %}
{% if post.tags contains 'infodump' or ntags == 0 %}
<li class="post {% if post.tags contains 'popular' %}popular{% endif %}">
  <span class="link"><a href="{{post.url}}">{{post.title}}</a></span>
  <span class="date">{{post.date | date: '%B %Y' }}</span>
</li>
{% endif %}
{% endfor %}
</ul>

Starred posts ⭐ are popular. [RSS feed](/feed.xml)
