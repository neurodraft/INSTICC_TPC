const fs = require('fs');

let rawdata = fs.readFileSync('iceis2022.json');
const {sessions, papers, restrictions, preferences } = JSON.parse(rawdata);

var gSessions = sessions.map(s => s.gSessionId).filter((v, i, a) => a.indexOf(v) === i).sort();


const iterativePaperGrouping = require('./paper-grouping.js');

const iterativePaperGrouper = iterativePaperGrouping(papers, restrictions, preferences, gSessions);

var availablePapers = [...papers];

var node = iterativePaperGrouper.nextGroup("a", 120, 17482, availablePapers);

console.dir(node);


// var duration = 90;

// while(availablePapers.length > 0){
//     var node = iterativePaperGrouper.nextGroup("a", duration, availablePapers);

//     if(node === null){
//         console.log(`No more groups for duration ${duration}, remaining papers:`);
//         console.dir(availablePapers);
//         duration -= 15;
//         if(duration < 75){
//             console.log("quitting");
//             break;
//         }
//         console.log(`Lowering duration to ${duration}.`);
//         continue;
//     }

//     console.dir(node);
    
//     availablePapers = availablePapers.filter(p => !node.group.includes(p));
//     console.log(`${availablePapers.length} still available papers.`);

// }