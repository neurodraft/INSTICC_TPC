const hash = require('object-hash');
const Heap = require('heap');

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

function calculateDistanceMatrix(papers) {
    var distanceMatrix = Array.from(Array(papers.length), () => new Array(papers.length));

    var paperIndexMap = new Map();

    for (var i = 0; i < papers.length; i++) {
        paperIndexMap.set(papers[i], i);
        for (var j = 0; j < papers.length; j++) {
            if (distanceMatrix[j][i] !== undefined) {
                distanceMatrix[i][j] = distanceMatrix[j][i];
            } else {
                distanceMatrix[i][j] = manhattanDistance(papers[i].vector, papers[j].vector) * 0.5
                + manhattanDistance(papers[i].vectorArea, papers[j].vectorArea)
                    //+ manhattanDistance(papers[i].restrictionsVector, papers[j].restrictionsVector)
                    //+ manhattanDistance(papers[i].preferencesVector, papers[j].preferencesVector)
                    ;
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
        //papers[i].preferences = [];
        var vector = new Array(gSessions.length).fill(0);
        for(var j = 0; j < gSessions.length; j++){
            var sessionId = gSessions[j];
            if(preferences.some(r => r.sessionId === sessionId &&
                r.articleId === papers[i].id)) {
                    vector[j] = 1;
                    //papers[i].preferences.push(sessionId);
                }
        }
        papers[i].preferencesVector = vector;
    }
}

function iterativePaperGrouper(papers, restrictions, preferences, gSessions) {
    addRestrictionsVectors(papers, restrictions, gSessions);
    addPreferencesVectors(papers, preferences, gSessions);

    var { distanceMatrix, paperIndexMap } = calculateDistanceMatrix(papers);

    var openNodesHeap = new Heap((a, b) =>
        a.distance - b.distance);
    var openNodesMap = new Map();

    var closedNodesMap = new Map();

    var durationNodeMap = new Map();

    var consumerIndicesMap = new Map();

    var cLimit = 0;

    for (var row = 0; row < papers.length; row++) {
        for (var column = 0; column < cLimit; column++) {
            if (row == column) {
                continue;
            }

            var group = [papers[row], papers[column]];
            group.sort((a, b) => a.id - b.id);
            var groupHash = hash(group);

            if (openNodesMap.has(groupHash)) {
                console.log("Node already exists.");
                console.log();
                continue;
            }

            var distance = distanceMatrix[row][column];

            var vector = orVectors(group[0].vector, group[1].vector);

            var vectorArea = orVectors(group[0].vectorArea, group[1].vectorArea);


            var restrictionsVector = orVectors(group[0].restrictionsVector, group[1].restrictionsVector);

            var preferencesVector = orVectors(group[0].preferencesVector, group[1].preferencesVector);

            var duration = group.map(p => p.duration).reduce((accumulator, curr) => accumulator + curr);

            var node = {
                children: [],
                group: group,
                distance: distance,
                duration: duration,
                vector: vector,
                vectorArea : vectorArea,
                restrictionsVector: restrictionsVector,
                preferencesVector: preferencesVector
            }

            openNodesMap.set(groupHash, node);
            openNodesHeap.push(node);

            console.log("Inserted new node:")
            printNode(node);
            console.log();
        }
        cLimit += 1;
    }

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

    function hasSessionRestriction(node, gSessionId){
        for(var i = 0; i < gSessions.length; i++){
            if(gSessions[i] === gSessionId){
                return node.restrictionsVector[i] == 1;
            }
        }
        return false;
    }

    function groupToSessionDurations(groupDuration) {
        var sessionDurations = [];
        if ([60, 65, 70, 75].includes(groupDuration)) {
            sessionDurations.push(75);
        }
        if ([80, 85, 90, 75].includes(groupDuration)) {
            sessionDurations.push(90);
        }
        if ([100, 105, 90, 95].includes(groupDuration)) {
            sessionDurations.push(105);
        }
        if ([120, 105, 110, 115].includes(groupDuration)) {
            sessionDurations.push(120);
        }
        return sessionDurations;
    }

    function _nextGroup(consumerIndices, duration, gSessionId, papersAvailable) {
        var index;

        if (consumerIndices[duration.toString()] === undefined) {
            consumerIndices[duration.toString()] = 0;
        }

        index = consumerIndices[duration.toString()];

        if (durationNodeMap.has(duration)) {
            var nodeList = durationNodeMap.get(duration);

            if (nodeList.length > index) {
                var node = nodeList[index];
                consumerIndices[duration.toString()] += 1;

                if(hasSessionRestriction(node, gSessionId) ||
                !containsAll(papersAvailable, node.group)) {
                    return _nextGroup(consumerIndices, duration, gSessionId, papersAvailable);
                }

                return node;
            }
        }

        if (search(duration, gSessionId, papersAvailable)) {
            return _nextGroup(consumerIndices, duration, gSessionId, papersAvailable);
        }

        return null;
    }

    function containsAll(superset, subset){
        return subset.every(e => superset.includes(e));
    }

    function search(sessionDuration, gSessionId, papersAvailable) {
        var reinsertInOpen = [];

        while (openNodesMap.size - reinsertInOpen.length > 0) {
            var closest = openNodesHeap.pop();

            if(closest.duration > sessionDuration ||
                !containsAll(papersAvailable, closest.group) ||
                hasSessionRestriction(closest, gSessionId)){
                reinsertInOpen.push(closest);
                continue;
            }

            var groupHash = hash(closest.group);
            openNodesMap.delete(groupHash);

            closedNodesMap.set(groupHash, closest);

            var duration = closest.duration;

            if (duration < 120) {
                for (var i = 0; i < papers.length; i++) {
                    var paper = papers[i];
                    if (closest.group.includes(paper)) {
                        continue;
                    }

                    var group = [...closest.group, paper];

                    group.sort((a, b) => a.id - b.id);
                    var newGroupHash = hash(group);

                    var inOpen = openNodesMap.get(newGroupHash);

                    if (inOpen) {
                        // console.log("Already in open: ");
                        // printNode(inOpen);
                        // console.log();
                        closest.children.push(inOpen);
                        continue;
                    }

                    var inClosed = closedNodesMap.get(newGroupHash);

                    if (inClosed) {
                        // console.log("Already in closed: ");
                        // printNode(inClosed);
                        // console.log();
                        closest.children.push(inClosed);
                        continue;
                    }

                    var maxDistance = closest.distance;

                    for (var j = 0; j < closest.group.length; j++) {
                        var d = distanceMatrix[paperIndexMap.get(paper)][paperIndexMap.get(closest.group[j])];
                        if (d > maxDistance) maxDistance = d;
                    }

                    var vector = orVectors(closest.vector, paper.vector);
                    var vectorArea = orVectors(closest.vectorArea, paper.vectorArea);
                    var preferencesVector = orVectors(closest.preferencesVector, paper.preferencesVector);
                    var restrictionsVector = orVectors(closest.restrictionsVector, paper.restrictionsVector);
                    var duration = closest.duration + paper.duration;

                    var node = {
                        children: [],
                        group: group,
                        distance: maxDistance,
                        duration: duration,
                        vector: vector,
                        vectorArea: vectorArea,
                        preferencesVector: preferencesVector,
                        restrictionsVector: restrictionsVector
                    }

                    // console.log("New node:");
                    // printNode(node);
                    // console.log();

                    openNodesMap.set(newGroupHash, node);
                    openNodesHeap.push(node);

                }
            }

            var sessionDurations = saveNode(closest);

            if (sessionDurations.includes(sessionDuration)) {
                reinsertInOpen.forEach(node => openNodesHeap.push(node));
                return true;
            }

        }

        reinsertInOpen.forEach(node => openNodesHeap.push(node));
        return false;
    }

    function nextGroup(consumerKey, sessionDuration, gSessionId, papersAvailable) {

        var key = hash([consumerKey, gSessionId]);

        var consumerIndices;
        if (!consumerIndicesMap.has(key)) {
            consumerIndices = {};
            consumerIndices = consumerIndicesMap.set(key, consumerIndices);
        } else {
            consumerIndices = consumerIndicesMap.get(key);
        }

        return _nextGroup(consumerIndices, sessionDuration, gSessionId, papersAvailable);
    }

    return { nextGroup: nextGroup };
}

module.exports = iterativePaperGrouper;



