const hash = require('object-hash');
const iterativePaperGrouping = require('./paper-grouping-agent');
const fs = require('fs');
const { match } = require('assert');

let rawdata = fs.readFileSync('iceis2022.json');
const { sessions, papers, restrictions, preferences, topics, areas } = JSON.parse(rawdata);

var authors = [];
papers.forEach(paper => {
    authors = [...authors, ...paper.authors];
});
authors = authors.filter((v, i, a) => a.indexOf(v) === i).sort();

addAuthorsVectors(papers, authors);

const gSessionsIds = sessions.map(s => s.gSessionId).filter((v, i, a) => a.indexOf(v) === i).sort();

const gSessions = gSessionsIds.map(gSessionId => {
    var session = sessions.find(s => s.gSessionId === gSessionId);
    return { id: gSessionId, duration: session.duration, groups: [], authorsVector: new Array(authors.length).fill(0) };
});

const totalSessionDuration = gSessions.reduce((partialSum, s) => partialSum + s.duration, 0);

const averageSessionDuration = totalSessionDuration / gSessions.length;

const totalPaperDuration = papers.reduce((partialSum, p) => partialSum + p.duration, 0);

const averagePaperDuration = totalPaperDuration / papers.length;

const averagePaperAmountPerRoom = averageSessionDuration / averagePaperDuration;

const averageRoomsPerSession = totalPaperDuration / totalSessionDuration;

const predictedRoomsPerSession = Math.ceil(averageRoomsPerSession * 1.25);

const amountPapersWithPreferences = preferences
    .map(p => p.articleId)
    .filter((v, i, s) => s.indexOf(v) === i).length;

addRestrictionsVectors(papers, restrictions, gSessionsIds);
addPreferencesVectors(papers, preferences, gSessionsIds);

const iterativePaperGrouper = iterativePaperGrouping(papers, gSessionsIds);

var remainingPapers = [...papers].sort();
//var remainingSessions = [...sessions].sort();

var startState = {
    //remainingSessions: remainingSessions,
    remainingPapers: remainingPapers,
    gSessions: gSessions,
    //distanceTotal: 0,
}

function addRestrictionsVectors(papers, restrictions, gSessions) {
    for (var i = 0; i < papers.length; i++) {
        //papers[i].restrictions = [];
        var vector = new Array(gSessions.length).fill(0);
        for (var j = 0; j < gSessions.length; j++) {
            var sessionId = gSessions[j];
            if (restrictions.some(r => r.sessionId === sessionId &&
                r.articleId === papers[i].id)) {
                vector[j] = 1;
                //papers[i].restrictions.push(sessionId);
            }
        }
        papers[i].restrictionsVector = vector;
    }
}

function addPreferencesVectors(papers, preferences, gSessions) {
    for (var i = 0; i < papers.length; i++) {
        var vector = new Array(gSessions.length).fill(0);
        for (var j = 0; j < gSessions.length; j++) {
            var sessionId = gSessions[j];
            if (preferences.some(r => r.sessionId === sessionId &&
                r.articleId === papers[i].id)) {
                vector[j] = 1;
            }
        }
        papers[i].preferencesVector = vector;
    }
}

function addAuthorsVectors(papers, authors) {
    for (var i = 0; i < papers.length; i++) {
        var vector = new Array(authors.length).fill(0);
        for (var j = 0; j < authors.length; j++) {
            if (papers[i].authors.includes(authors[j])) {
                vector[j] = 1;
            }
        }
        papers[i].authorsVector = vector;
    }
}

function printState(state) {

    let { gSessions, remainingPapers, ...rest } = state;

    console.log("G-Sessions:")
    gSessions.forEach(s => {
        console.log("-------------------")
        console.log(`G-SESSION ${s.id} | ${s.duration} min`);
        console.log("article groups:");
        s.groups.forEach((g, i, a) => {
            console.log(` - ${i +1}:`)
            console.dir({
                papersIds: g.paperGroup.map(p => p.id),
                areas: areaVectorToTitles(g.vectorArea),
                topics: topicVectorToTitles(g.topicVector),
                commonTopics: topicVectorToTitles(g.commonTopicsVector),
                //authors: authorsVectorToNames(g.authorsVector),
                duration: g.duration,
                distance: g.distance,
            })
        });
        return;
    })

    console.log("Remaining Papers:")
    console.dir(remainingPapers.map(p => p.id));

    // console.log("More:")
    // console.dir(rest);
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

function authorsVectorToNames(authorsVector) {
    var names = [];
    for (var i = 0; i < authorsVector.length; i++) {
        if (authorsVector[i] === 1) {
            names.push(authors[i]);
        }
    }
    return names;
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
    var distance = 1;
   
    var lastChangedSession = b.gSessions[b.gSessions.length - 1];
    var lastAddedGroup = lastChangedSession.groups[lastChangedSession.groups.length - 1];

    if (!lastAddedGroup.commonTopicsVector.some(v => v === 1)) {
        distance += 1;  
        distance += (lastAddedGroup.vectorArea.reduce((partialSum, a) => partialSum + a, 0) - 1) * 2;
    } else {
        distance += (lastAddedGroup.commonTopicsVector.reduce((partialSum, a) => partialSum + a, 0) - 1) * 1;
        distance += (lastAddedGroup.vectorArea.reduce((partialSum, a) => partialSum + a, 0) - 1) * 1;
    }

    var otherSessionGroupsAreaVector = new Array(lastAddedGroup.vectorArea.length).fill(0);
    lastChangedSession.groups.forEach(g => {
        if(g !== lastAddedGroup)
            otherSessionGroupsAreaVector = orVectors(otherSessionGroupsAreaVector, g.vectorArea)
    });

    distance += innerProduct(lastAddedGroup.vectorArea, otherSessionGroupsAreaVector) * 2;

    var durationDiff = lastChangedSession.duration - lastAddedGroup.duration;
    if (durationDiff >= 0) {
        distance += (durationDiff / lastChangedSession.duration) * 10;
    } else {
        distance += (lastChangedSession.duration / -durationDiff) * 0.1
    }

    return distance;
}

function orVectors(vector1, vector2) {
    var out = [];
    for (var i = 0; i < vector1.length; i++) {
        out[i] = vector1[i] || vector2[i];
    }
    return out;
}

function addVectors(vector1, vector2) {
    var out = [];
    for (var i = 0; i < vector1.length; i++) {
        out[i] = vector1[i] + vector2[i];
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

function standardDeviation(values) {
    const n = values.length;
    const mean = values.reduce((partialSum, v) => partialSum + v) / n;
    return Math.sqrt(values.map(x => Math.pow(x - mean, 2)).reduce((partialSum, v) => partialSum + v) / n)
}

function heuristic(state) {
    var heuristic = 0;

    // Adicionar o número previsto de salas que faltam preencher com uma folga
    // var remainingSessionsHeuristic = getRemainingSessionsHeuristic(state);

    var remainingPapersAmount = state.remainingPapers.length;

    //var areasHeuristic = getAreasHeuristic(state) * 0.25;

    // Evitar ter papers restantes com restrições para as sessões que mais salas faltam preencher,
    // principalmente quando existem poucas salas que restam preencher no total
    //var restrictionsHeuristic = getRestrictionsHeuristic(state);

    // Preferências que faltam satisfazer
    var preferencesHeuristic = getPreferencesHeuristic(state); 

    heuristic += remainingPapersAmount + preferencesHeuristic;

    return heuristic;
}

function getRestrictionsHeuristic(state) {
    if (state.remainingPapers.length > 0) {
        var restrictionsVector;
        state.remainingPapers.forEach(p => {
            if (restrictionsVector === undefined) {
                restrictionsVector = [...p.restrictionsVector];
            } else {
                restrictionsVector = addVectors(restrictionsVector, p.restrictionsVector);
            }
        });

        var adjustedRestrictionsVector = restrictionsVector.map(v => v / averagePaperAmountPerRoom)

        var sessionsVector = [];

        var totalPredictedRemainingRooms = 0;

        gSessionsIds.forEach(gSessionId => {
            var gSession = state.gSessions.find(s => s.id == gSessionId);

            var predictedRemainingRooms = predictedRoomsPerSession - gSession.groups.length;
            totalPredictedRemainingRooms += predictedRemainingRooms;

            sessionsVector.push(predictedRemainingRooms);
        });


        var similarity = innerProduct(sessionsVector, adjustedRestrictionsVector);

        var averageSessionsRemaining = (sessionsVector.reduce((a, b) => a + b) / sessionsVector.length);

        var value = similarity / gSessionsIds.length;

        return value;
    }

    return 0;
}

function getPreferencesHeuristic(state) {
    var preferencesMet = 0;
    state.gSessions.forEach(gSession => {
        preferencesMet += preferences
            .filter(p => p.sessionId == gSession.id &&
                gSession.groups
                    .some(group => group.paperGroup.some(paper => paper.id == p.articleId))).length;
    })

    return (amountPapersWithPreferences - preferencesMet);
}

function getAreasHeuristic(state) {
    var remainingPapersTotalAreaVector = new Array(areas.length).fill(0);

    state.remainingPapers.forEach(paper => {
        paper.vectorArea.forEach((v, i) => remainingPapersTotalAreaVector[i] += v);
    });

    var value = 0;

    // PREFER MINIMIZING NUMBER OF PAPERS REMAINING IN AREA WITH MOST PAPERS REMAINING
    //heuristic += Math.max(...remainingPapersTotalAreaVector) * 0.25;

    // AVOID HAVING AREAS WITH NUMBER OF PAPERS REMAINING LESS THAN AVERAGE PAPER AMOUNT PER ROOM
    var nonZeroRemainingAreaTotals = remainingPapersTotalAreaVector.filter(v => v !== 0);
    nonZeroRemainingAreaTotals.forEach(total => {
            value += Math.pow(0.5, (total - (averagePaperAmountPerRoom * 0.5)));
    })

    return value;
}

function getRemainingSessionsHeuristic(state) {
     var totalRemainingPapersDuration = state.remainingPapers.reduce((partialSum, paper) => partialSum + paper.duration, 0);

    var predictedRemainingSessions = (totalRemainingPapersDuration / averageSessionDuration);

    return predictedRemainingSessions;
}

function gSessionSimultaneousAuthorsVector(matches, gSessionId) {
    var authorsVector = new Array(authors.length).fill(0);;
    matches.forEach(m => {
        if (m.session.gSessionId === gSessionId) {
            authorsVector = orVectors(authorsVector, m.authorsVector);
        }
    });
    return authorsVector;
}

function gSessionsWithLeastGroups(stateGSessions) {
    var groupLengthMin = undefined;
    stateGSessions.forEach(m => {
        if (groupLengthMin === undefined) {
            groupLengthMin = m.groups.length;
        } else if (m.groups.length < groupLengthMin) {
            groupLengthMin = m.groups.length;
        }
    });
    var gSessions = [];
    stateGSessions.forEach(s => {
        if (s.groups.length == groupLengthMin) gSessions.push(s);
    })

    return gSessions;
}

function createNextSuccessor() {
    const stateExpansionStateMap = new Map();

    function nextSuccessor(state) {
        var expansionState;

        if (stateExpansionStateMap.has(state)) {
            expansionState = stateExpansionStateMap.get(state);
        } else {
            expansionState = {
                validSessions: gSessionsWithLeastGroups(state.gSessions).sort((a, b) => 0.5 - Math.random()),
                index: 0
            };
            stateExpansionStateMap.set(state, expansionState);
        }

        var gSession = expansionState.validSessions[expansionState.index];

        // var simultaneousAuthorsVector = gSessionSimultaneousAuthorsVector(state.matches, gSession.id);
        var simultaneousAuthorsVector = gSession.authorsVector;

        var consumerKey = hash([state, gSession.id]);

        var paperGroupNode = iterativePaperGrouper.nextGroup(consumerKey,
            gSession.duration, gSession.id, state.remainingPapers, simultaneousAuthorsVector);

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
            var newGSessions = state.gSessions.filter(s => s.id !== gSession.id);

            var newGroup = {
                paperGroup: paperGroupNode.group,
                distance: paperGroupNode.distance,
                vectorArea: paperGroupNode.vectorArea,
                topicVector: paperGroupNode.vector,
                commonTopicsVector: paperGroupNode.commonTopicsVector,
                restrictionsVector: paperGroupNode.restrictionsVector,
                preferencesVector: paperGroupNode.preferencesVector,
                authorsVector: paperGroupNode.authorsVector,
                duration: paperGroupNode.duration
            };

            var newGSession = {
                id: gSession.id,
                duration: gSession.duration,
                groups: [...gSession.groups, newGroup],
                authorsVector: orVectors(gSession.authorsVector, paperGroupNode.authorsVector)
            }

            newGSessions = [...newGSessions, newGSession];

            var newState = {
                remainingPapers: state.remainingPapers.filter(p => !paperGroupNode.group.includes(p)),
                gSessions: newGSessions,
                // distanceTotal: state.distanceTotal + paperGroupNode.distance,
            }

            return newState;
        }

    }

    return nextSuccessor;

}

var progressReport = {
    frequency: 5000, callback: (progress) => {
        let {bestSoFar, lastExpanded, ...rest } = progress;
        printState(lastExpanded.state);
        console.log("BestSoFar: g - " + bestSoFar.g + "; h - " + bestSoFar.h + "; f - " + bestSoFar.f);
        console.log("BestSoFar expanded " + bestSoFar.timesExpanded + " times");
        console.log("LastExpanded: g - " + lastExpanded.g + "; h - " + lastExpanded.h + "; f - " + lastExpanded.f);

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