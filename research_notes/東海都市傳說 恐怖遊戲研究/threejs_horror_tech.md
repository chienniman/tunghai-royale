# three.js r170 夜間恐怖遊戲技術工具箱（無建置步驟、CDN import map、靜態託管）

- 研究日期：2026-11-12。對象：three.js r170（`three@0.170.0`），純 ES modules + import map，無 bundler。
- 此時 three 最新版是 0.187.0（jsDelivr 套件資料，2026-11-12 查）；r170 仍可用，下列函式庫版本都相容 r170。
- 方法：網路搜尋（中文先、英文後）＋直接開頁面讀原始文件／原始碼／npm 與 jsDelivr 套件資料；另外在本機瀏覽器（Chromium 156）**實際載入 CDN 模組並量測**（見 §1、§2）。
- 限制（請先讀）：
  - 本輪的網路搜尋額度在約 30 次查詢後用完（額度與其他代理共用），之後只能直接開已知網址。中文搜尋只跑了 4 次，結果幾乎都是基礎教學，沒有可用的一手中文技術資料；本檔的技術來源以英文一手資料為主。
  - 打不開的頁面：Codrops（403）、OpenGameArt（403）、Adobe Mixamo FAQ（403）、Smithsonian 3D（403）、BBC Sound Effects（被擋）、GamesRadar／PC Gamer（內容被截斷）。凡是只靠搜尋摘要的說法，文中都標「僅搜尋摘要」。
  - 實測只在一台機器（AMD Radeon 內顯）上、用合成場景跑；數字用來比「相對成本」，不是保證值。
- 專案現況對照：我讀了 repo 目前的程式（commit `764d2c8`），它已經比任務描述走得更前面：夜空、`FogExp2(0.014)`、月光（有陰影）、帶 cookie 與電池的手電筒、路燈（光暈 Points＋地面光斑 decal＋3 盞輪調真燈）、程序化女鬼（rim、溶解、glitch）、合成音訊（HRTF、卷積殘響）、鬼的感知（看見／被照到／視線）。**還沒有的：後處理、尋路、低解析度模式。** 對照與優先順序見 §11。

---

## 1. 已實測可用的 import map（2026-11-12）

在 Chromium 156 的空白頁動態注入下列 import map，再 `import()` 每個模組，全部成功（`THREE.REVISION === "170"`、`postprocessing` 匯出 127 個名稱、`yuka` 104 個、`three-pathfinding` 的 `Pathfinding` 是 function）。

```html
<script type="importmap">
{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/",
  "postprocessing": "https://cdn.jsdelivr.net/npm/postprocessing@6.39.6/build/index.js",
  "yuka": "https://cdn.jsdelivr.net/npm/yuka@0.7.8/build/yuka.module.js",
  "three-pathfinding": "https://cdn.jsdelivr.net/npm/three-pathfinding@1.3.0/dist/three-pathfinding.module.js"
} }
</script>
```

要點與陷阱：

| 項目 | 事實 | 來源 |
|---|---|---|
| r170 的 build | `build/three.module.js`（1.31 MB）是單檔，r170 還沒有拆出 `three.core.js` | jsDelivr 檔案清單 |
| pmndrs `postprocessing` | 最新穩定 6.39.6（建置日 2026-11-01），peer `three >= 0.168.0 < 0.188.0`；`build/index.js`（635 KB，未壓縮 ESM）只 import 裸名稱 `"three"`，所以交給 import map 解析即可。v7 還在 beta（7.0.0-beta.16） | package.json、檔頭、jsDelivr |
| **不要用 jsDelivr 的 `/+esm`** | `postprocessing@6.39.6/+esm` 會把 three 改寫成 `/npm/three@0.187.0/+esm`，等於載入第二份、而且版本不同的 three | 實際讀檔 |
| esm.sh 的寫法 | 要用 esm.sh 就加 `?external=three`（或 `*` 前綴）讓 three 留給 import map；論壇 2024-04 的範例是把 three、addons、postprocessing 全部放 esm.sh | esm.sh 文件、three 論壇 |
| three 內建 addons | r170 的 `examples/jsm/postprocessing/` 有 EffectComposer、RenderPass、OutputPass、UnrealBloomPass、FilmPass、GlitchPass、RenderPixelatedPass、AfterimagePass、LUTPass、ShaderPass…；`shaders/` 有 VignetteShader、RGBShiftShader、FilmShader、HueSaturationShader、BrightnessContrastShader… | jsDelivr 檔案清單 |
| yuka | 0.7.8（2022-09-17 發佈，之後沒有新版），`build/yuka.module.js` 443 KB，無相依 | npm registry、jsDelivr |
| three-pathfinding | 1.3.0（2024-05-17），10.5 KB，只 import `"three"` | npm registry、實際讀檔 |
| recast-navigation-js | 0.44.0；官方有 import map 範例（unpkg），需要 `@recast-navigation/core/dist/index.mjs`（103 KB）＋`@recast-navigation/wasm/dist/recast-navigation.wasm-compat.js`（1.01 MB，WASM 內嵌），先 `await init()` | README、官方 vanilla 範例、jsDelivr |
| navcat | 0.4.1，純 JS、同作者的新函式庫；相依 `mathcat`，three 輔助模組 peer `three >= 0.180`，對 r170＋單檔 CDN 不方便 | npm registry、README |
| 量測工具 | `stats-gl` 4.2.3（MIT，`dist/main.js`）；three 自帶 `three/addons/libs/stats.module.js`、`lil-gui.module.min.js` | npm registry、three 手冊 |

來源：
https://data.jsdelivr.com/v1/package/npm/three ・ https://data.jsdelivr.com/v1/package/npm/three@0.170.0 ・ https://cdn.jsdelivr.net/npm/postprocessing@6.39.6/package.json ・ https://data.jsdelivr.com/v1/package/npm/postprocessing@6.39.6 ・ https://cdn.jsdelivr.net/npm/postprocessing@6.39.6/build/index.js ・ https://cdn.jsdelivr.net/npm/postprocessing@6.39.6/+esm ・ https://esm.sh/ ・ https://discourse.threejs.org/t/where-to-download-or-include-the-pmndrs-postprocessing-library/63518 ・ https://registry.npmjs.org/yuka ・ https://data.jsdelivr.com/v1/package/npm/yuka@0.7.8 ・ https://registry.npmjs.org/three-pathfinding ・ https://cdn.jsdelivr.net/npm/three-pathfinding@1.3.0/dist/three-pathfinding.module.js ・ https://github.com/isaac-mason/recast-navigation-js ・ https://raw.githubusercontent.com/isaac-mason/recast-navigation-js/main/examples-integrations/three-vanilla-example/index.html ・ https://data.jsdelivr.com/v1/package/npm/@recast-navigation/wasm@0.44.0 ・ https://registry.npmjs.org/navcat ・ https://github.com/isaac-mason/navcat ・ https://registry.npmjs.org/stats-gl/latest

---

## 2. 本機實測數據（相對成本用）

環境：Chromium 156、`ANGLE (AMD Radeon(TM) Graphics, 裝置 0x1681, Direct3D11)`（內顯，應是 Radeon 680M 等級）、12 邏輯核心。
量法：畫布 1920×1080、pixelRatio 1、`antialias:false`；每個設定暖機 10 幀，再跑 3 輪 × 36 幀（鏡頭水平轉一整圈），每幀後 `readPixels` 強制同步，取 3 輪的中位數。沒有 vsync，數字是「一幀的 CPU＋GPU 牆鐘時間」。
合成場景：2500×1600 m 地面、730 棟方盒建築（各自一個 Mesh）、10,000 棵圓錐樹（InstancedMesh）、半球光＋月光；除特別註明外用 `MeshLambertMaterial`。**不是實際遊戲場景**（實際遊戲用 `MeshStandardMaterial`、建築已合併成 3 個大 Mesh），所以只看差值與比例。

### 2.1 霧、手電筒、陰影、燈數（1080p）

| 設定 | ms／幀 | 備註 |
|---|---|---|
| 無霧、`far=3000` | 2.56 | 約 200 draw calls |
| `FogExp2(0.012)`＋`far=250` | 1.55 | draw calls 降到 24–34；省約 1.0 ms（−40%） |
| ＋手電筒 SpotLight（無陰影） | 1.68 | ＋0.13 |
| ＋陰影 1024、PCF、樹也投影 | 2.77 | ＋1.1 |
| 同上、樹不投影 | 2.46 | ＋0.8 |
| 陰影 512／2048（PCF） | 2.48／2.50 | 貼圖大小在這個場景量不出差別 |
| PCFSoft／Basic（1024） | 2.83／2.48 | 差距在雜訊範圍（±0.3） |
| ＋cookie（`spot.map`） | 2.61 | 等於免費 |
| Lambert ＋4／8／16／32 盞 PointLight | 3.66／4.22／4.74／6.90 | 每盞約 ＋0.13–0.26 ms |
| 全部換 `MeshStandardMaterial`、0 盞 | 4.40（最小值 3.93） | 光是 PBR 就比 Lambert 多約 1.4–1.8 ms |
| Standard ＋8／16／32 盞 | 5.56／7.47／10.66 | 每盞約 ＋0.15–0.2 ms |

### 2.2 後處理（基準：直接算到螢幕 2.70 ms；場景含霧、手電筒陰影、cookie）

| 管線 | ms／幀 | 比直接算多 |
|---|---|---|
| three `EffectComposer`：RenderPass＋OutputPass | 4.26 | ＋1.6（HalfFloat 緩衝＋一次全螢幕） |
| three：＋FilmPass＋Vignette＋RGBShift | 6.87 | ＋4.2（每多一個 ShaderPass 約 ＋0.85） |
| three：UnrealBloomPass＋OutputPass | 6.37 | ＋3.7 |
| three：Bloom＋Film＋Vignette＋RGBShift＋Output | 8.70 | ＋6.0 |
| pmndrs：RenderPass＋EffectPass(ToneMapping) | 4.01 | ＋1.3 |
| pmndrs：色差＋暗角＋色調映射＋雜訊（**合併成一個 pass**） | 4.73 | ＋2.0 |
| pmndrs：Bloom(mipmapBlur)＋色調映射 | 5.78 | ＋3.1 |
| pmndrs：色差＋Bloom＋暗角＋色調映射＋雜訊 | 6.10 | ＋3.4 |
| pmndrs：上一行＋第二個 EffectPass（掃描線＋ColorDepth） | 6.34 | ＋3.6 |

同樣五個效果，pmndrs 6.10 ms，three 內建鏈 8.70 ms（少 30%）。

### 2.3 解析度（pmndrs 完整鏈：色差＋Bloom＋暗角＋色調映射＋雜訊＋掃描線＋ColorDepth）

| 繪圖緩衝 | ms／幀 |
|---|---|
| 3840×2160 | 13.89（不加後處理直接算：5.53） |
| 1920×1080 | 6.34 |
| 1280×720 | 4.76 |
| 960×540 | 3.85 |
| 640×360 | 2.84（不加後處理直接算：1.74） |
| 480×270 | 2.82（已被 CPU／draw call 卡住，不再下降） |

**640×360 跑完整後處理鏈（2.84 ms）≈ 1080p 完全不加後處理（2.70 ms）。** 低解析度＋最近鄰放大，剛好把整套後處理的錢付掉。

### 2.4 格子尋路與視線（純 JS，TypedArray）

地圖 2500×1600 m；障礙＝730 個隨機矩形＋10,000 個單格樹（阻擋率約 20%，比真實校園密）。

| 項目 | 4 m 格（625×400＝25 萬格） | 2 m 格（1250×800＝100 萬格） |
|---|---|---|
| 從玩家出發的全圖 BFS 距離場 | 4.7 ms | 18.3 ms |
| 只算玩家周圍 160 m 的 BFS | 約 0.1 ms | 約 0.3 ms |
| A*（8 向、二元堆）對角跨全圖 | 17 ms（展開 4.5 萬格） | 43.8 ms（展開 13 萬格） |
| A* 約 117 m | 約 0.1 ms | 約 0.6 ms |
| 100 m 視線（格子 DDA） | 0.35 µs／條 | 0.69 µs／條 |

（`performance.now()` 解析度 0.1 ms，小數字只能當量級。）

---

## 3. 夜間光照

### 3.1 月光、曝光、色調映射

- 色調映射常數（r170）：`NoToneMapping`、Linear、Reinhard、Cineon、`ACESFilmicToneMapping`、`AgXToneMapping`、`NeutralToneMapping`；`toneMappingExposure` 預設 1。
- three 論壇 2024-12-15 的比較文（回覆到 2025-05）：不加色調映射時低亮度場景太暗、高亮處整片過曝；ACES 對比高、整體偏暗、會偏色（橘偏黃）；AgX 刻意低對比、色彩中性，適合之後再調色；Neutral 重視色彩忠實。donmccurdy 在回覆裡的意思是：色調映射只負責成像，對比與飽和度這類風格應該交給另一個調色步驟。換色調映射後光的強度要重調。
- 人眼在暗處對藍綠較敏感、紅色顯得更暗（Purkinje 效應，維基百科）。「夜晚＝偏藍、去飽和、紅色壓暗」是影視慣例，這層連結是我的推論，不是該條目的說法。
- **建議**：
  1. 黑暗要「看得懂」靠的是環境光下限，不是把曝光拉高：留一個偏藍的 `HemisphereLight` 當最低可見度，月光方向光只負責輪廓。
  2. 用 pmndrs 時 `renderer.toneMapping` 必須是 `NoToneMapping`，在 EffectPass 最後放 `ToneMappingEffect`。夜景先試 `ToneMappingMode.AGX`（暗部不會被壓死），再用 `BrightnessContrastEffect`／`HueSaturationEffect` 補對比與去飽和；想要戲劇性就用 ACES。
  3. 「眼睛適應」用手動的：手電筒關掉後 2–4 秒把曝光從 1.0 慢慢拉到約 1.6，開燈時快速拉回。pmndrs 有 `REINHARD2_ADAPTIVE` 自動曝光，但行為較難控制。（這條是設計判斷。）

來源：https://threejs.org/docs/pages/WebGLRenderer.html ・ https://discourse.threejs.org/t/tone-mapping-overview/75204 ・ https://github.com/pmndrs/postprocessing ・ https://pmndrs.github.io/postprocessing/public/docs/class/src/effects/ToneMappingEffect.js~ToneMappingEffect.html ・ https://pmndrs.github.io/postprocessing/public/docs/variable/index.html ・ https://en.wikipedia.org/wiki/Purkinje_effect

### 3.2 霧：線性、指數、高度霧、體積霧

- three 手冊（r170）：`Fog(near, far)` 可以指定從哪裡開始淡出，所以最常用；`FogExp2(density)` 較接近真實。霧只作用在物件上，背景要自己設成同色；每個材質有 `fog` 開關。
- `FogExp2` 的霧量是 `1 − exp(−(density × 距離)²)`（r170 的 fog chunk）。換算：霧量 50% 的距離＝0.833／density、90%＝1.517／density、99%＝2.146／density、99.9%＝2.628／density。現行 density 0.014 → 50% 在 59 m、90% 在 108 m、99% 在 153 m、200 m 已是 99.96%。
- 霧＋把 `camera.far` 縮到「完全被霧吃掉的距離再多一點」，是唯一「加了氣氛還變快」的項目（§2.1：2.56 → 1.55 ms）。
- 高度霧／地面霧：three 論壇 2025-12-08 的「High-Performance Ground Fog」：霧量只看世界座標 Y，加多層 FBM 噪聲飄動，只修補需要霧的材質；作者說在六年前的 iPhone 上 60 FPS，但有使用者回報手機幾乎卡死，討論串沒有解決。程式在 CodePen，沒標授權。同作者 2025-10 的 XZFog（MIT）用 `onBeforeCompile` 注入、會串接材質原有的 callback。
- 修補 shader 的快取規則：r170 的 `customProgramCacheKey()` 預設回傳 `onBeforeCompile.toString()`，所以「callback 原始碼不同」的材質本來就會分開快取；**同一段 callback 靠閉包變數產生不同 shader 時**（例如同一個工廠函式做出有霧與沒霧兩種版本），才必須自己回傳不同的 key，否則會共用到同一支程式。
- 體積光／體積霧（Maxime Heckel，2025-06-10）：後處理裡沿視線 raymarch，用深度緩衝截斷、用光源的陰影圖判斷遮蔽。作者把 250 步降到 50 步、步長 0.05 加大到 0.5，再用藍噪聲抖動起點。成本隨解析度與步數走，沒有給 ms 數字。
- **建議**：維持 `FogExp2`；把霧色做成隨視線方向變化（朝台中市區那一側偏橘、其他方向偏藍黑），只要改 `fog_fragment` 一行混色；地面霧用「世界 Y 指數衰減 × 低頻噪聲」修補地面、建築、樹三種材質即可。真正的 raymarch 體積霧不建議：50 步的全螢幕 raymarch 在內顯上會比整套後處理還貴。手電筒的「光柱」用一個加法混合的圓錐 Mesh（邊緣用 fresnel 淡出）假造，drei 的 volumetric SpotLight 就是這個思路。

來源：https://cdn.jsdelivr.net/npm/three@0.170.0/src/materials/Material.js ・ https://raw.githubusercontent.com/mrdoob/three.js/r170/manual/en/fog.html ・ https://threejs.org/docs/pages/FogExp2.html ・ https://raw.githubusercontent.com/mrdoob/three.js/r170/src/renderers/shaders/ShaderChunk/fog_fragment.glsl.js ・ https://discourse.threejs.org/t/high-performance-ground-fog-for-games-three-js/88522 ・ https://discourse.threejs.org/t/xzfog-horizontal-distance-fog-for-three-js-top-down-isometric-games/87619 ・ https://threejs.org/docs/pages/Material.html ・ https://blog.maximeheckel.com/posts/shaping-light-volumetric-lighting-with-post-processing-and-raymarching/ ・ https://drei.docs.pmnd.rs/staging/spot-light

### 3.3 光害、路燈、真燈數量

- three 是 forward renderer：每盞燈都讓每個受光片段多算一次；**燈的數量一變，所有受影響的 shader 重新編譯**（論壇 2019-12，Usnul）。同串 Mugen87 建議真燈只留在玩家附近，遠處用簡單物件或烘焙；Usnul 說他自己用幾何光束與光暈 sprite 假造。
- 論壇 2023-03（viridia）：固定 10 盞 PointLight 的池子，每幀把最近的光源抄進去，沒用到的設 `intensity = 0`，重編譯就消失了；回覆者說這是 OpenGL 時代遊戲的常見做法。
- 實測（§2.1）：1080p 內顯上每多一盞無陰影 PointLight 約 0.13–0.26 ms；`MeshStandardMaterial` 本身比 Lambert 多約 1.4–1.8 ms。
- **建議**：
  1. 真燈預算：桌機內顯約 8 盞以內（1 方向光＋1 手電筒＋最多 6 盞點光），手機 4 盞以內；數量永不變，只改位置與強度。現行程式（3 盞輪調路燈＋手電筒 spill＋槍口閃光常駐）已經照這個做法。
  2. 其餘幾百盞路燈＝自發光燈頭＋加法混合光暈（一個 `Points` 一次畫完）＋地面光斑 decal（一個 InstancedMesh）。現行程式已經這樣做。
  3. 想讓「沒有真燈的路燈」也照亮牆面與角色：把所有路燈畫進一張俯視的 2D 光照貼圖（例如 1024×640，約 2.4 m／像素），在地面、建築、角色材質裡用世界 XZ 取樣加到 emissive，成本是每片段一次貼圖取樣。（這是我的組合建議，沒有現成來源。）
  4. 光害：天空 shader 已有朝台中的地平線橘光；再把同色加進霧色與半球光的天空色，畫面才會一致。

來源：https://discourse.threejs.org/t/performance-when-handling-large-number-of-lights-in-a-city-game/11802 ・ https://discourse.threejs.org/t/point-lights-and-performance-revisited/49316

---

## 4. 手電筒

- `SpotLight(color, intensity(cd), distance, angle, penumbra, decay)`；`map` 是調變光色的貼圖，**`castShadow` 為 false 時 `map` 無效**（官方文件的警告）。
- 官方範例 `webgl_lights_spotlight`（r170）：intensity 100、angle π/6、penumbra 1、decay 2、陰影 1024、`shadow.camera.near/far = 1/10`、`shadow.focus = 1`；cookie 貼圖 `generateMipmaps = false`、`colorSpace = SRGBColorSpace`。
- 論壇 2026-02：有人回報 `map` 邊緣出現雜紋，原因沒確認；建議用無壓縮 PNG、或用 alpha 取代純黑。r183 測不出接縫。
- 陰影成本：N 盞投影燈＝場景畫 N+1 次；點光一盞就畫 6 次（three 手冊）。論壇 2024-04（manthrax）：他只用一到兩盞投影燈，靠 shadow camera 的 near／far 與貼圖大小壓成本。`LightShadow.autoUpdate`（預設 true）與 `needsUpdate` 可以改成手動更新。
- 實測（§2.1）：無陰影手電筒 ＋0.13 ms；1024 陰影 ＋0.8–1.1 ms；512／1024／2048 沒有可量的差別；cookie 免費。
- **建議**：
  1. 手電筒是唯一值得每幀更新陰影的燈。月光陰影改成「玩家移動超過幾公尺才更新」（`moon.shadow.autoUpdate = false`，需要時設 `needsUpdate = true`），可以省掉幾乎一整次場景繪製；代價是角色的月影不會每幀動，夜裡看不太出來。
  2. 陰影型別用 `PCFShadowMap` 就好；`shadow.camera.far` 不必等於光的照射距離，30–40 m 之外的影子在霧裡看不到。
  3. 閃爍只改 `intensity`（不要動 `visible`、不要增減燈）；電池、閃爍、光束慣性現行程式都有了。
  4. 光柱：加法混合圓錐（見 §3.2），在霧裡才有「手電筒切開黑暗」的感覺。
- 第一人稱還是越肩（設計判斷，無外部來源）：第一人稱時光源幾乎就在眼睛位置，影子都躲在物體後面，陰影圖的價值很低，除非光源偏離眼睛 0.2–0.3 m（現行程式偏右 0.22 m）；越肩視角光源在鏡頭前方，影子會掃過牆面，自己的身體也會擋光，同一張陰影圖得到的戲劇效果多得多，而且看得到角色本人，比較容易做出「又恐怖又好笑」。建議預設越肩，瞄準或進室內時切第一人稱（現在已有 V 鍵切換）。

來源：https://threejs.org/docs/pages/SpotLight.html ・ https://raw.githubusercontent.com/mrdoob/three.js/r170/examples/webgl_lights_spotlight.html ・ https://discourse.threejs.org/t/spotlight-map-issue-projecting-artefacts/89885 ・ https://raw.githubusercontent.com/mrdoob/three.js/r170/manual/en/shadows.html ・ https://discourse.threejs.org/t/how-to-optimize-shadow-rendering-in-three-js-for-better-performance/64681 ・ https://threejs.org/docs/pages/LightShadow.html

---

## 5. 後處理

### 5.1 兩套函式庫

- three 內建：`EffectComposer` 依序跑 pass，最後放 `OutputPass` 做色調映射與 sRGB。r170 的事實：
  - `FilmPass(intensity = 0.5, grayscale = false)` **只有顆粒，沒有掃描線**。
  - `UnrealBloomPass(resolution, strength, radius, threshold)`：5 層 mip、HalfFloat，每幀 13–14 次全螢幕繪製。
  - `RenderPixelatedPass(pixelSize, scene, camera)`：**場景畫兩次**（顏色＋法線）再合成，對這個場景太貴。
  - `GlitchPass(dt_size = 64)`：隨機間隔觸發，`goWild = true` 時每幀都抖。
  - `VignetteShader`（offset、darkness）、`RGBShiftShader`（amount 0.005、angle）。
- pmndrs `postprocessing`：`EffectPass` 把多個 Effect 合成一個 shader、用單一三角形畫全螢幕。README 要求：renderer 用 `antialias:false, stencil:false, depth:false`、`renderer.toneMapping = NoToneMapping`、用色調映射時開 `frameBufferType: HalfFloatType`、最後放 `ToneMappingEffect`。
  - 合併規則（wiki，2024-02）：一個 EffectPass 只能有一個「卷積型」效果；卷積型不能和改 UV 的效果放一起，要拆成不同 pass。建議順序：SMAA → SSAO → DoF → 色差 → Bloom → God Rays → 暗角 → 色調映射 → LUT／調色 → 顆粒 → 像素化。
  - 相關效果與預設值：`BloomEffect`（`mipmapBlur` 預設 true、threshold 1.0、levels 8、radius 0.85）、`NoiseEffect`（預設 SCREEN 混合、`premultiply` false）、`VignetteEffect`（offset 0.5、darkness 0.5）、`ChromaticAberrationEffect`（`radialModulation`、`modulationOffset` 0.15）、`ScanlineEffect`（density 1.25、OVERLAY）、`ColorDepthEffect`（bits 16）、`PixelationEffect`（granularity 30）、`GlitchEffect`（`GlitchMode`：DISABLED／SPORADIC／CONSTANT_MILD／CONSTANT_WILD）、`LUT3DEffect`、`HueSaturationEffect`、`BrightnessContrastEffect`。
  - 自訂 Effect：fragment 寫 `mainImage(inputColor, uv, outputColor)`（或帶 depth 的版本）、`mainUv(uv)`；可用 `time`、`resolution`、`texelSize`、`inputBuffer`、`depthBuffer`。
- **兩套不要混用**（搜尋摘要裡的社群警告：緩衝格式不相容；我沒有另外查證，但也沒有混用的理由）。

### 5.2 PS1／VHS／CRT 配方

- 低解析度＋最近鄰放大：把 canvas 的繪圖緩衝縮小、用 CSS 放大並設 `image-rendering: pixelated`（MDN）。裝置像素比不是整數時像素會大小不一。
- 頂點吸附（PS1 抖動）：在投影之後把 `gl_Position.xy / w` 乘上格數、取整、再乘回 w。Roman Liutikov（2023-03-11）用 320×240 當格子；2025-06 有人把它包成一份 `ShaderMaterial` gist。Codrops 2024-09-03 有一篇用 `onBeforeCompile` 做同一件事的教學（僅搜尋摘要，頁面 403）。
- 仿射貼圖（貼圖扭動）：論壇 2025-03-31 的做法才是對的：vertex 裡把 UV 乘上 clip-space 的 w，fragment 裡再除回內插後的 w；2019 年那個「直接把 gl_Position 除以 w」的做法會改到幾何，頂點出畫面時會壞掉。
- 色深與抖色：Roman Liutikov 轉 YUV 後每通道量化成 15 階、用 8×8 門檻矩陣；Maxime Heckel（2024-08-06）用 Bayer 2×2／4×4／8×8 或 128 px 藍噪聲貼圖當門檻，量化式是 `floor(c × (n−1) + 0.5) / (n−1)`，都包成 pmndrs 的自訂 Effect。
- CRT／VHS：沒有找到可直接引用的 three.js 一手教學（Codrops 2026-08-22 的「Sixty Frames for the Record」有 CRT 牆與效能心得，但只拿到搜尋摘要：作者說 dpr 2 在大視窗上等於 970 萬像素的緩衝，像素預算比 dpr 重要）。做法就是組合：掃描線＋水平抖動＋RGB 分離＋滾動的追蹤條＋顆粒，寫成一個自訂 Effect。

### 5.3 「每毫秒氣氛」排名與建議組合（依 §2 實測，1080p 內顯）

| 順位 | 項目 | 成本 | 說明 |
|---|---|---|---|
| 1 | 霧＋縮短 `far` | −1.0 ms | 還倒賺 |
| 2 | 內部解析度降到 640×360～960×540＋`image-rendering: pixelated` | −2.5～−3.5 ms（相對 1080p 完整鏈） | 同時得到 PS1 顆粒感，並把整套後處理的成本抵掉 |
| 3 | 一個合併的 EffectPass：色調映射＋暗角＋顆粒＋徑向色差 | 進 composer（含色調映射）＋1.3 ms，再加色差、暗角、顆粒共 ＋0.7 ms | 暗角把視線壓到中央、顆粒遮掉色帶與低面數的乾淨感 |
| 4 | 手電筒陰影 | ＋0.8–1.1 ms | 會動的影子是最便宜的「有東西在動」 |
| 5 | Bloom（mipmapBlur） | ＋1.4–1.8 ms | 路燈、窗、鬼的 rim 才會「發光」；門檻設高（0.85 以上），只讓自發光過 |
| 6 | 第二個 EffectPass：掃描線＋ColorDepth | ＋0.25 ms | 平常關著，鬼被看見時才開，配 `GlitchEffect` |
| 不做 | raymarch 體積霧、SSAO、DoF、`RenderPixelatedPass` | 很貴 | 對低面數夜景幫助有限 |

建議的實作順序：先上第 3 項（最小管線），再做第 2 項的解析度選項（設定裡給 1×／½／⅓），最後才加 Bloom。

```js
// pmndrs 最小恐怖管線（§2.2 量到 6.10 ms 的那一組）
renderer.toneMapping = THREE.NoToneMapping;
const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new EffectPass(camera,
  new ChromaticAberrationEffect({ offset: new THREE.Vector2(0.0012, 0.0012), radialModulation: true, modulationOffset: 0.3 }),
  new BloomEffect({ mipmapBlur: true, luminanceThreshold: 0.85, intensity: 0.6 }),
  new VignetteEffect({ offset: 0.3, darkness: 0.75 }),
  new ToneMappingEffect({ mode: ToneMappingMode.AGX }),
  new NoiseEffect({ premultiply: true })));
// 低解析度模式：三個尺寸一起改，CSS 負責放大
const k = 3, w = Math.floor(innerWidth / k), h = Math.floor(innerHeight / k);
renderer.setPixelRatio(1); renderer.setSize(w, h, false); composer.setSize(w, h);
renderer.domElement.style.cssText = 'width:100vw;height:100vh;image-rendering:pixelated';
```

### 5.4 接進現有專案時一定會踩到的三件事

1. **自訂 ShaderMaterial 的顏色**：three 的色彩管理文件說，自訂材質要自己做輸出色彩空間轉換（`ShaderMaterial` 加 `colorspace_fragment` chunk）。現在的天空 dome shader 直接輸出顯示用的顏色；一旦改成 composer（場景先畫進線性 HalfFloat 緩衝，最後才統一做色調映射與 sRGB），天空會被再編碼一次而變亮、變灰。接後處理時要把天空的顏色改成線性值（或在 shader 裡先做 sRGB→線性），並重調月亮、星星、城市光的強度。pmndrs 的 README 也提醒：色調映射作用在整張畫面，清除色看起來會和沒有後處理時不同。
2. `antialias: true` 對 composer 沒用（MSAA 只作用在預設 framebuffer）。改 `antialias:false`；需要抗鋸齒就用 pmndrs `EffectComposer` 的 `multisampling` 選項（預設 0，需要 WebGL 2）或 SMAA；低解析度像素風格則乾脆不要。另外 pmndrs composer 的 `frameBufferType` 預設是 `UnsignedByteType`，要自己指定 `HalfFloatType`。
3. 現在 pixelRatio 上限 1.5：1080p 螢幕就是 2880×1620＝467 萬像素。§2.3 顯示成本幾乎跟像素數成正比；加了後處理後，內顯機器應該把上限降到 1，或直接用低解析度模式。

來源：https://raw.githubusercontent.com/mrdoob/three.js/r170/manual/en/post-processing.html ・ https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/FilmPass.js ・ https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/shaders/FilmShader.js ・ https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/UnrealBloomPass.js ・ https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/RenderPixelatedPass.js ・ https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/GlitchPass.js ・ https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/OutputPass.js ・ https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/shaders/VignetteShader.js ・ https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/shaders/RGBShiftShader.js ・ https://github.com/pmndrs/postprocessing ・ https://github.com/pmndrs/postprocessing/wiki/Effect-Merging ・ https://github.com/pmndrs/postprocessing/wiki/Custom-Effects ・ https://pmndrs.github.io/postprocessing/public/docs/ ・ https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look ・ https://romanliutikov.com/blog/ps1-style-graphics-in-threejs ・ https://gist.github.com/bandinopla/497bcd86ba2bb662e0ab4cb47190748e ・ https://discourse.threejs.org/t/affine-texture-mapping-in-shader-ps1-style-graphics/5945 ・ https://blog.maximeheckel.com/posts/the-art-of-dithering-and-retro-shading-web/ ・ https://raw.githubusercontent.com/mrdoob/three.js/r170/docs/manual/en/introduction/Color-management.html ・（僅搜尋摘要）https://tympanus.net/codrops/2024/09/03/how-to-create-a-ps1-inspired-jitter-shader-with-react-three-fiber/ ・ https://tympanus.net/codrops/2026/08/22/sixty-frames-for-the-record-a-three-js-game-seven-fly-throughs-and-a-wall-of-crts/

---

## 6. 鬼魂渲染

現況：`src/ghosts/figure.js` 已經在 `MeshStandardMaterial` 上用 `onBeforeCompile` 做了布料擺動、裙襬淡出、噪聲溶解（螢幕空間抖色 discard）、fresnel rim、溶解邊緣發光、水平帶狀 glitch。下面是查到的技術與「還能加什麼」。

- 半透明的三條路：
  - `transparent`＋`opacity`：要排序，雙面物件預設畫兩次（`forceSinglePass` 可改成一次）；`depthWrite:false` 可避免自己擋自己。
  - `alphaHash`（r154 起）：依隨機門檻丟棄片段，不用排序，但有顆粒，官方說可用 TAA 降噪。對恐怖遊戲，這個顆粒正好是風格。
  - `alphaTest`：硬邊鏤空（髮片、破布）。
- Fresnel rim：`pow(1 − |dot(法線, 視線)|, n)` 加到 emissive。論壇 2019–2022 的討論：加在 `diffuseColor` 會受光照影響，直接寫輸出顏色就是不受光的；注入點會隨 three 版本改變。現成的 MIT 單檔材質：ektogamat 的 holographic material（fresnel、掃描線、閃爍、加法混合，每幀呼叫 `update()`）與 fake glow material（不靠 bloom 的假光暈，需要平滑法線的網格）。
- 溶解：噪聲值和門檻比較後 discard，門檻附近一條窄帶加自發光；Codrops 2025-02-17 有完整教學（含粒子，僅搜尋摘要，頁面 403）。
- 布料與頭髮的假動作：GPU Gems 3 第 16 章（Crytek，Tiago Sousa）的植被作法：整體彎曲＋細節擺動，用頂點色當硬度與相位權重，用三角波比 sin 便宜。裙襬、長髮、符紙都能用同一招：越靠近末端權重越大。
- 看板幻影（billboard）：three 手冊的 facade 技巧：把 3D 物件算進 64×64 的 render target 當 sprite 貼圖，遠處用 sprite 取代；手冊說通常比畫 3D 物件快，並建議算 8 個方向。
- 低面數為什麼嚇人：GamesRadar 訪談的標題引用開發者的話，大意是限制會逼出奇怪而獨特的折衷；其他幾篇評論的共同說法是「看不清楚，想像力會補上更糟的東西」，《沉默之丘》用霧掩蓋繪製距離是標準例子。這些都只有搜尋摘要，屬於評論而不是研究。
- **建議（還能加的）**：
  1. 被看見時的畫面 glitch：用現有的 `see.seen` 與距離算一個 0–1 的強度，推給後處理（`GlitchEffect.mode`、色差 offset、顆粒不透明度、掃描線），同時把 HRTF 耳語音量拉高。成本約 0.25 ms，而且只在事件發生時。
  2. 遠距離幻影：50 m 以外只放一張 sprite（或一個 `Points`），玩家一照到或一轉頭就消失。一個 draw call，沒有骨架與陰影成本。
  3. 熱浪式扭曲：寫一個改 UV 的自訂 Effect，以鬼在螢幕上的投影位置為中心扭曲；它屬於「改 UV」型，不能和色差放在同一個 EffectPass。
  4. 低面數要可怕靠的是：只給輪廓（rim＋黑臉）、不自然的移動（被看時靜止、沒被看時瞬移，現行程式已有被看見就減速）、過長的比例、以及低解析度與顆粒把細節吃掉。臉不要做細。
  5. 鬼的材質可以改用 Lambert 或 Basic 當底（它主要靠 emissive 與 rim），省掉 PBR 的片段成本。

來源：https://threejs.org/docs/pages/Material.html ・ https://discourse.threejs.org/t/fresnel-shader-or-similar-effect/9997 ・ https://github.com/ektogamat/threejs-vanilla-holographic-material ・ https://github.com/ektogamat/fake-glow-material-threejs ・ https://developer.nvidia.com/gpugems/gpugems3/part-iii-rendering/chapter-16-vegetation-procedural-animation-and-shading-crysis ・ https://raw.githubusercontent.com/mrdoob/three.js/r170/manual/en/billboards.html ・ https://registry.npmjs.org/three-custom-shader-material/latest（6.4.0，MIT，有 `/vanilla` 入口，peer three ≥ 0.159）・（僅搜尋摘要）https://tympanus.net/codrops/2025/02/17/implementing-a-dissolve-effect-with-shaders-and-particles-in-three-js/ ・ https://www.gamesradar.com/games/survival-horror/indie-devs-discuss-why-low-poly-works-so-well-for-horror-i-actually-think-those-limitations-encourage-weird-unique-compromises ・ https://www.pcgamer.com/inside-the-next-indie-frontier-ps1-style-horror-games

---

## 7. 音訊

現況：`src/spooks.js` 已用原生 WebAudio 做 HRTF `PannerNode`（inverse、refDistance 2.5、rolloff 1.4）、共用的卷積殘響（2.4 秒、程式產生的指數衰減噪聲）、耳語、心跳、鐘、夜蟲。不需要改用 three 的 Audio 類別。

- three 的 `PositionalAudio`：建構時就把 `panner.panningModel` 設成 `'HRTF'`；每幀用線性 ramp 把位置推到 `currentTime + listener.timeDelta`（比每幀 `setValueAtTime` 平滑）。`Audio.setNodeSource(node)` 可以把任意 AudioNode 當聲源。
- `PannerNode`：`equalpower`（預設，簡單省資源）與 `HRTF`（用真人量測的脈衝響應做卷積，品質較高）；距離模型 linear／inverse（預設）／exponential。
- 成本（Paul Adenot，《Web Audio API performance and debugging notes》，頁面沒有日期）：HRTF panner「很貴」，位置改變時要在新舊脈衝之間交叉淡化，移動中的立體聲源最多同時要四個卷積器；equalpower「相當便宜」、無狀態。`ConvolverNode` 也「很貴」，成本隨脈衝長度增加；低階裝置跑不動長尾殘響時，建議改用延遲線＋全通＋低通。他還建議：位置一直在變或在手機上，就用 equalpower；「很短的殘響＋equalpower」可以當 HRTF 的便宜替代品。
- 程式產生脈衝響應：指數衰減的白噪聲就是堪用的殘響（reverbGen 引用 Moorer 的觀察）；gskinner 2019-02 的做法是用 `OfflineAudioContext` 先把噪聲過高通（約 500 Hz）與低通（約 5 kHz）再當 IR，並加 pre-delay 與多抽頭延遲模擬早期反射。
- 自動播放：`AudioContext` 要在使用者手勢裡建立或 `resume()`（MDN）。現行程式已在「點擊開始」時處理。
- 程序化環境音配方：
  - 風（Noisescape 的森林配方）：白噪聲 → 低通 350 Hz 當風體、帶通 1800 Hz 當葉片摩擦、帶通 4500 Hz 當遠處沙沙聲；用 0.2 Hz 的 LFO 做陣風、0.5 Hz 做葉片晃動。大度山風大，這組很適合。
  - 鐘（Sound On Sound，Gordon Reid，2002-08）：鐘用加法合成最好；主要分音調成 2:3:4，人耳會聽到隱含的基音；另外加一對相差約八度、略微失諧的正弦波當低鳴尾音，敲擊瞬間用短的 FM 音。
  - 蟲鳴、耳語、心跳：沒有找到可引用的一手配方。常見作法是高頻正弦加快速開關（蟲）、帶通噪聲音節（耳語，現行程式已是這樣）、兩下低頻短音（心跳）；這是常識層級，未附來源。
- **建議**：
  1. HRTF 只給最近的 3–4 個鬼，其餘與手機一律 `equalpower`；位置用短的 ramp（`setTargetAtTime` 或線性 ramp）而不是每幀硬設。
  2. 遮蔽：鬼沒有視線時，在 emitter 前串一個低通（700 Hz 左右），有視線時回到全頻；`see.los` 已經有了，等於免費。
  3. 距離感：越遠乾聲越小、送去殘響的比例越高。
  4. 殘響 IR 保持 2.5 秒以內；手機改成 1 秒或換成延遲線。
  5. 好笑的音效（掃把、牛奶）故意做乾的（不送殘響）、音高隨機 ±2 個半音：恐怖的聲音都泡在殘響裡，乾聲一出來就有反差。（設計判斷。）

可放進公開 repo 的音效來源（授權以各頁面為準）：

| 來源 | 授權 | 能否把原檔放進公開 repo | 備註 |
|---|---|---|---|
| Kenney 音效包（Impact Sounds 130 檔、RPG Audio、Sci-fi Sounds、Voiceover Pack…） | CC0 | 可以 | 沒有恐怖專用包；撞擊、腳步、門可用 |
| Freesound | 逐檔：CC0／CC BY／CC BY-NC（舊檔有 Sampling+） | 只挑 CC0（或 CC BY 並列出作者、連結、授權） | 下載要登入；CC BY-NC 不能混進 CC0／CC BY 作品 |
| itch.io「Free Audio Asset Collection」（nihil-existentia） | CC0（頁面寫全部音檔都是 CC0） | 可以 | 約 98 檔 WAV：暗黑環境音、地下設施環境音、實驗噪聲 |
| OpenGameArt 的 CC0 環境音（Abandoned passages、Dark Ambiences、Ambience Pack 1…） | 搜尋摘要顯示 CC0 | 應該可以，但頁面 403，**使用前要再確認** | 弱來源 |
| Sonniss GDC 音效包 | 專屬授權 | **不行**：禁止以任何形式散布音檔本身，也禁止拿去訓練 AI | 只能包在成品裡 |
| Pixabay | Pixabay Content License | **不行**：禁止把內容原樣單獨散布 | |
| 小森平（日本） | 自訂條款 | 不行（二手資料說禁止再散布） | 弱來源 |
| BBC Sound Effects | 未能開啟 | 未查證 | |

來源：https://cdn.jsdelivr.net/npm/three@0.170.0/src/audio/PositionalAudio.js ・ https://threejs.org/docs/pages/PositionalAudio.html ・ https://threejs.org/docs/pages/Audio.html ・ https://developer.mozilla.org/en-US/docs/Web/API/PannerNode ・ https://developer.mozilla.org/en-US/docs/Web/API/PannerNode/panningModel ・ https://developer.mozilla.org/en-US/docs/Web/API/ConvolverNode ・ https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices ・ https://padenot.github.io/web-audio-perf/ ・ https://github.com/adelespinasse/reverbGen ・ https://blog.gskinner.com/archives/2019/02/reverb-web-audio-api.html ・ https://www.noisescap.app/how-it-works ・ https://www.soundonsound.com/techniques/synthesizing-bells ・ https://kenney.nl/assets/category:Audio ・ https://kenney.nl/assets/impact-sounds ・ https://kenney.nl/support ・ https://freesound.org/help/faq/ ・ https://nihil-existentia.itch.io/free-audio-asset-collection ・ https://sonniss.com/gdc-bundle-license/ ・ https://pixabay.com/service/license-summary/ ・（僅搜尋摘要）https://opengameart.org/content/abandoned-passages-horror-ambience-loop ・ https://opengameart.org/content/dark-ambiences ・ https://opengameart.org/content/ambience-pack-1-sci-fi-horror

---

## 8. 敵人移動

現況：鬼直線走向玩家；`phase: true` 的型別直接穿牆，其他型別靠 `colliders.resolve` 沿牆滑。碰撞是 20 m 格的空間雜湊（多邊形＋圓），不是可走性點陣。**沒有尋路。**

- 一個目標、很多敵人 → 距離場／flow field（Red Blob Games，2014，更新到 2020）：從目標做一次 BFS，每格記步數；敵人往步數較小的鄰格走。一次搜尋服務所有敵人，被推離路線或新生成的敵人也立刻有路。
- 格子最佳化（同站）：減少節點（路點、navmesh、階層）、Jump Point Search、更好的 heuristic；但作者的結論是「Most of the time, the standard graph search algorithms are all you need.」
- 視線：格子上用 supercover／DDA 走線，會經過線段穿過的每一格，不會漏掉擋路的格子（Red Blob Games 的線段繪製文）。
- 轉向行為：Reynolds 1999 的清單（seek、flee、pursuit、evasion、arrival、obstacle avoidance、wander、path following、flow field following、separation…）與三層模型（選行動 → 轉向 → 移動）。
- 函式庫：

| 函式庫 | 版本／日期 | 能否 CDN | 適不適合這個專案 |
|---|---|---|---|
| 自己寫格子 BFS／A* | — | 不需要 | **最適合**：實測全圖 BFS 4.7 ms（4 m 格）、局部 0.1–0.3 ms |
| yuka | 0.7.8（2022-09） | 可（已實測） | 有 14 種 steering、Vision、MemorySystem、狀態機、模糊邏輯、NavMesh、A*；要一整套 AI 架構才值得，443 KB |
| three-pathfinding | 1.3.0（2024-05） | 可（已實測） | 只做 navmesh 上的 A*＋`clampStep`，**不會產生 navmesh**，要先在 Blender 或 Recast 做好 |
| recast-navigation-js | 0.44.0 | 可（unpkg 官方範例） | 能從三角形產生 navmesh、有 Crowd；但 1 MB WASM，對 2.5×1.6 km 做體素化很重，要分 tile |
| navcat | 0.4.1（2026） | 不方便（相依 mathcat、three 輔助要 ≥ r180） | 純 JS 的 Recast 演算法，可 JSON 序列化；等升級 three 之後再考慮 |
| mikewesthad/navmesh | 2.x | 有 ES build（沒提 CDN） | 2D 凸多邊形 navmesh，有 `buildPolysFromGridMap`；README 的舊測試說長路徑比 EasyStar 快約 22 倍，但數字很舊 |
| PathFinding.js | 無新版（著作權行寫 2011–2012） | 只有 CommonJS／全域 | 不建議 |

- **建議（具體做法）**：
  1. 載入時把碰撞資料點陣化成 `Uint8Array`（4 m 格＝625×400；每格中心問一次 `colliders.blocked`），並把障礙外擴一格當作鬼的半徑。
  2. 每 0.25 秒（或玩家換格時）從玩家格做「半徑約 160–240 m」的 BFS，寫進 `Uint16Array` 距離場（實測 0.1–0.3 ms）。不穿牆的鬼每幀讀自己與 8 個鄰格，往距離最小的方向走，再加一點 separation。
  3. 場外的鬼：直接朝玩家直線移動或走「會穿牆」的規則；真的需要長路徑才跑 A*（跨全圖最壞 17 ms，要放進 Worker 或分幀）。
  4. 視線先用格子 DDA 粗篩（每條不到 1 µs），通過了才用現有的 `castWorld` 精算。
  5. 恐怖專用的變化：BFS 改成加權（玩家看得到的格子成本加高），鬼就會自己繞到背後；逃離手電筒時沿距離場的上坡走。（設計建議。）

```js
// 距離場 BFS（4 向），g: Uint8Array 障礙、dist: Uint16Array、q: Int32Array 都預先配置
function flood(g, W, H, sx, sy, maxSteps, dist, q) {
  dist.fill(65535); let head = 0, tail = 0; const N = W * H, s = sy * W + sx; dist[s] = 0; q[tail++] = s;
  while (head < tail) {
    const c = q[head++], d = dist[c] + 1; if (d > maxSteps) continue; const x = c % W; let n;
    if (x > 0     && !g[n = c - 1] && dist[n] === 65535) { dist[n] = d; q[tail++] = n; }
    if (x < W - 1 && !g[n = c + 1] && dist[n] === 65535) { dist[n] = d; q[tail++] = n; }
    if (c >= W    && !g[n = c - W] && dist[n] === 65535) { dist[n] = d; q[tail++] = n; }
    if (c < N - W && !g[n = c + W] && dist[n] === 65535) { dist[n] = d; q[tail++] = n; }
  }
}
```

來源：https://www.redblobgames.com/pathfinding/tower-defense/ ・ https://www.redblobgames.com/pathfinding/grids/algorithms.html ・ https://www.redblobgames.com/grids/line-drawing/ ・ https://www.red3d.com/cwr/steer/gdc99/ ・ https://github.com/Mugen87/yuka ・ https://mugen87.github.io/yuka/docs/ ・ https://github.com/donmccurdy/three-pathfinding ・ https://github.com/isaac-mason/recast-navigation-js ・ https://github.com/isaac-mason/navcat ・ https://github.com/mikewesthad/navmesh ・ https://github.com/qiao/PathFinding.js

---

## 9. 免費素材與字型

### 9.1 模型與動畫（CC0 為主）

| 來源 | 授權 | 內容（查到的） | 備註 |
|---|---|---|---|
| Quaternius | CC0（各包頁面標示） | Zombie Apocalypse Kit（2024-03，60 個模型、4 個可玩角色各 20 個動畫、4 個敵人）；Universal Animation Library（2025-03，120+ 個可重定向人形動畫）；Universal Animation Library 2；Universal Base Characters；Ultimate Monsters（2022-10，50 隻有動畫的怪物）；Animated Zombie Pack | 有 glTF／FBX／Blend；免費版約是全包的 60–70% |
| Kenney Graveyard Kit | CC0 | 90 檔，標籤 graveyard／halloween／horror／monster／spooky；5.0 版整個重做、含動畫 | 頁面只有標籤，沒有內容清單 |
| Kenney Particle Pack | CC0 | 80 張 512×512 粒子貼圖（2018） | 可當光暈與煙的 sprite；頁面沒有列出每張內容 |
| KayKit（Kay Lousberg） | CC0 | Halloween Bits（免費版 60+ 個模型）；Skeletons（4 個綁好骨架的骷髏＋10 多件武器）；Character Animations 1.1（2025-12-10，161 個人形動畫） | glTF／FBX；作者請大家不要把未修改的原包拿去轉賣 |
| Poly Haven | CC0（可再散布、可放進自己的產品） | `street_lamp_01`（3.06 萬面）、`street_lamp_02`（2.03 萬）、`Lantern_01`（3.39 萬）、`SchoolChair_01`（5,072）、`SchoolDesk_01`（4,162）、`plastic_monobloc_chair_01`（3,356）、`television_02`（映像管電視，2,310）、`pastic_torch_6v`（手電筒，4,352）、`chinese_stool`（1,090）、`plastic_broom`（1.87 萬）、`metal_trash_can`、`ornate_mirror_01`、`gothic_statue`、`korean_public_payphone_01`、`standing_chalkboard_01` | 面數偏高、貼圖很大，要先減面與縮貼圖；教室課桌椅、塑膠椅、掃把很對題 |
| Poly Pizza | 逐模型（站上有授權篩選） | 搜「ghost」有 Quaternius 的 Ghost、Ghost Skull；搜「lantern」有 Kay Lousberg 的 Lantern、Post Lantern、Hanging Lantern，以及 Poly by Google 的 Lamp post | 每個模型自己看授權；列表頁沒有顯示授權 |
| 國立故宮博物院 Open Data | 低階圖（100 萬畫素）CC0；中階圖（600 萬畫素）CC BY 4.0，要標「國立故宮博物院」 | 書畫、器物、織品約 41 萬幅圖像；**沒有 3D 模型** | 拿來當香爐、符紙、書法的貼圖素材；衍生品不可讓人誤以為是故宮出品 |
| Sketchfab | 商店授權（Standard／Editorial）都禁止把檔案單獨散布 | — | 免費下載區的 CC 授權頁這次沒開到；要用就逐一確認是 CC0／CC BY |
| Mixamo | 未查證（Adobe FAQ 403） | — | 在確認條款前，不要把 Mixamo 的原始 FBX 放進公開 repo；用 Quaternius／KayKit 的 CC0 動畫代替 |

- 台灣題材道具（符咒、香爐、金紙、紅包袋、宮燈）：這次沒找到授權清楚的 CC0 3D 模型。建議程序化：幾個方盒與圓柱＋`CanvasTexture`，字用下面的楷體或明體即時畫上去；畫之前先 `await document.fonts.load('64px "LXGW WenKai TC"', '要畫的字')`，否則會畫到後備字型。
- 載入：`three/addons/loaders/GLTFLoader.js`。素材可以事先（一次性）減面與壓貼圖，這不算遊戲的建置步驟。

來源：https://quaternius.com/ ・ https://quaternius.com/packs/zombieapocalypsekit.html ・ https://quaternius.com/packs/universalanimationlibrary.html ・ https://quaternius.com/packs/ultimatemonsters.html ・ https://kenney.nl/assets/graveyard-kit ・ https://kenney.nl/assets/particle-pack ・ https://kaylousberg.itch.io/halloween-bits ・ https://kaylousberg.itch.io/kaykit-skeletons ・ https://kaylousberg.itch.io/kaykit-character-animations ・ https://polyhaven.com/license ・ https://api.polyhaven.com/assets?t=models ・ https://poly.pizza/ ・ https://poly.pizza/search/ghost ・ https://poly.pizza/search/lantern ・ https://digitalarchive.npm.gov.tw/opendata ・ https://sketchfab.com/licenses ・ https://developer.mozilla.org/en-US/docs/Web/API/FontFaceSet/load

### 9.2 Google Fonts 上的繁體中文字型（2026-11-12 逐一向 css2 API 驗證存在；皆 OFL）

| 字型 | 加入日期 | 子集／字重 | 感覺與用途 |
|---|---|---|---|
| Noto Serif TC | 2018-12-03 | chinese-traditional；可變字重 200–900 | 明體 Black（900）是恐怖片海報的標準字；標題、死亡畫面 |
| Cactus Classical Serif（仙人掌明體） | 2024-05-14 | chinese-traditional；400 | 舊式印刷明體；告示、碑文、舊校刊 |
| LXGW WenKai TC（霞鶩文楷） | 2024-05-16 | chinese-traditional；300／400／700；分類 Handwriting | 楷書手寫感；符咒、日記、遺書 |
| Iansui（芫荽） | 2024-11-25 | chinese-traditional；400 | 原子筆手寫；學生筆記、便利貼、好笑的吐槽字幕 |
| Huninn（粉圓） | 2025-03-18 | chinese-traditional；400 | 圓體；和恐怖畫面對撞的搞笑 UI、社團海報 |
| WDXL Lubrifont TC | 2025-04-01 | chinese-traditional；400 | 窄長的標題字；警告牌、章節標題 |
| Bpmf Zihi Kai Std／Bpmf Iansui／Bpmf Huninn | 2026-01-30（Zihi Kai） | chinese-traditional；400 | **帶注音的字型**，像國小課本；用在鬼留下的字條會有「小孩寫的」的毛骨悚然感，而且很台灣 |
| Chocolate Classical Sans、Chiron GoRound TC、Chiron Hei HK、Chiron Sung HK | 已驗證存在 | 400 | 一般內文或 UI |

- 日文字型（New Tegomin、Zen Antique、Yuji Syuku、Potta One、Rampart One、Reggae One、Dela Gothic One、Yusei Magic、Kaisei Tokumin、Shippori Antique、DotGothic16）都存在，氣氛很好（DotGothic16 是點陣字，適合 PS1 風 UI），但子集是 japanese：繁體專用字會掉到後備字型，一句話裡兩種字體混在一起。只用在逐字檢查過的短標題。
- 簡體毛筆字型（Ma Shan Zheng、Zhi Mang Xing、Liu Jian Mao Cao、Long Cang、ZCOOL KuaiLe）沒有繁體字，不要用。
- 載入：`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@900&family=LXGW+WenKai+TC&display=swap">`。只有少數幾個字的標題可以加 `&text=`（要 URL 編碼；一個請求只能有一個 `text`，會套用到該請求的所有字型）把檔案縮到很小。
- 未查證：瀏覽器實際拿到的是不是依 unicode-range 切片的 woff2（這次用的抓取工具沒有瀏覽器 UA，只拿到單一 TTF 的回應）。

來源：https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC&display=swap（其餘字型同樣用 css2 API 驗證）・ https://raw.githubusercontent.com/google/fonts/main/ofl/lxgwwenkaitc/METADATA.pb ・ https://raw.githubusercontent.com/google/fonts/main/ofl/notoseriftc/METADATA.pb ・ https://raw.githubusercontent.com/google/fonts/main/ofl/cactusclassicalserif/METADATA.pb ・ https://raw.githubusercontent.com/google/fonts/main/ofl/iansui/METADATA.pb ・ https://raw.githubusercontent.com/google/fonts/main/ofl/huninn/METADATA.pb ・ https://raw.githubusercontent.com/google/fonts/main/ofl/wdxllubrifonttc/METADATA.pb ・ https://raw.githubusercontent.com/google/fonts/main/ofl/bpmfzihikaistd/METADATA.pb ・ https://raw.githubusercontent.com/google/fonts/main/ofl/dotgothic16/METADATA.pb ・ https://developers.google.com/fonts/docs/css2

---

## 10. 「東海特色武器：又恐怖又搞笑」的技術掛勾（建議，不是查證事實）

使用者要的是東海人一看就懂、又恐怖又好笑的武器。武器「是什麼」屬於傳說與校園文化那一份研究；這裡只列每種回饋該用哪個技術，repo 目前已有竹掃把與東海牛奶。

| 回饋 | 技術 | 成本 |
|---|---|---|
| 掃把掃到鬼 | 鬼材質的 `uGlitch` 拉高 0.2 秒＋`uDissolve` 往上推；落葉粒子用一個 `Points` | 幾乎為零 |
| 牛奶潑在地上／鬼身上 | 地面：加法或一般混合的 decal（InstancedMesh，`polygonOffset`）；鬼身上：材質裡加一個世界座標的白色遮罩，被手電筒照到時特別亮（Bloom 門檻設在只讓它過） | 一個 draw call |
| 命中時的畫面 | 一幀色差 offset 加大＋相機微震；不要用全螢幕閃白 | 0 |
| 好笑的部分 | 乾的、音高隨機的擬聲音效，疊在泡滿殘響的恐怖聲景上；字幕用芫荽或粉圓，恐怖字用明體 Black：字型的反差本身就是笑點 | 0 |
| 符紙類投擲物 | `CanvasTexture`＋霞鶩文楷即時畫字；飛行時用頂點 shader 的末端擺動（§6） | 1 張小貼圖 |

---

## 11. 現況對照與優先順序（對 commit `764d2c8`）

| 優先 | 項目 | 現況 | 建議 | 預期 |
|---|---|---|---|---|
| 1 | 後處理 | 沒有 | 加 pmndrs 單一 EffectPass（色調映射、暗角、顆粒、徑向色差）；同時修天空 shader 的色彩空間、`antialias:false`、`toneMapping = NoToneMapping` | 1080p 內顯約 ＋2 ms |
| 2 | 解析度 | pixelRatio 上限 1.5 | 加「復古模式」：內部 ½ 或 ⅓ 解析度＋`image-rendering: pixelated`；一般模式上限降到 1 | 省 2.5–3.5 ms，並得到 PS1 質感 |
| 3 | `camera.far` | 4000 | 霧 0.014 在 200 m 已是 99.96%，改成約 250（天空 dome 在 shader 裡固定畫在遠平面，不受影響） | 少算遠處的片段；建築是 3 個合併 Mesh，draw call 不會變少 |
| 4 | 陰影 | 月光 2048 PCFSoft＋手電筒 1024，共多畫兩次場景 | 月光陰影改手動更新；型別改 PCF | 多數幀省一次場景繪製 |
| 5 | 尋路 | 直線移動，穿牆或沿牆滑 | 加 4 m 格的局部距離場給不穿牆的鬼 | 每次更新 0.1–0.3 ms |
| 6 | 音訊 | 每個 emitter 都是 HRTF | HRTF 限 3–4 個；加視線遮蔽低通；手機用 equalpower | 降低音訊執行緒負擔 |
| 7 | Bloom | 沒有 | 第 1 項穩定後再加，門檻 ≥ 0.85 | ＋1.4–1.8 ms |
| 8 | 材質 | 幾乎全是 `MeshStandardMaterial` | 遠景、樹冠、鬼可以改 Lambert；合成場景裡 PBR 比 Lambert 多約 1.4–1.8 ms | 視場景而定，先量再改 |

量測方法：`renderer.info.render.calls`（注意 r170 的 `render()` 在陰影圖畫完之後才 `info.reset()`，所以陰影 pass 的 draw call 不會算進去）、`stats-gl` 或 three 自帶的 `stats.module.js`；每改一項就在同一個鏡頭位置比一次。

來源：https://cdn.jsdelivr.net/npm/three@0.170.0/src/renderers/WebGLRenderer.js ・ https://pmndrs.github.io/postprocessing/public/docs/class/src/core/EffectComposer.js~EffectComposer.html

---

## 12. 沒查到、或來源偏弱的地方

- 中文一手技術資料：沒有找到可引用的。
- three.js 的 CRT／VHS 一手教學：沒有開到（Codrops 全部 403）。
- 低面數恐怖的設計論述：只有新聞評論的搜尋摘要。
- 第一人稱 vs 越肩手電筒：沒有外部來源，是設計判斷。
- 蟲鳴、耳語、心跳的合成配方：沒有一手來源。
- 「three 內建 composer 和 pmndrs 不能混用」：只有搜尋摘要。
- OpenGameArt 各檔的授權、BBC 音效授權、Mixamo 條款、Smithsonian 3D、Sketchfab 的 CC 授權頁：都沒能開啟，使用前必須再確認。
- §2 的實測是單機、合成場景；手機與 Intel 舊內顯可能慢 3–5 倍以上（這個倍數是我的估計，沒有量）。
- 高度霧的解析解（Iñigo Quilez 的 fog 文章）這次開不到頁面，所以沒有引用。
