const fs = require('fs');

let rawdata = fs.readFileSync('iceis2022.json');
const { sessions, papers, restrictions, preferences, topics, areas } = JSON.parse(rawdata);

var authors = [];

papers.forEach(paper => {
    authors = [...authors, ...paper.authors];
});

authors = authors.filter((v, i, a) => a.indexOf(v) === i).sort();

console.dir(authors);