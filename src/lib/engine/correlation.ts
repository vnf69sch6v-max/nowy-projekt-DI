// =============================================
// StochFin Monte Carlo Engine: Correlation
// Cholesky decomposition and correlation enforcement
// =============================================

/**
 * Check if a matrix is positive-definite
 * A matrix is positive-definite if all eigenvalues are positive
 * (simplified check via Cholesky - if it succeeds, matrix is PD)
 */
export function isPositiveDefinite(matrix: number[][]): boolean {
    try {
        choleskyDecomposition(matrix);
        return true;
    } catch {
        return false;
    }
}

/**
 * Validate correlation matrix:
 * - Square
 * - Symmetric
 * - Diagonal elements are 1
 * - Off-diagonal elements in [-1, 1]
 * - Positive-definite
 */
export function validateCorrelationMatrix(matrix: number[][]): {
    valid: boolean;
    errors: string[];
} {
    const errors: string[] = [];
    const n = matrix.length;

    // Check square
    for (let i = 0; i < n; i++) {
        if (matrix[i].length !== n) {
            errors.push(`Row ${i} has ${matrix[i].length} elements, expected ${n}`);
        }
    }

    if (errors.length > 0) {
        return { valid: false, errors };
    }

    // Check symmetry and values
    for (let i = 0; i < n; i++) {
        // Diagonal must be 1
        if (Math.abs(matrix[i][i] - 1) > 1e-10) {
            errors.push(`Diagonal element [${i}][${i}] is ${matrix[i][i]}, expected 1`);
        }

        for (let j = i + 1; j < n; j++) {
            // Symmetry
            if (Math.abs(matrix[i][j] - matrix[j][i]) > 1e-10) {
                errors.push(`Matrix is not symmetric: [${i}][${j}]=${matrix[i][j]} but [${j}][${i}]=${matrix[j][i]}`);
            }

            // Range [-1, 1]
            if (matrix[i][j] < -1 || matrix[i][j] > 1) {
                errors.push(`Correlation [${i}][${j}]=${matrix[i][j]} is outside [-1, 1]`);
            }
        }
    }

    if (errors.length > 0) {
        return { valid: false, errors };
    }

    // Check positive-definite
    if (!isPositiveDefinite(matrix)) {
        errors.push('Matrix is not positive-definite. This can happen with inconsistent correlation values.');
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Cholesky Decomposition: A = L * L^T
 * Returns lower triangular matrix L
 * Throws if matrix is not positive-definite
 */
export function choleskyDecomposition(matrix: number[][]): number[][] {
    const n = matrix.length;
    const L: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
        for (let j = 0; j <= i; j++) {
            let sum = 0;

            if (j === i) {
                // Diagonal elements
                for (let k = 0; k < j; k++) {
                    sum += L[j][k] * L[j][k];
                }
                const val = matrix[i][j] - sum;
                if (val <= 0) {
                    throw new Error(`Matrix is not positive-definite at row ${i}`);
                }
                L[i][j] = Math.sqrt(val);
            } else {
                // Off-diagonal elements
                for (let k = 0; k < j; k++) {
                    sum += L[i][k] * L[j][k];
                }
                L[i][j] = (matrix[i][j] - sum) / L[j][j];
            }
        }
    }

    return L;
}

/**
 * Create correlation matrix from pairwise correlations
 * @param n Number of variables
 * @param correlations Map of (i,j) -> correlation value
 */
export function buildCorrelationMatrix(
    n: number,
    correlations: Map<string, number> | Record<string, number>
): number[][] {
    const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));

    // Initialize diagonal
    for (let i = 0; i < n; i++) {
        matrix[i][i] = 1;
    }

    // Fill in correlations (symmetric)
    const corrMap = correlations instanceof Map ? correlations : new Map(Object.entries(correlations));

    for (const [key, value] of corrMap) {
        const [iStr, jStr] = key.split(',');
        const i = parseInt(iStr);
        const j = parseInt(jStr);

        if (i >= 0 && i < n && j >= 0 && j < n && i !== j) {
            matrix[i][j] = value;
            matrix[j][i] = value;
        }
    }

    return matrix;
}

/**
 * Adjust correlation matrix to be positive-definite
 * Uses eigenvalue decomposition to fix negative eigenvalues
 * (Simplified version - nudges eigenvalues)
 */
export function adjustToPositiveDefinite(matrix: number[][], epsilon: number = 0.01): number[][] {
    const n = matrix.length;

    // Try Cholesky first
    if (isPositiveDefinite(matrix)) {
        return matrix;
    }

    // Simple adjustment: shrink off-diagonal elements toward 0
    const adjusted = matrix.map(row => [...row]);
    let shrinkFactor = 0.99;

    while (!isPositiveDefinite(adjusted) && shrinkFactor > 0.5) {
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (i !== j) {
                    adjusted[i][j] = matrix[i][j] * shrinkFactor;
                }
            }
        }
        shrinkFactor -= 0.01;
    }

    if (!isPositiveDefinite(adjusted)) {
        // Last resort: return identity with small correlations
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                adjusted[i][j] = i === j ? 1 : matrix[i][j] * 0.1;
            }
        }
    }

    return adjusted;
}

/**
 * Industry correlation templates
 */
export const INDUSTRY_CORRELATION_TEMPLATES: Record<string, {
    name: string;
    name_pl: string;
    variables: string[];
    matrix: number[][];
}> = {
    manufacturing: {
        name: 'Manufacturing',
        name_pl: 'Produkcja',
        variables: ['REVENUE_GROWTH', 'GROSS_MARGIN', 'INTEREST_RATE', 'GDP_GROWTH'],
        matrix: [
            [1.0, 0.3, -0.2, 0.6],
            [0.3, 1.0, -0.1, 0.4],
            [-0.2, -0.1, 1.0, -0.3],
            [0.6, 0.4, -0.3, 1.0]
        ]
    },
    retail: {
        name: 'Retail',
        name_pl: 'Handel detaliczny',
        variables: ['REVENUE_GROWTH', 'GROSS_MARGIN', 'INFLATION', 'GDP_GROWTH'],
        matrix: [
            [1.0, 0.4, -0.3, 0.5],
            [0.4, 1.0, -0.2, 0.3],
            [-0.3, -0.2, 1.0, -0.2],
            [0.5, 0.3, -0.2, 1.0]
        ]
    },
    technology: {
        name: 'Technology',
        name_pl: 'Technologia',
        variables: ['REVENUE_GROWTH', 'GROSS_MARGIN', 'CAPEX_TO_REVENUE', 'GDP_GROWTH'],
        matrix: [
            [1.0, 0.2, 0.5, 0.4],
            [0.2, 1.0, -0.1, 0.3],
            [0.5, -0.1, 1.0, 0.2],
            [0.4, 0.3, 0.2, 1.0]
        ]
    },
    real_estate: {
        name: 'Real Estate',
        name_pl: 'Nieruchomości',
        variables: ['REVENUE_GROWTH', 'GROSS_MARGIN', 'INTEREST_RATE', 'INFLATION'],
        matrix: [
            [1.0, 0.5, -0.6, 0.4],
            [0.5, 1.0, -0.3, 0.2],
            [-0.6, -0.3, 1.0, 0.3],
            [0.4, 0.2, 0.3, 1.0]
        ]
    },
    financial_services: {
        name: 'Financial Services',
        name_pl: 'Usługi finansowe',
        variables: ['REVENUE_GROWTH', 'NET_MARGIN', 'INTEREST_RATE', 'GDP_GROWTH'],
        matrix: [
            [1.0, 0.6, 0.4, 0.5],
            [0.6, 1.0, 0.5, 0.4],
            [0.4, 0.5, 1.0, 0.2],
            [0.5, 0.4, 0.2, 1.0]
        ]
    }
};

/**
 * Get industry template by code
 */
export function getIndustryTemplate(industryCode: string) {
    return INDUSTRY_CORRELATION_TEMPLATES[industryCode] || null;
}

/**
 * Print matrix nicely (for debugging)
 */
export function formatMatrix(matrix: number[][], precision: number = 2): string {
    return matrix.map(row =>
        row.map(val => val.toFixed(precision).padStart(6)).join(' ')
    ).join('\n');
}
