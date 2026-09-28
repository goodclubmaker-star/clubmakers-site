/* 우울폭주 성탄절 리뷰보드 v2: 설정/로케이션/씬 분리 + KEEP/NG 모아보기 */
(function () {
  (window.EXTRA_IMAGES || []).forEach(extra => {
    if (!DATA.images.some(im => im.file === extra.file)) DATA.images.push(extra);
  });

  let webtoonMode = false;
  const CATEGORY = {
    character: "캐릭터 설정",
    location: "로케이션 설정",
    scene: "씬 이미지",
    unclassified: "미분류",
    scenePending: "씬 미지정"
  };

  function guessedCategory(file) {
    const n = file.toLowerCase();
    if (/character|turnaround/.test(n)) return "character";
    if (/location|moodboard|img_/.test(n)) return "location";
    return "scene";
  }

  state.schemaVersion = 2;
  DATA.images.forEach(im => {
    state.img[im.file] = state.img[im.file] || {};
    const item = state.img[im.file];
    if (item.status === "OK") item.status = "KEEP";
    if (!item.category) item.category = guessedCategory(im.file);
    if (item.scene == null) item.scene = im.scene || 0;
  });
  save();

  current = "character";

  function categoryFor(file) {
    return state.img[file]?.category || guessedCategory(file);
  }

  function imagesForView(view) {
    if (view === "scenePending") {
      return DATA.images.filter(im => categoryFor(im.file) === "scene" && sceneFor(im) === 0);
    }
    if (typeof view === "number") {
      return DATA.images
        .filter(im => categoryFor(im.file) === "scene" && sceneFor(im) === view)
        .sort((a, b) => {
          const originalA = /ref-original/i.test(a.file) ? 1 : 0;
          const originalB = /ref-original/i.test(b.file) ? 1 : 0;
          return originalB - originalA || a.file.localeCompare(b.file);
        });
    }
    return DATA.images.filter(im => categoryFor(im.file) === view);
  }

  function countBy(view, status) {
    return imagesForView(view).filter(im => statusFor(im.file) === status).length;
  }

  function navLabel(label, view) {
    const all = imagesForView(view).length;
    const keep = countBy(view, "KEEP");
    const ng = countBy(view, "NG");
    return `${label} (${all}) · K${keep} N${ng}`;
  }

  renderNav = function () {
    const nav = document.getElementById("nav");
    const top = [
      ["character", "캐릭터 설정"],
      ["location", "로케이션 설정"],
      ["unclassified", "미분류"]
    ].map(([view, label]) => `<button class="${current === view ? "active" : ""}" onclick="current='${view}';render()">${navLabel(label, view)}</button>`).join("");
    const scenes = DATA.scenes.map(s => {
      const label = `S#${String(s.scene).padStart(2, "0")}`;
      return `<button class="${current === s.scene ? "active" : ""}" onclick="current=${s.scene};render()">${navLabel(label, s.scene)}</button>`;
    }).join("");
    const pending = `<button class="${current === 'scenePending' ? 'active' : ''}" onclick="current='scenePending';render()">${navLabel('씬 미지정', 'scenePending')}</button>`;
    nav.innerHTML = `<div class="navGroup">설정 자료</div>${top}<div class="navGroup sceneGroup">씬별 이미지</div>${pending}${scenes}`;
  };

  function categoryOptions(selected) {
    return Object.entries(CATEGORY).filter(([value]) => value !== "scenePending").map(([value, label]) => `<option value="${value}" ${selected === value ? "selected" : ""}>${label}</option>`).join("");
  }

  window.setCategory = function (file, value) {
    state.img[file] = state.img[file] || {};
    state.img[file].category = value;
    if (value !== "scene") state.img[file].scene = 0;
    save();
    render();
  };

  window.setSceneV2 = function (file, value) {
    state.img[file] = state.img[file] || {};
    state.img[file].category = "scene";
    state.img[file].scene = Number(value);
    save();
    render();
  };

  imgCard = function (im) {
    const st = statusFor(im.file);
    const sc = sceneFor(im);
    const cat = categoryFor(im.file);
    return `<div class="card ${st ? `status-${st.toLowerCase()}` : "status-none"}">
      <img src="images/${encodeURIComponent(im.file)}" onclick="zoom(this.src)">
      <div class="cardBody">
        <div class="fname" title="${esc(im.file)}">${esc(im.file)}</div>
        <div class="status two"><button class="${st === "KEEP" ? "on ok" : ""}" onclick="setImg('${im.file}','status','KEEP')">KEEP</button><button class="${st === "NG" ? "on ng" : ""}" onclick="setImg('${im.file}','status','NG')">NG</button></div>
        <select class="sceneSelect" onchange="setCategory('${im.file}',this.value)">${categoryOptions(cat)}</select>
        ${cat === "scene" ? `<select class="sceneSelect" onchange="setSceneV2('${im.file}',this.value)"><option value="0">씬 미지정</option>${Array.from({length:24},(_,i)=>`<option value="${i+1}" ${sc===i+1?'selected':''}>S#${String(i+1).padStart(2,'0')}</option>`).join('')}</select>` : ""}
      </div>
    </div>`;
  };

  function group(title, images, className) {
    return `<section class="reviewGroup ${className}"><h3 class="sectionTitle">${title} <span class="badge">${images.length}</span></h3><div class="gallery">${images.map(imgCard).join("") || '<div class="empty">해당 이미지 없음</div>'}</div></section>`;
  }

  function groupedImages(images) {
    const keep = images.filter(im => statusFor(im.file) === "KEEP");
    const ng = images.filter(im => statusFor(im.file) === "NG");
    const pending = images.filter(im => !statusFor(im.file));
    return group("KEEP", keep, "keepGroup") + group("NG", ng, "ngGroup") + group("미판정", pending, "pendingGroup");
  }

  function webtoonScene(scene, images) {
    const visible = images.filter(im => statusFor(im.file) !== "NG");
    const ng = images.filter(im => statusFor(im.file) === "NG");
    const panels = visible.map((im, index) => {
      const st = statusFor(im.file);
      return `<figure class="webtoonPanel">
        <div class="panelNumber">${String(index + 1).padStart(2, "0")}</div>
        <img src="images/${encodeURIComponent(im.file)}" onclick="zoom(this.src)" alt="S${String(scene.scene).padStart(2,"0")} 콘티 이미지 ${index+1}">
        <figcaption><span>${esc(im.file)}</span><div class="status two"><button class="${st === "KEEP" ? "on ok" : ""}" onclick="setImg('${im.file}','status','KEEP')">KEEP</button><button onclick="setImg('${im.file}','status','NG')">NG</button></div></figcaption>
      </figure>`;
    }).join("");
    const scriptFlow = scene.cuts.map((cut, index) => `<article class="webtoonCut">
      <div class="cutOrder">${String(index + 1).padStart(2,"0")}</div>
      <div><b>${esc(cut.id)} · ${esc(cut.action)}</b>${cut.dialogue ? `<p>${esc(cut.dialogue)}</p>` : ""}<small>${esc(cut.camera || "")}</small></div>
    </article>`).join("");
    return `<div class="webtoonHead"><div class="eyebrow">SCENE ${String(scene.scene).padStart(2,"0")}</div><h2>${esc(scene.meta.place || "")}</h2><p>${esc(scene.meta.core || "")}</p></div>
      <div class="webtoonStream">${panels || '<div class="empty">이 씬에 표시할 이미지가 없습니다.</div>'}</div>
      ${ng.length ? `<details class="ngDrawer"><summary>NG 이미지 ${ng.length}장</summary><div class="gallery">${ng.map(imgCard).join("")}</div></details>` : ""}
      <section class="scriptFlow"><h3>컷과 대사 흐름</h3>${scriptFlow}</section>`;
  }

  window.toggleWebtoon = function () {
    webtoonMode = !webtoonMode;
    if (webtoonMode && typeof current !== "number") {
      current = DATA.scenes.find(s => imagesForView(s.scene).length)?.scene || 1;
    }
    const button = document.getElementById("webtoonToggle");
    if (button) button.textContent = webtoonMode ? "분류 리뷰로 돌아가기" : "웹툰 콘티 보기";
    document.body.classList.toggle("webtoonMode", webtoonMode);
    render();
  };

  render = function () {
    renderNav();
    const main = document.getElementById("main");
    if (typeof current === "string") {
      const images = imagesForView(current);
      main.innerHTML = `<div class="sceneHead"><div><h2>${CATEGORY[current]}</h2><div class="meta">설정 자료와 씬 이미지를 분리하고 KEEP / NG로 모아 봅니다.</div></div><span class="badge">이미지 ${images.length}</span></div>${groupedImages(images)}`;
      updateSummary();
      return;
    }
    const scene = DATA.scenes[current - 1];
    const images = imagesForView(current);
    if (webtoonMode) {
      main.innerHTML = webtoonScene(scene, images);
      updateSummary();
      return;
    }
    main.innerHTML = `<div class="sceneHead"><div><h2>S#${String(current).padStart(2,"0")} · ${esc(scene.meta.place || "")}</h2><div class="meta">${esc(scene.meta.time || "")} · ${esc(scene.meta.chars || "")}<br><b>포인트</b> · ${esc(scene.meta.core || "")}</div></div><span class="badge">이미지 ${images.length} · 컷 ${scene.cuts.length}</span></div>${groupedImages(images)}<h3 class="sectionTitle cutReviewTitle">컷 구성 검토</h3>${scene.cuts.map(cutCard).join("")}${customCards(current)}<div class="addCut"><input id="newCut" placeholder="새로 추가하고 싶은 컷을 한 줄로 입력"><button onclick="addCustom(${current})">+ 컷 추가</button></div>`;
    updateSummary();
  };

  updateSummary = function () {
    const statuses = DATA.images.map(im => statusFor(im.file));
    const keep = statuses.filter(x => x === "KEEP").length;
    const ng = statuses.filter(x => x === "NG").length;
    const pending = DATA.images.length - keep - ng;
    document.getElementById("summary").textContent = `KEEP ${keep} · NG ${ng} · 미판정 ${pending}`;
  };

  exportJSON = function () {
    download("우울폭주_이미지분류_리뷰.json", JSON.stringify({version:2, exported:new Date().toISOString(), state}, null, 2), "application/json");
  };

  exportCSV = function () {
    const rows = [["파일명","분류","씬","판정","목표 폴더"]];
    DATA.images.forEach(im => {
      const cat = categoryFor(im.file);
      const sc = sceneFor(im);
      const status = statusFor(im.file) || "미판정";
      let folder = "미분류";
      if (cat === "character") folder = `캐릭터_설정/${status}`;
      if (cat === "location") folder = `로케이션_설정/${status}`;
      if (cat === "scene") folder = `씬별/S${String(sc).padStart(2,"0")}/${status}`;
      rows.push([im.file, CATEGORY[cat], sc || "", status, folder]);
    });
    const csv = "\ufeff" + rows.map(row => row.map(value => `"${String(value).replace(/"/g,'""')}"`).join(",")).join("\r\n");
    download("우울폭주_이미지분류.csv", csv, "text/csv");
  };

  const style = document.createElement("style");
  style.textContent = `
    .navGroup{font-size:12px;color:#89939e;padding:12px 10px 5px;text-transform:uppercase;letter-spacing:.08em}
    .sceneGroup{margin-top:8px;border-top:1px solid var(--line)}
    .reviewGroup{margin-bottom:34px;padding:0 0 20px;border-bottom:1px solid var(--line)}
    .reviewGroup .sectionTitle{display:flex;align-items:center;gap:8px}
    .keepGroup .sectionTitle{color:#7ed6ad}.ngGroup .sectionTitle{color:#ef9a9a}.pendingGroup .sectionTitle{color:#b7bec6}
    .card.status-keep{border-color:#397b5e}.card.status-ng{border-color:#944f4f}.card.status-none{border-color:#3a424b}
    .status.two button{min-height:34px}.cutReviewTitle{border-top:2px solid #46515d;padding-top:28px}
    .webtoonMode{background:#090a0c}.webtoonMode .layout{grid-template-columns:190px 1fr}.webtoonMode .main{padding:0 28px 80px}
    .webtoonHead{max-width:940px;margin:0 auto;padding:52px 24px 32px;text-align:center}.webtoonHead .eyebrow{color:#9aa7b5;letter-spacing:.22em;font-size:12px}.webtoonHead h2{font-size:34px;margin:10px 0}.webtoonHead p{color:#b8c0c8;line-height:1.7}
    .webtoonStream{max-width:940px;margin:0 auto}.webtoonPanel{position:relative;margin:0 0 72px;background:#11151a;border:1px solid #2d343d;box-shadow:0 22px 70px #0008}.webtoonPanel img{display:block;width:100%;height:auto;cursor:zoom-in}.webtoonPanel figcaption{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 14px;color:#9da7b1;font-size:12px}.webtoonPanel .status{width:180px}.panelNumber{position:absolute;left:-46px;top:12px;color:#5f6974;font:700 13px ui-monospace,monospace;letter-spacing:.12em}
    .scriptFlow{max-width:760px;margin:100px auto 0}.scriptFlow h3{text-align:center;font-size:22px;margin-bottom:28px}.webtoonCut{display:grid;grid-template-columns:48px 1fr;gap:14px;padding:18px 0;border-top:1px solid #2d343d;line-height:1.55}.webtoonCut p{color:#e8e4dc;margin:7px 0}.webtoonCut small{color:#87919c}.cutOrder{color:#64707d;font:700 13px ui-monospace,monospace}.ngDrawer{max-width:940px;margin:30px auto;color:#d18d8d}.ngDrawer summary{cursor:pointer;padding:12px 0}
    @media(max-width:800px){.webtoonMode .layout{grid-template-columns:1fr}.webtoonMode .main{padding:0 10px 60px}.webtoonHead{padding-top:30px}.webtoonHead h2{font-size:26px}.panelNumber{left:8px;top:8px;background:#000a;padding:5px;border-radius:4px}.webtoonPanel{margin-bottom:38px}.webtoonPanel figcaption{align-items:flex-start;flex-direction:column}.webtoonPanel .status{width:100%}}
  `;
  document.head.appendChild(style);

  const toolbar = document.querySelector(".toolbar");
  const webtoonButton = document.createElement("button");
  webtoonButton.id = "webtoonToggle";
  webtoonButton.textContent = "웹툰 콘티 보기";
  webtoonButton.onclick = window.toggleWebtoon;
  toolbar.insertBefore(webtoonButton, toolbar.firstChild);
  const csvButton = [...toolbar.querySelectorAll("button")].find(b => b.textContent.includes("컷 CSV"));
  if (csvButton) csvButton.textContent = "이미지 분류 CSV 저장";
  document.querySelector(".top h1").textContent = "우울폭주 성탄절 · 설정 / 로케이션 / 씬별 이미지 리뷰";
  render();
})();
