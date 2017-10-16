"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var alasql = require("alasql");
var matching = require("../");
alasql("CREATE TABLE Sources (Id string, FirstName string, LastName number)");
alasql("CREATE TABLE Targets (Id string, FirstName string, LastName number)");
alasql("CREATE TABLE Matches  (SrcId string, TargetId string)");
alasql("INSERT INTO Sources SELECT * FROM ?", [[
        { Id: "aaaa", FirstName: "George", LastName: "Bush" },
        { Id: "bbbb", FirstName: "Barack", LastName: "Obama" },
        { Id: "cccc", FirstName: "Bill", LastName: "Clinton" },
        { Id: "eeee", FirstName: "Donald", LastName: "Trump" },
        { Id: "ffff", FirstName: "Ronald", LastName: "Reagan" }
    ]]);
alasql("INSERT INTO Targets SELECT * FROM ?", [[
        { Id: "vvvv", FirstName: "Bill", LastName: "Clinton" },
        { Id: "wwww", FirstName: "Barack", LastName: "Obama" },
        { Id: "xxxx", FirstName: "Ronald", LastName: "Reagan" },
        { Id: "yyyy", FirstName: "Donald", LastName: "Trump" },
        { Id: "zzzz", FirstName: "George", LastName: "Bush" }
    ]]);
var MatchDB = /** @class */ (function () {
    function MatchDB() {
    }
    MatchDB.prototype.getSourceObj = function (srcId) {
        return Promise.resolve(alasql("SELECT * FROM Sources WHERE Id=?", [srcId])[0]);
    };
    MatchDB.prototype.getTargetObj = function (targetId) {
        return Promise.resolve(alasql("SELECT * FROM Targets WHERE Id=?", [targetId])[0]);
    };
    MatchDB.prototype.getUnmatchedSources = function () {
        var ret = alasql("SELECT a.Id FROM Sources a LEFT JOIN Matches b ON a.Id=b.SrcId WHERE b.SrcId IS NULL");
        var Ids = [];
        for (var i in ret)
            Ids.push(ret[i]["Id"]);
        return Promise.resolve(Ids);
    };
    MatchDB.prototype.getUnmatchedTargets = function () {
        var ret = alasql("SELECT a.Id FROM Targets a LEFT JOIN Matches b ON a.Id=b.TargetId WHERE b.TargetId IS NULL");
        var Ids = [];
        for (var i in ret)
            Ids.push(ret[i]["Id"]);
        return Promise.resolve(Ids);
    };
    MatchDB.prototype.storeMatchingPair = function (pair) {
        alasql("INSERT INTO Matches VALUES (?, ?)", [pair.srcId, pair.targetId]);
        return Promise.resolve();
    };
    return MatchDB;
}());
var comparator = function (srcIObj, targetObj) {
    var matched = (srcIObj.FirstName === targetObj.FirstName && srcIObj.LastName === targetObj.LastName);
    return Promise.resolve(matched);
};
var m = matching.matcher(new MatchDB(), comparator);
m.on("matching", function (srcId, targetId) {
    console.log("matching " + srcId + " to " + targetId + "...");
}).on("matched", function (srcId, targetId) {
    console.log("<MATCHED>: " + srcId + " ===> " + targetId);
}).doMatching()
    .then(function (value) {
    console.log("");
    console.log("Done");
    console.log("matching result:\n" + JSON.stringify(value, null, 2));
    console.log("");
    console.log("matches in DB:\n" + JSON.stringify(alasql("SELECT * FROM Matches"), null, 2));
}).catch(function (err) {
    console.error("!!! Error: " + JSON.stringify(err));
});
//# sourceMappingURL=app.js.map