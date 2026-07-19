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
      const gmailAddressPattern = /^[A-Za-z0-9._%+\-]+@gmail\.com$/;

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
      const calendarPresentation = Object.freeze({
        instrument: {
          order: 2,
          eyebrow: "Equipment",
          title: "Instrument Reservation",
          description: "Check existing reservations, then create a booking with the instrument name and operator in the event title.",
          mode: "WEEK",
          action: "Create instrument booking",
          eventTitle: "[Instrument] Instrument name - Member name",
          eventDetails: "Instrument:\nMember:\nSample or project:\nNotes:",
        },
        leave: {
          order: 3,
          eyebrow: "Attendance",
          title: "Leave Schedule",
          description: "Review laboratory availability and submit leave dates with your name and leave type in the event title.",
          mode: "MONTH",
          action: "Submit leave schedule",
          eventTitle: "[Leave] Member name - Leave type",
          eventDetails: "Member:\nLeave type:\nReason or handover note:\nEmergency contact if needed:",
        },
        meeting: {
          order: 1,
          eyebrow: "Collaboration",
          title: "Lab Meetings",
          description: "View upcoming meetings and add a meeting invitation with the topic, location, and participants.",
          mode: "MONTH",
          account: "corelabfcu@gmail.com",
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
        calendars.forEach((calendar) => {
          const presentation = calendarPresentation[calendar.key];
          const calendarId = String(calendar.calendarId);
          const card = document.createElement("article");
          card.className = `member-calendar-card member-calendar-${calendar.key}`;
          const header = document.createElement("header");
          header.className = "member-calendar-card-head";
          const copy = document.createElement("div");
          copy.append(createText("p", presentation.eyebrow, "eyebrow"), createText("h3", presentation.title), createText("p", presentation.description));
          const actions = document.createElement("div");
          actions.className = "member-calendar-actions";
          const createLink = createText("a", presentation.action, "btn btn-primary");
          createLink.href = calendarUrl("https://calendar.google.com/calendar/render", {
            action: "TEMPLATE",
            text: presentation.eventTitle,
            details: presentation.eventDetails,
            add: calendarId,
            ctz: "Asia/Taipei",
            ...(presentation.account ? { authuser: presentation.account } : {}),
          });
          createLink.target = "_blank";
          createLink.rel = "noopener noreferrer";
          const openLink = createText("a", "Open in Google Calendar", "btn btn-secondary");
          openLink.href = calendarUrl("https://calendar.google.com/calendar/u/1/r", { cid: calendarId });
          openLink.target = "_blank";
          openLink.rel = "noopener noreferrer";
          actions.append(createLink, openLink);
          header.append(copy, actions);
          const frame = document.createElement("iframe");
          frame.className = "member-calendar-frame";
          frame.title = `${presentation.title} Google Calendar`;
          frame.src = calendarUrl("https://calendar.google.com/calendar/embed", { src: calendarId, ctz: "Asia/Taipei", mode: presentation.mode, showTitle: "0", showPrint: "0", showTabs: "0", showCalendars: "0", showTz: "0" });
          frame.loading = "lazy";
          frame.referrerPolicy = "strict-origin-when-cross-origin";
          card.append(header, frame);
          list.append(card);
        });
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
          list.append(createText("p", "No Gmail addresses are awaiting their first sign-in.", "muted"));
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
              setStatus("Pre-approved Gmail address removed.", "success");
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
            if (!gmailAddressPattern.test(email)) throw new Error("invalid-gmail");
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
            if (error?.message === "invalid-gmail") setStatus("Enter a valid @gmail.com address.", "error");
            else if (error?.message === "existing-invite") setStatus("That Gmail address is already pre-approved.", "warning");
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
          activatePortalTab("announcements");
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
