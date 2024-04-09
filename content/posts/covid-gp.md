---
aliases:
- /2020/12/17/covid-gp
date: '2020-12-17'
title: Inferring transmission rates
tags: [infodump]
---

Here's a plot of Covid-19's reproductive rate ($R$) over time in the UK, based on daily case numbers and seroprevalence surveys. Because the estimates are uncertain, each light blue line on the plot shows a possible path that $R$ could have taken, with all paths together giving a sense of what's plausible on any given day.

<img src="/assets/covid-r.png" style="width:100%" />
<div class="caption">
Estimates of the reproductive rate in the UK, up to 16th December 2020.
</div>

Early in the year $R$ could be almost anything, given the limited data at that time. As testing improves, the effects of the first, stringent lockdown in late March become clear, with $R$ rapidly dropping below one. Things loosen up for the summer, but $R$ drops once again when lockdowns are imposed for a second time at the start of November.

The reproductive rate is probably familiar by now, but the way it's calculated here may not be.

## Yes, SIR

A cornerstone of infectious disease epidemiology is the compartmental model, in which a population is divided into buckets. Each bucket counts the number of people at a different stage of a disease, and over time there is a flow between buckets (as, for example, infected people recover). The simplest compartmental model is known as the "SIR model", defined by the following equations.

$$
\begin{aligned}
    \dot S &= -\beta \frac{I S}{N} \\\\
    \dot I &= \beta \frac{I S}{N} - \gamma I \\\\
    \dot R &= \gamma I
\end{aligned}
$$

These represent three buckets, for those who are susceptible to a new disease (labelled $S$), currently infected by it ($I$) and recovered from it ($R$). Over time new people become infected (moving from $S$ to $I$) and recover (moving from $I$ to $R$). The two key parameters are $\beta$, which represents how easily the disease is transmitted, and $\gamma$, how quickly those infected recover. We can also represent transmissibility with the familiar reproductive number $R_0$, which in this setup is given by $R_0 = \beta / \gamma$. (Somewhat confusingly, $R$ and $R_0$ are unrelated here.)

If we solve these equations we'll end up with a plot of the disease's course like this.

<img src="/assets/sir.png" style="width:100%" />
<div class="caption">
SIR model output. Each category contains a proportion of the whole population, from zero to one. The shape of the "infected" curve corresponds roughly to case counts.
</div>

The SIR model and friends are useful in epidemiology, despite being heavily simplified. But one issue makes them hard to apply to covid case counts: the assumption that the rate of transmission $\beta$ (and hence $R_0$) doesn't change over time. In many countries, lockdowns and circuit breakers are intended to change the transmission rate. Some regions have even seen multiple peaks in case counts as lockdowns are imposed and eased again, behaviour that the SIR model alone can't account for.

So in practice we need to distinguish between the baseline reproductive rate, $R_0$, at the start of the epidemic and before any behaviour changes, and the effective reproductive rate $R_e$. $R_e$ also has the useful property that it measures whether infection rates are increasing; if $R_e > 1$ the epidemic is getting worse, while at $R_e < 1$ the disease dies away.

## Every day I'm modelling

The plot above takes the SIR model as a foundation, but switches out the constant $\beta$ for a variable that can change over time, and from which we can derive $R_e$.[^gp] We don't know what $\beta$ is, but we can make a guess for it (as well as other important parameters like $\gamma$). We can then simulate an epidemic using these guesses, generate simulated case and death count data, and compare it to the counts we actually recorded in a given country. If the simulation looks like the real data, our guess for $\beta$ was good, and we'll keep it; if not, we'll throw it out. The plots above show the remaining, plausible values of $\beta$. Made a bit more formal, this process is called Bayesian inference.

From this we get estimates of transmission over time, which gives us a nice indicator of how effective lockdowns are. A time series allows us to make use of all the data while still being responsive as new information comes in. For example, it's quite likely that $R$ is already edging above $1$ as students return and families move around for Christmas, yet as of writing the goverment reports a below-one figure from a few weeks ago.[^update]

Combining modelling approaches this way has other advantages. Including the dynamics of disease spread allows us to make sense of rich but complex and non-linear data, and relate very different datasets together. Estimating important parameters together helps to understand relationships between them (eg "if $R$ was low in June it must have been high in October"). For all these reasons epidemiologists often work with mechanistic or multivariate models.

If you want to play around with it, you can find the code for all this on [GitHub](https://github.com/MikeInnes/bayes-sir).

[^gp]: More technically, $\beta$ is modelled as a [Gaussian process](https://github.com/willtebbutt/Stheno.jl). For our purposes this is basically a fancy moving average, which accounts for uncertainty and can be smart about how smooth the resulting curve is.

[^update]: Update: A couple of days after this plot (the 18th), the [official figure](https://www.gov.uk/guidance/the-r-number-in-the-uk) was updated to be 1.1-1.2.
