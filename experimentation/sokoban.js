var aStar = require('./astar');

const moves = {
    up: {x: 0, y: -1},
    down: {x: 0, y: 1},
    left: {x: -1, y: 0},
    right: {x: 1, y: 0}
}

class SokobanState {
    constructor(board, playerPos, boxPos, goalPos){
        this.board = board;
        this.playerPos = playerPos;
        this.boxPos = boxPos;
        this.goalPos = goalPos;
    }
}

function isGoal(state){
    return samePosition(state.boxPos, state.goalPos);
}

function generateSuccessors(state){
    // printState(state);
    var sucessors = [];

    for(let [key, value] of Object.entries(moves)){
        var newState = applyMove(state, value);
        if(newState === null){
            continue;
        }
        sucessors.push(newState);
    }

    return sucessors
}

function applyMove(state, move){
    var newPlayerPos = addVector(state.playerPos, move);

    if(!isFloor(state.board, newPlayerPos)){
        return null;
    }

    if(samePosition(state.boxPos, newPlayerPos)){
        var newBoxPos = addVector(state.boxPos, move);

        if(!isFloor(state.board, newBoxPos)){
            return null;
        }
    }

    return new SokobanState(state.board, newPlayerPos,
        newBoxPos??state.boxPos, state.goalPos);

}

function isFloor(board, position){
    return board[position.y][position.x] == 0;
}

function addVector(a, b){
    return {
        x: a.x + b.x,
        y: a.y + b.y
    }
}

function samePosition(a, b){
    return a.x == b.x && a.y == b.y;
}

// const board = [
//     [1, 1, 1, 1, 1, 1],
//     [1, 0, 0, 0, 0, 1],
//     [1, 0, 0, 0, 1, 1],
//     [1, 0, 1, 0, 0, 1],
//     [1, 0, 1, 0, 0, 1],
//     [1, 0, 1, 0, 0, 1],
//     [1, 1, 1, 1, 1, 1]
// ]

const board = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 0, 0, 0, 1, 1],
    [1, 0, 1, 0, 0, 1, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 1, 1, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

const board2 = [
    [0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],    
    [0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],   
    [1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 0, 0, 0, 1],
    [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0]  
];

function printState(state){
    for(var y = 0; y < state.board.length; ++y){
        var line = ""
        for(var x = 0; x < state.board[y].length; ++x){
            var pos = {x: x, y: y};

            if(samePosition(pos, state.playerPos)){
                line += " P";
                continue;
            }
            if(samePosition(pos, state.boxPos)){
                line += " B";
                continue;
            }
            if(samePosition(pos, state.goalPos)){
                line += " @";
                continue;
            }
            if(isFloor(state.board, pos)){
                line += "  ";
                continue;
            }
            line += " X";
        }
        console.log(line);
    }
}

function uniformDistance(){
    return 1;
}

function heuristic(state){
    var box2goal = manhattanDistance(state.boxPos, state.goalPos)*2;
    var player2box = manhattanDistance(state.playerPos, state.boxPos);

    return box2goal + player2box;
}

function manhattanDistance(a, b){
    return  Math.abs(a.x - b.x) +
            Math.abs(a.y - b.y)
}

function printResult(result){
    if(result.path)
        for(var i = 0; i < result.path.length; i++){
            printState(result.path[i]);
            console.log("------ ------");
        }

    let {path, ...rest} = result;
    console.dir(rest);
}

var startState = new SokobanState(
    board2, {x: 11, y: 8},
    {x: 7, y: 3}, {x: 17, y: 6} 
)

// printState(startState);

// var sucessors = generateSuccessors(startState);

// sucessors.forEach(successor => printState(successor));


// var currentState = startState

// while(currentState !== null){
//     printState(currentState);
//     if(isGoal(currentState)){
//         console.log("IS GOAL.");
//         break;
//     }
//     currentState = applyMove(currentState, moves.right);
// }

var result = aStar(startState, isGoal,
    generateSuccessors, uniformDistance,
    heuristic);

printResult(result);
