const dFIS = require('../algorithms/iterative-successors-df');

const {
    startState, isGoalState, nextSuccessor,
    progressReport, printState, restrictions,
    preferences} = require('./tpcDomain');

var result = dFIS(startState, isGoalState, nextSuccessor, 1, undefined, progressReport);

let {path, ...rest} = result;

var finalState = path.pop();

printState(finalState);

console.dir(rest);

const evaluateMatches = require("./evaluateMatches.js");

console.dir(evaluateMatches(finalState.matches, restrictions, preferences));