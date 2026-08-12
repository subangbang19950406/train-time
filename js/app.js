(function () {
  var STORAGE_KEY = "s3-query-v2";
  var DEFAULTS = {
    direction: "gaojiachong",
    boardId: "youfangqiao",
    alightId: "lanhuatang"
  };
  var data = window.S3_LANHUATANG;
  var S = window.S3Schedule;

  var state = {
    direction: DEFAULTS.direction,
    boardId: DEFAULTS.boardId,
    alightId: DEFAULTS.alightId,
    calendarKey: null,
    calendarManual: false,
    openMenu: null
  };

  function pad2(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function formatNow(d) {
    var week = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
    return (
      d.getFullYear() +
      "-" +
      pad2(d.getMonth() + 1) +
      "-" +
      pad2(d.getDate()) +
      " 周" +
      week +
      " " +
      pad2(d.getHours()) +
      ":" +
      pad2(d.getMinutes())
    );
  }

  function stationName(id) {
    return (data.stations && data.stations[id]) || id;
  }

  function loadSaved() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function persist() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          direction: state.direction,
          boardId: state.boardId,
          alightId: state.alightId
        })
      );
    } catch (e) {}
  }

  function normalizeSelection() {
    var boards = S.boardOptions(data, state.direction);
    if (boards.indexOf(state.boardId) < 0) {
      state.boardId =
        boards.indexOf(DEFAULTS.boardId) >= 0 ? DEFAULTS.boardId : boards[0];
    }
    var alights = S.alightOptions(data, state.direction, state.boardId);
    if (alights.indexOf(state.alightId) < 0) {
      if (
        state.direction === "gaojiachong" &&
        alights.indexOf("lanhuatang") >= 0
      ) {
        state.alightId = "lanhuatang";
      } else if (
        state.direction === "nanjingnan" &&
        alights.indexOf("youfangqiao") >= 0
      ) {
        state.alightId = "youfangqiao";
      } else {
        state.alightId = alights[0];
      }
    }
  }

  function ensureCalendar(now) {
    if (!state.calendarManual || !state.calendarKey) {
      state.calendarKey = S.defaultCalendarKey(now);
    }
  }

  function closeMenus() {
    state.openMenu = null;
    ["board", "alight"].forEach(function (kind) {
      var trigger = document.getElementById(kind + "Trigger");
      var menu = document.getElementById(kind + "Menu");
      trigger.setAttribute("aria-expanded", "false");
      menu.hidden = true;
    });
  }

  function setMenuOpen(kind, open) {
    closeMenus();
    if (!open) return;
    state.openMenu = kind;
    var trigger = document.getElementById(kind + "Trigger");
    var menu = document.getElementById(kind + "Menu");
    trigger.setAttribute("aria-expanded", "true");
    menu.hidden = false;
  }

  function fillMenu(kind, ids, selectedId) {
    var menu = document.getElementById(kind + "Menu");
    var html = "";
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var selected = id === selectedId;
      html +=
        '<li role="presentation">' +
        '<button type="button" class="origin-option' +
        (selected ? " is-selected" : "") +
        '" role="option" data-value="' +
        id +
        '" aria-selected="' +
        (selected ? "true" : "false") +
        '">' +
        stationName(id) +
        "</button></li>";
    }
    menu.innerHTML = html;
  }

  function refreshMenus() {
    fillMenu("board", S.boardOptions(data, state.direction), state.boardId);
    fillMenu(
      "alight",
      S.alightOptions(data, state.direction, state.boardId),
      state.alightId
    );
  }

  function syncTriggers() {
    document.getElementById("boardTriggerText").textContent = stationName(
      state.boardId
    );
    document.getElementById("alightTriggerText").textContent = stationName(
      state.alightId
    );
  }

  function syncDirectionUI() {
    var radios = document.querySelectorAll(
      '#directionSeg input[name="direction"]'
    );
    for (var i = 0; i < radios.length; i++) {
      radios[i].checked = radios[i].value === state.direction;
    }
  }

  function syncCalendarUI() {
    var radios = document.querySelectorAll(
      '#calendarSeg input[name="calendar"]'
    );
    for (var i = 0; i < radios.length; i++) {
      radios[i].checked = radios[i].value === state.calendarKey;
    }
  }

  function render() {
    var now = new Date();
    ensureCalendar(now);
    normalizeSelection();

    document.getElementById("nowText").textContent = "现在 " + formatNow(now);
    syncDirectionUI();
    syncCalendarUI();
    syncTriggers();

    var trips = S.upcomingTrips(
      data,
      state.direction,
      state.boardId,
      state.alightId,
      state.calendarKey,
      now
    );
    var listEl = document.getElementById("tripList");
    var emptyEl = document.getElementById("emptyState");

    if (!trips.length) {
      listEl.innerHTML = "";
      emptyEl.hidden = false;
      emptyEl.textContent = "今日已无剩余班次";
      return;
    }

    emptyEl.hidden = true;
    var html = "";
    for (var i = 0; i < trips.length; i++) {
      var t = trips[i];
      var waitHtml =
        t.waitMinutes === 0
          ? "即将发车"
          : '<span class="wait-prefix">还有</span>' +
            t.waitMinutes +
            " 分钟";
      html +=
        '<article class="trip' +
        (i === 0 ? " next" : "") +
        '">' +
        '<div class="dep"><span class="approx">约</span>' +
        t.boardTime +
        "</div>" +
        '<div class="wait">' +
        waitHtml +
        "</div>" +
        '<div class="arrive">到' +
        stationName(state.alightId) +
        " " +
        t.arriveTime +
        "</div>" +
        "</article>";
    }
    listEl.innerHTML = html;
  }

  function bindDropdown(kind) {
    var dropdown = document.getElementById(kind + "Dropdown");
    var trigger = document.getElementById(kind + "Trigger");
    var menu = document.getElementById(kind + "Menu");

    trigger.addEventListener("click", function () {
      var open = state.openMenu !== kind;
      setMenuOpen(kind, open);
    });

    menu.addEventListener("click", function (e) {
      var btn = e.target.closest(".origin-option");
      if (!btn) return;
      var value = btn.getAttribute("data-value");
      if (kind === "board") {
        state.boardId = value;
        normalizeSelection();
        refreshMenus();
      } else {
        state.alightId = value;
      }
      persist();
      closeMenus();
      render();
    });

    document.addEventListener("click", function (e) {
      if (state.openMenu !== kind) return;
      if (!dropdown.contains(e.target)) {
        closeMenus();
      }
    });
  }

  function bind() {
    document.getElementById("directionSeg").addEventListener("change", function (e) {
      if (e.target.name !== "direction") return;
      state.direction = e.target.value;
      normalizeSelection();
      refreshMenus();
      persist();
      closeMenus();
      render();
    });

    bindDropdown("board");
    bindDropdown("alight");

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && state.openMenu) {
        closeMenus();
      }
    });

    document.getElementById("calendarSeg").addEventListener("change", function (e) {
      if (e.target.name !== "calendar") return;
      state.calendarKey = e.target.value;
      state.calendarManual = true;
      closeMenus();
      render();
    });
  }

  function init() {
    if (!data || !S) {
      document.body.innerHTML = "<p style='padding:24px'>数据未加载</p>";
      return;
    }

    var saved = loadSaved();
    if (saved) {
      if (saved.direction === "gaojiachong" || saved.direction === "nanjingnan") {
        state.direction = saved.direction;
      }
      if (saved.boardId) state.boardId = saved.boardId;
      if (saved.alightId) state.alightId = saved.alightId;
    }

    normalizeSelection();
    refreshMenus();
    bind();
    render();
    setInterval(render, 30000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
