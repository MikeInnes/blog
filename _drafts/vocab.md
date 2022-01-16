---
title: Test Your Vocab
tags: essay infodump
---

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
}

function answer(i) {
    console.log(i === answerid ? "correct" : "incorrect");
    worker.postMessage({id, result: i === answerid});
}

worker.onmessage = ({data}) => question(data);

document.querySelectorAll('.vocab-test button').forEach(function (b,i) {
    b.onclick = () => answer(i);
});
</script>
