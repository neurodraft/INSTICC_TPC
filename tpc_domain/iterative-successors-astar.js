const Heap = require('heap');
const hash = require('object-hash');

const ResultStatus = {
    Successfull: "Solution found successfully.",
    TimeOut: "Set time limit exceeded.",
    NoSolution: "No solution found.",
    InvalidArguments: "Provided arguments are invalid, see error list."
}

class AStarResult {
    constructor(path, totalGenerated, totalExpanded, timeDuration, status, errors = []) {
        this.path = path;
        if (path)
            this.pathLength = path.length;
        this.totalGenerated = totalGenerated;
        this.totalExpanded = totalExpanded;
        this.timeDuration = timeDuration;
        this.status = status;
        this.errors = errors;
    }
}

function reconstructPath(node) {
    if (node === undefined) {
        return [];
    }
    var path = reconstructPath(node.parent);
    path.push(node.state);

    return path;
}

class Node {
    constructor(state, parent, g, h) {
        this.state = state;
        this.parent = parent;
        this.g = g;
        this.h = h;
        this.f = g + h;
        this.tested = false;
    }

    recalculateF() {
        this.f = this.g + this.h;
        return this.f;
    }
}

module.exports = aStarIS;

function aStarIS(startState, isGoalState, nextSuccessor, distanceBetween, heuristic,
    timeLimit = undefined, stateAuxiliaryKeys = [],
    progressReport = { frequency: 1000, callback: (progress) => { console.dir(progress) } }) {

    var generatedNodes = 0;
    var expandedNodes = 0;
    var updatedOpenNodes = 0;
    var reoppenedClosedNodes = 0;
    var lastReport = 0;

    var startTime = Date.now();

    var errors = validateArgs(arguments);
    if (errors.length > 0) {
        return new AStarResult(null, generatedNodes, expandedNodes, Date.now() - startTime, ResultStatus.InvalidArguments, errors);
    }

    var hashOptions = {
        excludeKeys: function (key) {
            return stateAuxiliaryKeys.includes(key);
        }
    }

    var startNode = new Node(
        startState, undefined,
        0, heuristic(startState));

    // Map between unique state hashes and existing nodes in open set
    var openNodesMap = new Map();
    // MinHeap as Priority Queue for f sorting nodes in open set
    var openNodesHeap = new Heap((a, b) =>
        a.f - b.f);

    // Map between unique state hashes and existing nodes in closed set
    var closedNodesMap = new Map();

    // Add starting node to open set
    openNodesHeap.push(startNode);
    openNodesMap.set(hash(startNode.state, hashOptions), startNode);

    var result;

    var lastExpanded = null;

    while (!openNodesHeap.empty()) {
        // get lowest f node
        var node = openNodesHeap.pop();

        lastExpanded = node;


        // create unique hash of state
        var stateHash = hash(node.state, hashOptions);

        var timeDuration = Date.now() - startTime;

        // handle reporting if due
        var nextReport = Math.floor(timeDuration / progressReport.frequency);
        if (nextReport > lastReport) {
            progressReport.callback({
                elapsedTime: timeDuration,
                nodesGeneratedSoFar: generatedNodes,
                nodesFullyExpandedSoFar: expandedNodes,
                updatedOpenNodes: updatedOpenNodes,
                reoppenedClosedNodes: reoppenedClosedNodes,
                lastExpanded: lastExpanded
            });
            lastReport = nextReport;
        }

        // if node still wasn't tested and is goal state, reconstruct path and return
        // otherwise flag as tested to ignore in later expansions
        if (!node.tested) {
            if (isGoalState(node.state)) {
                result = new AStarResult(reconstructPath(node), generatedNodes, expandedNodes, timeDuration, ResultStatus.Successfull);
                break;
            }

            node.tested = true;
        }

        // if time limit is defined and duration exceeds limit, quit.
        if (timeLimit !== undefined) {
            if (timeDuration > timeLimit) {
                result = new AStarResult(null, generatedNodes, expandedNodes, timeDuration, ResultStatus.TimeOut);
                break;
            }
        }

        var fullyExpanded = false;

        for (var i = 0; i < 8; i++) {
            // generate node successor states
            var successor = nextSuccessor(node.state);

            // node fully expanded, dont reinsert in open and add to closed permanently.
            if (successor === null) {
                fullyExpanded = true;
                break;                
            }

            generatedNodes += 1;

            var successorHash = hash(successor, hashOptions);

            // get distance between parent state and successor state to calculate new g value
            var distance = distanceBetween(node.state, successor);
            var g = node.g + distance;

            // try and find existing node in open with same state
            var previouslyOpen = openNodesMap.get(successorHash);
            // if it exists and has lower g value, replace open's parent with sucessor's parent and recalculate f
            if (previouslyOpen !== undefined &&
                g < previouslyOpen.g) {
                previouslyOpen.g = g;
                previouslyOpen.recalculateF();
                previouslyOpen.parent = node;

                openNodesHeap.updateItem(previouslyOpen);

                updatedOpenNodes += 1;
                continue;
            }

            // try and find existing node in closed with same state
            var previouslyClosed = closedNodesMap.get(successorHash);
            // if it exists and has lower g value, remove from close, replace parent with sucessor's parent, recalculate f
            // and insert in open set
            if (previouslyClosed !== undefined &&
                g < previouslyClosed.g) {
                closedNodesMap.delete(successorHash);

                previouslyClosed.g = g;
                previouslyClosed.recalculateF();
                previouslyClosed.parent = node;

                openNodesHeap.push(previouslyClosed);
                openNodesMap.set(successorHash, previouslyClosed)

                reoppenedClosedNodes += 1;
                continue;
            }

            // if no nodes with same state found either in open or closed sets,
            // calculate heuristic and add successor node to open set
            if (previouslyOpen === undefined && previouslyClosed === undefined) {
                var successorNode = new Node(
                    successor, node,
                    g, heuristic(successor));

                openNodesHeap.push(successorNode);
                openNodesMap.set(successorHash, successorNode);
            }
        }

        if(fullyExpanded){
            // remove node from open map
            openNodesMap.delete(stateHash);
            // add current node to closed set
            closedNodesMap.set(stateHash, node);
            expandedNodes += 1;
        } else {
            //reinsert expanding node in open heap
            openNodesHeap.push(node);
        }

    }

    // No result found and no timeout reached, no solution could be found
    if (!result) {
        var timeDuration = Date.now() - startTime;
        result = new AStarResult(null, generatedNodes, expandedNodes, timeDuration, ResultStatus.NoSolution);
    }

    return result;
}


function validateArgs(args) {
    var errors = [];

    if (!(args[0] instanceof Object)) {
        errors.push("startState must be provided and must be an Object.")
    }
    if (!(args[1] instanceof Function)) {
        errors.push("isGoalState must be provided and must be a Function.")
    }
    if (!(args[2] instanceof Function)) {
        errors.push("nextSuccessor must be provided and must be a Function.")
    }
    if (!(args[3] instanceof Function)) {
        errors.push("distanceBetween must be provided and must be a Function.")
    }
    if (!(args[4] instanceof Function)) {
        errors.push("heuristic must be provided and must be a Function.")
    }
    if (args[5] !== undefined &&
        !(Number.isInteger(args.timeLimit))) {
        errors.push("timeLimit is optional but must be an integer if provided.")
    }
    if (args[6] !== undefined &&
        !(args.stateAuxiliaryKeys instanceof Array) &&
        args.stateAuxiliaryKeys.every(k => k instanceof String)) {
        errors.push("stateAuxiliaryKeys is optional but must be an array of strings if provided.")
    }

    return errors;
}