function addVectors(vector1, vector2) {
    var out = [];
    for (var i = 0; i < vector1.length; i++) {
        out[i] = vector1[i] + vector2[i];
    }
    return out;
}

function evaluateMatches(gSessions, restrictions, preferences) {
    var qualityReport = {};

    qualityReport.evaluations = [];

    var anyInvalid = false;
    var totalRestrictions = 0;
    var totalPreferences = 0;
    

    gSessions.forEach(gSession => {
        var evaluations = [];

        var areasTotalsVector = undefined;

        gSession.groups.forEach(match => {
            var areaTotal = match.vectorArea.filter(el => el === 1).length;
            var topicTotal = match.topicVector.filter(el => el === 1).length;
            var commonTopicsTotal = match.commonTopicsVector.filter(el => el === 1).length;

            if (areasTotalsVector == undefined) {
                areasTotalsVector = [...match.vectorArea];
            } else {
                areasTotalsVector = addVectors(areasTotalsVector, match.vectorArea);
            }

            var foundRestrictions = [];
            match.paperGroup.forEach(paper => {
                var found = restrictions.filter(r => r.articleId === paper.id &&
                    r.sessionId === gSession.id);

                foundRestrictions.push(...found);
            });

            var foundPreferences = [];
            match.paperGroup.forEach(paper => {
                var found = preferences.filter(r => r.articleId === paper.id &&
                    r.sessionId === gSession.id);
                
                foundPreferences.push(...found);
            });

            totalPreferences += foundPreferences.length;
            totalRestrictions += foundRestrictions.length;

            var decision = "VALID";

            if (foundRestrictions.length > 0) {
                decision = "INVALID";
                anyInvalid = true;
            } else if (foundPreferences.length > 0) {
                decision = `VALID with ${foundPreferences.length} preference(s)`;
            }

            var penalties = [];

            
            if (commonTopicsTotal == 0) {
                penalties.push({ penalty: 1, description: `No topics in common.` })
                if (areaTotal > 1)
                    penalties.push({ penalty: 8*(areaTotal - 1), description: `No topics in common and ${areaTotal} areas in group.` })
            } else if (commonTopicsTotal == 1) {
                if (areaTotal > 1)
                    penalties.push({ penalty: 2*(areaTotal - 1), description: `${areaTotal} areas in group.` })
            } else if (commonTopicsTotal > 1) {
                penalties.push({ penalty: (commonTopicsTotal - 1), description: `${commonTopicsTotal} common topics in group.` })
                if (areaTotal > 1)
                    penalties.push({ penalty: 2*(areaTotal - 1), description: `${areaTotal} areas in group.` })
            }
            
            var durationDiff = gSession.duration - match.duration;
            if (durationDiff > 0) {
                penalties.push({ penalty: (durationDiff / gSession.duration) * 40, description: `Group duration short ${durationDiff} minutes.` })
            } else if (durationDiff < 0){
                penalties.push({ penalty: (-durationDiff * gSession.duration) * 0.0125, description: `Group duration exceeds session duration by ${-durationDiff} minutes.` })
            }
            
            var evaluation = {
                group: match.paperGroup.map(p => p.id),
                decision: decision,
                areaTotal: areaTotal,
                topicTotal: topicTotal,
                commonTopicsTotal: commonTopicsTotal,
                foundRestrictions: foundRestrictions,
                foundPreferences: foundPreferences,
                leftoverTime: durationDiff,
                penalties: penalties,
                penaltyScore: penalties.reduce((a, b) => { return a  + b.penalty }, 0),
            }

            evaluations.push(evaluation);
        });

        var simultaneousAreasPenaltyScore = 0;

        areasTotalsVector.forEach(e => {
            if (e > 1) {
                simultaneousAreasPenaltyScore += e - 1;
            }
        })

        simultaneousAreasPenaltyScore *= 8;

        qualityReport.evaluations.push({
            gSessionId: gSession.id,
            evaluations: evaluations,
            simultaneousAreasPenaltyScore: simultaneousAreasPenaltyScore
        })

    });

    qualityReport.decision = anyInvalid ? "INVALID" : "VALID";
    qualityReport.totalRestrictions = totalRestrictions;
    qualityReport.totalPreferences = totalPreferences;

    const amountPapersWithPreferences = preferences
    .map(p => p.articleId)
        .filter((v, i, s) => s.indexOf(v) === i).length;
    
    qualityReport.unmetPreferences = amountPapersWithPreferences - totalPreferences;
    qualityReport.unmetPreferencesPenalty = qualityReport.unmetPreferences;


    qualityReport.penaltyScore = qualityReport.evaluations.reduce((a, b) => { return a + b.evaluations.reduce((a, b) => {return a + b.penaltyScore }, 0) + b.simultaneousAreasPenaltyScore }, 0)
        + qualityReport.unmetPreferencesPenalty;

    return qualityReport;
}

module.exports = evaluateMatches;