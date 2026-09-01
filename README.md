# 流光秘境攻略（玩家看到的網站）

這個資料夾是**玩家實際訪問的網站**。裡面沒有後台，後台已經搬到另一個獨立、有上鎖的網址，見下方說明。

---

## 這個資料夾要做什麼

把整個資料夾內容 push 到一個 **public** 的 GitHub repo，開啟該 repo 的 **Settings → Pages**（Source 選 `Deploy from a branch`，分支 `main`、資料夾 `/root`），就會得到一個 `https://你的帳號.github.io/repo名稱/` 的網址，這就是玩家看到的網站。

這個 repo 保持 public 沒關係——裡面只有攻略內容、卡片資料、圖片，本來就是要給玩家看的。**真正需要上鎖、不給玩家看到的「後台」已經不在這個資料夾裡了**，是另一個獨立部署、有上鎖的網站，操作方式請見 `admin-site` 資料夾裡的 `SETUP-GUIDE.md`（一步一步、用最簡單的方式寫）。

---

## 目錄結構

```
index.html / stages.html / stage-detail.html / cards.html / my-teams.html
data/           所有攻略、卡片等公開資料（JSON）
assets/img/     圖片
src/            前端程式碼
```

## 資料結構

跟之前版本完全一樣，所有資料以 `id` 互相參照，`filter-schema.json` 驅動篩選面板，新增資料完全透過後台的表單完成，不需要手動編輯這裡的任何 JSON。細節可以參考 `admin-site/SETUP-GUIDE.md` 裡「怎麼新增卡片 / 關卡」的部分。

## 玩家資料

玩家自己建立的隊伍只存在玩家自己瀏覽器的 LocalStorage，不會寫回這個 repo，也不會被其他玩家看到。
