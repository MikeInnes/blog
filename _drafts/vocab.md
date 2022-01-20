---
title: Test Your Vocab
tags: essay infodump
---

<script src="https://cdn.jsdelivr.net/npm/d3@7"></script>

So you want to show off the size of your dictionary? Look no further than this quick test, which will work out how many words you know.

<!-- HTML buttons -->
<div class="vocab-test">
    <div class="test-word">word</div>
    <div class="test-help">which word has the closest meaning?</div>
    <div class="test-buttons">
        <div class="test-buttons-row">
            <button>synonym</button>
            <button>antonym</button>
        </div>
        <div class="test-buttons-row">
            <button>unrelated</button>
            <button>nothing</button>
        </div>
    </div>
</div>

<p class="vocab-graph"></p>

<p>
Just click the word that’s closest in meaning to <span class="word">travel</span>. As you play we’ll narrow down the estimate of your vocabulary size, and you can stop whenever you get bored.
Right now we think you know about <span class="vocab-mean">42,000</span> words (between <span class="vocab-lower">36,000</span> and <span class="vocab-upper">48,000</span>).
</p>

You can also administer the test for someone else. For more reliable results, try asking them to define the word or give an example. If they are not sure of a word then just click an answer at random.[^random]

[^random]: If your subject gets a word wrong, it's best not to knowingly choose a wrong answer on their behalf. The reason is that the quiz expects you to get some answers right by accident, so forcing wrong answers could make it overly pessimistic.

## How it works

We can’t test you on every English word – there are hundreds of thousands of them. Instead we can turn this into a statistical problem, by asking how likely you are to know a given word. If there’s a 5% chance you’ll recognise any word in English, that means you know a twentieth of the dictionary, and we can figure out your vocabulary size from there.

Ideally we’d show you a small set of words, chosen at random, and see what fraction you understand. But this is tricky because of the number of obscure words. The plot below shows the top 1,000 words, ordered by how often they appear in writing and speech. You can see that a few words (like _the_ and _and_) are really, really popular, but the bulk are less well-known. Zooming out, there are a few thousand common words, tens of thousands of unusual ones, and millions more that are esoteric, archaic or obsolete. So to avoid making the quiz tedious, we have to be a bit cleverer.

[plot – zipf’s law]

The shape of this graph can also be to our advantage. It shows that a word twice as far down the list gets used roughly half as often, an effect known as [Zipf’s law](https://en.wikipedia.org/wiki/Zipf%27s_law). So a word’s rank gives an idea of its usage, which in turn affects how likely you are to recognise it. That makes it possible to talk about your confidence in different parts of the list, separating the common and uncommon words, rather than dealing with all of them at once.

[plot – sigmoid curve]

This plot shows what someone’s “vocab curve” might look like – that is, their recognition of each word as we go through the list. The upside-down-S shape represents someone who knows almost all the common words, some unusual ones, and few arcane ones. If we can find your personal S-curve, at least roughly, we know your chance of recognising every word in English.

Armed with word frequency data from COCA and a bit of mathematical jiggery-pokery, that’s exactly what this test does. As we learn which words you understand, we can narrow down what this curve looks like for you, and so estimate your vocabulary size.

The only question is how to probe your vocab. Some tests simply ask if you recognise a set of words, but this probably leads to overestimates. Obscure words can be mistaken for common ones (eg _dissemble_ for _disassemble_, or _lessor_ for _lesser_). Multiple choice makes things more objective at the cost of false positives – because if you guess at random, you’ll be right a quarter of the time. Fortunately this is easy to adjust for in the statistics.

## On vocab size

Possibly the best-known vocabulary test is [testyourvocab.com](http://testyourvocab.com) (TYV), which may give slightly lower scores than this one. This is largely down to the underlying data used, which in TYV's case is over a decade old. Because we use a larger and more modern lexicon, we can detect more of your hard-earned words.

Languages change. The Oxford English Dictionary added [1400 new entries](https://public.oed.com/updates/) just in the first quarter of 2021. A corpus drawn from the internet, rather than stuffy 20<sup>th</sup> century news and literature, has less Queen’s English and more memespeak. The [data we use](https://www.wordfrequency.info) includes neologisms (like _blog_), some homonyms (_mean_ as in *convey*, *average* and *unkind*) and hyphenations (like _co-founder_).[^stemming] So TYV’s [hardest words](http://testyourvocab.com/hard) are more obscure than those from the newer list, even though the latter has more entries overall.

[^stemming]:
     Both datasets make an effort to “stem” words, so that _jumps_, _jumping_, _jumped_ and so on are all treated as part of the same root word, _jump_.

[Many words](https://gist.github.com/MikeInnes/4aaae4d2c898c2dadf76dbfde444353d) don't appear in the older corpus even once. Future historians will no doubt learn a lot about our changing society from terms like _blog_, _ipad_, _self-driving_, _idiot-proof_ and _co-wife_.

## Maths

Say [[x_i]] is the popularity of the [[i^\text{th}]] word, and [[y_i]] is `true` if you know the word. The statistical model is as follows.

<div>
    $[[\begin{aligned}
        \epsilon_i &\sim \mathcal{N}(0, 1) \\
        y_i &= b - W x_i + \epsilon_i > 0
    \end{aligned}]]
</div>

This is a probit regression (much like the more common logistic regression, but with slightly better fit to this data). Basically, [[W]] and [[b]] are learnable parameters that define an S-shaped curve, and we can fit that curve to your quiz answers.

We could equally write that model out as follows, with an explicit Bernoulli distribution [[\mathcal{B}(p)]] and the normal distribution CDF [[\Phi(x)]].

$[[y_i \sim \mathcal{B}(\Phi(b - W x_i))]]

This isn't quite the whole story, though, because we don't actually see [[y_i]] (whether you know the [[i^\text{th}]] word) but [[\hat y_i]] (whether you got the [[i^\text{th}]] answer right). With multiple choice these are quite different things, because there's a one in four chance you'll get the answer by guessing.[^choice]

[^choice]: Incidentally, I think this is a nice case study in questioning statistical assumptions. You could certainly throw plain logistic (or probit) regression at this quiz data, and it'd give you an answer. But it'd be a poor one given that the distribution doesn't actually fit ([[p(x)]] doesn't tends towards zero). A simple tweak, taking into account how the data is produced, gets much better results.

<div>
    $[[
        \hat y_i \sim
        \begin{cases}
            \mathcal{B}(1),& \text{if } y_i\\
            \mathcal{B}(\frac{1}{4}),& \text{otherwise}
        \end{cases}
    ]]
</div>

We can easily tweak the model to deal with this, observing [[\hat y_i]] but then recovering [[P(y_i)]] to calculate your score. The quiz uses Expectation Propagation to fit to model instantly in your browser. Running the model live in turn lets us make use of its results: we can ask questions for which the chance of a right answer is about 50%. Words at the edge of your knowledge – not too easy, not too hard – are the most helpful for fitting the curve, as well as being more fun to answer.

After fitting we can pull out a function [[p(x) = \Phi(b - W x)]] representing how likely it is that you know any word at rank [[x]]. Then it's easy to sum up over all word ranks to estimate how many you know overall.[^totals]

[^totals]: The quiz also displays 95% confidence intervals, which are only slightly trickier to calculate.

$[[\sum_{x=1}^\infty \Phi(b - W x)]]

Note that we've assumed there are more words than just those in our limited dataset, which only goes up to rank 35,000 or so. Summing to infinity equates to including the top million words in English (or some other big number).

It's bold to model your knowledge beyond the words that we can test. It’d be useful to bolster our assumptions by testing the S-curve’s fit more thoroughly, especially using data from smaller vocabularies (like those of youngsters or non-native speakers). That said, it won’t have a big effect on most people’s results, and the alternative of capping high scores is no less arbitrary.

It's even plausible that infinity is the right choice. András Kornai has argued that the size of language [is actually unbounded](https://kornai.com/Papers/hmwat.pdf). Zipf’s long tail just keeps going on, leaving no phrase out, however few people use it. It looks after the words that live only among odd dialects in villages, or as an inside joke between friends, or spoken playfully between pillows. We may as well count those words, too.

## Notes

<!-- Script/style -->

<style>
    @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@400;600&display=swap');
    .vocab-test {
        width: 100%;
        text-align: center;
        font-family: 'Quicksand', sans-serif;
    }
    .test-word {
        font-size: 20pt;
        font-weight: 600;
    }
    .test-help {
        font-size: 10pt;
        color: #888;
        font-weight: 600;
    }
    .test-buttons-row {
        --button-border-colour: #DDD;
        /* --button-hover-border-colour: #CCC; */
        --button-hover-border-colour: #DDD;
    }
    .test-buttons button {
        font-family: inherit;
        font-weight: 600;
        background-color: white;
        border: 3px solid var(--button-border-colour);
        border-radius: 10px;
        filter: drop-shadow(0px 3px 0 var(--button-border-colour));
        font-size: 12pt;
        width: 250px;
        margin: 10px;
        padding: 10px;
    }
    .test-buttons button:hover {
        border-color: var(--button-hover-border-colour);
        filter: drop-shadow(0px 3px 0 var(--button-hover-border-colour));
        /* position: relative;
        top: -1px; */
    }
    .test-buttons button:active {
        filter: drop-shadow(0px 0px 0 var(--button-border-colour));
        position: relative;
        top: 3px;
    }
    .word {
        font-style: italic;
    }
    .vocab-mean, .vocab-lower, .vocab-upper {
        font-weight: bold;
    }
    .vocab-graph rect {
        transition: all 0.5s;
    }
</style>

<script>
let id = null;
let answerid = null;
let worker = new Worker('/assets/vocab-worker.js');

function format(n) {
    return Math.round(n).toLocaleString(undefined, {maximumSignificantDigits: 2});
}

function question(data) {
    id = data.id;
    answerid = Math.floor(Math.random() * 4);
    document.querySelector('.vocab-test .test-word').innerText = data.word;
    document.querySelector('.word').innerText = data.word;
    document.querySelectorAll('.vocab-test button').forEach(function (b,i) {
        if (i === answerid) {
            b.innerText = data.answer;
        } else {
            b.innerText = data.answers.pop();
        }
    });
    document.querySelector('.vocab-mean').innerText = format(data.bounds[0]);
    document.querySelector('.vocab-lower').innerText = format(data.bounds[1]);
    document.querySelector('.vocab-upper').innerText = format(data.bounds[2]);
    updatePlot(data.bounds[1], data.bounds[2]);
}

function answer(i) {
    correct = i === answerid;
    console.log(correct ? "correct" : "incorrect");
    worker.postMessage({id, result: correct});
    updateCorrect(correct);
}

worker.onmessage = ({data}) => question(data);

document.querySelectorAll('.vocab-test button').forEach(function (b,i) {
    b.onclick = () => answer(i);
});

let height = 40;
let range = [390, 2e5];
let bounds = [1e3, 1e5];
let margin = ({top: 0, right: 30, bottom: 20, left: 30});

function clamp(x) {
    return Math.max(Math.min(x, bounds[1]), bounds[0]);
}

function renderPlot() {
    width = document.querySelector(".vocab-graph").clientWidth;
    x = d3.scaleLog()
          .domain([bounds[0], bounds[1]])
          .range([margin.left, width - margin.right])
          .interpolate(d3.interpolateRound)

    d3.select(".vocab-graph").selectAll("*").remove();
    let svg = d3.select(".vocab-graph").append("svg")
                .attr("viewBox", `0 0 ${width} ${height}`);

    svg.append("g")
       .append("rect").attr("rx", 2)
       .attr("fill", "#F0F0F0")
       .attr("x", x(bounds[0]))
       .attr("width", x(bounds[1]) - x(bounds[0]))
       .attr("height", 16);

    svg.append("g")
       .append("rect").attr("id", "graph-bar")
       .attr("fill", "steelblue")
       .attr("rx", 2)
       .attr("x", x(clamp(range[0])))
       .attr("width", x(clamp(range[1])) - x(clamp(range[0])))
       .attr("height", 16);

    svg.append("g")
       .attr("transform", `translate(0,${height-margin.bottom})`)
       .call(d3.axisBottom(x).ticks(width/80, ","))
       .call(g => g.select(".domain").remove())
}

function updatePlot(lower, upper) {
    range = [lower, upper];
    d3.select("#graph-bar")
      .attr("x", x(clamp(range[0])))
      .attr("width", x(clamp(range[1])) - x(clamp(range[0])));
}

function updateCorrect(correct) {
    d3.select("#graph-bar").attr("fill", correct ? "steelblue" : "#b58e46");
}

renderPlot();
onresize = () => renderPlot();
</script>
