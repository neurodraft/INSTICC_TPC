const aStarIS = require('./iterative-successors-astar');
const hash = require('object-hash');
const iterativePaperGrouping = require('./paper-grouping-agent');
const fs = require('fs');

let rawdata = fs.readFileSync('iceis2022.json');
const { sessions, papers, restrictions, preferences, topics, areas } = JSON.parse(rawdata);

var gSessions = sessions.map(s => s.gSessionId).filter((v, i, a) => a.indexOf(v) === i).sort();

const iterativePaperGrouper = iterativePaperGrouping(papers, restrictions, preferences, gSessions);

var remainingPapers = [...papers].sort();
var remainingSessions = [...sessions].sort();

var startState = {
    remainingSessions: remainingSessions,
    remainingPapers: remainingPapers,
    matches: [
    ]
}

function printState(state) {

    let {matches, remainingSessions, remainingPapers, ...rest} = state;

    console.log("Matches:")
    console.dir(matches.map(m => {
        return {
            session: m.session.id,
            papers: m.paperGroup.map(p => p.id),
            areas: areaVectorToTitles(m.vectorArea),
            topics: topicVectorToTitles(m.topicVector)
        };
    }))

    console.log("Remaining Sessions:")
    console.dir(remainingSessions.map(s => s.id));

    console.log("Remaining Papers:")
    console.dir(remainingPapers.map(p => p.id));

     
    console.log("More:")
    console.dir(rest);
}

function topicVectorToTitles(topicVector) {
    var titles = [];
    for (var i = 0; i < topicVector.length; i++) {
        if (topicVector[i] === 1) {
            titles.push(topics[i].name);
        }
    }
    return titles;
}

function areaVectorToTitles(vectorArea) {
    var titles = [];
    for (var i = 0; i < vectorArea.length; i++) {
        if (vectorArea[i] === 1) {
            titles.push(areas[i].name);
        }
    }
    return titles;
}

function isGoalState(state) {
    if (state.remainingPapers.length === 0) {
        console.log("REACHED END:");
        printState(state);
        return true;
    };
    return false;
}

function distanceBetween(a, b) {
    let difference = b.matches
        .filter(x => !a.matches.includes(x));

    var distance = 0;
    difference.forEach(match => distance += match.distance);

    return distance;
}

function orVectors(vector1, vector2) {
    var out = [];
    for (var i = 0; i < vector1.length; i++) {
        out[i] = vector1[i] || vector2[i];
    }
    return out;
}

function manhattanDistance(vector1, vector2) {
    var value = 0;
    for (var i = 0; i < vector1.length; i++) {
        value += Math.abs(vector1[i] - vector2[i]);
    }

    return value;
}

function innerProduct(vector1, vector2) {
    var value = 0;
    for (var i = 0; i < vector1.length; i++) {
        value += vector1[i] * vector2[i];
    }

    return value;
}

function heuristic(state) {
    var heuristic = 0;

    heuristic += state.remainingSessions.length;

    if (state.remainingPapers.length > 0) {
        heuristic += state.remainingPapers.length;

        var restrictionsVector;
        state.remainingPapers.forEach(p => {
            if (restrictionsVector === undefined) {
                restrictionsVector = [...p.restrictionsVector];
            } else {
                restrictionsVector = orVectors(restrictionsVector, p.restrictionsVector);
            }
        });

        var sessionsVector = [];
        gSessions.forEach(gSessionId => {
            if (state.remainingSessions.some(s => s.gSessionId === gSessionId)) {
                sessionsVector.push(1);
            } else {
                sessionsVector.push(0);
            }
        });

        var similarity = innerProduct(sessionsVector, restrictionsVector);

        heuristic += similarity;
    }

    return heuristic;
}

function createNextSuccessor() {
    const stateExpansionStateMap = new Map();

    function nextSuccessor(state) {
        var expansionState;

        if (stateExpansionStateMap.has(state)) {
            expansionState = stateExpansionStateMap.get(state);
        } else {
            expansionState = {
                validSessions: [...state.remainingSessions],
                index: 0
            };
            stateExpansionStateMap.set(state, expansionState);
        }

        var session = expansionState.validSessions[expansionState.index];

        var consumerKey = hash([state, session]);

        var paperGroupNode = iterativePaperGrouper.nextGroup(consumerKey,
            session.duration, session.gSessionId, state.remainingPapers);

        if (paperGroupNode === null) {
            expansionState.validSessions.splice(expansionState.index, 1);
            if (expansionState.validSessions.length == 0) {
                return null;
            }
        }

        expansionState.index += 1;
        expansionState.index %= expansionState.validSessions.length;

        if (paperGroupNode === null) {
            return nextSuccessor(state);
        } else {
            var newState = {
                remainingSessions: state.remainingSessions.filter(s => s != session).sort(),
                remainingPapers: state.remainingPapers.filter(p => !paperGroupNode.group.includes(p)).sort(),
                matches: [
                    ...state.matches,
                    {
                        session: session,
                        paperGroup: paperGroupNode.group,
                        distance: paperGroupNode.distance,
                        vectorArea: paperGroupNode.vectorArea,
                        topicVector: paperGroupNode.vector,
                        restrictionsVector: paperGroupNode.restrictionsVector,
                        preferencesVector: paperGroupNode.preferencesVector
                    }
                ].sort()
            }

            return newState;
        }

    }

    return nextSuccessor;

}

var progressReport = {
    frequency: 10000, callback: (progress) => {
        let { lastExpanded, ...rest } = progress;
        printState(lastExpanded.state);
        console.dir(rest);
    }
};

var result = aStarIS(startState, isGoalState, createNextSuccessor(), distanceBetween, heuristic, undefined, undefined, progressReport);

let {path, ...rest} = result;

var finalState = path.pop();

printState(finalState);

console.dir(rest);

const evaluateMatches = require("./evaluateMatches.js");

console.dir(evaluateMatches(finalState.matches, restrictions, preferences));