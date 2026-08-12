/**
 * S3 任意上下车站推算（以兰花塘站牌为锚点）
 */
(function (root) {
  function parseHHMM(text) {
    var parts = String(text).trim().split(":");
    var h = Number(parts[0]);
    var m = Number(parts[1]);
    if (!Number.isFinite(h) || !Number.isFinite(m)) {
      throw new Error("无效时刻: " + text);
    }
    return h * 60 + m;
  }

  function formatHHMM(totalMinutes) {
    var day = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
    var h = Math.floor(day / 60);
    var m = day % 60;
    return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
  }

  function shiftHHMM(hhmm, deltaMinutes) {
    return formatHHMM(parseHHMM(hhmm) + deltaMinutes);
  }

  function defaultCalendarKey(date) {
    var day = date.getDay();
    return day === 0 || day === 6 ? "restDay" : "weekday";
  }

  function lineOrder(data, direction) {
    var order = data.stationOrder.slice();
    if (direction === "nanjingnan") {
      order.reverse();
    }
    return order;
  }

  function stationIndex(order, stationId) {
    return order.indexOf(stationId);
  }

  function boardOptions(data, direction) {
    var order = lineOrder(data, direction);
    return order.slice(0, -1);
  }

  function alightOptions(data, direction, boardId) {
    var order = lineOrder(data, direction);
    var i = stationIndex(order, boardId);
    if (i < 0) return [];
    return order.slice(i + 1);
  }

  function isDownstream(data, direction, boardId, alightId) {
    var order = lineOrder(data, direction);
    var a = stationIndex(order, boardId);
    var b = stationIndex(order, alightId);
    return a >= 0 && b > a;
  }

  function directionConfig(data, direction) {
    var cfg = data.directions && data.directions[direction];
    if (!cfg) throw new Error("未知方向: " + direction);
    return cfg;
  }

  /**
   * @returns {{ boardTime: string, arriveTime: string, waitMinutes: number }[]}
   */
  function upcomingTrips(data, direction, boardId, alightId, calendarKey, now) {
    var cfg = directionConfig(data, direction);
    var times = cfg[calendarKey];
    if (!Array.isArray(times)) throw new Error("未知日历: " + calendarKey);
    var offsets = cfg.offsetFromLanhuatang;
    if (offsets[boardId] == null || offsets[alightId] == null) {
      throw new Error("站点不在该方向时刻锚点内");
    }
    if (!isDownstream(data, direction, boardId, alightId)) {
      return [];
    }
    var nowMinutes = now.getHours() * 60 + now.getMinutes();
    var trips = [];
    for (var i = 0; i < times.length; i++) {
      var anchor = times[i];
      var boardTime = shiftHHMM(anchor, offsets[boardId]);
      var arriveTime = shiftHHMM(anchor, offsets[alightId]);
      var boardMinutes = parseHHMM(boardTime);
      if (boardMinutes >= nowMinutes) {
        trips.push({
          boardTime: boardTime,
          arriveTime: arriveTime,
          waitMinutes: boardMinutes - nowMinutes
        });
      }
    }
    return trips;
  }

  var api = {
    parseHHMM: parseHHMM,
    formatHHMM: formatHHMM,
    shiftHHMM: shiftHHMM,
    defaultCalendarKey: defaultCalendarKey,
    lineOrder: lineOrder,
    boardOptions: boardOptions,
    alightOptions: alightOptions,
    isDownstream: isDownstream,
    directionConfig: directionConfig,
    upcomingTrips: upcomingTrips
  };

  root.S3Schedule = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
