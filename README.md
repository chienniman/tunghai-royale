# 東海大逃殺 Tunghai Royale

以**真實東海大學校園**為地圖的網頁版大逃殺遊戲，用瀏覽器就能玩，不用安裝。

> 目前版本：**v0.2 武器與物資**。可以在校園裡搜刮物資、開槍打靶、對付哨戒機槍；AI 對手、縮圈和跳傘會在 v0.3 加入。

## v0.2 有什麼

- **5 種武器**：手槍、衝鋒槍、突擊步槍、霰彈槍、狙擊步槍（開鏡），加上空手揮拳
- **射擊手感**：後座力、連射擴散、動態準星、過肩瞄準、曳光彈、槍口火光、彈著塵土、命中提示與傷害數字
- **物資**：兩千多件物資散落在每棟建築周圍，依稀有度以顏色區分（灰／綠／藍／紫／金），高級貨有光柱
- **背包**：容量有限，撿到更大的背包才裝得更多；`Tab` 開背包整理、丟棄、使用
- **血量與護甲**：繃帶、急救包、東海鮮乳（能量飲料）；頭盔與防彈背心會吸收傷害並耗損，裝備會穿在角色身上
- **可以打的東西**：人形靶（出生點旁就是靶場）與 26 座會反擊的**哨戒機槍**——被雷射鎖定就要找掩體
- **畫面**：有關節的角色與雙手持槍動作、午後斜陽、雲層、草叢

## 地圖有多真實？

| 項目 | 資料來源 |
|---|---|
| 建築位置、形狀（734 棟） | OpenStreetMap |
| 道路、步道、文理大道 | OpenStreetMap |
| 草地、樹林、相思林、牧場、運動場 | OpenStreetMap |
| 地形高低（海拔 95–243 m，大度山坡度） | NASA SRTM 30 m 衛星高程 |
| 路思義教堂 | 依實際尺寸手工建模（雙曲面金黃琉璃瓦） |

## 操作

| 按鍵 | 動作 |
|---|---|
| WASD | 移動 |
| 滑鼠 | 轉視角 |
| Shift | 衝刺 |
| 空白鍵 | 跳 |
| C | 蹲下（準度較高） |
| 滑鼠左鍵 | 開火／揮拳 |
| 滑鼠右鍵 | 瞄準（狙擊步槍會開鏡） |
| R | 換彈 |
| F | 撿起最近的物資 |
| 1 / 2 / 3、滾輪 | 主武器／副武器／空手 |
| 4 / 5 / 6 | 繃帶／急救包／東海鮮乳 |
| Tab | 背包 |
| M | 大地圖 |
| Esc | 暫停 |
| Enter | 被淘汰後重新部署 |

## 本機執行

不需要安裝 Node.js 或 Python。在 repo 資料夾執行：

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1
```

然後打開 http://localhost:8080/

## 專案結構

```
index.html            入口頁面、HUD
src/main.js           遊戲主迴圈、光影、鏡頭、介面狀態
src/player.js         角色模型（關節四肢、持槍 IK）、移動、血量
src/input.js          鍵盤、滑鼠、pointer lock
src/items.js          物品定義、稀有度、掉落表（純資料）
src/inventory.js      背包、武器欄、護甲（純邏輯）
src/combat.js         射擊、換彈、補血、撿取
src/targets.js        人形靶、哨戒機槍
src/loot.js           地上的物資（空間雜湊，只顯示附近的）
src/models.js         槍枝與物品模型、武器圖示
src/fx.js             曳光彈、槍口火光、塵土、傷害數字
src/hud.js            羅盤、小地圖、大地圖、地點名稱
src/hud-combat.js     血條、武器欄、撿取提示、背包面板
src/world/terrain.js  地形（SRTM 高程）
src/world/ground.js   地表貼圖（道路、草地、樹林）
src/world/grass.js    草叢
src/world/sky.js      天空、太陽、雲層
src/world/buildings.js 建築（牆面、窗戶、灰瓦斜屋頂）
src/world/chapel.js   路思義教堂
src/world/trees.js    樹木
src/world/colliders.js 碰撞與射線判定
tests/                單元測試（npm test，不需安裝任何套件）
data/map.json         轉換後的地圖資料
data/elevation.json   高程資料
tools/build-map.ps1   OSM 原始資料 → map.json 轉換腳本
```

## 開發進度

- [x] v0.1 真實地形、建築、道路、樹木、路思義教堂、角色移動、羅盤、小地圖
- [x] v0.2 武器、射擊、血量、背包、撿物資、人形靶與哨戒機槍
- [ ] v0.3 AI 敵人、縮圈、跳傘
- [ ] v0.4 音效、結算畫面、效能優化
- [ ] 之後：多人連線

## 授權與資料來源

- 地圖資料 © [OpenStreetMap](https://www.openstreetmap.org/copyright) 貢獻者，採 ODbL 授權
- 高程資料：NASA SRTM（透過 [OpenTopoData](https://www.opentopodata.org/)）
- 3D 引擎：[three.js](https://threejs.org/)（MIT）
- 字型：Noto Sans TC、Rajdhani（Google Fonts，OFL；載入失敗時使用系統字型）
