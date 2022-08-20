function evaluateMatches(gSessions, restrictions, preferences) {
    var qualityReport = {};

    qualityReport.evaluations = [];

    var anyInvalid = false;
    var totalRestrictions = 0;
    var totalPreferences = 0;
    

    gSessions.forEach(gSession => {
        gSession.groups.forEach(match => {
            var areaTotal = match.vectorArea.filter(el => el === 1).length;
            var topicTotal = match.topicVector.filter(el => el === 1).length;
            var commonTopicsTotal = match.commonTopicsVector.filter(el => el === 1).length;

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

            
            if (commonTopicsTotal == 0)
                penalties.push({ penalty: 1, description: `No topics in common.` })
                if (areaTotal > 1)
                    penalties.push({ penalty: 2*(areaTotal - 1), description: `No tipics in common and ${areaTotal} areas in group.` })
            if (commonTopicsTotal > 1)
                penalties.push({ penalty: (commonTopicsTotal - 1), description: `${commonTopicsTotal} common topics in group.` })
                if (areaTotal > 1)
                    penalties.push({ penalty: areaTotal - 1, description: `${areaTotal} areas in group.` })
            if (commonTopicsTotal == 1)
                if (areaTotal > 1)
                    penalties.push({ penalty: areaTotal - 1, description: `${areaTotal} areas in group.` })
            
            var durationDiff = gSession.duration - match.duration;
            var durationDiffNormalized = Math.abs(durationDiff) / gSession.duration;
            if (durationDiff > 0) {
                penalties.push({ penalty: durationDiffNormalized * 10, description: `Group duration short ${durationDiff} minutes.` })
            } else if (durationDiff < 0){
                penalties.push({ penalty: (1 / durationDiffNormalized) * 0.1, description: `Group duration exceeds session duration by ${-durationDiff} minutes.` })
            }
            
            var evaluation = {
                gSessionId: gSession.id,
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

            qualityReport.evaluations.push(evaluation);
        });

    });

    qualityReport.decision = anyInvalid ? "INVALID" : "VALID";
    qualityReport.totalRestrictions = totalRestrictions;
    qualityReport.totalPreferences = totalPreferences;

    const amountPapersWithPreferences = preferences
    .map(p => p.articleId)
        .filter((v, i, s) => s.indexOf(v) === i).length;
    
    qualityReport.unmetPreferences = amountPapersWithPreferences - totalPreferences;
    qualityReport.unmetPreferencesPenalty = qualityReport.unmetPreferences * 0.5;


    qualityReport.penaltyScore = qualityReport.evaluations.reduce((a, b) => { return a + b.penaltyScore }, 0)
        + qualityReport.unmetPreferencesPenalty;

    return qualityReport;
}

module.exports = evaluateMatches;