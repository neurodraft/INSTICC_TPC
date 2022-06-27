const aStarIS = require('../algorithms/iterative-successors-astar');

const {
    startState, isGoalState, nextSuccessor, distanceBetween,
    heuristic, progressReport, printState, restrictions,
    preferences
} = require('./tpcDomain');

var result = aStarIS(startState, isGoalState, nextSuccessor, distanceBetween, heuristic, 8, undefined, undefined, progressReport);

let {path, ...rest} = result;

var finalState = path.pop();

printState(finalState);

console.dir(rest);

const evaluateMatches = require("./evaluateMatches.js");

console.dir(evaluateMatches(finalState.matches, restrictions, preferences));