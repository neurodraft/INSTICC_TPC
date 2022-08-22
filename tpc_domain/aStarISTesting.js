const aStarIS = require('../algorithms/iterative-successors-astar');
const tpcDomain = require('./tpcDomain');
const evaluateMatches = require("./evaluateMatches.js");
const mapResults = require("./mapResults.js")
const { Formatter } = require("fracturedjsonjs");

const fs = require('fs');

let rawdata = fs.readFileSync('iceis2022.json');

let tpcConfig = {
    // Base cost added to g with each transition
    baseTransitionCost: 1,
    // Session evaluation penalty rules
    sessionPenalties: {
        // Base penalty for sessions without common topics
        noCommonTopicsPenalty: 1,
        // Multiplier for common topics total beyond first common topic
        commonTopicsBeyondFirstPenaltyMultiplier: 1,
        // Multiplier for areas total beyond first area in group...
        areasBeyondFirstPenaltyMultiplier: {
            // ...when there aren't any topics in common
            withoutCommonTopics: 16,
            // ...when there is at least a topic in common
            withCommonTopics: 2,
        },
        // Multiplier for total of duplicate simultaneous areas in different rooms
        simultaneousSessionsAreaSimilarityPenaltyMultiplier: 16,

        // Multiplier for undertime normalized relative to Session Duration
        // eg.: 15 / 60 = 0.25 * 10 = 2.5 penalty score added for being 15 minutes under in a 60 minutes session
        // eg.: 15 / 105 = ~0.143 * 10 = ~1.43 penalty score added for being 15 minutes under in a 105 minutes session
        undertimeNormalizedPenaltyMultiplier: 40,

        // Multiplier for product between overtime and Session Duration (gets larger as any of the two increases).
        // eg.: 5 * 60 = 300 * 0.025 = 7.5 penalty score added for going 5 minutes over in a 60 minutes session
        // eg.: 5 * 105 = 525 * 0.025 = 13.125 penalty score added for going 5 minutes over in a 105 minutes session
        overtimeSessionDurationProductPenaltyMultiplier: 0.00625
    },
    // Valid paper group durations for given general session duration
    validDurations: [
        {
            sessionDuration: 60,
            validDurations: [45, 50, 55, 60, 65]
        },
        {
            sessionDuration: 75,
            validDurations: [60, 65, 70, 75, 80]
        },
        {
            sessionDuration: 90,
            validDurations: [75, 80, 85, 90, 95]
        },
        {
            sessionDuration: 105,
            validDurations: [90, 95, 100, 105, 110]
        },
        {
            sessionDuration: 120,
            validDurations: [105, 110, 115, 120, 125]
        },

    ],
    // Heuristic cost multipliers
    heuristicMultipliers: {
        // Multiplier for remaining papers total
        remainingPapersMultiplier: 1,
        // Multiplier for unmet preferences total
        unmetPreferencesMultiplier: 1
    },
    iterativeAStar: {
        // Additional cost for each reexpansion of a node
        nodeReExpansionAdditionalCost: 4,
        // JavaScript expression for determining how many sucessors to expand at once in function of d (depth)
        maxSuccessorsPerIterationExpression:
            //"Math.max(16 / Math.pow(2, d), 4)"
            //"Math.max(32 / Math.pow(2, d), 4)"
            //"Math.max(64 / Math.pow(2, d), 4)"
            //"Math.max(128 / Math.pow(2, d), 4)"
            //"Math.max(256 / Math.pow(2, d), 4)"
            //"Math.max(512 / Math.pow(2, d), 4)"
            "Math.max(1024 / Math.pow(2, d), 4)"
            //"2048"
            //"Math.max(256 / (d + 1), 8)"
            //"Math.max(64 / (d + 1), 4)"
    }
    
};

const {
    startState, isGoalState, nextSuccessor, distanceBetween,
    heuristic, progressReport, printState, restrictions,
    preferences, stateHash, clearStateExpansionDataMap
} = tpcDomain(rawdata, tpcConfig);

function maxSuccessorsPerIteration(d) {
    return eval(tpcConfig.iterativeAStar.maxSuccessorsPerIterationExpression);
}
var reExpansionPenalty = tpcConfig.iterativeAStar.nodeReExpansionAdditionalCost;

const formatter = new Formatter();

for (var i = 0; i < 1; i++){

    var result = aStarIS(startState, isGoalState, nextSuccessor, distanceBetween, heuristic, maxSuccessorsPerIteration, reExpansionPenalty, undefined, stateHash, progressReport);

    clearStateExpansionDataMap();

    let {path, ...rest} = result;
    
    var folderName = `results/${Date.now().valueOf()}`;
    
    fs.mkdirSync(folderName);

    fs.writeFileSync(`${folderName}/tpcConfig.json`, formatter.serialize(tpcConfig));

    if (path == null) {
        console.log("No result found.")
        console.dir(rest);
        fs.writeFileSync(`${folderName}/error.json`, formatter.serialize(rest));
        continue;
    }
        
    var finalState = path.pop();
    
    console.log("!!! FINAL STATE:");
    
    printState(finalState);
    
    console.dir(rest);
    
    const data = formatter.serialize(finalState.gSessions);
    
    fs.writeFileSync(`${folderName}/result.json` , data)
    
    var evaluation = evaluateMatches(finalState.gSessions, restrictions, preferences);
    
    console.dir(evaluation);

    rest.evaluationPenaltyScore = evaluation.penaltyScore;

    fs.writeFileSync(`${folderName}/metrics.json`, formatter.serialize(rest));

    
    fs.writeFileSync(`${folderName}/evaluation.json`, formatter.serialize(evaluation));

    var mappedResult = mapResults(finalState.gSessions, rawdata);

    fs.writeFileSync(`${folderName}/mappedResult.json`, JSON.stringify(mappedResult));
    
}