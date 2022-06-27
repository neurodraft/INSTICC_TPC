var aStar = require('./astar');
const hash = require('object-hash');


const moves = {
    up: {x: 0, y: -1},
    down: {x: 0, y: 1},
    left: {x: -1, y: 0},
    right: {x: 1, y: 0}
}

class SokobanState {
    constructor(board, playerPos, boxes, goals){
        this.board = board;
        this.playerPos = playerPos;
        this.boxes = boxes;
        this.goals = goals;
    }
}

function isGoal(state){
    for(var i = 0; i < state.goals.length; i++){
        var goal = state.goals[i];

        if(boxAt(goal, state) == null)
            return false
    }

    return true;
}

function generateSuccessors(state){
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

function boxAt(position, state){
    for (let i = 0; i < state.boxes.length; i++) {
        var box = state.boxes[i];
        if(samePosition(box, position)) return box;
    }

    return null;
}

function goalAt(position, state){
    for (let i = 0; i < state.goals.length; i++) {
        var goal = state.goals[i];
        if(samePosition(goal, position)) return goal;
    }

    return null;
}

function moveBoxes(state, boxPos, move){

    var box = boxAt(boxPos, state);

    if(box !== null){
        var newBoxPos = addVectors(boxPos, move);
        state = moveBoxes(state, newBoxPos, move);

        if(state !== null){
            box.x = newBoxPos.x;
            box.y = newBoxPos.y;
        }

        return state
    }else if(isFloor(state.board, boxPos)){
        return state;
    }

    return null;
    
}

function applyMove(state, move){
    var newPlayerPos = addVectors(state.playerPos, move);

    if(!isFloor(state.board, newPlayerPos)){
        return null;
    }

    var newState = new SokobanState(state.board, newPlayerPos,
        structuredClone(state.boxes), state.goals);

    newState = moveBoxes(newState, newPlayerPos, move);

    return newState;
}

function isFloor(board, position){
    return board[position.y][position.x] == 0;
}

function addVectors(a, b){
    return {
        x: a.x + b.x,
        y: a.y + b.y
    }
}

function samePosition(a, b){
    return a.x == b.x && a.y == b.y;
}

function printState(state){
    for(var y = 0; y < state.board.length; ++y){
        var line = ""
        for(var x = 0; x < state.board[y].length; ++x){
            var pos = {x: x, y: y};

            if(samePosition(pos, state.playerPos)){
                line += " P";
                continue;
            }
            var box = boxAt(pos, state);
            if(box !== null){
                line += " B";
                continue;
            }
            var goal = goalAt(pos, state);
            if(goal !== null){
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

function isBoxStuck(box, state){

    var directions = [moves.up, moves.right, moves.down, moves.left];

    var touchingSides = [];

    for(var i = 0; i < directions.length; i++){
        var direction = directions[i];
        if(!isFloor(state.board, addVectors(box, direction))){
            touchingSides.push(i);
        }
    }

    if(touchingSides.length > 2){
        return true;
    } else if (touchingSides.length == 2){
        var corner = ((touchingSides[0] + touchingSides[1]) % 2) == 1;
        if(corner) return true;
    }

    return false;
    
}

function dumbHeuristic(state){
    printState(state);

    var value = 0;

    for(var i = 0; i < state.boxes.length; i++) {
        var box = state.boxes[i];

        if(!goalAt(box, state)){
            if(isBoxStuck(box, state)){
                console.log(`Box stuck at x: ${box.x}, y: ${box.y}`);
                return Number.POSITIVE_INFINITY;
            }

            var closestGoalDistance = undefined;
            state.goals.forEach(goal => {
                if(!boxAt(goal, state)){
                    var currDistance = manhattanDistance(box, goal);
                    if(closestGoalDistance === undefined || currDistance < closestGoalDistance){
                        closestGoalDistance = currDistance;
                    }  
                }
            }); 
            
            value += closestGoalDistance;
        }
    }

    return value;
}

function heuristic(state){
    // printState(state);

    var value = 0;

    var closestBox = null;
    var closestBoxDistance = undefined;

    var remainingBoxes = [];

    for(var i = 0; i < state.boxes.length; i++) {
        var box = state.boxes[i];

        if(!goalAt(box, state)){

            if(isBoxStuck(box, state)){
                // console.log(`Box stuck at ${box}`);
                return Number.POSITIVE_INFINITY;
            }

            remainingBoxes.push(box);
            var currDistance = manhattanDistance(state.playerPos, box) -1;

            if(closestBoxDistance === undefined || currDistance < closestBoxDistance){
                closestBox = box;
                closestBoxDistance = currDistance;
            }   
        }
    }

    if(remainingBoxes.length == 0)
        return 0;

    // console.log(`${remainingBoxes.length} remaining Boxes`);
    // console.log(`Closest (${closestBoxDistance}) box: ${closestBox}`);
    value += closestBoxDistance;

    var remainingGoals = [];
    var totalX = 0;
    var totalY = 0;
    
    state.goals.forEach(goal => {
        if(!boxAt(goal, state)){
            remainingGoals.push(goal);
            totalX += goal.x;
            totalY += goal.y;
        }
    })

    // console.log(`${remainingGoals.length} remaining goals`);

    var averageGoalPos = {
        x: Math.floor(totalX / remainingGoals.length),
        y: Math.floor(totalY / remainingGoals.length)
    };

    // console.log(`Average remaining goal pos: ${averageGoalPos}`);

    remainingBoxes.forEach(box => {
        if(box != closestBox){
            value += manhattanDistance(box, averageGoalPos);
        }
    })

    remainingBoxes.forEach(box => {
            var closestGoalDistance = undefined;
            remainingGoals.forEach(goal => {
                    var currDistance = manhattanDistance(box, goal);
                    if(closestGoalDistance === undefined || currDistance < closestGoalDistance){
                        closestGoalDistance = currDistance;
                    }  
            }); 
            
            value += closestGoalDistance;
        
    })

    // console.log(`Heuristic value: ${value}`);
    
    return value;
}

function manhattanDistance(a, b){
    return  Math.abs(a.x - b.x) +
            Math.abs(a.y - b.y)
}

function printSolution(node){
    if(node.parent !== undefined){
        printSolution(node.parent);
        console.log("----");
    }
    printState(node.state);
}


const readlinePromises = require('node:readline/promises');

async function playGame(){

    var startState = new SokobanState(
        board2, {x: 11, y: 8},
        board2_boxes, board2_goals
    )

    const rl = readlinePromises.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    var currentState = startState;
    while(true){
        printState(currentState);

        if(isGoal(currentState)){
            console.log("YOU WIN!");
            break;
        }

        var move;

        while(true){
            var answer = await rl.question("Choose direction [up, down, left, right] ");
            //console.log(answer);
            move = moves[answer];
            //console.dir(move);
            if(move !== undefined){
                break;
            }
            console.log("Invalid command...");
        }
        
        var newState = applyMove(currentState, move);

        //console.dir(newState);
        if(newState === null){
            console.log("Invalid move...");
            continue
        }

        currentState = newState;
    }

    rl.close();
}

const lvl1_board = [
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

const lvl1_boxes = [
    {x: 5, y: 2},
    {x: 5, y: 4},
    {x: 7, y: 3},
    {x: 7, y: 4},
    {x: 5, y: 7},
    {x: 2, y: 7},
];

const lvl1_goals = [
    {x: 16, y: 8},
    {x: 16, y: 6},
    {x: 16, y: 7},
    {x: 17, y: 7},
    {x: 17, y: 6},
    {x: 17, y: 8},
]

const lvl1_player = {x: 11, y: 8};

const lvl2_board = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1],
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1],
    [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 1],
    [1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 1],
    [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
    [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],

]

const lvl2_boxes = [
    {x: 4, y: 7},
    {x: 6, y: 3},
    {x: 7, y: 2},
    {x: 7, y: 7},
    {x: 9, y: 6},
    {x: 9, y: 7},
    {x: 10, y: 2},
    {x: 10, y: 5},
    {x: 11, y: 6},
    {x: 11, y: 7},
]

const lvl2_goals = [
    {x:1, y:1},
    {x:1, y:2},
    {x:1, y:3},
    {x:1, y:4},
    {x:1, y:5},
    {x:2, y:1},
    {x:2, y:2},
    {x:2, y:3},
    {x:2, y:4},
    {x:2, y:5},
]

const lvl2_player = {x: 7, y: 4};

const lvl90_board = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1],
    [1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 1],
    [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 1, 1],
    [1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 1],
    [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
    [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1],
    [1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1],
    [1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

const lvl90_boxes = [
    {x: 2, y: 2},
    {x: 2, y: 3},
    {x: 2, y: 7},
    {x: 2, y: 12},
    {x: 3, y: 14},
    {x: 5, y: 2},
    {x: 5, y: 4},
    {x: 5, y: 8},
    {x: 6, y: 13},
    {x: 7, y: 7},
    {x: 7, y: 14},
    {x: 8, y: 6},
    {x: 8, y: 8},
    {x: 9, y: 2},
    {x: 10, y: 2},
    {x: 10, y: 4},
    {x: 11, y: 4},
    {x: 11, y: 8},
    {x: 11, y: 12},
    {x: 11, y: 14},
    {x: 13, y: 2},
    {x: 13, y: 5},
    {x: 15, y: 4},
    {x: 17, y: 2},
    {x: 17, y: 7}
];

const lvl90_goals = [
    {x: 1, y: 1},
    {x: 1, y: 2},
    {x: 1, y: 3},
    {x: 2, y: 1},
    {x: 2, y: 14},
    {x: 3, y: 14},
    {x: 4, y: 14},
    {x: 5, y: 13},
    {x: 5, y: 14},
    {x: 6, y: 13},
    {x: 6, y: 14},
    {x: 7, y: 14},
    {x: 12, y: 7},
    {x: 14, y: 14},
    {x: 15, y: 14},
    {x: 16, y: 11},
    {x: 16, y: 12},
    {x: 16, y: 13},
    {x: 16, y: 14},
    {x: 17, y: 12},
    {x: 17, y: 14},
    {x: 18, y: 11},
    {x: 18, y: 12},
    {x: 18, y: 13},
    {x: 18, y: 14}
];

const lvl90_player = {x: 13, y: 6};

//playGame();

// var startState = new SokobanState(
//     board2, {x: 11, y: 8},
//     board2_boxes, board2_goals
// );

var startState = new SokobanState(
    lvl1_board, lvl1_player,
    lvl1_boxes, lvl1_goals
);

var result = aStar(startState, isGoal,
    generateSuccessors, (a, b) => {if(hash(a.boxes) !== hash(b.boxes)) return 0.5; else return 0.1},
    heuristic);
    
// var result = aStar(startState, isGoal,
//     generateSuccessors, (a, b) => {return 0;},
//     dumbHeuristic, 6000);

printResult(result);

function printResult(result){
    if(result.path instanceof Object){
        for(var i = 0; i < result.path.length; i++){
            printState(result.path[i]);
            console.log("-------- --------")
        }
    }

    let {path, ...rest} = result;
    console.dir(rest);
}
//printSolution(solution);