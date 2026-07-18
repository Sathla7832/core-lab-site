const loginPage = document.querySelector("[data-member-login]");
const portalPage = document.querySelector("[data-member-portal]");

if (loginPage || portalPage) {
  const statusElement = document.querySelector("[data-member-status]");
  const config = window.CORE_LAB_FIREBASE_CONFIG || {};
  const bootstrapAdmin = String(window.CORE_LAB_BOOTSTRAP_ADMIN || "").toLowerCase();
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
            const remove = createText("button", "Delete", "member-delete");
            remove.type = "button";
            remove.addEventListener("click", async () => {
              if (!window.confirm("Delete this announcement?")) return;
              await dbSdk.deleteDoc(item.ref);
              await renderAnnouncements();
            });
            card.append(remove);
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
          link.href = data.url || "#";
          link.target = "_blank";
          link.rel = "noopener noreferrer";
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
          const row = document.createElement("article");
          row.className = "member-approval-row";
          const identity = document.createElement("div");
          identity.append(createText("strong", member.displayName || member.email || "Member"), createText("span", member.email || "", "muted"));
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
          toggle.addEventListener("click", async () => {
            toggle.disabled = true;
            await dbSdk.updateDoc(member.ref, { active: !member.active, role: role.value, updatedAt: dbSdk.serverTimestamp() });
            await renderMembers();
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
        const announcementForm = document.querySelector("[data-announcement-form]");
        announcementForm?.addEventListener("submit", async (event) => {
          event.preventDefault();
          const submit = announcementForm.querySelector('button[type="submit"]');
          submit.disabled = true;
          const values = new FormData(announcementForm);
          try {
            await dbSdk.addDoc(dbSdk.collection(db, "announcements"), { title: String(values.get("title") || "").trim(), body: String(values.get("body") || "").trim(), createdAt: dbSdk.serverTimestamp(), createdBy: user.uid });
            announcementForm.reset();
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
        const email = String(user.email || "").toLowerCase();
        const memberRef = dbSdk.doc(db, "members", user.uid);
        const bootstrap = email === bootstrapAdmin;
        try {
          let memberSnapshot = await dbSdk.getDoc(memberRef);
          if (bootstrap) {
            await dbSdk.setDoc(memberRef, { email: user.email || bootstrapAdmin, displayName: user.displayName || "CORE Lab Administrator", active: true, role: "admin", lastLoginAt: dbSdk.serverTimestamp() }, { merge: true });
            memberSnapshot = await dbSdk.getDoc(memberRef);
          } else if (!memberSnapshot.exists()) {
            await dbSdk.setDoc(memberRef, { email: user.email || "", displayName: user.displayName || "", active: false, role: "member", createdAt: dbSdk.serverTimestamp() });
            memberSnapshot = await dbSdk.getDoc(memberRef);
          }
          const member = memberSnapshot.exists() ? memberSnapshot.data() : {};
          if (!bootstrap && member.active !== true) {
            document.querySelector("[data-member-denied]")?.removeAttribute("hidden");
            setStatus("Signed in - administrator approval is required.", "warning");
            return;
          }
          currentIsAdmin = bootstrap || member.role === "admin";
          document.querySelector("[data-member-content]")?.removeAttribute("hidden");
          if (currentIsAdmin) document.querySelector("[data-member-admin]")?.removeAttribute("hidden");
          setStatus(currentIsAdmin ? "Administrator access verified." : "Member access verified.", "success");
          if (currentIsAdmin) bindAdminForms(user);
          await Promise.all([renderAnnouncements(), renderResources(), currentIsAdmin ? renderMembers() : Promise.resolve()]);
        } catch (error) {
          setStatus(friendlyError(error), "error");
        }
      });
    })().catch((error) => setStatus(friendlyError(error), "error"));
  }
}
