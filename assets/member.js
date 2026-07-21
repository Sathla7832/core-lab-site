const loginPage = document.querySelector("[data-member-login]");
const portalPage = document.querySelector("[data-member-portal]");
const memberPageIsFramed = (loginPage || portalPage) && window.top !== window.self;

if (memberPageIsFramed) {
  // GitHub Pages cannot emit frame-ancestors/X-Frame-Options response headers.
  // Hide the authenticated UI before attempting to escape a hostile frame.
  document.documentElement.style.display = "none";
  try {
    window.top.location.replace(window.self.location.href);
  } catch (_error) {
    // Sandboxed cross-origin frames can block top navigation; the page stays hidden.
  }
}

if ((loginPage || portalPage) && !memberPageIsFramed) {
  const statusElement = document.querySelector("[data-member-status]");
  const config = window.CORE_LAB_FIREBASE_CONFIG || {};
  const syncApiUrl = String(window.CORE_LAB_SYNC_API_URL || "").replace(/\/$/, "");
  const configured = Boolean(config.apiKey && config.apiKey !== "PENDING_FIREBASE_SETUP" && config.authDomain && config.projectId && config.appId);

  const setStatus = (message, tone = "") => {
    if (!statusElement) return;
    statusElement.textContent = message;
    statusElement.dataset.tone = tone;
  };

  const friendlyError = (error) => {
    // Keep the real error in the console; the returned text is intentionally generic.
    console.error("[member-portal]", error);
    const code = String(error?.code || "");
    if (code.includes("popup-closed-by-user")) return "Sign-in was cancelled.";
    if (code.includes("unauthorized-domain")) return "This website domain has not been authorized for sign-in.";
    if (code.includes("network-request-failed")) return "The sign-in service could not be reached. Check your connection and try again.";
    if (code.includes("permission-denied")) return "Your account does not have permission to perform this action.";
    return "The portal could not complete that request. Please try again or contact the administrator.";
  };

      const portalTabs = Array.from(document.querySelectorAll("[data-member-tab-target]"));
  const portalPanels = Array.from(document.querySelectorAll("[data-member-panel]"));
  const availablePortalTabs = () => portalTabs.filter((tab) => !tab.hidden);
      let loadMemberRoadmap = () => {};
      let loadMemberReportSchedule = () => {};
  const activatePortalTab = (target, moveFocus = false) => {
    const selectedTab = portalTabs.find((tab) => tab.dataset.memberTabTarget === target && !tab.hidden);
    if (!selectedTab) return;
    portalTabs.forEach((tab) => {
      const selected = tab === selectedTab;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    portalPanels.forEach((panel) => {
      panel.hidden = panel.dataset.memberPanel !== target;
    });
    if (target === "roadmap") loadMemberRoadmap();
    if (target === "report-schedule") loadMemberReportSchedule();
    if (moveFocus) selectedTab.focus();
  };

  portalTabs.forEach((tab) => {
    tab.addEventListener("click", () => activatePortalTab(tab.dataset.memberTabTarget));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      const tabs = availablePortalTabs();
      const currentIndex = tabs.indexOf(tab);
      if (currentIndex < 0) return;
      event.preventDefault();
      let nextIndex = currentIndex;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = tabs.length - 1;
      if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
      activatePortalTab(tabs[nextIndex].dataset.memberTabTarget, true);
    });
  });

  if (!configured) {
    setStatus("Member access is being configured. Please contact the laboratory administrator.", "error");
    document.querySelector("[data-member-sign-in]")?.setAttribute("disabled", "");
  } else {
    (async () => {
      const sdkVersion = "11.10.0";
      const [appSdk, authSdk, dbSdk] = await Promise.all([
        import(`https://www.gstatic.com/firebasejs/${sdkVersion}/firebase-app.js`),
        import(`https://www.gstatic.com/firebasejs/${sdkVersion}/firebase-auth.js`),
        import(`https://www.gstatic.com/firebasejs/${sdkVersion}/firebase-firestore.js`),
      ]);
      const app = appSdk.initializeApp(config);
      const auth = authSdk.getAuth(app);
      const db = dbSdk.getFirestore(app);
      const provider = new authSdk.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      let currentIsAdmin = false;

      loadMemberRoadmap = async () => {
        const frame = document.querySelector("[data-member-roadmap-frame]");
        const state = document.querySelector("[data-member-roadmap-state]");
        if (!frame || frame.dataset.loaded === "true" || frame.dataset.loading === "true") return;
        frame.dataset.loading = "true";
        if (state) state.textContent = "Loading protected student roadmap...";
        try {
          if (!syncApiUrl) throw new Error("The member content service is not configured.");
          const token = await auth.currentUser?.getIdToken();
          if (!token) throw new Error("Please sign in again to load the student roadmap.");
          const response = await fetch(`${syncApiUrl}/api/resources/student-roadmap`, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(String(data.error || "The student roadmap could not be loaded."));
          }
          const html = await response.text();
          const blobUrl = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
          frame.addEventListener("load", () => {
            frame.hidden = false;
            if (state) state.hidden = true;
            frame.dataset.loaded = "true";
            frame.dataset.loading = "false";
          }, { once: true });
          frame.setAttribute("src", blobUrl);
          window.addEventListener("beforeunload", () => {
            URL.revokeObjectURL(blobUrl);
          }, { once: true });
        } catch (error) {
          frame.dataset.loading = "false";
          if (state) state.textContent = friendlyError(error);
        }
      };

      loadMemberReportSchedule = async () => {
        const frame = document.querySelector("[data-member-report-schedule-frame]");
        const state = document.querySelector("[data-member-report-schedule-state]");
        if (!frame || frame.dataset.loaded === "true" || frame.dataset.loading === "true") return;
        frame.dataset.loading = "true";
        if (state) state.textContent = "Loading protected report schedule...";
        try {
          if (!syncApiUrl) throw new Error("The member content service is not configured.");
          const token = await auth.currentUser?.getIdToken();
          if (!token) throw new Error("Please sign in again to load the report schedule.");
          const response = await fetch(`${syncApiUrl}/api/resources/report-schedule`, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(String(data.error || "The report schedule could not be loaded."));
          }
          const html = await response.text();
          const blobUrl = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
          frame.addEventListener("load", () => {
            frame.hidden = false;
            if (state) state.hidden = true;
            frame.dataset.loaded = "true";
            frame.dataset.loading = "false";
          }, { once: true });
          frame.setAttribute("src", blobUrl);
          window.addEventListener("beforeunload", () => URL.revokeObjectURL(blobUrl), { once: true });
        } catch (error) {
          frame.dataset.loading = "false";
          if (state) state.textContent = friendlyError(error);
        }
      };

      const signInButton = document.querySelector("[data-member-sign-in]");
      signInButton?.addEventListener("click", async () => {
        signInButton.disabled = true;
        setStatus("Opening Google sign-in...");
        try {
          await authSdk.signInWithPopup(auth, provider);
        } catch (error) {
          if (String(error?.code || "").includes("popup-blocked")) {
            await authSdk.signInWithRedirect(auth, provider);
            return;
          }
          setStatus(friendlyError(error), "error");
          signInButton.disabled = false;
        }
      });

      document.querySelector("[data-member-sign-out]")?.addEventListener("click", async () => {
        await authSdk.signOut(auth);
        window.location.replace("member-login.html");
      });

      const formatDate = (timestamp) => {
        const value = timestamp?.toDate?.();
        return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(value) : "Recently added";
      };
      const createText = (tag, text, className = "") => {
        const node = document.createElement(tag);
        node.textContent = text;
        if (className) node.className = className;
        return node;
      };

      const secureHttpsUrl = (value) => {
        try {
          const url = new URL(String(value || ""));
          return url.protocol === "https:" ? url.href : "";
        } catch (_error) {
          return "";
        }
      };

      const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
      // Domains allowed for pre-approval. To add one, append it inside the parentheses.
      const approvedAddressPattern = /^[A-Za-z0-9._%+\-]+@(gmail\.com|nycu\.edu\.tw)$/;

      const callSyncApi = async (announcementId, method, payload = {}) => {
        if (!syncApiUrl) throw new Error("The Discord synchronization service is not configured.");
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error("Please sign in again before synchronizing with Discord.");
        const response = await fetch(`${syncApiUrl}/api/announcements/${encodeURIComponent(announcementId)}`, {
          method,
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(String(data.error || "Discord synchronization failed."));
        return data;
      };

      const publishAnnouncementToDiscord = async (item, data) => {
        await dbSdk.updateDoc(item.ref, {
          syncStatus: "pending",
          syncError: "",
          discordMessageId: String(data.discordMessageId || ""),
          discordChannelId: String(data.discordChannelId || ""),
          updatedAt: dbSdk.serverTimestamp(),
        });
        try {
          const result = await callSyncApi(item.id, "POST", {
            title: String(data.title || "").trim(),
            body: String(data.body || "").trim(),
            discordMessageId: String(data.discordMessageId || ""),
          });
          await dbSdk.updateDoc(item.ref, {
            syncStatus: "synced",
            syncError: "",
            discordMessageId: String(result.discordMessageId || ""),
            discordChannelId: String(result.discordChannelId || ""),
            syncedAt: dbSdk.serverTimestamp(),
            updatedAt: dbSdk.serverTimestamp(),
          });
          return true;
        } catch (error) {
          await dbSdk.updateDoc(item.ref, {
            syncStatus: "failed",
            syncError: String(error?.message || "Discord synchronization failed.").slice(0, 500),
            updatedAt: dbSdk.serverTimestamp(),
          });
          throw error;
        }
      };

      const calendarIdPattern = /^[A-Za-z0-9._%+-]+@group\.calendar\.google\.com$/;
      const calendarAccount = "corelabfcu@gmail.com";
      const calendarPresentation = Object.freeze({
        instrument: {
          order: 2,
          apiKind: "booking",
          title: "Instrument Reservation",
          mode: "WEEK",
          action: "Create instrument booking",
          eventTitle: "[Instrument] Instrument name - Member name",
          eventDetails: "Instrument:\nMember:\nSample or project:\nNotes:",
        },
        leave: {
          order: 3,
          title: "Leave Schedule",
          mode: "MONTH",
          action: "Submit leave schedule",
          eventTitle: "[Leave] Member name - Leave type",
          eventDetails: "Member:\nLeave type:\nReason or handover note:\nEmergency contact if needed:",
        },
        meeting: {
          order: 1,
          title: "Lab Meetings",
          mode: "MONTH",
          action: "Add meeting",
          eventTitle: "[Meeting] Topic",
          eventDetails: "Organizer:\nLocation or Google Meet:\nParticipants:\nAgenda:",
        },
      });

      const calendarUrl = (base, parameters) => {
        const url = new URL(base);
        Object.entries(parameters).forEach(([key, value]) => url.searchParams.set(key, value));
        return url.href;
      };

      const calendarDateKey = (date) => [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
      ].join("-");

      const localCalendarDate = (value) => {
        const text = String(value || "");
        const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
        if (dateOnly) return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
        const parsed = new Date(text);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      };

      const startOfCalendarWeek = (value) => {
        const start = new Date(value.getFullYear(), value.getMonth(), value.getDate());
        start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
        return start;
      };

      const calendarRange = (anchor, mode) => {
        if (mode === "WEEK") {
          const start = startOfCalendarWeek(anchor);
          const end = new Date(start);
          end.setDate(end.getDate() + 7);
          return { start, end, cells: 7 };
        }
        const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
        const start = startOfCalendarWeek(monthStart);
        const end = new Date(start);
        end.setDate(end.getDate() + 42);
        return { start, end, cells: 42 };
      };

      const fetchCalendarEvents = async (kind, start, end) => {
        if (!syncApiUrl) throw new Error("The calendar service is not configured.");
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error("Please sign in again to load calendar events.");
        const url = new URL(`${syncApiUrl}/api/calendars/events`);
        url.searchParams.set("kind", kind);
        url.searchParams.set("start", start.toISOString());
        url.searchParams.set("end", end.toISOString());
        const response = await fetch(url, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(String(data.error || "Calendar events could not be loaded."));
        return Array.isArray(data.events) ? data.events : [];
      };

      const calendarEventNode = (event) => {
        const item = document.createElement("div");
        item.className = "member-calendar-event";
        const start = localCalendarDate(event.start);
        const time = event.allDay || !start
          ? "All day"
          : new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(start);
        item.append(createText("span", time, "member-calendar-event-time"));
        item.append(createText("span", String(event.title || "Untitled event"), "member-calendar-event-title"));
        if (event.location) item.title = `${event.title} - ${event.location}`;
        return item;
      };

      const eventOccursOn = (event, day) => {
        const start = localCalendarDate(event.start);
        const end = localCalendarDate(event.end);
        if (!start) return false;
        const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        const eventEnd = end && end > start ? end : new Date(start.getTime() + 60 * 60 * 1000);
        return start < dayEnd && eventEnd > dayStart;
      };

      const renderCalendarGrid = (surface, presentation, anchor, range, events) => {
        surface.replaceChildren();
        const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        const grid = document.createElement("div");
        grid.className = `member-native-calendar-grid is-${presentation.mode.toLowerCase()}`;
        grid.setAttribute("role", "grid");
        weekdays.forEach((weekday) => grid.append(createText("div", weekday, "member-calendar-weekday")));
        const todayKey = calendarDateKey(new Date());
        for (let offset = 0; offset < range.cells; offset += 1) {
          const day = new Date(range.start);
          day.setDate(day.getDate() + offset);
          const cell = document.createElement("section");
          cell.className = "member-calendar-day";
          cell.setAttribute("role", "gridcell");
          if (presentation.mode === "MONTH" && day.getMonth() !== anchor.getMonth()) cell.classList.add("is-outside");
          if (calendarDateKey(day) === todayKey) cell.classList.add("is-today");
          const heading = document.createElement("div");
          heading.className = "member-calendar-day-heading";
          heading.append(createText("span", new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(day)));
          cell.append(heading);
          const dayEvents = events.filter((event) => eventOccursOn(event, day));
          const eventList = document.createElement("div");
          eventList.className = "member-calendar-day-events";
          dayEvents.forEach((event) => eventList.append(calendarEventNode(event)));
          if (!dayEvents.length) eventList.append(createText("span", "No events", "member-calendar-empty-day"));
          cell.append(eventList);
          grid.append(cell);
        }
        surface.append(grid);
      };

      const mountCalendarSurface = (card, kind, presentation) => {
        const calendar = document.createElement("div");
        calendar.className = "member-native-calendar";
        const toolbar = document.createElement("div");
        toolbar.className = "member-calendar-toolbar";
        const navigation = document.createElement("div");
        navigation.className = "member-calendar-navigation";
        const previous = createText("button", "Previous", "btn btn-secondary member-calendar-nav");
        const today = createText("button", "Today", "btn btn-secondary member-calendar-nav");
        const next = createText("button", "Next", "btn btn-secondary member-calendar-nav");
        [previous, today, next].forEach((button) => { button.type = "button"; });
        const period = createText("strong", "", "member-calendar-period");
        navigation.append(previous, today, next, period);
        const state = createText("p", "Loading events...", "member-calendar-state");
        state.setAttribute("aria-live", "polite");
        toolbar.append(navigation, state);
        const surface = document.createElement("div");
        surface.className = "member-calendar-surface";
        calendar.append(toolbar, surface);
        card.append(calendar);

        let anchor = new Date();
        const load = async () => {
          const range = calendarRange(anchor, presentation.mode);
          period.textContent = presentation.mode === "WEEK"
            ? `${new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(range.start)} - ${new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(range.end.getTime() - 86400000))}`
            : new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(anchor);
          state.textContent = "Loading events...";
          surface.replaceChildren(createText("p", "Loading calendar...", "member-calendar-loading"));
          try {
            const events = await fetchCalendarEvents(presentation.apiKind || kind, range.start, range.end);
            renderCalendarGrid(surface, presentation, anchor, range, events);
            state.textContent = `${events.length} event${events.length === 1 ? "" : "s"}`;
            state.dataset.tone = "success";
          } catch (error) {
            surface.replaceChildren(createText("p", String(error?.message || "Calendar events could not be loaded."), "member-calendar-error"));
            state.textContent = "Unable to load events";
            state.dataset.tone = "error";
          }
        };
        previous.addEventListener("click", () => {
          anchor = presentation.mode === "WEEK"
            ? new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - 7)
            : new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1);
          load();
        });
        today.addEventListener("click", () => { anchor = new Date(); load(); });
        next.addEventListener("click", () => {
          anchor = presentation.mode === "WEEK"
            ? new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + 7)
            : new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
          load();
        });
        return load();
      };

      const renderCalendars = async () => {
        const list = document.querySelector("[data-calendar-list]");
        if (!list) return;
        const snapshot = await dbSdk.getDocs(dbSdk.collection(db, "calendars"));
        const calendars = snapshot.docs
          .map((item) => ({ key: item.id, ...item.data() }))
          .filter((item) => item.active === true && calendarPresentation[item.key] && calendarIdPattern.test(String(item.calendarId || "")))
          .sort((a, b) => calendarPresentation[a.key].order - calendarPresentation[b.key].order);
        list.replaceChildren();
        if (!calendars.length) {
          list.append(createText("p", "No protected calendars are configured yet. An administrator can add them below.", "muted"));
          return;
        }
        const calendarLoads = [];
        calendars.forEach((calendar) => {
          const presentation = calendarPresentation[calendar.key];
          const calendarId = String(calendar.calendarId);
          const card = document.createElement("article");
          card.className = `member-calendar-card member-calendar-${calendar.key}`;
          const header = document.createElement("header");
          header.className = "member-calendar-card-head";
          const copy = document.createElement("div");
          copy.append(createText("h3", presentation.title));
          const actions = document.createElement("div");
          actions.className = "member-calendar-actions";
          const createLink = createText("a", presentation.action, "btn btn-primary");
          createLink.href = calendarUrl("https://calendar.google.com/calendar/render", {
            action: "TEMPLATE",
            text: presentation.eventTitle,
            details: presentation.eventDetails,
            add: calendarId,
            ctz: "Asia/Taipei",
            authuser: calendarAccount,
          });
          createLink.target = "_blank";
          createLink.rel = "noopener noreferrer";
          const openLink = createText("a", "Open in Google Calendar", "btn btn-secondary");
          openLink.href = calendarUrl("https://calendar.google.com/calendar/r", { cid: calendarId, authuser: calendarAccount });
          openLink.target = "_blank";
          openLink.rel = "noopener noreferrer";
          actions.append(createLink, openLink);
          header.append(copy, actions);
          card.append(header);
          list.append(card);
          calendarLoads.push(mountCalendarSurface(card, calendar.key, presentation));
        });
        await Promise.allSettled(calendarLoads);
      };

      const renderAnnouncements = async () => {
        const list = document.querySelector("[data-announcement-list]");
        if (!list) return;
        const snapshot = await dbSdk.getDocs(dbSdk.query(dbSdk.collection(db, "announcements"), dbSdk.orderBy("createdAt", "desc"), dbSdk.limit(30)));
        list.replaceChildren();
        if (snapshot.empty) {
          list.append(createText("p", "No announcements have been posted yet.", "muted"));
          return;
        }
        snapshot.forEach((item) => {
          const data = item.data();
          const card = document.createElement("article");
          card.className = "member-card";
          card.append(createText("p", formatDate(data.createdAt), "member-card-meta"), createText("h3", data.title || "Announcement"), createText("p", data.body || ""));
          if (currentIsAdmin) {
            const syncLabel = data.syncStatus === "synced" ? "Discord: Synced" : data.syncStatus === "failed" ? "Discord: Failed" : "Discord: Pending";
            card.append(createText("p", syncLabel, `member-sync-status is-${data.syncStatus || "pending"}`));
            const actions = document.createElement("div");
            actions.className = "member-resource-actions";
            const retry = createText("button", data.syncStatus === "synced" ? "Update Discord" : "Sync to Discord", "btn btn-secondary");
            retry.type = "button";
            retry.addEventListener("click", async () => {
              retry.disabled = true;
              try {
                await publishAnnouncementToDiscord(item, data);
                setStatus("Announcement synchronized with Discord.", "success");
              } catch (error) {
                setStatus(String(error?.message || "Discord synchronization failed."), "error");
              }
              await renderAnnouncements();
            });
            const remove = createText("button", "Delete", "member-delete");
            remove.type = "button";
            remove.addEventListener("click", async () => {
              if (!window.confirm("Delete this announcement?")) return;
              remove.disabled = true;
              try {
                await callSyncApi(item.id, "DELETE", { discordMessageId: String(data.discordMessageId || "") });
                await dbSdk.deleteDoc(item.ref);
                await renderAnnouncements();
                setStatus("Announcement removed from the portal and Discord.", "success");
              } catch (error) {
                remove.disabled = false;
                setStatus(String(error?.message || "The announcement could not be deleted from Discord."), "error");
              }
            });
            actions.append(retry, remove);
            card.append(actions);
          }
          list.append(card);
        });
      };

      const renderResources = async () => {
        const list = document.querySelector("[data-resource-list]");
        if (!list) return;
        const snapshot = await dbSdk.getDocs(dbSdk.query(dbSdk.collection(db, "resources"), dbSdk.orderBy("createdAt", "desc"), dbSdk.limit(100)));
        list.replaceChildren();
        if (snapshot.empty) {
          list.append(createText("p", "No resources have been added yet.", "muted"));
          return;
        }
        snapshot.forEach((item) => {
          const data = item.data();
          const card = document.createElement("article");
          card.className = "member-resource";
          const copy = document.createElement("div");
          copy.append(createText("p", data.category || "Resource", "member-card-meta"), createText("h3", data.title || "Laboratory resource"), createText("p", data.description || ""));
          const actions = document.createElement("div");
          actions.className = "member-resource-actions";
          const link = createText("a", "Open resource", "btn btn-primary");
          const resourceUrl = secureHttpsUrl(data.url);
          if (resourceUrl) {
            link.href = resourceUrl;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
          } else {
            link.textContent = "Unavailable resource";
            link.classList.add("is-disabled");
            link.setAttribute("aria-disabled", "true");
          }
          actions.append(link);
          if (currentIsAdmin) {
            const remove = createText("button", "Delete", "member-delete");
            remove.type = "button";
            remove.addEventListener("click", async () => {
              if (!window.confirm("Delete this resource link?")) return;
              await dbSdk.deleteDoc(item.ref);
              await renderResources();
            });
            actions.append(remove);
          }
          card.append(copy, actions);
          list.append(card);
        });
      };

      const renderInvites = async () => {
        const list = document.querySelector("[data-member-invite-list]");
        if (!list || !currentIsAdmin) return;
        const snapshot = await dbSdk.getDocs(dbSdk.collection(db, "memberInvites"));
        const invites = snapshot.docs
          .map((item) => ({ id: item.id, ref: item.ref, ...item.data() }))
          .sort((a, b) => String(a.email || "").localeCompare(String(b.email || "")));
        list.replaceChildren();
        if (!invites.length) {
          list.append(createText("p", "No addresses are awaiting their first sign-in.", "muted"));
          return;
        }
        invites.forEach((invite) => {
          const row = document.createElement("article");
          row.className = "member-approval-row";
          const identity = document.createElement("div");
          identity.append(
            createText("strong", invite.displayName || invite.email || "Pre-approved member"),
            createText("span", `${invite.email || ""} - activates automatically on first sign-in`, "muted"),
          );
          const remove = createText("button", "Remove approval", "btn btn-secondary");
          remove.type = "button";
          remove.addEventListener("click", async () => {
            if (!window.confirm(`Remove pre-approval for ${invite.email || "this account"}?`)) return;
            remove.disabled = true;
            try {
              await dbSdk.deleteDoc(invite.ref);
              await renderInvites();
              setStatus("Pre-approved address removed.", "success");
            } catch (error) {
              setStatus(friendlyError(error), "error");
              remove.disabled = false;
            }
          });
          row.append(identity, remove);
          list.append(row);
        });
      };

      const renderMembers = async () => {
        const list = document.querySelector("[data-member-list]");
        if (!list || !currentIsAdmin) return;
        const snapshot = await dbSdk.getDocs(dbSdk.collection(db, "members"));
        const members = snapshot.docs.map((item) => ({ id: item.id, ref: item.ref, ...item.data() })).sort((a, b) => String(a.email || "").localeCompare(String(b.email || "")));
        list.replaceChildren();
        if (!members.length) {
          list.append(createText("p", "No member accounts have signed in yet.", "muted"));
          return;
        }
        members.forEach((member) => {
          const isCurrentAccount = member.id === auth.currentUser?.uid;
          const row = document.createElement("article");
          row.className = "member-approval-row";
          const identity = document.createElement("div");
          identity.append(createText("strong", member.displayName || member.email || "Member"), createText("span", `${member.email || ""}${isCurrentAccount ? " (current account)" : ""}`, "muted"));
          const controls = document.createElement("div");
          controls.className = "member-approval-controls";
          const role = document.createElement("select");
          role.setAttribute("aria-label", `Role for ${member.email || "member"}`);
          [{ value: "member", label: "Member" }, { value: "admin", label: "Administrator" }].forEach((choice) => {
            const option = document.createElement("option");
            option.value = choice.value;
            option.textContent = choice.label;
            option.selected = member.role === choice.value;
            role.append(option);
          });
          const toggle = createText("button", member.active ? "Deactivate" : "Approve", member.active ? "btn btn-secondary" : "btn btn-primary");
          toggle.type = "button";
          role.disabled = isCurrentAccount;
          toggle.disabled = isCurrentAccount;
          toggle.addEventListener("click", async () => {
            toggle.disabled = true;
            try {
              await dbSdk.updateDoc(member.ref, { active: !member.active, role: role.value, updatedAt: dbSdk.serverTimestamp() });
              if (member.active && member.email) {
                await dbSdk.deleteDoc(dbSdk.doc(db, "memberInvites", normalizeEmail(member.email)));
              }
              await Promise.all([renderMembers(), renderInvites()]);
            } catch (error) {
              setStatus(friendlyError(error), "error");
              toggle.disabled = false;
            }
          });
          role.addEventListener("change", async () => {
            role.disabled = true;
            await dbSdk.updateDoc(member.ref, { role: role.value, updatedAt: dbSdk.serverTimestamp() });
            await renderMembers();
          });
          controls.append(role, toggle);
          row.append(identity, controls);
          list.append(row);
        });
      };

      const bindAdminForms = (user) => {
        const inviteForm = document.querySelector("[data-member-invite-form]");
        inviteForm?.addEventListener("submit", async (event) => {
          event.preventDefault();
          const submit = inviteForm.querySelector('button[type="submit"]');
          submit.disabled = true;
          const values = new FormData(inviteForm);
          const email = normalizeEmail(values.get("email"));
          const displayName = String(values.get("displayName") || "").trim();
          try {
            if (!approvedAddressPattern.test(email)) throw new Error("invalid-address");
            const inviteRef = dbSdk.doc(db, "memberInvites", email);
            if ((await dbSdk.getDoc(inviteRef)).exists()) throw new Error("existing-invite");
            await dbSdk.setDoc(inviteRef, {
              email,
              displayName,
              active: true,
              role: "member",
              createdAt: dbSdk.serverTimestamp(),
              createdBy: user.uid,
            });
            inviteForm.reset();
            await renderInvites();
            setStatus(`${email} is pre-approved for member access.`, "success");
          } catch (error) {
            if (error?.message === "invalid-address") setStatus("Enter a valid @gmail.com or @nycu.edu.tw address.", "error");
            else if (error?.message === "existing-invite") setStatus("That address is already pre-approved.", "warning");
            else setStatus(friendlyError(error), "error");
          } finally {
            submit.disabled = false;
          }
        });

        const announcementForm = document.querySelector("[data-announcement-form]");
        announcementForm?.addEventListener("submit", async (event) => {
          event.preventDefault();
          const submit = announcementForm.querySelector('button[type="submit"]');
          submit.disabled = true;
          const values = new FormData(announcementForm);
          try {
            const title = String(values.get("title") || "").trim();
            const body = String(values.get("body") || "").trim();
            const itemRef = await dbSdk.addDoc(dbSdk.collection(db, "announcements"), {
              title,
              body,
              createdAt: dbSdk.serverTimestamp(),
              createdBy: user.uid,
              updatedAt: dbSdk.serverTimestamp(),
              syncStatus: "pending",
              syncError: "",
              discordMessageId: "",
              discordChannelId: "",
            });
            announcementForm.reset();
            try {
              await publishAnnouncementToDiscord({ id: itemRef.id, ref: itemRef }, { title, body });
              setStatus("Announcement published to the portal and Discord.", "success");
            } catch (syncError) {
              setStatus(`Announcement saved, but Discord sync needs attention: ${String(syncError?.message || "Unknown error")}`, "error");
            }
            await renderAnnouncements();
          } catch (error) {
            setStatus(friendlyError(error), "error");
          } finally {
            submit.disabled = false;
          }
        });

        const resourceForm = document.querySelector("[data-resource-form]");
        resourceForm?.addEventListener("submit", async (event) => {
          event.preventDefault();
          const submit = resourceForm.querySelector('button[type="submit"]');
          submit.disabled = true;
          const values = new FormData(resourceForm);
          const url = String(values.get("url") || "").trim();
          try {
            const parsedUrl = new URL(url);
            if (parsedUrl.protocol !== "https:") throw new Error("invalid-url");
            await dbSdk.addDoc(dbSdk.collection(db, "resources"), { title: String(values.get("title") || "").trim(), description: String(values.get("description") || "").trim(), category: String(values.get("category") || "Resource").trim() || "Resource", url, createdAt: dbSdk.serverTimestamp(), createdBy: user.uid });
            resourceForm.reset();
            await renderResources();
          } catch (error) {
            setStatus(error?.message === "invalid-url" ? "Resource links must use a secure HTTPS address." : friendlyError(error), "error");
          } finally {
            submit.disabled = false;
          }
        });

        const calendarForm = document.querySelector("[data-calendar-form]");
        calendarForm?.addEventListener("submit", async (event) => {
          event.preventDefault();
          const submit = calendarForm.querySelector('button[type="submit"]');
          submit.disabled = true;
          const values = new FormData(calendarForm);
          const calendarKey = String(values.get("calendarKey") || "");
          const calendarId = String(values.get("calendarId") || "").trim();
          try {
            if (!calendarPresentation[calendarKey] || !calendarIdPattern.test(calendarId)) throw new Error("invalid-calendar");
            await dbSdk.setDoc(dbSdk.doc(db, "calendars", calendarKey), {
              calendarId,
              active: values.get("active") === "on",
              updatedAt: dbSdk.serverTimestamp(),
              updatedBy: user.uid,
            });
            calendarForm.reset();
            calendarForm.querySelector('[name="active"]').checked = true;
            await renderCalendars();
            setStatus("Protected calendar setting saved.", "success");
          } catch (error) {
            setStatus(error?.message === "invalid-calendar" ? "Enter a valid Google group calendar ID." : friendlyError(error), "error");
          } finally {
            submit.disabled = false;
          }
        });
      };

      authSdk.onAuthStateChanged(auth, async (user) => {
        if (!user) {
          if (portalPage) window.location.replace("member-login.html");
          else setStatus("Sign in to continue.");
          return;
        }
        if (loginPage) {
          window.location.replace("member-portal.html");
          return;
        }
        document.querySelector("[data-member-account]")?.removeAttribute("hidden");
        const name = document.querySelector("[data-member-name]");
        if (name) name.textContent = user.displayName || user.email || "Signed-in member";
        const memberRef = dbSdk.doc(db, "members", user.uid);
        try {
          const email = normalizeEmail(user.email);
          const inviteRef = email ? dbSdk.doc(db, "memberInvites", email) : null;
          const inviteSnapshot = inviteRef ? await dbSdk.getDoc(inviteRef) : null;
          const hasInvite = Boolean(
            inviteSnapshot?.exists()
            && inviteSnapshot.data()?.active === true
            && normalizeEmail(inviteSnapshot.data()?.email) === email
            && inviteSnapshot.data()?.role === "member"
          );
          let memberSnapshot = await dbSdk.getDoc(memberRef);
          if (!memberSnapshot.exists()) {
            await dbSdk.setDoc(memberRef, { email: user.email || "", displayName: user.displayName || "", active: hasInvite, role: "member", createdAt: dbSdk.serverTimestamp() });
            memberSnapshot = await dbSdk.getDoc(memberRef);
          } else if (memberSnapshot.data()?.active !== true && hasInvite) {
            await dbSdk.updateDoc(memberRef, { active: true, updatedAt: dbSdk.serverTimestamp() });
            memberSnapshot = await dbSdk.getDoc(memberRef);
          }
          if (hasInvite && inviteRef && memberSnapshot.data()?.active === true) {
            await dbSdk.deleteDoc(inviteRef);
          }
          const member = memberSnapshot.exists() ? memberSnapshot.data() : {};
          if (member.active !== true) {
            document.querySelector("[data-member-denied]")?.removeAttribute("hidden");
            setStatus("Signed in - administrator approval is required.", "warning");
            return;
          }
          currentIsAdmin = member.role === "admin";
          document.querySelector("[data-member-content]")?.removeAttribute("hidden");
          const adminTab = document.querySelector("[data-member-admin-tab]");
          if (adminTab) adminTab.hidden = !currentIsAdmin;
          activatePortalTab("report-schedule");
          setStatus(currentIsAdmin ? "Administrator access verified." : "Member access verified.", "success");
          if (currentIsAdmin) bindAdminForms(user);
          await Promise.all([
            renderCalendars(),
            renderAnnouncements(),
            renderResources(),
            currentIsAdmin ? renderMembers() : Promise.resolve(),
            currentIsAdmin ? renderInvites() : Promise.resolve(),
          ]);
        } catch (error) {
          setStatus(friendlyError(error), "error");
        }
      });
    })().catch((error) => setStatus(friendlyError(error), "error"));
  }
}
