const ResultStatus = {
    Successfull: "Solution found successfully.",
    TimeOut: "Set time limit exceeded.",
    NoSolution: "No solution found.",
    InvalidArguments: "Provided arguments are invalid, see error list."
}

class Result {
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
    constructor(state, parent) {
        this.state = state;
        this.parent = parent;
        this.tested = false;
    }

    recalculateF() {
        this.f = this.g + this.h;
        return this.f;
    }
}

module.exports = DFIS;

function DFIS(startState, isGoalState, nextSuccessor, maxSuccessorsPerIteration = 1,
    timeLimit = undefined,
    progressReport = { frequency: 1000, callback: (progress) => { console.dir(progress) } }) {

    var generatedNodes = 0;
    var expandedNodes = 0;
    var updatedOpenNodes = 0;
    var reoppenedClosedNodes = 0;
    var lastReport = 0;

    var startTime = Date.now();

    var errors = validateArgs(arguments);
    if (errors.length > 0) {
        return new Result(null, generatedNodes, expandedNodes, Date.now() - startTime, ResultStatus.InvalidArguments, errors);
    }

    var startNode = new Node(
        startState, undefined);

    // Stack as Priority Queue for depth first sorting in open set
    var openNodesStack = [];

    // Add starting node to open set
    openNodesStack.push(startNode);

    var result;

    var lastExpanded = null;

    while (openNodesStack.length > 0) {
        // get lowest f node
        var node = openNodesStack.pop();

        lastExpanded = node;

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
                result = new Result(reconstructPath(node), generatedNodes, expandedNodes, timeDuration, ResultStatus.Successfull);
                break;
            }

            node.tested = true;
        }

        // if time limit is defined and duration exceeds limit, quit.
        if (timeLimit !== undefined) {
            if (timeDuration > timeLimit) {
                result = new Result(null, generatedNodes, expandedNodes, timeDuration, ResultStatus.TimeOut);
                break;
            }
        }

        var fullyExpanded = false;

        var newSucessors = [];

        for (var i = 0; i < maxSuccessorsPerIteration; i++) {
            // generate node successor states
            var successor = nextSuccessor(node.state);

            // node fully expanded, dont reinsert in open and add to closed permanently.
            if (successor === null) {
                fullyExpanded = true;
                break;                
            }

            generatedNodes += 1;
            
            var successorNode = new Node(
                successor, node);

            newSucessors.push(successorNode);
        }

        // if not all successors generated
        if(!fullyExpanded){
           //reinsert expanding node in open stack before children
           openNodesStack.push(node);
        }

        //add new successors
        newSucessors.forEach(s => openNodesStack.push(s));
    }

    // No result found and no timeout reached, no solution could be found
    if (!result) {
        var timeDuration = Date.now() - startTime;
        result = new Result(null, generatedNodes, expandedNodes, timeDuration, ResultStatus.NoSolution);
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
    if (args[3] !== undefined &&
        !(Number.isInteger(args[3]))) {
        errors.push("maxSuccessorsPerIteration is optional but must be an integer if provided.")
    }
    if (args[4] !== undefined &&
        !(Number.isInteger(args[4]))) {
        errors.push("timeLimit is optional but must be an integer if provided.")
    }

    return errors;
}