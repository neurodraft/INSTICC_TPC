const aStarIS = require('../algorithms/iterative-successors-astar');
const tpcDomain = require('./tpcDomain');

const fs = require('fs');

let rawdata = fs.readFileSync('iceis2022.json');

let tpcConfig = {
    baseTransitionCost: 1,
    sessionPenalties: {
        noCommonTopicsPenalty: 1,
        commonTopicsBeyondFirstPenaltyMultiplier: 1,
        areasBeyondFirstPenaltyMultiplier: {
            withoutCommonTopics: 4,
            withCommonTopics: 2,
        },
        simultaneousSessionsAreaSimilarityPenaltyMultiplier: 2,

        // Multiplier for undertime normalized relative to Session Duration
        // eg.: 15 / 60 = 0.25 * 10 = 2.5 penalty score added for being 15 minutes under in a 60 minutes session
        // eg.: 15 / 105 = ~0.143 * 10 = ~1.43 penalty score added for being 15 minutes under in a 105 minutes session
        undertimeNormalizedPenaltyMultiplier: 40,

        // Multiplier for product between overtime and Session Duration (gets larger as any of the two increases).
        // eg.: 5 * 60 = 300 * 0.025 = 7.5 penalty score added for going 5 minutes over in a 60 minutes session
        // eg.: 5 * 105 = 525 * 0.025 = 13.125 penalty score added for going 5 minutes over in a 105 minutes session
        overtimeSessionDurationProductPenaltyMultiplier: 0.025
    },
    heuristicMultipliers: {
        remainingPapersMultiplier: 1,
        unmetPreferencesMultiplier: 1
    },
    iterativeAStar: {
        // Additional cost for each reexpansion of a node
        nodeReExpansionAdditionalCost: 4,

        // JavaScript expression for determining how many sucessors to expand in function of d (depth)
        maxSuccessorsPerIterationExpression: "Math.max(2048 / Math.pow(2, d), 4)"
    }
    
};

const {
    startState, isGoalState, nextSuccessor, distanceBetween,
    heuristic, progressReport, printState, restrictions,
    preferences, stateHash
} = tpcDomain(rawdata, tpcConfig);

function maxSuccessorsPerIteration(d) {
    return eval(tpcConfig.iterativeAStar.maxSuccessorsPerIterationExpression);
}
var reExpansionPenalty = tpcConfig.iterativeAStar.nodeReExpansionAdditionalCost;

var result = aStarIS(startState, isGoalState, nextSuccessor, distanceBetween, heuristic, maxSuccessorsPerIteration, reExpansionPenalty, undefined, stateHash, progressReport);

let {path, ...rest} = result;

var finalState = path.pop();

console.log("!!! FINAL STATE:");

printState(finalState);

console.dir(rest);

const data = JSON.stringify(finalState.gSessions);

fs.writeFile(`result_${Date.now().valueOf()}.json`, data, (err) => {
    if (err) {
        throw err;
    }
    console.log("JSON data is saved.");
});