// The first visitor primes a persistent Cloudflare R2 copy of this exact APK.
// Signed Codemagic URLs expire; never mark the button "ready" without a server confirmation.
(async () => {
  const button = document.getElementById("apk-link");
  const status = document.getElementById("apk-status");
  if (!button || !status) return;
  button.setAttribute("aria-disabled", "true");
  status.textContent = "설치 파일을 준비하고 있습니다. 처음에는 잠시 걸릴 수 있어요.";
  try {
    const response = await fetch("./download?prepare=1", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || !data.ready) throw new Error(data.error || "준비 실패");
    const mb = data.bytes ? (data.bytes / 1048576).toFixed(1) : "";
    status.textContent = "다운로드 준비 완료" + (mb ? " · " + mb + "MB" : "");
    button.removeAttribute("aria-disabled");
  } catch (err) {
    status.textContent = "자동 준비에 실패했습니다. 잠시 후 다시 방문하거나 관리자에게 문의해 주세요.";
    status.classList.add("error");
    button.removeAttribute("aria-disabled"); // manual retry triggers the same safe server path
  }
})();