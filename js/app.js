(function () {
  var STORAGE_KEY = "s3-query-v2";
  var RELOAD_SCROLL_TOP_KEY = "s3-reload-scroll-top";
  var APP_VERSION = window.APP_VERSION || "dev";
  var DEFAULTS = {
    direction: "gaojiachong",
    boardId: "youfangqiao",
    alightId: "lanhuatang"
  };
  var data = window.S3_LANHUATANG;
  var S = window.S3Schedule;
  var COLLAPSED_LIMIT = 6;
  var SCROLL_EDGE = 48;

  var state = {
    direction: DEFAULTS.direction,
    boardId: DEFAULTS.boardId,
    alightId: DEFAULTS.alightId,
    calendarKey: null,
    calendarManual: false,
    openMenu: null,
    listExpanded: false,
    scrollTarget: null
  };

  function pad2(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function formatNow(d) {
    return (
      pad2(d.getHours()) +
      ":" +
      pad2(d.getMinutes()) +
      ":" +
      pad2(d.getSeconds())
    );
  }

  function formatToday(d) {
    var week = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
    return pad2(d.getMonth() + 1) + "月" + pad2(d.getDate()) + "日 周" + week;
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

  function syncListToggle(total) {
    var toggleEl = document.getElementById("listToggle");
    if (total <= COLLAPSED_LIMIT) {
      toggleEl.hidden = true;
      return;
    }
    toggleEl.hidden = false;
    toggleEl.textContent = state.listExpanded
      ? "收起"
      : "展开全部（" + (total - COLLAPSED_LIMIT) + " 班）";
  }

  function collapseList() {
    state.listExpanded = false;
  }

  function handleReloadScrollTop() {
    try {
      if (sessionStorage.getItem(RELOAD_SCROLL_TOP_KEY) !== "1") return false;
      if ("scrollRestoration" in history) {
        history.scrollRestoration = "manual";
      }
      window.scrollTo(0, 0);
      requestAnimationFrame(function () {
        window.scrollTo(0, 0);
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  function finishReloadScrollTop() {
    try {
      sessionStorage.removeItem(RELOAD_SCROLL_TOP_KEY);
    } catch (e) {}
  }

  function canPageScroll() {
    return document.documentElement.scrollHeight - window.innerHeight > SCROLL_EDGE;
  }

  function clearProgrammaticScroll() {
    state.scrollTarget = null;
    syncScrollFab();
  }

  function beginProgrammaticScroll(target) {
    state.scrollTarget = target;
    syncScrollFab();

    var lastY = window.scrollY || document.documentElement.scrollTop;
    var stableFrames = 0;

    function watch() {
      if (!state.scrollTarget) return;
      var y = window.scrollY || document.documentElement.scrollTop;
      syncScrollFab();
      if (y === lastY) {
        stableFrames++;
        if (stableFrames >= 5) {
          clearProgrammaticScroll();
          return;
        }
      } else {
        stableFrames = 0;
        lastY = y;
      }
      requestAnimationFrame(watch);
    }

    requestAnimationFrame(watch);
  }

  function onManualScrollIntent() {
    if (state.scrollTarget) {
      clearProgrammaticScroll();
    }
  }

  function syncScrollFab() {
    var fab = document.getElementById("scrollFab");
    var topBtn = document.getElementById("scrollToTopBtn");
    var bottomBtn = document.getElementById("scrollToBottomBtn");
    if (!fab || !topBtn || !bottomBtn) return;

    if (!canPageScroll()) {
      fab.hidden = true;
      topBtn.hidden = true;
      bottomBtn.hidden = true;
      return;
    }

    var y = window.scrollY || document.documentElement.scrollTop;
    var maxY = document.documentElement.scrollHeight - window.innerHeight;
    var atTop = y <= SCROLL_EDGE;
    var atBottom = y >= maxY - SCROLL_EDGE;

    if (state.scrollTarget === "top") {
      topBtn.hidden = atTop;
      bottomBtn.hidden = true;
    } else if (state.scrollTarget === "bottom") {
      topBtn.hidden = true;
      bottomBtn.hidden = atBottom;
    } else {
      topBtn.hidden = atTop;
      bottomBtn.hidden = atBottom;
    }

    fab.hidden = topBtn.hidden && bottomBtn.hidden;
  }

  function waitUrgency(waitMinutes) {
    if (waitMinutes <= 1) return "urgent";
    if (waitMinutes <= 4) return "soon";
    if (waitMinutes <= 8) return "near";
    return "calm";
  }

  function render() {
    var now = new Date();
    ensureCalendar(now);
    normalizeSelection();

    document.getElementById("todayText").innerHTML =
      '<span class="today-date">' +
      formatToday(now) +
      '</span><span class="today-time">' +
      formatNow(now) +
      "</span>";
    var buildTime = window.APP_BUILD_TIME ? "（构建 " + window.APP_BUILD_TIME + "）" : "";
    document.getElementById("versionText").textContent = "版本 " + APP_VERSION + buildTime;
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
      document.getElementById("listToggle").hidden = true;
      syncScrollFab();
      return;
    }

    emptyEl.hidden = true;
    var visibleTrips =
      state.listExpanded || trips.length <= COLLAPSED_LIMIT
        ? trips
        : trips.slice(0, COLLAPSED_LIMIT);
    var html = "";
    for (var i = 0; i < visibleTrips.length; i++) {
      var t = visibleTrips[i];
      var waitHtml =
        t.waitMinutes === 0
          ? "即将发车"
          : '<span class="wait-prefix">还有</span>' +
            t.waitMinutes +
            " 分钟";
      var urgency = i === 0 ? waitUrgency(t.waitMinutes) : "";
      html +=
        '<article class="trip' +
        (i === 0 ? " next urgency-" + urgency : "") +
        '">' +
        '<div class="dep">' +
        t.boardTime +
        '<span class="approx"> 到达</span>' +
        "</div>" +
        '<div class="wait' +
        (urgency ? " wait-" + urgency : "") +
        '">' +
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
    syncListToggle(trips.length);
    syncScrollFab();
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
        collapseList();
      } else {
        state.alightId = value;
        collapseList();
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
      collapseList();
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
      collapseList();
      render();
    });

    document.getElementById("reloadBtn").addEventListener("click", function () {
      try {
        sessionStorage.setItem(RELOAD_SCROLL_TOP_KEY, "1");
      } catch (e) {}
      location.reload();
    });

    document.getElementById("listToggle").addEventListener("click", function () {
      state.listExpanded = !state.listExpanded;
      render();
      setTimeout(syncScrollFab, 80);
    });

    document.getElementById("scrollToTopBtn").addEventListener("click", function () {
      beginProgrammaticScroll("top");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    document.getElementById("scrollToBottomBtn").addEventListener("click", function () {
      beginProgrammaticScroll("bottom");
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "smooth"
      });
    });

    window.addEventListener("scroll", syncScrollFab, { passive: true });
    window.addEventListener("resize", syncScrollFab);
    window.addEventListener("wheel", onManualScrollIntent, { passive: true });
    window.addEventListener("touchstart", onManualScrollIntent, { passive: true });
    window.addEventListener("touchmove", onManualScrollIntent, { passive: true });
    if ("onscrollend" in window) {
      window.addEventListener("scrollend", function () {
        if (state.scrollTarget) clearProgrammaticScroll();
      }, { passive: true });
    }
  }

  function init() {
    handleReloadScrollTop();

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
    syncScrollFab();
    if (handleReloadScrollTop()) {
      finishReloadScrollTop();
    }
    // 每秒重算等待分钟数并刷新右上角时间（精确到秒）
    setInterval(render, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.addEventListener("pageshow", function () {
    handleReloadScrollTop();
  });
})();
