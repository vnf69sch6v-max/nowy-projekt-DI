// =============================================
// StochFin Monte Carlo Engine - Barrel Export
// =============================================

// Random number generation and sampling
export {
    MersenneTwister,
    sampleStandardNormal,
    sampleNormal,
    sampleLognormal,
    sampleUniform,
    sampleTriangular,
    samplePert,
    sampleStudentT,
    sampleGamma,
    samplePoisson,
    sampleEmpirical,
    sampleCorrelatedNormals
} from './random';

// Correlation utilities
export {
    isPositiveDefinite,
    validateCorrelationMatrix,
    choleskyDecomposition,
    buildCorrelationMatrix,
    adjustToPositiveDefinite,
    getIndustryTemplate,
    formatMatrix,
    INDUSTRY_CORRELATION_TEMPLATES
} from './correlation';

// Stochastic processes
export {
    // GBM
    stepGBM,
    stepGBMMilstein,
    simulateGBMPath,
    // Ornstein-Uhlenbeck
    stepOU,
    simulateOUPath,
    ouHalfLife,
    // Jump-Diffusion
    stepJumpDiffusion,
    simulateJumpDiffusionPath,
    // Heston stochastic volatility
    stepHeston,
    simulateHestonPath,
    checkFellerCondition,
    hestonImpliedVolatility,
    // Generic path simulation
    simulatePath,
    simulateCorrelatedPaths,
    getTimeStepInYears,
    // Types
    type TimeStepUnit,
    type GBMConfig,
    type OUConfig,
    type JumpDiffusionConfig,
    type HestonConfig,
    type ProcessConfig,
    type ProcessType
} from './processes';

// Copula theory for tail dependencies
export {
    // Sampling
    sampleFromCopula,
    sampleClayton,
    sampleGumbel,
    sampleFrank,
    sampleGaussianCopula,
    sampleTCopula,
    sampleRotatedCopula,
    // Analysis
    tailDependenceCoefficient,
    kendallsTau,
    // Fitting
    fitClaytonFromTau,
    fitGumbelFromTau,
    fitFrankFromTau,
    // Scenarios
    getCopulaForScenario,
    // Types
    type ClaytonCopula,
    type GumbelCopula,
    type FrankCopula,
    type TCopula,
    type GaussianCopula,
    type RotatedCopula,
    type CopulaConfig
} from './copulas';

// Bayesian inference and sequential updates
export {
    // Beta-Bernoulli
    updateBetaPrior,
    betaPosteriorStats,
    // Normal-Normal
    updateNormalPrior,
    normalPosteriorStats,
    // Normal-Inverse-Gamma
    updateNormalInverseGammaPrior,
    // Prior elicitation
    elicitBetaPrior,
    elicitNormalPrior,
    weakBetaPrior,
    weakNormalPrior,
    // A/B Testing
    analyzeABTest,
    // Thompson Sampling (bandits)
    thompsonSampling,
    updateBanditArm,
    // Types
    type BetaPrior,
    type NormalPrior,
    type NormalInverseGammaPrior,
    type ABTestResult,
    type BanditArm
} from './bayesian';

// Statistical aggregation
export {
    percentile,
    mean,
    variance,
    stdDev,
    skewness,
    kurtosis,
    modeEstimate,
    valueAtRisk,
    conditionalVaR,
    probNegative,
    probBelowThreshold,
    iqr,
    coefficientOfVariation,
    calculateStatistics,
    formatStatistics,
    type SimulationStats
} from './aggregator';

// Parameter estimation
export {
    estimateGBMParams,
    estimateOUParams,
    recommendProcess,
    type GBMEstimation,
    type OUEstimation,
    type ProcessRecommendation,
    type RecommendedProcess
} from './estimation';

// Main simulator
export {
    runSimulation,
    runSensitivityAnalysis,
    runStressTest,
    PREDEFINED_STRESS_SCENARIOS,
    type SimulationConfig,
    type VariableConfig,
    type SimulationInput,
    type CovenantConfig,
    type SimulationResult,
    type VariablePeriodResult,
    type CovenantPeriodResult,
    type SensitivityInput,
    type SensitivityResult,
    type StressScenario,
    type StressTestResult
} from './simulator';

// Event Probability DSL and Types
export {
    // Event types
    type EventType,
    type ComparisonOperator,
    type LogicalOperator,
    type SDEModelType,
    type DataFrequency,
    // Event definitions
    type ThresholdBreachEvent,
    type CompoundEvent,
    type ConditionalEvent,
    type SequenceEvent,
    type AtLeastKEvent,
    type EventDefinition,
    // SDE parameters
    type GBMParameters,
    type OUParameters,
    type HestonParameters,
    type MertonJumpParameters,
    type SDEParameters,
    // Configuration
    type EventVariable,
    type PriorDistribution,
    type CopulaFamily,
    type EventCopulaSpec,
    type EventSimulationConfig,
    type EventProbabilityResult,
    type BayesianVersion,
    type EventModel,
    // Type guards
    isThresholdBreach,
    isCompoundEvent,
    isConditionalEvent,
    isSequenceEvent,
    isAtLeastKEvent,
    // Validation
    validateEventDefinition,
    type ValidationResult,
    // Helpers
    extractVariables,
    getVariablePairs,
    monthsToYears,
    getNumSteps,
    getDtYears,
    DEFAULT_SIMULATION_CONFIG
} from './events';

// Event Probability Simulation Engine
export {
    runEventSimulation,
    runEventSimulationWithComparison,
    evaluateEvent,
    evaluateThresholdBreach
} from './event-evaluator';

// Gemini NL Parser for Event Definitions
export {
    parseNaturalLanguageEvent,
    interpretSimulationResult,
    parseNaturalLanguageEventStreaming,
    EXAMPLE_PROMPTS,
    type NLParseResult,
    type NLSuggestedVariable,
    type NLInterpretation
} from './gemini-nl-parser';
