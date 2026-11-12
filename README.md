# 東海夜遊（開發中，原名東海大逃殺）

> **專案已從大逃殺改成恐怖撤離遊戲，目前在 `horror` 分支開發。現況與接手說明請看 [HANDOFF.md](HANDOFF.md)。以下內容是大逃殺時期寫的，尚未更新。**

以**真實東海大學校園**為地圖的網頁版大逃殺遊戲，用瀏覽器就能玩，不用安裝。

**馬上玩：https://chienniman.github.io/tunghai-royale/**

> 目前版本：**v0.3 開發中**。可以在校園裡撿槍、打靶、補血，並且有會縮小的毒圈；還沒有敵人和多人連線。

## 地圖有多真實？

| 項目 | 資料來源 |
|---|---|
| 建築位置、形狀（734 棟） | OpenStreetMap |
| 道路、步道、文理大道 | OpenStreetMap |
| 草地、樹林、相思林、牧場、運動場 | OpenStreetMap |
| 地形高低（海拔 95–243 m，大度山坡度） | NASA SRTM 30 m 衛星高程 |
| 路思義教堂 | 依實際尺寸手工建模（雙曲面金黃琉璃瓦） |

## v0.2 有什麼

- **5 把槍**：T75 手槍、T77 衝鋒槍、T91 步槍、M12 霰彈槍、T93 狙擊槍（含狙擊鏡），各有不同的傷害、射速、後座力、彈道擴散和有效射程
- **射擊手感**：後座力會把準星往上帶、連射越打越散、移動和跳躍時更不準、蹲下更穩；右鍵瞄準會拉近鏡頭
- **真實的彈道判定**：子彈從槍口飛出，會被牆、樹、地形擋住；打到牆上會留彈孔
- **物資**：全地圖約 1,600 件物資散落在建築周圍（槍、4 種子彈、繃帶、急救包、能量飲料）
- **血量與補血**：繃帶（補到 75）、急救包（補滿）、能量飲料（緩慢回血）；從高處摔下會受傷
- **打靶**：校園內有 70 個人形靶，可以練槍，爆頭傷害加倍
- **角色動作**：有膝蓋和手肘的骨架，雙手持槍（反向運動學）、跑步、蹲下、換彈都有對應姿勢
- **音效**：槍聲、換彈、腳步聲、環境風聲，全部即時合成，不需下載音檔
- **毒圈**：安全區分 6 階段縮小，圈外每秒扣血且越後面越痛；小地圖和大地圖會標出目前的毒圈（藍）和下一個安全區（白），場景中有一道藍色能量牆

## 操作

| 按鍵 | 動作 |
|---|---|
| WASD | 移動 |
| 滑鼠 | 轉視角 |
| Shift | 衝刺 |
| 空白鍵 | 跳 |
| C | 蹲下 |
| 左鍵 | 射擊 |
| 右鍵（按住） | 瞄準 |
| R | 換彈 |
| F | 撿東西 |
| 1 / 2 / 3 | 切換主武器 / 主武器 / 副武器（滾輪也可以） |
| X | 收槍 |
| G | 丟掉手上的槍 |
| 4 / 5 / 6 | 繃帶 / 急救包 / 能量飲料 |
| Tab（按住） | 背包 |
| M | 大地圖 |
| Esc | 暫停 |

## 本機執行

不需要安裝 Node.js 或 Python。在 repo 資料夾執行：

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1
```

然後打開 http://localhost:8080/

## 專案結構

```
index.html             入口頁面、HUD
src/main.js            遊戲主迴圈、天空光影
src/player.js          角色骨架、移動、持槍姿勢（IK）
src/camera.js          第三人稱鏡頭、瞄準、狙擊鏡
src/hud.js             羅盤、地圖、血量、彈藥、背包
src/audio.js           即時合成音效
src/game/items.js      武器、彈藥、補給的數值與模型
src/game/combat.js     射擊、換彈、補血、背包
src/game/raycast.js    子彈與地形、建築的碰撞判定
src/game/loot.js       物資生成與顯示
src/game/targets.js    人形靶
src/game/effects.js    曳光、槍口火光、彈孔、揚塵
src/game/zone.js       毒圈（由種子碼與時間推算，連線時不需同步）
src/world/terrain.js   地形（SRTM 高程）
src/world/ground.js    地表貼圖（道路、草地、樹林）
src/world/buildings.js 建築（牆面、窗戶、灰瓦斜屋頂）
src/world/chapel.js    路思義教堂
src/world/trees.js     樹木
src/world/colliders.js 碰撞
data/map.json          轉換後的地圖資料
data/elevation.json    高程資料
tools/build-map.ps1    OSM 原始資料 → map.json 轉換腳本
```

## 開發進度

- [x] v0.1 真實地形、建築、道路、樹木、路思義教堂、角色移動、羅盤、小地圖
- [x] v0.2 武器、射擊、血量、背包、撿物資、打靶、音效
- [ ] v0.3 毒圈（已完成）、多人連線約朋友、AI 敵人、跳傘、勝負結算
- [ ] v0.4 畫面升級：後製特效（景深、泛光、環境光遮蔽）、草地、更細緻的建築外觀
- [ ] v0.5 可進入的建築內部、防具、配件、載具


## 授權與資料來源

- 地圖資料 © [OpenStreetMap](https://www.openstreetmap.org/copyright) 貢獻者，採 ODbL 授權
- 高程資料：NASA SRTM（透過 [OpenTopoData](https://www.opentopodata.org/)）
- 3D 引擎：[three.js](https://threejs.org/)（MIT）
