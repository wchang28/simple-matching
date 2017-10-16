export declare type Comparator<SourceObj, TargetObj> = (srcIObj: SourceObj, targetObj: TargetObj) => Promise<boolean>;
export interface MatchingPair<SourceId, TargetId> {
    srcId: SourceId;
    targetId: TargetId;
}
export declare type MatchingResult<SourceId, TargetId> = MatchingPair<SourceId, TargetId>[];
export interface MatchingDB<SourceId, TargetId, SourceObj, TargetObj> {
    getSourceObj(srcId: SourceId): Promise<SourceObj>;
    getTargetObj(targetId: TargetId): Promise<TargetObj>;
    getUnmatchedSources(): Promise<SourceId[]>;
    getUnmatchedTargets(): Promise<TargetId[]>;
    storeMatchingPair(pair: MatchingPair<SourceId, TargetId>): Promise<void>;
}
export interface Matcher<SourceId, TargetId, SourceObj, TargetObj> {
    doMatching(): Promise<MatchingResult<SourceId, TargetId>>;
    on(event: "matching", listener: (srcId: SourceId, targetId: TargetId) => void): this;
    on(event: "matched", listener: (srcId: SourceId, targetId: TargetId) => void): this;
}
export declare function matcher<SourceId, TargetId, SourceObj, TargetObj>(matchingDB: MatchingDB<SourceId, TargetId, SourceObj, TargetObj>, comparator: Comparator<SourceObj, TargetObj>): Matcher<SourceId, TargetId, SourceObj, TargetObj>;
