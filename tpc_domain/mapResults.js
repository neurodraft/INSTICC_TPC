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

function topicVectorToTopics(topicVector, topics) {
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

function commonTopicsToTitle(topicVector, topics) {
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

function areaVectorToTitle(areaVector, areas) {
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

function authorsVectorToAuthors(authorsVector, authors) {
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

function areaVectorToAreas(vectorArea, areas) {
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

function mapResults(result, rawdata) {
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
                    ? commonTopicsToTitle(g.commonTopicsVector, topics)
                    : areaVectorToTitle(g.vectorArea, areas),
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
                Areas: areaVectorToAreas(g.vectorArea, areas),
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
                        Areas: areaVectorToAreas(p.vectorArea, areas),
                        Topics: topicVectorToTopics(p.vector, topics),
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

    return simplified;
}

module.exports = mapResults;