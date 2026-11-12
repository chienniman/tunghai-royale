# 東海大逃殺 Tunghai Royale

以**真實東海大學校園**為地圖的網頁版大逃殺遊戲，用瀏覽器就能玩，不用安裝。

> 目前版本：**v0.1 地圖預覽**。可以在校園裡自由走動，還沒有武器和敵人。

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
| C | 蹲下 |
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
index.html            入口頁面、HUD
src/main.js           遊戲主迴圈、天空光影、第三人稱鏡頭
src/player.js         角色模型與移動
src/hud.js            羅盤、小地圖、大地圖、地點名稱
src/world/terrain.js  地形（SRTM 高程）
src/world/ground.js   地表貼圖（道路、草地、樹林）
src/world/buildings.js 建築（牆面、窗戶、灰瓦斜屋頂）
src/world/chapel.js   路思義教堂
src/world/trees.js    樹木
src/world/colliders.js 碰撞
data/map.json         轉換後的地圖資料
data/elevation.json   高程資料
tools/build-map.ps1   OSM 原始資料 → map.json 轉換腳本
```

## 開發進度

- [x] v0.1 真實地形、建築、道路、樹木、路思義教堂、角色移動、羅盤、小地圖
- [ ] v0.2 武器、射擊、血量、背包、撿物資
- [ ] v0.3 AI 敵人、縮圈、跳傘
- [ ] v0.4 音效、結算畫面、效能優化
- [ ] 之後：多人連線

## 授權與資料來源

- 地圖資料 © [OpenStreetMap](https://www.openstreetmap.org/copyright) 貢獻者，採 ODbL 授權
- 高程資料：NASA SRTM（透過 [OpenTopoData](https://www.opentopodata.org/)）
- 3D 引擎：[three.js](https://threejs.org/)（MIT）
