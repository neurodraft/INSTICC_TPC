const hash = require('object-hash');
const iterativePaperGrouping = require('./paper-grouping-agent');
const fs = require('fs');
const { match } = require('assert');

let rawdata = fs.readFileSync('iceis2022.json');
const { sessions, papers, restrictions, preferences, topics, areas } = JSON.parse(rawdata);

var gSessions = sessions.map(s => s.gSessionId).filter((v, i, a) => a.indexOf(v) === i).sort();

var authors = [];
papers.forEach(paper => {
    authors = [...authors, ...paper.authors];
});
authors = authors.filter((v, i, a) => a.indexOf(v) === i).sort();

addRestrictionsVectors(papers, restrictions, gSessions);
addPreferencesVectors(papers, preferences, gSessions);
addAuthorsVectors(papers, authors);

const iterativePaperGrouper = iterativePaperGrouping(papers, gSessions);

var remainingPapers = [...papers].sort();
var remainingSessions = [...sessions].sort();

var startState = {
    remainingSessions: remainingSessions,
    remainingPapers: remainingPapers,
    matches: [
    ]
}

function addRestrictionsVectors(papers, restrictions, gSessions){
    for(var i = 0; i < papers.length; i++){
        //papers[i].restrictions = [];
        var vector = new Array(gSessions.length).fill(0);
        for(var j = 0; j < gSessions.length; j++){
            var sessionId = gSessions[j];
            if(restrictions.some(r => r.sessionId === sessionId &&
                r.articleId === papers[i].id)) {
                    vector[j] = 1;
                    //papers[i].restrictions.push(sessionId);
                }
        }
        papers[i].restrictionsVector = vector;
    }
}

function addPreferencesVectors(papers, preferences, gSessions){
    for(var i = 0; i < papers.length; i++){
        var vector = new Array(gSessions.length).fill(0);
        for(var j = 0; j < gSessions.length; j++){
            var sessionId = gSessions[j];
            if(preferences.some(r => r.sessionId === sessionId &&
                r.articleId === papers[i].id)) {
                    vector[j] = 1;
                }
        }
        papers[i].preferencesVector = vector;
    }
}

function addAuthorsVectors(papers, authors){
    for(var i = 0; i < papers.length; i++){
        var vector = new Array(authors.length).fill(0);
        for(var j = 0; j < authors.length; j++){
            if(papers[i].authors.includes(authors[j])) {
                    vector[j] = 1;
                }
        }
        papers[i].authorsVector = vector;
    }
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
    // let difference = b.matches
    //     .filter(x => !a.matches.includes(x));

    // var distance = 0;
    // difference.forEach(match => distance += match.distance);

    // return distance;
    return 1;
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


    var preferencesMet = 0;

    state.matches.forEach(match => {
        preferencesMet += preferences
            .filter(p => p.sessionId == match.session.gSessionId &&
                match.paperGroup
                    .some(paper => paper.id == p.articleId)).length;
    })

    var amountPapersWithPreferences = preferences
        .map(p => p.articleId)
        .filter((v, i, s) => s.indexOf(v) === i).length;

    heuristic +=  (amountPapersWithPreferences - preferencesMet);

    return heuristic;
}

function gSessionSimultaneousAuthorsVector(matches, gSessionId){
    var authorsVector = new Array(authors.length).fill(0);;
    matches.forEach(m => {
        if(m.session.gSessionId === gSessionId){
            authorsVector = orVectors(authorsVector, m.authorsVector);
        }
    });
    return authorsVector;
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

        var simultaneousAuthorsVector = gSessionSimultaneousAuthorsVector(state.matches, session.gSessionId);

        var consumerKey = hash([state, session]);

        var paperGroupNode = iterativePaperGrouper.nextGroup(consumerKey,
            session.duration, session.gSessionId, state.remainingPapers, simultaneousAuthorsVector);

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
                        preferencesVector: paperGroupNode.preferencesVector,
                        authorsVector: paperGroupNode.authorsVector
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

module.exports = {
    startState: startState,
    isGoalState: isGoalState,
    nextSuccessor: createNextSuccessor(),
    distanceBetween: distanceBetween,
    heuristic: heuristic,
    progressReport: progressReport,
    printState: printState,
    restrictions: restrictions,
    preferences: preferences
};