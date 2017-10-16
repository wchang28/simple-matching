import alasql = require("alasql");
import * as matching from "../";

interface Item {
    Id: string
    FirstName: string;
    LastName: string;
}

type SourceId = string;
type TargetId = string;

alasql("CREATE TABLE Sources (Id string, FirstName string, LastName number)");
alasql("CREATE TABLE Targets (Id string, FirstName string, LastName number)");
alasql("CREATE TABLE Matches  (SrcId string, TargetId string)");

alasql("INSERT INTO Sources SELECT * FROM ?", [[
    {Id: "aaaa", FirstName: "George", LastName: "Bush"}
    ,{Id: "bbbb", FirstName: "Barack", LastName: "Obama"}
    ,{Id: "cccc", FirstName: "Bill", LastName: "Clinton"}
    ,{Id: "eeee", FirstName: "Donald", LastName: "Trump"}
    ,{Id: "ffff", FirstName: "Ronald", LastName: "Reagan"}
]]);

alasql("INSERT INTO Targets SELECT * FROM ?", [[
    {Id: "vvvv", FirstName: "Bill", LastName: "Clinton"}
    ,{Id: "wwww", FirstName: "Barack", LastName: "Obama"}
    ,{Id: "xxxx", FirstName: "Ronald", LastName: "Reagan"}
    ,{Id: "yyyy", FirstName: "Donald", LastName: "Trump"}
    ,{Id: "zzzz", FirstName: "George", LastName: "Bush"}
]]);

class MatchDB implements matching.MatchingDB<SourceId, TargetId, Item, Item> {
    getSourceObj(srcId: SourceId) : Promise<Item> {
        return Promise.resolve<Item>(alasql("SELECT * FROM Sources WHERE Id=?",[srcId])[0]);
    }
    getTargetObj(targetId: TargetId) : Promise<Item> {
        return Promise.resolve<Item>(alasql("SELECT * FROM Targets WHERE Id=?",[targetId])[0]);
    }
	getUnmatchedSources() : Promise<SourceId[]> {
        let ret = alasql("SELECT a.Id FROM Sources a LEFT JOIN Matches b ON a.Id=b.SrcId WHERE b.SrcId IS NULL");
        let Ids: SourceId[] = [];
        for (let i in ret)
            Ids.push(ret[i]["Id"]);
        return Promise.resolve<SourceId[]>(Ids);
    }
	getUnmatchedTargets() : Promise<TargetId[]> {
        let ret = alasql("SELECT a.Id FROM Targets a LEFT JOIN Matches b ON a.Id=b.TargetId WHERE b.TargetId IS NULL");
        let Ids: TargetId[] = [];
        for (let i in ret)
            Ids.push(ret[i]["Id"]);
        return Promise.resolve<TargetId[]>(Ids);        
    }
	storeMatchingPair(pair: matching.MatchingPair<SourceId, TargetId>) : Promise<void> {
        alasql("INSERT INTO Matches VALUES (?, ?)", [pair.srcId, pair.targetId]);
        return Promise.resolve();
    }
}

let comparator : matching.Comparator<Item, Item> = (srcIObj: Item, targetObj: Item) => {
    let matched = (srcIObj.FirstName === targetObj.FirstName && srcIObj.LastName === targetObj.LastName);
    return Promise.resolve<boolean>(matched);
}

let m = matching.matcher<SourceId, TargetId, Item, Item>(new MatchDB(), comparator);
m.on("matching", (srcId: SourceId, targetId: TargetId) => {
    console.log("matching " + srcId + " to " + targetId + "...");
}).on("matched", (srcId: SourceId, targetId: TargetId) => {
    console.log("<MATCHED>: " + srcId + " ===> " + targetId);
}).doMatching()
.then((value: matching.MatchingResult<SourceId, TargetId>) => {
    console.log("");
    console.log("Done");
    console.log("matching result:\n" + JSON.stringify(value, null, 2));
    console.log("");
    console.log("matches in DB:\n" + JSON.stringify(alasql("SELECT * FROM Matches"), null, 2));
}).catch((err: any) => {
    console.error("!!! Error: " + JSON.stringify(err));
});