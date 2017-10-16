"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var events = require("events");
var MatcherCls = /** @class */ (function (_super) {
    __extends(MatcherCls, _super);
    function MatcherCls(matchingDB, comparator) {
        var _this = _super.call(this) || this;
        _this.matchingDB = matchingDB;
        _this.comparator = comparator;
        return _this;
    }
    MatcherCls.prototype.match = function (srcId, targetId) {
        var _this = this;
        this.emit("matching", srcId, targetId);
        return Promise.all([this.matchingDB.getSourceObj(srcId), this.matchingDB.getTargetObj(targetId)])
            .then(function (value) { return _this.comparator(value[0], value[1]); });
    };
    MatcherCls.prototype.tryMatchSourceWithTargets = function (srcId, targetIds) {
        var _this = this;
        var n = targetIds.length;
        var matchedTarget = null;
        var onFulFilledHandlerFactory = function (i) {
            return function (matched) {
                if (!matchedTarget && matched)
                    matchedTarget = targetIds[i];
                return (i < n - 1 && matchedTarget === null) ? _this.match(srcId, targetIds[i + 1]) : Promise.resolve(false);
            };
        };
        var p = this.match(srcId, targetIds[0]);
        for (var i = 0; i < n; i++)
            p = p.then(onFulFilledHandlerFactory(i));
        return p.then(function () { return matchedTarget; });
    };
    MatcherCls.prototype.tryMatchSource = function (srcId) {
        var _this = this;
        return this.matchingDB.getUnmatchedTargets()
            .then(function (targetIds) {
            return (targetIds && targetIds.length > 0) ? _this.tryMatchSourceWithTargets(srcId, targetIds) : Promise.resolve(null);
        });
    };
    MatcherCls.prototype.tryMatchSourceAndStore = function (srcId) {
        var _this = this;
        var targetId = null;
        return this.tryMatchSource(srcId)
            .then(function (value) {
            targetId = value;
            if (targetId)
                _this.emit("matched", srcId, targetId);
            return targetId ? _this.matchingDB.storeMatchingPair({ srcId: srcId, targetId: targetId }) : Promise.resolve();
        }).then(function () { return targetId; });
    };
    MatcherCls.prototype.tryMatchSources = function (srcIds) {
        var _this = this;
        var n = srcIds.length;
        var result = [];
        var onFulFilledHandlerFactory = function (i) {
            return function (targetId) {
                if (targetId)
                    result.push({ srcId: srcIds[i], targetId: targetId });
                return (i < n - 1) ? _this.tryMatchSourceAndStore(srcIds[i + 1]) : Promise.resolve(null);
            };
        };
        var p = this.tryMatchSourceAndStore(srcIds[0]);
        for (var i = 0; i < n; i++)
            p = p.then(onFulFilledHandlerFactory(i));
        return p.then(function () { return result; });
    };
    MatcherCls.prototype.doMatching = function () {
        var _this = this;
        return this.matchingDB.getUnmatchedSources()
            .then(function (srcIds) {
            return (srcIds && srcIds.length > 0) ? _this.tryMatchSources(srcIds) : Promise.resolve([]);
        });
    };
    return MatcherCls;
}(events.EventEmitter));
function matcher(matchingDB, comparator) {
    return new MatcherCls(matchingDB, comparator);
}
exports.matcher = matcher;
//# sourceMappingURL=index.js.map