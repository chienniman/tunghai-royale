# 東海大逃殺 Tunghai Royale

以**真實東海大學校園**為地圖的網頁版大逃殺遊戲，用瀏覽器就能玩，不用安裝。

> 目前版本：**v0.3 晝夜與阿飄**。白天在校園搜刮、打靶、對付哨戒機槍；天一黑，女鬼和阿飄就會從暗處冒出來。電腦和手機（橫向全螢幕）都能玩。

## 玩法

- **晝夜循環**：一天約 10 分鐘。白天搜刮物資、練槍；黃昏後天色轉暗、建築亮燈、手電筒自動打開，天亮時鬼怪全數消散。
- **女鬼**：白衣長髮，先在遠處飄著盯你，靠太近、盯著她看太久或開槍打她，她就會尖叫衝過來貼臉——護甲擋不住鬼，只能打散她或逃跑。
- **阿飄**：成群結隊飄過來咬人，血少但煩。
- **5 種武器**：手槍、衝鋒槍、突擊步槍、霰彈槍、狙擊步槍（開鏡），加上空手揮拳；有後座力、連射擴散、動態準星、過肩瞄準。
- **東海美食補血**：雞爪凍（小補）、東海炸雞（中補）、刈包（補滿）、東海冰淇淋（持續回血、小幅加速）。
- **物資與背包**：兩千多件物資散落在每棟建築周圍，依稀有度以顏色區分（灰／綠／藍／紫／金）；背包容量有限，頭盔與防彈背心會吸收子彈傷害並耗損，裝備會穿在角色身上。
- **白天的靶子**：出生點旁的人形靶場，以及 26 座會用雷射鎖定並反擊的哨戒機槍。
- **手機**：虛擬搖桿（推到底衝刺）、右側拖曳轉視角、射擊／瞄準／跳／蹲／換彈按鈕，武器卡與食物可直接點；開始後自動全螢幕並鎖定橫向（iPhone Safari 不支援網頁全螢幕，可「加入主畫面」後開啟）。

網址參數：`?time=22` 從晚上 10 點開始、`?timescale=3` 時間加速、`?touch=1` 在電腦上強制顯示觸控介面。

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
| 4 / 5 / 6 / 7 | 雞爪凍／炸雞／刈包／冰淇淋 |
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
src/ghosts.js         女鬼、阿飄（夜間敵人）
src/audio.js          程序化音效（槍聲、尖叫、夜晚環境音）
src/touch.js          手機觸控操作
src/loot.js           地上的物資（空間雜湊，只顯示附近的）
src/models.js         槍枝與物品模型、武器圖示
src/fx.js             曳光彈、槍口火光、塵土、傷害數字
src/hud.js            羅盤、小地圖、大地圖、地點名稱
src/hud-combat.js     血條、武器欄、撿取提示、背包面板
src/world/terrain.js  地形（SRTM 高程）
src/world/ground.js   地表貼圖（道路、草地、樹林）
src/world/grass.js    草叢
src/world/sky.js      晝夜循環、太陽月亮、星空、雲層、霧
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
- [x] v0.3 晝夜循環、女鬼與阿飄、東海美食、音效、手機橫向觸控
- [ ] v0.4 更多鬼怪種類、縮圈、跳傘、結算畫面、效能優化
- [ ] 之後：多人連線

## 授權與資料來源

- 地圖資料 © [OpenStreetMap](https://www.openstreetmap.org/copyright) 貢獻者，採 ODbL 授權
- 高程資料：NASA SRTM（透過 [OpenTopoData](https://www.opentopodata.org/)）
- 3D 引擎：[three.js](https://threejs.org/)（MIT）
- 字型：Noto Sans TC、Rajdhani（Google Fonts，OFL；載入失敗時使用系統字型）
