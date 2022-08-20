const Heap = require('heap');

function hash(paperGroup) {
    return paperGroup.map(p => p.id).toString();
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

function orVectors(vector1, vector2) {
    var out = [];
    for (var i = 0; i < vector1.length; i++) {
        out[i] = vector1[i] || vector2[i];
    }

    return out;
}

// Summation of XORing vector1[i] with vector2[i] for every i
// Same result as manhattan distance for vectors with binary values, faster
function xorSumVectors(vector1, vector2) {
    var sum = 0;
    for (var i = 0; i < vector1.length; i++) {
        sum += vector1[i] != vector2[i] ? 1 : 0;
    }

    return sum;
}

function andVectors(vector1, vector2) {
    var out = [];
    for (var i = 0; i < vector1.length; i++) {
        out[i] = vector1[i] && vector2[i];
    }

    return out;
}

function standardDeviation(values) {
    const n = values.length;
    const mean = values.reduce((partialSum, v) => partialSum + v) / n;
    return Math.sqrt(values.map(x => Math.pow(x - mean, 2)).reduce((partialSum, v) => partialSum + v) / n)
}

function calculateDistanceMatrix(papers) {
    var distanceMatrix = Array.from(Array(papers.length), () => new Array(papers.length));

    var paperIndexMap = new Map();

    for (var i = 0; i < papers.length; i++) {
        paperIndexMap.set(papers[i], i);
        for (var j = 0; j < papers.length; j++) {
            if (distanceMatrix[j][i] !== undefined) {
                distanceMatrix[i][j] = distanceMatrix[j][i];
            } else {
                distanceMatrix[i][j] = xorSumVectors(papers[i].vectorArea, papers[j].vectorArea) * 2
                    + xorSumVectors(papers[i].vector, papers[j].vector)
                    + xorSumVectors(papers[i].restrictionsVector, papers[j].restrictionsVector) * 0.25
                    + xorSumVectors(papers[i].preferencesVector, papers[j].preferencesVector) * 0.25;
            }
        }
    }

    console.dir(distanceMatrix);

    return { distanceMatrix: distanceMatrix, paperIndexMap: paperIndexMap };
}

function printNode(node) {

    //console.dir(node.group);

    var paperIds = node.group.map(p => p.id);

    console.log(`Group: [${paperIds.toString()}], Distance: ${node.distance}`);
}

function iterativePaperGrouper(papers, gSessions, penaltiesConfig) {
    var { distanceMatrix, paperIndexMap } = calculateDistanceMatrix(papers);

    var startingNodes = [];

    var generateNodesMap = new Map();

    var consumerDataMap = new Map();

    // EMPTY STARTING NODE
    var group = [];
    var groupHash = hash(group);
    var vector = new Array(papers[0].vector.length).fill(0);
    var commonTopicsVector = new Array(papers[0].vector.length).fill(0);
    var vectorArea = new Array(papers[0].vectorArea.length).fill(0);
    var restrictionsVector = new Array(papers[0].restrictionsVector.length).fill(0);
    var preferencesVector = new Array(papers[0].preferencesVector.length).fill(0);
    var authorsVector = new Array(papers[0].authorsVector.length).fill(0);
    var duration = 0;
    var maxDistance = 0;
    var distance = 0;

    var node = {
        children: undefined,
        group: group,
        maxDistance: maxDistance,
        distance: distance,
        duration: duration,
        vector: vector,
        commonTopicsVector: commonTopicsVector,
        vectorArea: vectorArea,
        restrictionsVector: restrictionsVector,
        preferencesVector: preferencesVector,
        authorsVector: authorsVector
    }

    generateNodesMap.set(groupHash, node);
    startingNodes.push(node);

    function saveNode(node) {
        var sessionDurations = groupToSessionDurations(node.duration);

        for (var i = 0; i < sessionDurations.length; i++) {

            var sDuration = sessionDurations[i];

            if (durationNodeMap.has(sDuration)) {
                durationNodeMap.get(sDuration).push(node);
            } else {
                durationNodeMap.set(sDuration, [node]);
            }
        }

        return sessionDurations;
    }

    function hasSessionRestriction(node, gSessionId) {
        for (var i = 0; i < gSessions.length; i++) {
            if (gSessions[i] === gSessionId) {
                return node.restrictionsVector[i] == 1;
            }
        }
        return false;
    }

    function groupToSessionDurations(groupDuration) {
        var sessionDurations = [];
        if ([40, 45, 50, 60, 65].includes(groupDuration)) {
            sessionDurations.push(60);
        }
        if ([60, 65, 70, 75, 80].includes(groupDuration)) {
            sessionDurations.push(75);
        }
        if ([80, 85, 90, 75, 95].includes(groupDuration)) {
            sessionDurations.push(90);
        }
        if ([100, 105, 90, 95, 110].includes(groupDuration)) {
            sessionDurations.push(105);
        }
        if ([120, 105, 110, 115, 125].includes(groupDuration)) {
            sessionDurations.push(120);
        }
        return sessionDurations;
    }


    function containsAll(superset, subset) {
        return subset.every(e => superset.includes(e));
    }

    function generateChildren(parent) {
        parent.children = [];
        var duration = parent.duration;
        if (duration < 120) {
            for (var i = 0; i < papers.length; i++) {
                var paper = papers[i];
                if (parent.group.includes(paper)) {
                    continue;
                }
                var group = [...parent.group, paper];

                group.sort((a, b) => a.id - b.id);
                var newGroupHash = hash(group);

                var alreadyGenerated = generateNodesMap.get(newGroupHash);

                if (alreadyGenerated) {
                    // console.log("Already in open: ");
                    // printNode(inOpen);
                    // console.log();
                    parent.children.push(alreadyGenerated);
                    continue;
                }

                var maxDistance = parent.maxDistance;

                for (var j = 0; j < parent.group.length; j++) {
                    var d = distanceMatrix[paperIndexMap.get(paper)][paperIndexMap.get(parent.group[j])];
                    if (d > maxDistance) maxDistance = d;
                }

                var vector = orVectors(parent.vector, paper.vector);
                    
                var commonTopicsVector = parent.group.length ? andVectors(parent.commonTopicsVector, paper.vector) : [...paper.vector];
                var vectorArea = orVectors(parent.vectorArea, paper.vectorArea);
                var preferencesVector = orVectors(parent.preferencesVector, paper.preferencesVector);
                var restrictionsVector = orVectors(parent.restrictionsVector, paper.restrictionsVector);
                var authorsVector = orVectors(parent.authorsVector, paper.authorsVector);
                var duration = parent.duration + paper.duration;
                var distance = maxDistance;


                var nAreasBeyondFirst = vectorArea.reduce((partialSum, a) => partialSum + a, 0) - 1;
                if (!commonTopicsVector.some(v => v === 1)) {
                    distance += penaltiesConfig.noCommonTopicsPenalty;
                    if (nAreasBeyondFirst > 0) distance += nAreasBeyondFirst * penaltiesConfig.areasBeyondFirstPenaltyMultiplier.withoutCommonTopics;
                } else {
                    var nCommonTopicsBeyondFirst = commonTopicsVector.reduce((partialSum, a) => partialSum + a, 0) - 1;
                    distance += nCommonTopicsBeyondFirst * penaltiesConfig.commonTopicsBeyondFirstPenaltyMultiplier;
                    if (nAreasBeyondFirst > 0) distance += nAreasBeyondFirst * penaltiesConfig.areasBeyondFirstPenaltyMultiplier.withCommonTopics;
                }

                var node = {
                    children: undefined,
                    group: group,
                    distance: distance,
                    maxDistance: maxDistance,
                    duration: duration,
                    vector: vector,
                    commonTopicsVector: commonTopicsVector,
                    vectorArea: vectorArea,
                    preferencesVector: preferencesVector,
                    restrictionsVector: restrictionsVector,
                    authorsVector: authorsVector
                }
                generateNodesMap.set(newGroupHash, node);
                parent.children.push(node);

            }
        }
    }

    function search(consumerData, sessionDuration, gSessionId, papersAvailable, simultaneousAuthorsVector) {

        let openNodesHeap = consumerData.openNodesHeap;

        while (openNodesHeap.size() > 0) {
            var closest = openNodesHeap.pop();

            if (closest.children === undefined) {
                generateChildren(closest);
            }

            closest.children.forEach(child => {
                if (child.duration <= sessionDuration + 5 &&
                    containsAll(papersAvailable, child.group) &&
                    !hasSessionRestriction(child, gSessionId) &&
                    validAuthors(child.authorsVector, simultaneousAuthorsVector)) {
                    openNodesHeap.push(child);
                }
            })

            var sessionDurations = groupToSessionDurations(closest.duration);

            if (sessionDurations.includes(sessionDuration)) {
                return closest;
            }
        }

        return null;
    }

    function validAuthors(groupAuthors, simultaneousAuthors) {
        return innerProduct(groupAuthors, simultaneousAuthors) === 0;
    }

    function nextGroup(consumerKey, sessionDuration, gSessionId, papersAvailable, simultaneousAuthorsVector) {

        var consumerData;
        if (!consumerDataMap.has(consumerKey)) {

            var openNodesHeap = new Heap((a, b) =>
                a.distance - b.distance);

            startingNodes.forEach(n => {
                if (n.duration <= sessionDuration + 5 &&
                    containsAll(papersAvailable, n.group) &&
                    !hasSessionRestriction(n, gSessionId) &&
                    validAuthors(n.authorsVector, simultaneousAuthorsVector)) {
                    openNodesHeap.push(n);
                }
            })

            consumerData = {
                openNodesHeap: openNodesHeap,
            };
            consumerDataMap.set(consumerKey, consumerData);
        } else {
            consumerData = consumerDataMap.get(consumerKey);
        }

        return search(consumerData, sessionDuration, gSessionId, papersAvailable, simultaneousAuthorsVector);
    }

    return { nextGroup: nextGroup };
}

module.exports = iterativePaperGrouper;



