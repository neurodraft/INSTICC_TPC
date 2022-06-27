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
                distanceMatrix[i][j] = manhattanDistance(papers[i].vectorArea, papers[j].vectorArea)
                    + manhattanDistance(papers[i].vector, papers[j].vector) * 0.5
                    + manhattanDistance(papers[i].restrictionsVector, papers[j].restrictionsVector) * 0.25
                    + manhattanDistance(papers[i].preferencesVector, papers[j].preferencesVector) * 0.25
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

    var startingNodes = [];

    var generateNodesMap = new Map();

    var consumerDataMap = new Map();

    var cLimit = 0;

    for (var row = 0; row < papers.length; row++) {
        for (var column = 0; column < cLimit; column++) {
            if (row == column) {
                continue;
            }

            var group = [papers[row], papers[column]];
            group.sort((a, b) => a.id - b.id);
            var groupHash = hash(group);

            var distance = distanceMatrix[row][column];

            var vector = orVectors(group[0].vector, group[1].vector);

            var vectorArea = orVectors(group[0].vectorArea, group[1].vectorArea);


            var restrictionsVector = orVectors(group[0].restrictionsVector, group[1].restrictionsVector);

            var preferencesVector = orVectors(group[0].preferencesVector, group[1].preferencesVector);

            var duration = group.map(p => p.duration).reduce((accumulator, curr) => accumulator + curr);

            var node = {
                children: undefined,
                group: group,
                distance: distance,
                duration: duration,
                vector: vector,
                vectorArea : vectorArea,
                restrictionsVector: restrictionsVector,
                preferencesVector: preferencesVector
            }

            generateNodesMap.set(groupHash, node);
            startingNodes.push(node);

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
        if ([40, 45, 50, 60].includes(groupDuration)) {
            sessionDurations.push(60);
        }
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


    function containsAll(superset, subset){
        return subset.every(e => superset.includes(e));
    }

    function generateChildren(parent){
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

                    var maxDistance = parent.distance;

                    for (var j = 0; j < parent.group.length; j++) {
                        var d = distanceMatrix[paperIndexMap.get(paper)][paperIndexMap.get(parent.group[j])];
                        if (d > maxDistance) maxDistance = d;
                    }

                    var vector = orVectors(parent.vector, paper.vector);
                    var vectorArea = orVectors(parent.vectorArea, paper.vectorArea);
                    var preferencesVector = orVectors(parent.preferencesVector, paper.preferencesVector);
                    var restrictionsVector = orVectors(parent.restrictionsVector, paper.restrictionsVector);
                    var duration = parent.duration + paper.duration;

                    var node = {
                        children: undefined,
                        group: group,
                        distance: maxDistance,
                        duration: duration,
                        vector: vector,
                        vectorArea: vectorArea,
                        preferencesVector: preferencesVector,
                        restrictionsVector: restrictionsVector
                    }
                    generateNodesMap.set(newGroupHash, node);
                    parent.children.push(node);

                }
            }
    }

    function search(consumerData, sessionDuration, gSessionId, papersAvailable) {

        let openNodesHeap = consumerData.openNodesHeap;

        while (openNodesHeap.size() > 0) {
            var closest = openNodesHeap.pop();
            
            if(closest.children === undefined){
                generateChildren(closest);
            }

            closest.children.forEach(child => {
                if(child.duration <= sessionDuration &&
                    containsAll(papersAvailable, child.group) &&
                    !hasSessionRestriction(child, gSessionId)){
                    openNodesHeap.push(child);
                }
            })

            var sessionDurations = groupToSessionDurations(closest.duration);

            if(sessionDurations.includes(sessionDuration)){
                return closest;
            }
        }

        return null;
    }

    function nextGroup(consumerKey, sessionDuration, gSessionId, papersAvailable) {

        var consumerData;
        if (!consumerDataMap.has(consumerKey)) {

            var openNodesHeap = new Heap((a, b) =>
            a.distance - b.distance);

            startingNodes.forEach(n => {
                if(n.duration <= sessionDuration &&
                    containsAll(papersAvailable, n.group) &&
                    !hasSessionRestriction(n, gSessionId)){
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

        return search(consumerData, sessionDuration, gSessionId, papersAvailable);
    }

    return { nextGroup: nextGroup };
}

module.exports = iterativePaperGrouper;



