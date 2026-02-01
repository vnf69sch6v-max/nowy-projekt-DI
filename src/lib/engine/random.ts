// =============================================
// StochFin Monte Carlo Engine: Random Number Generation
// Includes RNG and distribution samplers
// =============================================

/**
 * Mersenne Twister PRNG (simplified implementation)
 * For production, consider using a library like 'random-js'
 */
export class MersenneTwister {
    private mt: number[] = new Array(624);
    private mti: number = 625;

    constructor(seed?: number) {
        this.init(seed ?? Date.now());
    }

    private init(seed: number): void {
        this.mt[0] = seed >>> 0;
        for (let i = 1; i < 624; i++) {
            const s = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
            this.mt[i] = (((((s & 0xffff0000) >>> 16) * 1812433253) << 16) +
                (s & 0x0000ffff) * 1812433253 + i) >>> 0;
        }
        this.mti = 624;
    }

    /**
     * Generates a random integer in [0, 2^32 - 1]
     */
    genrandInt32(): number {
        let y: number;
        const mag01 = [0x0, 0x9908b0df];

        if (this.mti >= 624) {
            let kk: number;
            for (kk = 0; kk < 227; kk++) {
                y = (this.mt[kk] & 0x80000000) | (this.mt[kk + 1] & 0x7fffffff);
                this.mt[kk] = this.mt[kk + 397] ^ (y >>> 1) ^ mag01[y & 0x1];
            }
            for (; kk < 623; kk++) {
                y = (this.mt[kk] & 0x80000000) | (this.mt[kk + 1] & 0x7fffffff);
                this.mt[kk] = this.mt[kk - 227] ^ (y >>> 1) ^ mag01[y & 0x1];
            }
            y = (this.mt[623] & 0x80000000) | (this.mt[0] & 0x7fffffff);
            this.mt[623] = this.mt[396] ^ (y >>> 1) ^ mag01[y & 0x1];
            this.mti = 0;
        }

        y = this.mt[this.mti++];
        y ^= y >>> 11;
        y ^= (y << 7) & 0x9d2c5680;
        y ^= (y << 15) & 0xefc60000;
        y ^= y >>> 18;

        return y >>> 0;
    }

    /**
     * Generates a random float in [0, 1)
     */
    random(): number {
        return this.genrandInt32() * (1.0 / 4294967296.0);
    }

    /**
     * Set seed for reproducibility
     */
    setSeed(seed: number): void {
        this.init(seed);
    }
}

// =============================================
// Distribution Samplers
// =============================================

/**
 * Sample from Standard Normal N(0, 1) using Box-Muller transform
 */
export function sampleStandardNormal(rng: MersenneTwister): number {
    let u1: number, u2: number;

    // Avoid log(0)
    do {
        u1 = rng.random();
    } while (u1 === 0);

    u2 = rng.random();

    // Box-Muller transform
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Sample from Normal N(mu, sigma)
 */
export function sampleNormal(rng: MersenneTwister, mu: number, sigma: number): number {
    return mu + sigma * sampleStandardNormal(rng);
}

/**
 * Sample from Lognormal with parameters mu, sigma (of the log)
 */
export function sampleLognormal(rng: MersenneTwister, mu: number, sigma: number): number {
    return Math.exp(sampleNormal(rng, mu, sigma));
}

/**
 * Sample from Uniform [min, max]
 */
export function sampleUniform(rng: MersenneTwister, min: number, max: number): number {
    return min + (max - min) * rng.random();
}

/**
 * Sample from Triangular(min, mode, max)
 */
export function sampleTriangular(
    rng: MersenneTwister,
    min: number,
    mode: number,
    max: number
): number {
    const u = rng.random();
    const fc = (mode - min) / (max - min);

    if (u < fc) {
        return min + Math.sqrt(u * (max - min) * (mode - min));
    } else {
        return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
    }
}

/**
 * Sample from PERT(optimistic, most_likely, pessimistic)
 * PERT is a modified Beta distribution
 */
export function samplePert(
    rng: MersenneTwister,
    optimistic: number,
    mostLikely: number,
    pessimistic: number,
    lambda: number = 4
): number {
    const range = pessimistic - optimistic;
    if (range === 0) return mostLikely;

    // Calculate mean and standard deviation
    const mu = (optimistic + lambda * mostLikely + pessimistic) / (lambda + 2);

    // Calculate alpha and beta for Beta distribution
    const alpha1 = (4 * mostLikely + pessimistic - 5 * optimistic) / range;
    const alpha2 = (5 * pessimistic - optimistic - 4 * mostLikely) / range;

    // Sample from Beta using gamma distributions (simplified)
    const x = sampleGamma(rng, Math.max(0.1, alpha1), 1);
    const y = sampleGamma(rng, Math.max(0.1, alpha2), 1);
    const beta = x / (x + y);

    return optimistic + beta * range;
}

/**
 * Sample from Gamma(alpha, beta) using Marsaglia and Tsang's method
 */
export function sampleGamma(rng: MersenneTwister, alpha: number, beta: number): number {
    if (alpha < 1) {
        // Boost alpha to >= 1, then adjust
        const u = rng.random();
        return sampleGamma(rng, alpha + 1, beta) * Math.pow(u, 1 / alpha);
    }

    const d = alpha - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);

    while (true) {
        let x: number, v: number;

        do {
            x = sampleStandardNormal(rng);
            v = 1 + c * x;
        } while (v <= 0);

        v = v * v * v;
        const u = rng.random();

        if (u < 1 - 0.0331 * (x * x) * (x * x)) {
            return d * v / beta;
        }

        if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
            return d * v / beta;
        }
    }
}

/**
 * Sample from Student-t(nu) with location mu and scale sigma
 */
export function sampleStudentT(
    rng: MersenneTwister,
    nu: number,
    mu: number = 0,
    sigma: number = 1
): number {
    // t = Z / sqrt(V/nu) where Z ~ N(0,1) and V ~ Chi-squared(nu)
    const z = sampleStandardNormal(rng);
    const v = sampleGamma(rng, nu / 2, 2); // Chi-squared(nu)

    return mu + sigma * z / Math.sqrt(v / nu);
}

/**
 * Sample from Poisson(lambda)
 */
export function samplePoisson(rng: MersenneTwister, lambda: number): number {
    if (lambda < 30) {
        // Direct method for small lambda
        const L = Math.exp(-lambda);
        let k = 0;
        let p = 1;

        do {
            k++;
            p *= rng.random();
        } while (p > L);

        return k - 1;
    } else {
        // Normal approximation for large lambda
        return Math.round(Math.max(0, sampleNormal(rng, lambda, Math.sqrt(lambda))));
    }
}

/**
 * Sample from Empirical distribution (bootstrap)
 */
export function sampleEmpirical(rng: MersenneTwister, samples: number[]): number {
    const index = Math.floor(rng.random() * samples.length);
    return samples[index];
}

// =============================================
// Multi-variate Sampling (for correlation)
// =============================================

/**
 * Generate n independent standard normal samples
 */
export function sampleStandardNormalVector(rng: MersenneTwister, n: number): number[] {
    const result: number[] = new Array(n);
    for (let i = 0; i < n; i++) {
        result[i] = sampleStandardNormal(rng);
    }
    return result;
}

/**
 * Generate correlated normal samples using Cholesky decomposition
 * @param rng Random number generator
 * @param means Vector of means
 * @param choleskyL Lower triangular Cholesky matrix
 */
export function sampleCorrelatedNormals(
    rng: MersenneTwister,
    means: number[],
    stdDevs: number[],
    choleskyL: number[][]
): number[] {
    const n = means.length;
    const z = sampleStandardNormalVector(rng, n);

    // y = L * z (matrix-vector multiplication)
    const result: number[] = new Array(n);
    for (let i = 0; i < n; i++) {
        let sum = 0;
        for (let j = 0; j <= i; j++) {
            sum += choleskyL[i][j] * z[j];
        }
        result[i] = means[i] + stdDevs[i] * sum;
    }

    return result;
}
