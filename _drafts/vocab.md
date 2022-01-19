---
title: Test Your Vocab
tags: essay infodump
---

<script src="https://cdn.jsdelivr.net/npm/d3@7"></script>

foo bar baz

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
Right now we think you know about <span class="vocab-mean">42,000</span> words (between <span class="vocab-lower">36,000</span> and <span class="vocab-upper">48,000</span>).
</p>

foo bar baz

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
    d3.select("#graph-bar").attr("fill", correct ? "steelblue" : "#cc650c");
}

renderPlot();
onresize = () => renderPlot();
</script>
