// Numerical functions
// -------------------

let pi = Math.PI;
let Inf = Infinity;
let exp = Math.exp;
let pow = Math.pow;
let sqrt = Math.sqrt;

function erf(x) {
    // save the sign of x
    var sign = (x >= 0) ? 1 : -1;
    x = Math.abs(x);

    // constants
    var a1 =  0.254829592;
    var a2 = -0.284496736;
    var a3 =  1.421413741;
    var a4 = -1.453152027;
    var a5 =  1.061405429;
    var p  =  0.3275911;

    // A&S formula 7.1.26
    var t = 1.0/(1.0 + p*x);
    var y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * exp(-x * x);
    return sign * y; // erf(-x) = -erf(x);
}

function erfc(x) {
    return 1 - erf(x);
}

function erfinv(x) {
    // maximum relative error = .00013
    const a  = 0.147
    //if (0 == x) { return 0 }
    const b = 2/(pi * a) + Math.log(1-x**2)/2
    const sqrt1 = Math.sqrt( b**2 - Math.log(1-x**2)/a )
    const sqrt2 = Math.sqrt( sqrt1 - b )
    return sqrt2 * Math.sign(x)
}

function erfcinv(x) {
    return erfinv(1-x);
}

function phi(x) {
    return exp(-pow(x, 2)/2)/sqrt(2*pi);
}

function Phi(x) {
    return erfc(-x / sqrt(2))/2;
}

// Integrate x phi(a + bx)
function ixphi(x, a, b) {
    return -(phi(a+b*x)+a*Phi(a+b*x))/pow(b, 2);
}
function ixphi0(x, a, b) {
    return ixphi(x, a, b) - ixphi(0, a, b);
}

// Integrate x^2 phi(a + bx)
function ix2phi(x, a, b) {
    return ((pow(a, 2)+1)*Phi(a+b*x)+(a-b*x)*phi(a+b*x))/pow(b, 3);
}
function ix2phi0(a, b) {
    return (pow(a, 2)+1)/pow(b, 3) - ix2phi(0, a, b);
}

class Normal {
    constructor(mean, variance) {
        this.mean = mean;
        this.variance = variance;
    }
    pdf(x) {
        let [mean, std] = [this.mean, sqrt(this.variance)];
        return phi((x - mean)/std)/std;
    }
    cdf(x) {
        let [mean, std] = [this.mean, sqrt(this.variance)];
        return Phi((x - mean) / std);
    }
}

// EP update equations
// -------------------

function gaussdiv(a, b) {
    let [t, u] = [1/a.variance, 1/b.variance]
    return new Normal((a.mean*t - b.mean*u)/(t-u), 1/(t-u));
}

function candiv(a, b) {
    return a.variance < b.variance;
}

// Condition positive
function condition_positive(W) {
    let [μ, σ] = [W.mean, sqrt(W.variance)];
    let Z = 1-W.cdf(0);
    let Ex = ixphi0(Inf, -μ/σ, 1/σ)/σ/Z;
    let Ex2 = ix2phi0(-μ/σ, 1/σ)/σ/Z;
    return new Normal(Ex, Ex2 - pow(Ex,2));
}

function ep_positive(W, f) {
    let W_ = gaussdiv(W, f);
    W = condition_positive(W_);
    f = gaussdiv(W, W_);
    return [W, f];
}

function project_prior(W, b, x) {
  let [μ, v] = [W.mean, W.variance]
  μ = -μ * x
  v = pow(x, 2) * v
  return new Normal(μ + b.μ, v + pow(b.σ, 2))
}

function update_prior(p, y, multi=true) {
    let [μ, σ] = [p.mean, sqrt(p.variance)];
    let Z = (1/2)*erfc(-((1/sqrt(2))*(μ*((1/sqrt((1+pow(σ, -2))))*(1/σ)))));
    let Ex = μ+(exp(((-1/2)*(pow(μ, 2)*((1/(1+pow(σ, -2)))*pow(σ, -2)))))*(sqrt((2*(1/pi)))*((1/sqrt((1+pow(σ, -2))))*(σ*(1/erfc(-((1/sqrt(2))*(μ*((1/sqrt((1+pow(σ, -2))))*(1/σ))))))))));
    let v = pow(σ, 2)+-(pow(σ, 4)*((2*(exp(-(pow(μ, 2)*((1/(1+pow(σ, -2)))*pow(σ, -2))))*((1/pi)*((1/(1+pow(σ, -2)))*(pow(σ, -2)*pow(erfc(-((1/sqrt(2))*(μ*((1/sqrt((1+pow(σ, -2))))*(1/sqrt(pow(σ, 2))))))), -2))))))+(4*(exp(((-1/2)*(pow(μ, 2)*((1/(1+pow(σ, -2)))*pow(σ, -2)))))*((1/sqrt(pi))*((((-1/2)*((1/sqrt(2))*(μ*(pow((1+pow(σ, -2)), (-3/2))*pow(pow(σ, 2), (-5/2))))))+((1/2)*((1/sqrt(2))*(μ*((1/sqrt((1+pow(σ, -2))))*pow(pow(σ, 2), (-3/2)))))))*(1/erfc(-((1/sqrt(2))*(μ*((1/sqrt((1+pow(σ, -2))))*(1/sqrt(pow(σ, 2))))))))))))));
    let Ex2 = v + pow(Ex, 2);
    if (multi) {
        let Z_ = 1/4 + 3/4*Z;
        Ex = (1/4*μ + 3/4*Ex*Z)/Z_;
        Ex2 = (1/4*(μ^2+σ^2) + 3/4*Ex2*Z)/Z_;
        Z = Z_;
    }
    if (!y) {
        let Z_ = 1-Z;
        Ex = (μ - Ex*Z)/Z_;
        Ex2 = (pow(μ,2)+pow(σ,2)-Ex2*Z)/Z_;
    }
    return new Normal(Ex, Ex2 - pow(Ex, 2));
}

// ϵᵢ ~ Normal(0, 1)
// i = -W*xᵢ + b + ϵᵢ
// ŷᵢ = i > 0

// Main script
// -----------

let words;

async function main() {
    let resp = await fetch('/assets/vocab.json');
    words = await resp.json();
    // console.log(words);
    // console.log(ep_positive(new Normal(0, 1), new Normal(0, Inf)));
    console.log(update_prior(new Normal(0, 1), true));
    console.log(update_prior(new Normal(0, 1), false));
}

main();

onmessage = e => console.log(e.data);
