const params = new URLSearchParams(location.search);
const callback = params.get("callback") || "";
const state = params.get("state") || "";
const status = document.querySelector("#status");
const button = document.querySelector("#sign-in");

function fail(message) {
  status.textContent = message;
  status.className = "error";
  button.disabled = false;
}

let callbackUrl;
try {
  callbackUrl = new URL(callback);
  if (callbackUrl.protocol !== "http:" || callbackUrl.hostname !== "127.0.0.1" || callbackUrl.pathname !== "/auth-callback" || !state) {
    throw new Error("invalid callback");
  }
} catch (_error) {
  fail("無效的桌面 App 登入請求。請從 CORE Lab Desktop 重新開啟同步。");
  button.disabled = true;
}

button.addEventListener("click", async () => {
  button.disabled = true;
  status.className = "";
  status.textContent = "正在開啟 Google 登入…";
  try {
    const version = "11.10.0";
    const [appSdk, authSdk] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${version}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${version}/firebase-auth.js`),
    ]);
    const app = appSdk.initializeApp(window.CORE_LAB_FIREBASE_CONFIG || {});
    const auth = authSdk.getAuth(app);
    const provider = new authSdk.GoogleAuthProvider();
    const credential = await authSdk.signInWithPopup(auth, provider);
    const idToken = await credential.user.getIdToken(true);
    const response = await fetch(callbackUrl.href, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state, idToken }),
    });
    if (!response.ok) throw new Error("desktop callback rejected");
    status.textContent = "登入完成，已回傳桌面 App。現在可以關閉此頁。";
    status.className = "ok";
    button.hidden = true;
  } catch (error) {
    console.error("[desktop-sync]", error);
    fail("登入或連線失敗，請確認桌面 App 仍在等待後再試一次。");
  }
});
