---
title: Adventures in Face Space
tags: general
---

The website [thispersondoesnotexist.com](https://thispersondoesnotexist.com) shows off images created by [StyleGAN](https://github.com/NVlabs/stylegan2-ada-pytorch), a kind of machine learning model trained on around 70,000 headshots from Flickr. Although the photos on the site resemble real ones, they are wholly made up: StyleGAN can generate an unlimited number of convincing faces on the fly, each unique and never to be seen again.

Under the hood, StyleGAN starts with a set of 512 numbers, known as the “latent state”, like:

```julia
[-2.0763590228145516,
  1.6445363589507724,
  0.5918615055274108,
 -0.0264190200752720,
 -0.2397198207971201,
 ...
```

Normally these are chosen arbitrarily, and the model will generate a unique face for every possible list. But we can also dig into what the numbers mean. Similar lists produce similar faces, making it possible to manipulate StyleGAN’s output in interesting ways. For example, we can create an animation by showing all the faces between two starting points.


<div class="fill">
<video controls loop=true playsinline=true>
<source src="/assets/facespace/tween00.webm"
        type="video/webm" />
<source src="/assets/facespace/tween00.mp4"
        type="video/mp4" />
</video>
</div>


We can also ask whether the generated faces have some quality – for example, smiling or not smiling, or appearing male or female – and then tell StyleGAN to generate images that are likely to be classified one way or the other. We can even tweak one trait while fixing others, like age and pose.[^1]

<div class="fill">
<video controls loop=true playsinline=true>
<source src="/assets/facespace/tween01.webm"
        type="video/webm" />
<source src="/assets/facespace/tween01.mp4"
        type="video/mp4" />
</video>
</div>

<div class="fill">
<video controls loop=true playsinline=true>
<source src="/assets/facespace/tween02.webm"
        type="video/webm" />
<source src="/assets/facespace/tween02.mp4"
        type="video/mp4" />
</video>
</div>

Of course, the model doesn’t really know about gender (or anything else), but blindly spits out any features of the dataset that correlate with our classifications. If Flickr’s men tend to be [pictured on grey days](https://www.jefftk.com/p/detecting-tanks), for example, StyleGAN will act as if overhead clouds were crucial to the art of manliness. As it happens, the women in the dataset tend to have makeup and longer hair, as well as wearing different outfits, so the results reflect those conventions. Still, highlighting that skew in the data can be useful, just as when analysis of word embeddings reveals [bias in language use](https://dl.acm.org/doi/10.1145/3351095.3372843).

The images below were created by first generating a StyleGAN face as normal, then “flipping” the latent state in an attempt to alter the classification. The multi-panelled images interpolate more ambiguous faces in between the two extremes. The animations extend this to a continuum, and they are squarely in the uncanny valley. Partly that’s because they look so surreal and unnatural when moving; yet when paused, each frame is realistic.

<div class="fill">
<a href="/assets/facespace/panel02.jpg" target=_blank class="img">
<img src="/assets/facespace/panel02small.jpg">
</a>
</div>

<div class="fill">
<a href="/assets/facespace/panel01.jpg" target=_blank class="img">
<img src="/assets/facespace/panel01small.jpg">
</a>
</div>

<div class="fill">
<a href="/assets/facespace/panel03.jpg" target=_blank class="img">
<img src="/assets/facespace/panel03small.jpg">
</a>
</div>

<div class="fill">
<a href="/assets/facespace/panel05.jpg" target=_blank class="img">
<img src="/assets/facespace/panel05small.jpg">
</a>
</div>

<div class="fill">
<a href="/assets/facespace/panel23.jpg" target=_blank class="img">
<img src="/assets/facespace/panel23small.jpg">
</a>
</div>

<div class="fill">
<a href="/assets/facespace/panel24.jpg" target=_blank class="img">
<img src="/assets/facespace/panel24small.jpg">
</a>
</div>

<div class="fill">
<video controls loop=true playsinline=true>
<source src="/assets/facespace/tween03.webm"
        type="video/webm" />
<source src="/assets/facespace/tween03.mp4"
        type="video/mp4" />
</video>
</div>

<div class="fill">
<a href="/assets/facespace/panel17.jpg" target=_blank class="img">
<img src="/assets/facespace/panel17small.jpg">
</a>
</div>

<div class="fill">
<a href="/assets/facespace/panel06.jpg" target=_blank class="img">
<img src="/assets/facespace/panel06small.jpg">
</a>
</div>

<div class="fill">
<a href="/assets/facespace/panel07.jpg" target=_blank class="img">
<img src="/assets/facespace/panel07small.jpg">
</a>
</div>

<div class="fill">
<a href="/assets/facespace/panel08.jpg" target=_blank class="img">
<img src="/assets/facespace/panel08small.jpg">
</a>
</div>

<div class="fill">
<a href="/assets/facespace/panel19.jpg" target=_blank class="img">
<img src="/assets/facespace/panel19small.jpg">
</a>
</div>

<div class="fill">
<video controls loop=true playsinline=true>
<source src="/assets/facespace/tween06.webm"
        type="video/webm" />
<source src="/assets/facespace/tween06.mp4"
        type="video/mp4" />
</video>
</div>

<div class="fill">
<a href="/assets/facespace/panel10.jpg" target=_blank class="img">
<img src="/assets/facespace/panel10small.jpg">
</a>
</div>

<div class="fill">
<a href="/assets/facespace/panel11.jpg" target=_blank class="img">
<img src="/assets/facespace/panel11small.jpg">
</a>
</div>

<div class="fill">
<video controls loop=true playsinline=true>
<source src="/assets/facespace/tween05.webm"
        type="video/webm" />
<source src="/assets/facespace/tween05.mp4"
        type="video/mp4" />
</video>
</div>

<div class="fill">
<a href="/assets/facespace/panel21.jpg" target=_blank class="img">
<img src="/assets/facespace/panel21small.jpg">
</a>
</div>

<div class="fill">
<a href="/assets/facespace/panel12.jpg" target=_blank class="img">
<img src="/assets/facespace/panel12small.jpg">
</a>
</div>

<div class="fill">
<video controls loop=true playsinline=true>
<source src="/assets/facespace/tween08.webm"
        type="video/webm" />
<source src="/assets/facespace/tween08.mp4"
        type="video/mp4" />
</video>
</div>

<div class="fill">
<a href="/assets/facespace/panel14.jpg" target=_blank class="img">
<img src="/assets/facespace/panel14small.jpg">
</a>
</div>

<div class="fill">
<a href="/assets/facespace/panel15.jpg" target=_blank class="img">
<img src="/assets/facespace/panel15small.jpg">
</a>
</div>

<div class="fill">
<a href="/assets/facespace/panel09.jpg" target=_blank class="img">
<img src="/assets/facespace/panel09small.jpg">
</a>
</div>

<div class="fill">
<video controls loop=true playsinline=true>
<source src="/assets/facespace/tween07.webm"
        type="video/webm" />
<source src="/assets/facespace/tween07.mp4"
        type="video/mp4" />
</video>
</div>

<div class="fill">
<a href="/assets/facespace/panel04.jpg" target=_blank class="img">
<img src="/assets/facespace/panel04small.jpg">
</a>
</div>

<div class="fill">
<a href="/assets/facespace/panel18.jpg" target=_blank class="img">
<img src="/assets/facespace/panel18small.jpg">
</a>
</div>

<div class="fill">
<a href="/assets/facespace/panel20.jpg" target=_blank class="img">
<img src="/assets/facespace/panel20small.jpg">
</a>
</div>

<div class="fill">
<video controls loop=true playsinline=true>
<source src="/assets/facespace/tween04.webm"
        type="video/webm" />
<source src="/assets/facespace/tween04.mp4"
        type="video/mp4" />
</video>
</div>

<div class="fill">
<a href="/assets/facespace/panel22.jpg" target=_blank class="img">
<img src="/assets/facespace/panel22small.jpg">
</a>
</div>

## Notes

[^1]:
     The method is basically the same as the one used for word embeddings in [this post](http://mikeinnes.github.io/2021/03/23/colours.html). StyleGAN’s latent space lets us define a geometry on faces; by subtracting one face from another we can represent the difference between the two. The average difference between faces with and without some trait defines a direction we can move along to add or remove that trait from the final image.
