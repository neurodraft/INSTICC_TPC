const fs = require('fs');
let rawdata = fs.readFileSync('iceis2022.json');
const { restrictions, preferences} = JSON.parse(rawdata);

const evaluateMatches = require("./evaluateMatches.js");

let gSessions = JSON.parse(fs.readFileSync("result_1661033444110.json"));

var evaluation = evaluateMatches(gSessions, restrictions, preferences);

console.dir(evaluation);