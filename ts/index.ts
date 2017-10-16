import * as events from "events";

type IterativePromiseFulFilledHandler<T> = (value: T) => Promise<T>;

export type Comparator<SourceObj, TargetObj> = (srcIObj: SourceObj, targetObj: TargetObj) => Promise<boolean>;

export interface MatchingPair<SourceId, TargetId> {
	srcId: SourceId;
	targetId: TargetId;
}

export type MatchingResult<SourceId, TargetId> = MatchingPair<SourceId, TargetId>[];

export interface MatchingDB<SourceId, TargetId, SourceObj, TargetObj> {
    getSourceObj(srcId: SourceId) : Promise<SourceObj>;
    getTargetObj(targetId: TargetId) : Promise<TargetObj>;
	getUnmatchedSources() : Promise<SourceId[]>;
	getUnmatchedTargets() : Promise<TargetId[]>;
	storeMatchingPair(pair: MatchingPair<SourceId, TargetId>) : Promise<void>;
}

export interface Matcher<SourceId, TargetId, SourceObj, TargetObj> {
	doMatching() : Promise<MatchingResult<SourceId, TargetId>>;
	on(event: "matching", listener:(srcId: SourceId, targetId: TargetId) => void) : this;
	on(event: "matched", listener:(srcId: SourceId, targetId: TargetId) => void) : this;
}

class MatcherCls<SourceId, TargetId, SourceObj, TargetObj> extends events.EventEmitter implements Matcher<SourceId, TargetId, SourceObj, TargetObj> {
	constructor(private matchingDB: MatchingDB<SourceId, TargetId, SourceObj, TargetObj>, private comparator: Comparator<SourceObj, TargetObj>) {
		super();
	}
    private match(srcId: SourceId, targetId: TargetId) : Promise<boolean> {
		this.emit("matching", srcId, targetId);
        return Promise.all([this.matchingDB.getSourceObj(srcId), this.matchingDB.getTargetObj(targetId)])
        .then((value: [SourceObj, TargetObj]) => this.comparator(value[0], value[1]));
    }

	private tryMatchSourceWithTargets(srcId: SourceId, targetIds: TargetId[]) : Promise<TargetId> {
		let n = targetIds.length;
		let matchedTarget: TargetId = null;
		let onFulFilledHandlerFactory = (i: number) => {
			return (matched: boolean) => {
				if (!matchedTarget && matched) matchedTarget = targetIds[i]; 
				return (i < n-1 && matchedTarget === null) ? this.match(srcId, targetIds[i+1]) : Promise.resolve<boolean>(false);
			};
		};
		let p = this.match(srcId, targetIds[0]);
		for (let i = 0; i < n; i++)
			p = p.then(onFulFilledHandlerFactory(i));
		return p.then(() => matchedTarget);
	}
	
	private tryMatchSource(srcId: SourceId) : Promise<TargetId> {
		return this.matchingDB.getUnmatchedTargets()
		.then((targetIds: TargetId[]) => {
			return (targetIds && targetIds.length > 0) ? this.tryMatchSourceWithTargets(srcId, targetIds) : Promise.resolve<TargetId>(null);
		});
	}

	private tryMatchSourceAndStore(srcId: SourceId) : Promise<TargetId> {
		let targetId = null;
		return this.tryMatchSource(srcId)
		.then((value: TargetId) => {
			targetId = value;
			if (targetId) this.emit("matched", srcId, targetId);
			return targetId ? this.matchingDB.storeMatchingPair({srcId, targetId}) : Promise.resolve();
		}).then(() => targetId);
	}

	private tryMatchSources(srcIds: SourceId[]) : Promise<MatchingResult<SourceId, TargetId>> {
		let n = srcIds.length;
		let result: MatchingResult<SourceId, TargetId> = [];
		let onFulFilledHandlerFactory = (i: number) => {
			return (targetId: TargetId) => {
				if (targetId) result.push({srcId: srcIds[i], targetId});
				return (i < n-1) ? this.tryMatchSourceAndStore(srcIds[i+1]) : Promise.resolve<TargetId>(null);
			};
		};
		let p = this.tryMatchSourceAndStore(srcIds[0]);
		for (let i = 0; i < n; i++)
			p = p.then(onFulFilledHandlerFactory(i));
		return p.then(() => result);
	}

	doMatching() : Promise<MatchingResult<SourceId, TargetId>> {
		return this.matchingDB.getUnmatchedSources()
		.then((srcIds: SourceId[]) => {
			return (srcIds && srcIds.length > 0) ? this.tryMatchSources(srcIds) : Promise.resolve<MatchingPair<SourceId, TargetId>[]>([]);
		})
	}
}

export function matcher<SourceId, TargetId, SourceObj, TargetObj>(matchingDB: MatchingDB<SourceId, TargetId, SourceObj, TargetObj>, comparator: Comparator<SourceObj, TargetObj>) : Matcher<SourceId, TargetId, SourceObj, TargetObj> {
	return new MatcherCls(matchingDB, comparator);
}
