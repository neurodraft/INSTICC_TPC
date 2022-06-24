function evaluateMatches(matches, restrictions, preferences){
    var qualityReport = {};

    qualityReport.evaluations = [];
    
    var anyInvalid = false;
    var totalRestrictions = 0;
    var totalPreferences = 0;

    matches.forEach(match => {
        var areaTotal = match.vectorArea.filter(el => el === 1).length;
        var topicTotal = match.topicVector.filter(el => el === 1).length;

        var gSessionId = match.session.gSessionId;

        var foundRestrictions = [];
        match.paperGroup.forEach(paper => {
            var found = restrictions.filter(r => r.articleId === paper.id &&
                r.sessionId === gSessionId);

            foundRestrictions.push(...found);
        });

        var foundPreferences = [];
        match.paperGroup.forEach(paper => {
            var found = preferences.filter(r => r.articleId === paper.id &&
                r.sessionId === gSessionId);

            foundPreferences.push(...found);
        });

        totalPreferences += foundPreferences.length;
        totalRestrictions += foundRestrictions.length;

        var decision = "VALID";

        if(foundRestrictions.length > 0){
            decision = "INVALID";
            anyInvalid = true;
        } else if(foundPreferences.length > 0){
            decision = `VALID with ${foundPreferences.length} preference(s)`;
        }

        var evaluation = {
            match: match,
            decision: decision,
            areaTotal: areaTotal,
            topicTotal: topicTotal,
            foundRestrictions: foundRestrictions,
            foundPreferences: foundPreferences,
        }

        qualityReport.evaluations.push(evaluation);
    });

    qualityReport.decision = anyInvalid ? "INVALID" : "VALID";

    qualityReport.totalRestrictions = totalRestrictions;
    qualityReport.totalPreferences = totalPreferences;

    return qualityReport;
}

module.exports = evaluateMatches;