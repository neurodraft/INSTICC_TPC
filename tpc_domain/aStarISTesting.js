const aStarIS = require('../algorithms/iterative-successors-astar');

const {
    startState, isGoalState, nextSuccessor, distanceBetween,
    heuristic, progressReport, printState, restrictions,
    preferences
} = require('./tpcDomain');

function maxSuccessorsPerIteration(d) {
    return Math.max(128 / (d + 1), 8);
}

var result = aStarIS(startState, isGoalState, nextSuccessor, distanceBetween, heuristic, maxSuccessorsPerIteration, undefined, undefined, progressReport);

let {path, ...rest} = result;

var finalState = path.pop();

console.log("!!! FINAL STATE:");

printState(finalState);

console.dir(rest);

const data = JSON.stringify(finalState.gSessions);

const fs = require('fs');

fs.writeFile(`result_${Date.now().valueOf()}.json`, data, (err) => {
    if (err) {
        throw err;
    }
    console.log("JSON data is saved.");
});