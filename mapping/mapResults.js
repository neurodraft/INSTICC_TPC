const fs = require("fs");

//const fileName = "../data/sample_output/TP-ICEIS2022.json";

//const final = JSON.parse(fs.readFileSync(fileName));

const result = JSON.parse(fs.readFileSync("../results/result_1659407417589.json"));

let rawdata = fs.readFileSync('../data/input/iceis2022.json');
const { sessions, papers, areas, topics } = JSON.parse(rawdata);

var authors = [];
papers.forEach(paper => {
    authors = [...authors, ...paper.authors];
});
authors = authors.filter((v, i, a) => a.indexOf(v) === i).sort();

let conStart = undefined;
let conEnd = undefined

sessions.forEach(s => {
    s.start = parseDate(s.start);
    s.end = addMinutes(s.duration, new Date(s.start));

    if (conStart == undefined) {
        conStart = s.start;
    } else if (s.start < conStart) {
        conStart = s.start
    }

    if (conEnd == undefined) {
        conEnd = s.end;
    } else if (s.end > conEnd) {
        conEnd = s.end
    }
})

function parseDate(dateString) {
    var epoch_time = parseInt(dateString.substr(6, 13));
    // var timezoneHours = parseInt(dateString.substr(20, 2));
    // var timezoneMinutes = parseInt(dateString.substr(22, 2));

    var date = new Date(epoch_time);
    // date.setMinutes(date.getMinutes() + (timezoneHours * 60 + timezoneMinutes));

    return date;
}

function addMinutes(numOfMinutes, date = new Date()) {
    date.setMinutes(date.getMinutes() + numOfMinutes);
  
    return date;
  }

// let simplified = {
//     Id: "",
//     Name: "",
//     Start: conStart,
//     End: conEnd,
//     Location: "",
//     URL: "",
//     Email: "",
//     Sessions: final.Sessions
//         .map((s) => {
//             return {
//                 Id: s.Id,
//                 Identifier: s.Identifier,
//                 Name: s.Name,
//                 Type: {
//                     Id: "",
//                     Name: "",
//                     Color: "#589A58",
//                     ShowDuration: true,
//                     SinglePresentation: false
//                 },
//                 Room: null,
//                 Start: s.Start,
//                 End: s.End,
//                 Areas: [],
//                 ParticipantGroups: [],
//                 Presentations: s.Presentations.map((p) => {
//                     return {
//                         Id: p.Id,
//                         Identifier: p.Identifier,
//                         Title: p.Title,
//                         Abstract: p.Abstract,
//                         Keywords: p.Keywords,
//                         DOI: p.DOI,
//                         Duration: p.Duration,
//                         Type: p.Type,
//                         Speakers: p.Speakers,
//                         Authors: p.Authors.map((a) => {
//                             return {
//                                 Id: a.Id,
//                                 Name: a.Name,
//                                 Biography: a.Biography,
//                                 PhotoURL: a.PhotoURL,
//                                 Affiliations: a.Affiliations,
//                                 Country: a.Country,
//                                 Gender: a.Gender,
//                                 Order: a.Order,
//                                 RegistrationNumber: a.RegistrationNumber,
//                                 Contacts: a.Contacts,
//                                 TotalAffiliations: a.TotalAffiliations
//                             };
//                         }),
//                         Areas: p.Areas.map((a) => {
//                             return {
//                                 Id: a.Id,
//                                 Name: a.Name,
//                                 Topics: []
//                             };
//                         }),
//                         Topics: p.Topics.map((a) => {
//                             return {
//                                 Id: a.Id,
//                                 Name: a.Name,
//                             };
//                         }),
//                         SessionID: "",
//                         PaperURL: "",
//                         PresentationURL: "",
//                         IsInvited: false,
//                         ParticipantMode: null
//                     };
//                 }),
//             };
//         })
//     ,
//     Zones: [],
//     MapURL: "",
//     Organizingcomittee: [],
//     InternetRooms: [],
//     Venue: final.Venue,
//     flag: true,
//     OnlineStreaming: true
// };

// function printState(state) {

//     let { gSessions, remainingPapers, ...rest } = state;

//     console.log("G-Sessions:")
//     gSessions.forEach(s => {
//         console.log("-------------------")
//         console.log(`G-SESSION ${s.id} | ${s.duration} min`);
//         console.log("article groups:");
//         s.groups.forEach((g, i, a) => {
//             console.log(` - ${i +1}:`)
//             console.dir({
//                 papersIds: g.paperGroup.map(p => p.id),
//                 areas: areaVectorToTitles(g.vectorArea),
//                 topics: topicVectorToTitles(g.topicVector),
//                 commonTopics: topicVectorToTitles(g.commonTopicsVector),
//                 //authors: authorsVectorToNames(g.authorsVector),
//                 duration: g.duration,
//                 distance: g.distance,
//             })
//         });
//         return;
//     })

//     console.log("Remaining Papers:")
//     console.dir(remainingPapers.map(p => p.id));

//     // console.log("More:")
//     // console.dir(rest);
// }

function topicVectorToTopics(topicVector) {
    var list = [];
    for (var i = 0; i < topics.length; i++) {
        if (topicVector[i] === 1) {
            list.push(
                {
                    Id: topics[i].id,
                    Name: topics[i].name
                });
        }
    }
    return list;
}

function commonTopicsToTitle(topicVector) {
    var string = "";
    for (var i = 0; i < topics.length; i++) {
        if (topicVector[i] === 1) {
            if (string != "")
                string += ", ";
            string += topics[i].name
        }
    }
    return string;
}

function areaVectorToTitle(areaVector) {
    var string = "";
    for (var i = 0; i < areas.length; i++) {
        if (areaVector[i] === 1) {
            if (string != "")
                string += ", ";
            string += areas[i].name
        }
    }
    return string;
}

function authorsVectorToAuthors(authorsVector) {
    var names = [];
    for (var i = 0; i < authorsVector.length; i++) {
        if (authorsVector[i] === 1) {
            names.push({
                Id: authors[i].Id,
                Name: "",
                Biography: a.Biography,
                PhotoURL: a.PhotoURL,
                Affiliations: a.Affiliations,
                Country: a.Country,
                Gender: a.Gender,
                Order: a.Order,
                RegistrationNumber: a.RegistrationNumber,
                Contacts: a.Contacts,
                TotalAffiliations: a.TotalAffiliations
            });
        }
    }
    return names;
}

function areaVectorToAreas(vectorArea) {
    var list = [];
    for (var i = 0; i < areas.length; i++) {
        if (vectorArea[i] === 1) {
            list.push({
                Id: areas[i].id,
                Name: areas[i].name,
                Topics: []
            });
        }
    }
    return list;
}

var simplified = {
    Id: "",
    Name: "",
    Start: conStart,
    End: conEnd,
    Location: "",
    URL: "",
    Email: "",
    Sessions: [],
    Zones: [],
    MapURL: "",
    Organizingcomittee: [],
    InternetRooms: [],
    Venue: {
        Events: []
    },
    flag: true,
    OnlineStreaming: true
}

let id = 0; 
    
result.forEach(gSession => {
    var session_data = sessions.find(s => s.gSessionId == gSession.id);
    gSession.groups.forEach(g => {
        id += 1;
        simplified.Sessions.push({
            Id: id.toString(),
            Identifier: id.toString(),
            Name: g.commonTopicsVector.some(v => v == 1)
                ? commonTopicsToTitle(g.commonTopicsVector)
                : areaVectorToTitle(g.vectorArea),
            Type: {
                Id: "",
                Name: "",
                Color: "#589A58",
                ShowDuration: true,
                SinglePresentation: false
            },
            Room: null,
            Start: session_data.start,
            End: session_data.end,
            Areas: areaVectorToAreas(g.vectorArea),
            ParticipantGroups: [],
            Presentations: g.paperGroup.map((p, i) => {
                return {
                    Id: p.id,
                    Identifier: `${id}-${i}`,
                    Title: p.title,
                    Abstract: "",
                    Keywords: "",
                    DOI: "",
                    Duration: p.duration,
                    "Type": {
                        "Acronym": "S",
                        "Name": "Short Paper",
                        "Color": "DarkSeaGreen"
                    },
                    Speakers: [],
                    Authors: p.authors.map((a) => {
                        return {
                            Id: "",
                            Name: a,
                            Biography: "",
                            PhotoURL: "",
                            Affiliations: [{
                                "Name": "Polytechnic Institute of Setubal / INSTICC",
                                "Country": {
                                    "Id": "PT",
                                    "Name": "Portugal"
                                }
                            }],
                            "Country": {
                                "Id": "PT",
                                "Name": "Portugal"
                            },
                            Gender: "1",
                            Order: 0,
                            RegistrationNumber: 0,
                            Contacts: [],
                            TotalAffiliations: 1
                        };
                    }),
                    Areas: areaVectorToAreas(p.vectorArea),
                    Topics: topicVectorToTopics(p.vector),
                    SessionID: "",
                    PaperURL: "",
                    PresentationURL: "",
                    IsInvited: false,
                    ParticipantMode: null
                };
            }),
        });
    })
})

const data = JSON.stringify(simplified);

fs.writeFile(`../data/generated_output/simplified.json`, data, (err) => {
    if (err) {
        throw err;
    }
    console.log("JSON data is saved.");
});
