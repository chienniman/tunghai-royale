# 恐怖遊戲設計工法研究筆記（東海夜間校園・鬼追人＋撤離）

- 研究日：2026-11-12（文中「存取」皆指這一天）
- 適用對象：小型第一／第三人稱瀏覽器遊戲（three.js、無建置步驟）；多隻「各有規則」的鬼在大型戶外校園夜間獵捕玩家；一局 10–20 分鐘；調性要「又恐怖又搞笑」，並且要有東海人一看就懂的特色武器。
- 本檔只談「工法」：怎麼做才會怕、怎麼做才會好笑。鬼的傳說出處與東海名物清單，請以同資料夾其他研究檔為準；本檔第 15 節的東海例子只是示意，未經查證。

## 研究方法與限制（先讀）

- 搜尋：成功 28 次（13 次繁體中文、15 次英文）。之後整個工作流共用的 200 次搜尋額度用盡，第 29 次被拒絕。之後改為直接開啟已知網址，共嘗試約 106 次頁面抓取，約 75 次拿到可用內文。
- 後果：
  - 繁中搜尋多半只回英文設計文章，中文一手資料偏少（可用的有鏡週刊製作人專訪、機核兩篇評測、一份繁中恐鬼症機制整理）。
  - 部分主題只拿到搜尋摘要、原文打不開，已逐條標 [弱]。
  - GDC 演講影片無法觀看，只用到投影片文字、官方場次頁與媒體整理。
- 引文：全檔只保留一句短引文（§14 的 Zeekerss），其餘皆改寫。
- 來源強度標示：
  - [A] 開發者本人的投影片、部落格或受訪說法
  - [B] 專業媒體或百科的整理
  - [C] 社群 wiki、攻略、玩家評測（數值隨版本變動）
  - [弱] 只看到搜尋摘要、未能開啟原文，或只有單一來源
- 打不開的來源與未查證線索列在第 18 節。

## 0. 速記：這個專案最該照做的 12 件事

1. 導演系統調「頻率」不調「傷害」：Build Up → Sustain Peak（3–5 秒）→ Peak Fade → Relax（30–45 秒）。見 §1
2. 雙層 AI：導演永遠知道玩家在哪，但只給鬼「大概方位」，鬼要靠自己的感官找人。見 §2
3. 每隻鬼＝一種感官＋一條規則＋一個「先聽到」的預兆＋一個破解法。見 §3、§7
4. 規則要嚴格、邊界略帶模糊；死因必須事後說得通。見 §3
5. 戶外不靠走廊，靠「視線、聲音、光」三種暴露來嚇人。見 §9
6. 手電筒是雙面刃：看得見就會被看見；連續續航約 2–3 分鐘，逼玩家點放。見 §5
7. 理智／恐懼值藏起來，只當導演的輸入與視聽徵兆，不當失敗條件。見 §6
8. Jump scare 是調味料：重點在前奏；同一招不重複；Relax 期才用假驚嚇。見 §8
9. 一局 12–15 分鐘：N 選 M 個目標 → 出口開啟 → 限時衝刺；越晚越危險。見 §10
10. 不做教學關：第一分鐘安全、第一次遭遇寬鬆、死亡畫面用一句話說明規則。見 §11
11. 死亡要快、要好笑、要換局面，不要讓玩家重跑同一段。見 §12
12. 武器只能擋、拖、嚇退，每次使用都有代價；好笑放在道具與失手，恐怖留給鬼。見 §14、§15

---

## 1. 恐懼節奏與張力曲線（累積、釋放、安全空間）

### 1.1 Left 4 Dead「Adaptive Dramatic Pacing」 [A]
- 出處：Valve〈The AI Systems of Left 4 Dead〉投影片（2009；Valve 出版品網址，本次以文字擷取閱讀全文）。
- 觀察起點是 Counter-Strike 的自然節奏：長時間安靜的緊張，被無法預測的激烈交火打斷。一直打會疲勞，太久沒事會無聊。
- 演算法：估計每位玩家的「情緒強度」，取四人最大值；太高就暫時拿掉主要威脅，否則就生成有趣的威脅組合。
- 強度上升：被打傷（按傷害量）、倒地、被拉下或推下邊緣、附近有敵人死亡（越近加越多）。
- 強度衰減：隨時間回到零；但只要有敵人正在糾纏該玩家，就不衰減。
- 四個狀態：
  - Build Up：完整威脅量，直到強度越過峰值門檻
  - Sustain Peak：峰值後再維持完整威脅 3–5 秒
  - Peak Fade：改為最小威脅量，等強度自然掉出峰值區（讓手上這場打完，不吃掉休息時間）
  - Relax：最小威脅量維持 30–45 秒，或玩家往下一個安全屋走得夠遠，再回 Build Up
- 最小威脅量＝不生新的遊蕩者、不出群襲、不出特殊敵人（已存在的可以繼續攻擊）。Boss 遭遇不受節奏系統影響。
- 投影片明講：演算法調的是節奏不是難度，改的是頻率而不是幅度；強度估計很粗糙，但排出來的節奏有效。
- 來源：https://steamcdn-a.akamaihd.net/apps/valve/2009/ai_systems_of_l4d_mike_booth.pdf
- 實作要點：直接照抄這個四狀態機。強度輸入換成本作的事件（鬼在視線內且夠近、正在被追、被抓到、驚險脫逃）。Relax 期不啟動新的獵殺，但「傳說級」定點鬼不受影響。

### 1.2 Alien: Isolation 的 menace gauge [B，轉述開發者演講]
- 導演追蹤自己對玩家施加了多少壓力：異形離玩家很近、玩家看得到牠、動態追蹤器上很近且牠能很快抵達時，量表上升；在隔壁房間則上升較慢。
- 量表到頂，導演就把異形趕回通風管「後台」，讓玩家有空間推進。
- 創意總監在 2025 年回顧中把這種來回擺盪的情緒說成體驗的關鍵。
- 來源：https://www.gamedeveloper.com/design/the-perfect-organism-the-ai-of-alien-isolation （2017-10-31，資料來自開發者在 nucl.ai 2016 的演講）；https://www.gamedeveloper.com/design/revisiting-the-ai-of-alien-isolation （2020-05-20）；https://gameinformer.com/retrospective/2025/06/24/how-creative-assembly-built-its-perfectly-evolved-ai-xenomorph （2025-06-24）
- 實作要點：壓力來自「靠近」而不是「攻擊」。每隻鬼在前台待滿一定「威嚇次數」就強制退場。

### 1.3 少即是多、要有真的休息 [A／B]
- Frictional 創意總監：恐怖像雲霄飛車，要有可控的下墜。Amnesia 的書房區把很多次驚嚇砍到只剩幾次，玩家反而更怕，因為間隔讓張力累積。
  - 來源：https://frictionalgames.blogspot.com/2019/10/9-years-9-lessons-on-horror.html （2019-10-15）
- 同一位作者 2012 年主張：從日常開始、拉長鋪陳，高峰才打得重。
  - 來源：https://www.gamedeveloper.com/design/10-ways-horror-games-need-to-evolve （2012-04-30）
- Outlast 2：追逐要分拍子，先讓玩家覺得安全，再用絆倒、新敵人、路塌來拖慢；追逐要短以免麻痺；起手方式要換（突襲、安靜、玩家自己觸發），有些區域甚至可以完全沒追逐。
  - 來源：https://www.gamedeveloper.com/audio/the-art-of-the-chase-level-design-and-player-orientation-in-i-outlast-2-i- （2017-05-18）
- 評論文章：只有追逐、沒有安全點的獨立恐怖遊戲被稱為「追逐模擬器」，令人煩躁多於害怕；休息必須是真的安全，「安全點背叛玩家」只能偶爾用。Amnesia 在最後追逐後給一個明亮、有舒緩旋律的空間。 [C]
  - 來源：https://cliqist.com/2018/10/24/pacing-in-horror-games-why-its-important/ （2018-10-24）
- FAITH 作者（GDC 2021）：先讓玩家信任某個區域，再打破它，例如森林裡只出現一次的樹妖。 [B]
  - 來源：https://www.gamedeveloper.com/design/10-horror-game-design-tips （2023-10-31，標題為〈10 design lessons learned from 30 years of horror games〉）

### 1.4 安全空間的幾種做法 [B／C]
- 光就是安全：Alan Wake 的路燈與燈架是敵人進不來的避難所，回血也比較快。來源：https://en.wikipedia.org/wiki/Alan_Wake
- 基地＋燃料計時：Amnesia: The Bunker 的安全室可存檔、有儲物箱與會逐步補完的地圖；發電機沒油，全區變暗，怪物開始主動獵人。媒體評語是每一趟外出都帶著急迫感。來源：https://en.wikipedia.org/wiki/Amnesia:_The_Bunker
- 「大致安全」的基地：Lethal Company 的巨人進不了飛船，但門開著時看得進來，站在出口附近會被抓；被激怒的狗會衝進船內。來源：https://lethal.miraheze.org/wiki/Forest_Keeper 、https://lethal.miraheze.org/wiki/Eyeless_Dog
- 實作要點：
  - 校園裡放 3–5 個「光圈」安全點（便利商店、路燈群、警衛亭之類），可充電、可喘息。
  - 安全點的規則要寫死、可預期；一局最多破例一次，而且要有預兆。
  - 安全點之間的距離，就是張力曲線的波長。

---

## 2. AI 導演系統

### 2.1 Left 4 Dead：結構化的不可預測 [A]
- 固定擺放敵人會被背起來，玩家只剩「最佳解」，合作退化成賽跑；多套腳本輪替也一樣會被背完。
- 做法是把幾個「帶設計師指定隨機量」的生成函數疊加：
  - 遊蕩者（高頻）
  - 群襲（中頻）：一般難度每 90–180 秒隨機一次，一群 20–30 隻
  - 特殊敵人（中頻）：各自隨機間隔，只在玩家看不到的區域生成，位置配合類型（跑不快的生在前方、會拉人的生在高處）
  - Boss（低頻）：沿逃脫路線每隔 N 單位加減隨機量擺一個事件，三種事件（兩種 Boss 與「什麼都沒有」）洗牌發放，不連續重複
- Active Area Set：只在玩家周圍的導航區生成與回收敵人，所以少量實體能撐出數百隻的感覺。
- 群襲有 75% 從背後來，因為前方通常已經有其他敵人在交戰。
- 道具位置由設計師擺候選點，導演決定哪些真的存在。
- 來源：同 §1.1 投影片
- 實作要點：
  - 鬼一律生在視線外；用「玩家周圍活動區」生成與回收。
  - 分三層：氣氛事件（高頻、無害）、獵殺型鬼（中頻）、傳說定點鬼（低頻、洗牌、不重複）。
  - 目標物與補給用「候選點＋每局抽選」。

### 2.2 Alien: Isolation：雙層 AI [B，轉述開發者]
- 導演知道玩家與異形的位置，週期性叫異形往玩家「附近」移動，但從不告知確切位置；之後由異形自己的行為樹與感官去找。
- 前台與後台：前台是在走廊掃蕩或聽到聲音後搜索，搜索半徑一圈圈縮小；後台是在玩家看不到的通風管移動，往牠預測玩家會去的出口靠。
- 搜索點刻意用「不是最佳」的順序走，回頭路讀起來像猶豫；設計師可以標出牠永遠不會看的區域，避免不公平。
- 行為樹超過 100 個節點，約 30 個頂層節點；部分分支一開始鎖住，條件達成才解鎖。搜置物櫃、鑽通風管，是在玩家反覆用那招逃脫之後才啟用，造成「牠在學習」的錯覺。解鎖條件不含玩家死亡次數。
- 幾乎不瞬移：開發者說全程只有兩次，且都是為了過場。
- 感官：腳步（跑比走吵、蹲最安靜）、槍聲比移動聲更快引來牠、追蹤器只有極近才聽得到；背後有短距離感測，不能從後面偷摸。玩家躲著時開手電筒幾乎立刻被發現。
- 難度旋鈕：簡單難度把視覺與移動聲反應砍掉三分之一以上；高難度是後台時間變短、威嚇持續變長、巡邏範圍更貼近玩家。
- 來源：同 §1.2 兩篇
- 另一個說法：開發者表示玩家一旦能預測牠的模式就不可怕了，謹慎玩家的單次遭遇可能超過 30 分鐘。 [弱，僅搜尋摘要] https://techradar.com/news/gaming/design-nightmare-just-how-smart-is-alien-isolation-s-monster-1268919 、https://www.shacknews.com/article/83521/alien-isolation-trailer-extols-unscripted-ai
- 實作要點：
  - 導演只下「去某區看看」的工作單，鬼靠視覺錐與聽覺半徑自己找。
  - 校園裡要有鬼專用的後台路徑（樹林、建築內部、屋頂），讓牠「消失再從別處出現」不必瞬移。
  - 「學習」用解鎖做：玩家同一招用第三次，對應的反制行為才打開。

### 2.3 Lethal Company：時間曲線＋戰力預算 [C，社群拆解，細節完整]
- 每 2 個遊戲小時跑一次生成；數量由該星球的時間曲線加減偏差決定。
- 室外數量公式含「距離繳款期限天數」一項，期限越近下限越高。
- 候選怪要通過四關：自身上限、戰力預算、多樣性上限、最晚出現時間。權重＝星球機率 × 該怪的時間曲線 × 同種數量遞減。
- 室內怪從通風口出來，出來前有爬行聲、越來越大聲。室外怪直接出現在室外生成點。
- 以最簡單的星球為例：夜間怪約下午 5 點才開始出現，晚上 10 點後暴增，午夜到頂；白天生物則越晚越少。
- 表現太好會被加壓：隔天之後，若已達配額、或已找到超過 65% 的戰利品、或累計 5 局都有收穫且無人死亡，室內最低生成數會從 0 變 1。
- 時間：全域值是每小時長度 60、共 18 小時、時間倍率 1.4，飛船 23:57 離開。換算約 43 秒一個遊戲小時、整個時鐘約 13 分鐘（這是我的算術，頁面沒有直接寫）。
- 來源：https://lethal.miraheze.org/wiki/Mechanics 、https://lethal.miraheze.org/wiki/Experimentation
- 實作要點：
  - 夜越深越危險的曲線：前 2–3 分鐘幾乎安全，最後四分之一暴增。
  - 用「戰力預算」限制同時在場的鬼（例：預算 6，大鬼 3、小鬼 1）。
  - 連勝才加壓，新手不加壓。

### 2.4 Phasmophobia：以理智為閘門的獵殺 [B／C]
- 全隊平均理智掉到門檻以下，鬼才可能開始獵殺；越低越頻繁。獵殺開始時出口上鎖。在鬼附近說話、手上開著電子設備都會把鬼引過來。地圖越大、難度越高，獵殺越久。
- 門檻預設 50%，各鬼有例外：70%（無條件）、40%、35%、60%；依房間燈光 60%／40%；附近有開著的電子設備時 65%；有人在約 2 公尺內說話時 80%；隨時間從 75% 老化到 15%。
- 社群數值（約 0.9 版）：焚香後約 90 秒不能獵殺（個別鬼 180 秒或 60 秒）；十字架範圍 3 公尺（個別鬼 5 公尺）；兩次獵殺間隔約 25 秒；多數鬼基礎速度 1.7 m/s。
- 獵殺開頭有寬限期，依難度約 2–5 秒；鬼在約 10 公尺內時聽得到心跳聲。 [弱，僅搜尋摘要，版本不明]
- 官方商店頁：超過 20 種鬼各有特性與能力、極簡 UI、每張地圖有躲藏點、5 種難度加自訂難度。
- 來源：https://en.wikipedia.org/wiki/Phasmophobia_(video_game) （存取 2026-11-12）；https://www.ginx.tv/en/ghost-hunt-sanity-thresholds （2024-07-19）；https://hackmd.io/@Miyago9267/phasmophobia （繁中社群整理，未標日期）；https://store.steampowered.com/app/739630/Phasmophobia/ ；[弱] https://steamcommunity.com/app/739630/discussions/0/3159832276081745916
- 實作要點：獵殺要有「開始條件」（隱藏量表過門檻）與「寬限秒數」。同一個量表，不同鬼用不同門檻，就得到「早獵型」「晚獵型」的個性。

### 2.5 The Forest：遠遠看著你 [B]
- 食人族初遇時常常不攻擊，只在遠處觀察、繞著營地巡邏；玩家越兇牠們越兇，避開衝突可以維持中立很多天。
- 來源：https://en.wikipedia.org/wiki/The_Forest_(video_game)
- 實作要點：戶外大地圖裡，「遠處站著不動的身影」比衝過來更省成本也更可怕。

---

## 3. 規則型怪物（玩家必須學會一條規則）

### 3.1 有來源的規則對照表

| 規則 | 例子 | 可直接借用的參數 | 來源 |
|---|---|---|---|
| 盯著牠，牠就不動 | SCP-173：不在視線內才能動；眨眼量表會強迫你眨眼 | 眨眼＝強制失去視線 | https://en.wikipedia.org/wiki/SCP_%E2%80%93_Containment_Breach [B] |
| 盯著牠，牠就不動（進階） | Lethal Company 的 Coil-Head | 被觀察＝有視線＋60 單位內＋在 68° 視角內；累計移動超過 9 秒後強制休息 11 秒；永遠追最近的人 | https://lethal.miraheze.org/wiki/Coil-Head [C] |
| 可以瞄一眼，不能一直盯 | Bracken | 被看到就後退 24 秒（每第三次只退 11 秒）；盯著看每 0.2 秒加 0.2 怒氣；每加滿 1 點就以「怒氣 × 9%」機率暴走；預兆是沒腳步聲的開門聲與低鳴 | https://lethal.miraheze.org/wiki/Bracken [C] |
| 聽到音樂就離開 | Jester | 跟隨一段時間後停下轉發條 35–40 秒，音樂越來越快；之後不看視線、全圖追殺；所有人離開建築才重置 | https://lethal.miraheze.org/wiki/Jester [C] |
| 不要出聲 | Eyeless Dog | 全盲；聽覺距離＝18 × 音量，沒有視線時音量減半；蹲走無聲；丟任何物品都有聲音；起疑值每 3–4 秒掉 1 | https://lethal.miraheze.org/wiki/Eyeless_Dog [C] |
| 不要被看見 | Forest Keeper（戶外巨人） | 聾；越近、動作越大，起疑越快（蹲著不動 1 倍，走或跑最高 3 倍）；超過 1 就追；脫離視線 3 秒才放棄，之後在約 25 單位內搜 9 秒；牠看著你時會有持續低頻環境音 | https://lethal.miraheze.org/wiki/Forest_Keeper [C] |
| 不要回頭 | Ghost Girl | 只有被選中的人看得到；預兆是燈閃、呼吸、笑聲、心跳；追逐撐過 20 秒或拉開 50 單位就結束 | https://lethal.miraheze.org/wiki/Ghost_Girl [C] |
| 不要看太久 | Slender | 看太久就輸；撿越多頁出現越頻繁、給的逃跑時間越短；永遠只呈現站著不動 | https://en.wikipedia.org/wiki/Slender:_The_Eight_Pages [B]；https://levelsave.com/an-interview-with-slender-creator-mark-hadley/ [A] |
| 不要在走廊奔跑 | Baldi's Basics 的校長 | 違規就關禁閉；主追兵聽得到每一次開門 | https://en.wikipedia.org/wiki/Baldi%27s_Basics_in_Education_and_Learning [B] |
| 不要講話／關掉電器／開燈 | Phasmophobia 各鬼 | 見 §2.4 的門檻例外 | 同 §2.4 |
| 每隻鬼要特定手法 | Luigi's Mansion 的畫像鬼 | 一鬼一解法，掌機可顯示線索 | https://en.wikipedia.org/wiki/Luigi%27s_Mansion [B] |
| 看了會爆、吸住視線、改你聲音 | R.E.P.O. 的幾種怪 | 評測者認為怪物行為與玩家行為緊密相扣 | https://www.gcores.com/articles/196536 （2025-03-25）[C] |

### 3.2 規則要怎麼訂才公平 [A]
- SOMA 的教訓：怪物規則要嚴格但邊界模糊，玩家才會替牠腦補出智慧。太機械就變成可預測的遊戲物件；太隨機則讓人困惑。
- 「到底有沒有敵意」的曖昧設計在測試中失敗：玩家不是直接衝上去就是完全無視。最後改成清楚的溫和或清楚的兇。
- 作者想擺脫「等牠走、再跑」的躲藏，改讓玩家能計畫、能用工具引開怪物。
  - 來源：https://www.gamedeveloper.com/design/the-tricky-design-problem-of-i-soma-i-s-memorable-monsters （2015-10-27）
- 計畫理論：玩家靠心智模型在腦中模擬行動。世界必須一致，失敗了要能理解原因，才談得上計畫。Amnesia 比 SOMA 更像「遊戲」，正是因為理智、光源與資源讓玩家有東西可盤算。
  - 來源：https://www.gamedeveloper.com/design/planning-the-core-reason-why-gameplay-feels-good （2017-06-01）
- 玩家會跟你作對：Penumbra 的狗爬不上箱子，玩家站上去就不怕了，世界也不像真的。
  - 來源：https://frictionalgames.blogspot.com/2019/10/9-years-9-lessons-on-horror.html （2019-10-15）

### 3.3 規則互相衝突：是賣點也是陷阱
- 設計好的兩難：wiki 建議同時遇到「要盯著」與「不能盯」的兩隻怪時，退到轉角後把視線對準前者會出現的位置。 [C] https://lethal.miraheze.org/wiki/Coil-Head
- 規則怪談改編遊戲的開發日誌（2025-11-01）：這個類型以互相矛盾的規則為核心，但放進遊戲容易讓玩家招架不住；完全不給地圖、標記與說明時，測試者不知道要做什麼，後來補上簡短的目標敘述，做法仍留給玩家探索。 [A，小團隊]
  - 來源：https://itch.io/devlog/1100847/so-we-made-a-game-about-rules-horror.amp
- PTT 討論串：讀者普遍討厭規則不明確、靠文字遊戲與假規則、只能用猜的寫法。 [弱，僅搜尋摘要，原頁 403] https://www.ptt.cc/bbs/CFantasy/M.1726541037.A.DEE.html

### 3.4 實作要點
- 鬼卡模板：感官（視／聽／被注視／距離）＋觸發規則＋預兆（先聲音）＋懲罰＋破解法＋與哪隻鬼相衝。
- 一條規則一句話講得完，可用校園公告的口吻寫。
- 規則不騙人。要曖昧就曖昧在「何時來」，不要曖昧在「怎樣算違規」。
- 刻意安排一到兩組相衝的鬼同時在場，當作後半局的高潮。
- 堵住漏洞：玩家站上桌子、卡門口就無敵，恐懼會立刻歸零。

---

## 4. 潛行與躲藏

- 核心幻想：開發團隊曾請同事想像辦公室裡有老虎，大家的答案都是躲起來、等牠走、再溜出去。 [A] https://gameinformer.com/retrospective/2025/06/24/how-creative-assembly-built-its-perfectly-evolved-ai-xenomorph
- 躲藏不能永遠有效：異形在玩家反覆用置物櫃逃脫後才開始搜櫃子（§2.2）。
- 批評一：躲了又等、等了又跑會重複，資深玩家覺得膩，新手卻很愛。 [A] 同 §3.2 第一個來源
- 批評二：潛行恐怖主要製造「想逃」的驚恐，而不是動彈不得的恐怖；可以改用預告式的不安，例如先暗示下一間可能有東西。 [C，開發者部落格] https://www.gamedeveloper.com/design/beyond-stealth-keeping-horror-gaming-fresh （2017-02-14）
- 《女鬼橋 開魂路》：製作人說市調顯示「鬼抓人」與「躲貓貓」受恐怖玩家喜愛，因此做成核心玩法。 [A] https://www.mirrormedia.mg/story/20230324insight001 （2023-03-24）
  - 同一款的評測指出躲藏體驗的問題：沒有小地圖、追逐中路線會變、容易迷路；有些櫃子只是擺設，真正能躲的位置又很隱蔽。 [C] https://www.gcores.com/articles/157449 （2022-10-13）
- Outlast：不能攻擊，只能躲櫃子、床下、陰影，或用跑的。 [B] https://en.wikipedia.org/wiki/Outlast
- Phasmophobia：躲藏點數量是難度設定的一部分。 [B] 同 §2.4
- 戶外版的躲藏：對巨人是蹲下加利用樹與岩石斷視線；對狗是蹲著、安靜、不擋路。 [C] 同 §3.1
- 實作要點：
  - 開放校園的「躲」＝斷視線＋不出聲＋關燈，三者對應三種感官的鬼。
  - 能躲的地方要有一致的外觀記號，裝飾品不要長得一樣。
  - 同一個躲藏點重複使用要變弱（鬼開始搜）。
  - 追逐時必須有地標或光指路，不能讓玩家迷路致死。

---

## 5. 光與電池

- 只有手電筒：Slender 的玩家唯一的工具是電量有限的手電筒。 [B] https://en.wikipedia.org/wiki/Slender:_The_Eight_Pages
- 續航參考值：Lethal Company 的手電筒滿電可用 140 秒，wiki 建議點放使用。 [C] https://lethal.miraheze.org/wiki/Flashlight
- 夜視吃電：Outlast 多數區域無光，夜視鏡頭慢慢耗電，電池稀少要搜刮。 [B] https://en.wikipedia.org/wiki/Outlast
- 光是武器的前置：Alan Wake 要先用光燒掉敵人的黑暗護盾才能傷害牠；加強照射更快但更耗電。 [B] https://en.wikipedia.org/wiki/Alan_Wake
- 關燈換隱蔽：Silent Hill 關掉手電筒畫面更暗，但怪物比較難發現你。 [B] https://en.wikipedia.org/wiki/Silent_Hill_(video_game)
- 開燈會暴露：Alien: Isolation 躲著時開手電筒幾乎立刻被看見。Phasmophobia 獵殺中開著的電子設備會吸引鬼。 [B] 同 §2.2、§2.4
- 光源當全局計時：Amnesia: The Bunker 的發電機燃料、Five Nights at Freddy's 的電力（攝影機、門、燈都耗電，用完就毫無防備）。 [B] https://en.wikipedia.org/wiki/Amnesia:_The_Bunker 、https://en.wikipedia.org/wiki/Five_Nights_at_Freddy%27s_(video_game)
- 會出聲的光：The Bunker 的手搖手電筒很吵。 [B] 同上
- 火能嚇退：The Forest 的食人族怕火，但也可能把火把拿走。 [B] 同 §2.5
- 開發者後悔的事：Amnesia 的燈油與道具可以囤積，削弱了壓力。 [A] https://www.gamedeveloper.com/design/game-design-deep-dive-i-amnesia-i-s-sanity-meter- （2014-08-27）
- 實作要點：
  - 手電筒連續續航 2–3 分鐘，只能在安全光圈充電，不能囤電池。
  - 開燈：看得遠、理智掉得慢，但視覺型鬼的起疑變快。關燈：相反。
  - 至少一隻鬼「怕光」、一隻鬼「被光吸引」，讓開關燈永遠是選擇。
  - 可以有一個全校共用的光源計時（例如某處總電源），當作局內的大時鐘。

---

## 6. 理智／恐懼量表

- Amnesia 的演變 [A]：
  - 早期版本有明確數字與訊息；後來改成隱性，只剩物品欄的圖文、畫面效果與一個音效。
  - 跨數小時的系統幾乎無法平衡：有人完全沒感覺，有人長時間卡在低理智。最後把挑戰性全部拿掉，沒有失敗條件，只剩氛圍功能。
  - 玩家自己發明理論；資訊不清楚反而更怕。團隊沒有告訴玩家低理智其實沒有懲罰。
  - 結論：把東西做得太「遊戲化」會毀掉想要的感覺；恐怖適合環境式回饋，不適合戰術資訊。
  - 來源：https://www.gamedeveloper.com/design/game-design-deep-dive-i-amnesia-i-s-sanity-meter- （2014-08-27）；https://www.gamedeveloper.com/design/-i-amnesia-i-dev-makes-the-case-for-why-lying-to-players-is-sometimes-good-game-design （2019-04-19）；https://www.gamedeveloper.com/business/gdc-europe-i-amnesia-i-s-grip-delivers-terrifying-tales-of-immersion （2011-08-15）
- 「保持模糊」原則：剪影比清楚的照片可怕；血量只顯示幾個狀態比精確數字好。 [A] https://frictionalgames.blogspot.com/2019/10/9-years-9-lessons-on-horror.html
- Eternal Darkness：被敵人看見就掉理智；低理智時鏡頭歪斜、雕像頭跟著你轉，甚至假裝電視或主機出錯。靈感來自桌遊 Call of Cthulhu。專利 2005 年取得、2021 年到期。 [B] https://en.wikipedia.org/wiki/Eternal_Darkness
- 把量表當導演輸入：
  - Phasmophobia 用全隊平均理智決定能不能獵殺（§2.4）。
  - Lethal Company 有隱藏的瘋狂值：獨處時漲得快，和隊友在一起或聽對講機會降；用來加權決定誰被小女孩纏上。 [C] https://lethal.miraheze.org/wiki/Ghost_Girl
  - Left 4 Dead 的情緒強度同樣是隱藏變數（§1.1）。
- 實作要點：
  - 量表不上 HUD，用心跳、呼吸、畫面邊緣、耳鳴來表現。
  - 它只決定「鬼能不能開始獵殺」與「誰被盯上」，歸零不直接死。
  - 黑暗、獨處、直視鬼會掉；待在光圈、完成目標會回。
  - 玩家誤以為它有更多作用，是好事，不必澄清。

---

## 7. 聲音設計

- Dead Space [A，音效總監受訪]：
  - 每隻敵人身上有看不見的「fear emitter」，最多四層，隨玩家靠近而變化，所以時機跟著玩家走，不是電影式的固定點。
  - 環境音用小聲音在 3D 空間移動並慢慢改變音高與音量，讓每次回到同一區聽起來都不同；兩三分鐘的循環會被聽出來。
  - 大聲與小聲交替：全作最安靜的時刻緊接在最吵的房間之前。
  - 怪聲由五六種動物錄音疊成，其中一種以嬰兒的咿呀聲開頭。
  - 來源：https://gameinformer.com/b/features/archive/2009/12/11/feature-noises-in-the-dark-exploring-the-sounds-of-dead-space.aspx （2009-12-11）
- Alien: Isolation [A，音效設計師受訪]：運用制約、誤導與人對特定頻率的本能反應，讓玩家不斷懷疑自己的耳朵。音效晚一兩秒，恐怖就會變成喜劇。也實驗過雙耳與 HRTF 處理。
  - 來源：https://www.mcvuk.com/development-news/how-alien-isolation-is-using-audio-to-manipulate-player-emotions （2014-07-16）
- Outlast 2 [A]：刻意誇大追兵的腳步、尖叫與喘息；音訊由玩家速度、敵人距離與 AI 狀態驅動；偶爾拿掉追逐音樂來打破慣性。來源同 §1.3
- 先聽到、後看到的現成例子 [B／C]：
  - 通風口爬行聲越來越大才出怪；巨人看著你時有持續低頻；低鳴停了才安全；發條音樂越轉越快。來源：§2.3、§3.1 各頁
  - Silent Hill 的收音機雜訊預告附近有怪物。來源：https://en.wikipedia.org/wiki/Silent_Hill_(video_game)
  - Dead by Daylight：殺手有「恐懼半徑」，倖存者在範圍內聽到心跳，越近越強；殺手面前有紅光顯示朝向。來源：https://en.wikipedia.org/wiki/Dead_by_Daylight
- 極簡配樂：Slender 作者要的是單調、重複、沒有旋律的低鳴，不搶注意力。 [A] https://levelsave.com/an-interview-with-slender-creator-mark-hadley/
- 聲音比畫面省錢也更可怕：Dead Space 2 的設計師指出，暗示性的聲音（像是有東西在房間裡）可能比畫面更嚇人，預算有限反而有利。 [B] https://www.gamedeveloper.com/design/10-horror-game-design-tips
- 拿掉戰鬥後，玩家會對細微聲響有強烈反應。 [A] https://frictionalgames.blogspot.com/2019/10/9-years-9-lessons-on-horror.html
- 學術觀點：有視聽線索的前奏會讓觀眾進入預期狀態，不論最後有沒有嚇；沒有前奏的突發音效被評為更意外、更驚嚇；整條音軌（含靜默）都在累積張力。 [B] https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2025.1569394/full （Frontiers in Psychology 第 16 卷，年份待核）
- 赤燭《還願》：因預算做不起兩個角色吵架的畫面，改成讓玩家「聽」爭吵，並設計一個清脆、惱人、記得住的咂舌音。 [弱，僅搜尋摘要，原頁 403] https://www.thenewslens.com/article/114373
- 實作要點：
  - 每隻鬼一個專屬聲音簽名，在看得到之前 3–10 秒就聽得到，而且有方向。
  - 心跳只在「鬼有視線且夠近」時出現，玩家會把它當雷達。
  - 高潮前先抽掉環境音。
  - 環境音要隨機變化，不要兩分鐘循環。
  - 鬼的音效時機要準；刻意晚一拍的效果留給搞笑道具。

---

## 8. Jump scare：為什麼濫用會被懲罰

- Slender 作者：嚇一跳不等於恐懼；沒有鋪陳的突然驚嚇只是讓人抖一下。腳本事件一旦被預期就失效，所以他讓出現位置隨機到連自己都猜不到。 [A] https://levelsave.com/an-interview-with-slender-creator-mark-hadley/
- 三位開發者的說法（2018-03-07 整理）：
  - Alien: Isolation 編劇：它是主菜上的一點調味；假驚嚇可以告訴玩家「這一輪嚇過了，可以放鬆」。
  - Amnesia 創意總監：玩家知道會有驚嚇後就會開始預期，沒發生的場景也跟著變緊張。
  - Outlast 共同創辦人：重點全在尖叫之前的鋪陳。
  - 來源：https://www.gamedeveloper.com/design/the-time-and-place-for-jump-scares-according-to-horror-devs [B]
- 《女鬼橋 開魂路》製作人：驚嚇太密集會讓人麻痺，要適度讓玩家放下戒心；測試時觀察團隊與玩家被嚇後的反應再調整。 [A] https://www.mirrormedia.mg/story/20230324insight001
- Until Dawn：測試者接上量測皮膚溫度與濕度的裝置，多人同時出現的峰值才算有效驚嚇；開發者自己玩太多次會麻木，所以一定要找新玩家；混用「有預告」與「沒預告」的驚嚇，免得被看穿公式。 [A] https://blog.playstation.com/?p=148419 （2015-01-16）
- 重複就失效：Resident Evil 的狗破窗橋段在重製版被拿掉，因為玩家已經知道何時會來。 [C] https://www.gamedeveloper.com/design/discussing-horror-mechanics （2016-02-16）
- Five Nights at Freddy's：媒體評它靠的是「驚嚇的威脅」而不是驚嚇本身；也有評論說驚嚇久了變重複、限制重玩性。 [B] https://en.wikipedia.org/wiki/Five_Nights_at_Freddy%27s_(video_game)
- 實作要點：
  - 驚嚇只當「違規的結算」（被抓到那一下），不當隨機事件。
  - 每種鬼一種抓人演出，長度一秒內。
  - 同一地點不放固定驚嚇。
  - Relax 期可以放一兩個無害的假驚嚇（貓、風、掉下來的社團海報）。
  - 找沒玩過的人測，開發者自己的感覺不可靠。

---

## 9. 戶外開放空間怎麼嚇人

- Outlast 2 的戶外經驗 [A]：
  - 光是主要引導：月光照在濕路面、一盞燈籠、餘燼未熄的營火。玩家不確定時會往光走。
  - 雜物塑形：玩家避開密集處、流向開闊路徑，可用灌木、倒木、翻倒的桶子導流。不想讓玩家去的地方就放敵人。
  - 全月光森林很難指路，而且每台螢幕的暗部不同。
  - 直路無聊、迷宮讓人煩躁，最後取中間值；路標太多又像軌道。目標是看似混亂、實則直覺。
  - 來源同 §1.3
- Slender [A／B]：
  - 森林是平的，只有少數地標（廢棄卡車、柱子），刻意不解釋，讓玩家自己想。
  - 敵人永遠只呈現站著不動，位置靠幾條規則加隨機；可瞬移到任何合法點。
  - 霧是發行後才加的。
  - 來源同 §3.1
- Silent Hill：用霧與黑暗遮掩主機機能限制，結果成了氛圍招牌。分析文章指出戶外視角較高，但霧抵銷了開闊感；刻意拉長的林間小路用來製造孤立。 [B／C] https://en.wikipedia.org/wiki/Silent_Hill_(video_game) 、https://www.gamedeveloper.com/design/visualizing-fear （2012-05-09）
- Lethal Company 的戶外 [C]：靠視線的巨人讓空曠處變危險；靠聽覺的狗讓奔跑與丟東西變危險；兩者同時在場就是兩難。來源同 §3.1
- Alan Wake：原本做開放世界生存（白天蒐集汽油、晚上點燈），花了約三年仍無法和驚悚節奏結合，最後改成線性章節，但保留開放世界素材帶來的真實感。 [B] https://en.wikipedia.org/wiki/Alan_Wake
- 「開放」的正確意思 [A]：不是沙盒，而是能自由移動、能跳過區域。自願走進黑暗隧道比被迫走進去可怕；Amnesia 的樞紐式地圖靠開放選擇製造焦慮，SOMA 的直線地圖反而沒那麼可怕。來源：§1.3 兩篇
- 遠處的注視：見 §2.5。
- 打破安全感：見 §1.3 的 FAITH 例子。
- Subnautica 研究：不安感來自恐怖氛圍、探索自由與生存脆弱三者的混合；開闊空間裡威脅可以來自任何方向。 [弱，僅搜尋摘要，網站拒絕連線] https://gamestudies.org/2301/articles/evans
- 實作要點（對應大度山校園）：
  - 能見度用夜色、霧與手電筒光錐來限制；遠景只留燈光與剪影。
  - 路燈與建築燈光就是導航與節奏；危險捷徑（穿樹林）對安全遠路（沿有燈的大道）要讓玩家自己選。
  - 至少各一隻「視線型」「聽覺型」「注視型」的鬼，空曠地才有壓力。
  - 遠處站著不動的身影成本最低、效果最好。
  - 追逐時必須看得到地標，避免《女鬼橋》評測提到的迷路問題（§4）。
  - 大地圖不要一開始全開；用目標把玩家帶過 3–4 個區域。

---

## 10. 目標與撤離結構（10–20 分鐘一局）

| 遊戲 | 單局結構 | 時間壓力 | 來源 |
|---|---|---|---|
| Lethal Company | 進場搜刮，午夜前回船；全滅則戰利品歸零；三天一個配額 | 整個時鐘約 13 分鐘（換算，見 §2.3）；越晚怪越多 | https://en.wikipedia.org/wiki/Lethal_Company 、https://store.steampowered.com/app/1966720/Lethal_Company/ |
| Content Warning | 潛入拍怪物換觀看數；三天達標 | 離開潛水鐘後氧氣約 500 秒 | https://en.wikipedia.org/wiki/Content_Warning_(video_game) |
| R.E.P.O. | 每個撤離點都要填滿配額，再逃回卡車；關卡間進商店 | 物品受損會貶值，貪多風險高 | https://en.wikipedia.org/wiki/R.E.P.O. 、https://store.steampowered.com/app/3241660/REPO/ |
| Slender | 撿八張紙 | 每撿一張，敵人更常出現 | §3.1 |
| Baldi's Basics | 撿七本筆記本再逃出學校 | 追兵隨筆記本數變快 | §3.1 |
| Five Nights at Freddy's | 撐過一晚 | 一晚約十分鐘內（精確秒數未核）；電力有限 | §5 |
| Dead by Daylight | 七台發電機修好五台，兩個出口通電 | 終局有兩分鐘倒數 | §7 |
| Dead Rising | 72 個遊戲小時（約 6 個真實小時）；任務會過期 | 全局時鐘，失敗不直接結束 | https://en.wikipedia.org/wiki/Dead_Rising_(video_game) |

- 實作要點：
  - 目標用「N 選 M」（例：七個地點任選五個），玩家因此有路線決策，每局不同。
  - 每完成一個目標，導演升一級（鬼更常出現、解鎖新鬼）。
  - 出口開啟後進入限時終局（約兩分鐘），所有鬼進入前台。
  - 全局時鐘用「天亮」或「校門關閉」，12–15 分鐘到底。
  - 帶越多東西出去分數越高，但負重、噪音或貶值讓貪心有代價。

---

## 11. 免教學關的上手

- Plants vs. Zombies 作者在 GDC 2012 的十點 [A，媒體整理]：把教學融進遊戲；讓玩家動手而不是閱讀；分散教學；動作做一次就夠；字越少越好（一次約八個字以內）；訊息不要打斷操作；只對做錯的人顯示提示；不要製造雜訊；用外觀與名字暗示功能；利用玩家已知的慣例。
  - 來源：https://www.gamedeveloper.com/design/gdc-2012-10-tutorial-tips-from-i-plants-vs-zombies-i-creator-george-fan （2012-03-09）
- 用「假裝是別種遊戲」開場：Baldi's Basics 先像愚蠢的教育遊戲，追兵開始獵人後才翻成恐怖。 [B] §3.1
- 規則寫在世界裡：SCP – Containment Breach 用文件與終端機揭露各異常的應對方式。Lethal Company 掃描怪物後圖鑑才解鎖，條目含應對建議；但有些怪掃不到、沒有條目。 [B／C] §3.1；https://lethal.miraheze.org/wiki/Bestiary
- 教的是「世界怎麼運作」，並確保失敗可解釋。 [A] §3.2 計畫理論一文
- 完全不給指引會讓測試者迷失，至少要有一句目標敘述。 [A] §3.3 開發日誌
- 用早期的嚴苛告訴玩家「死亡是預期內的」：Spelunky 作者堅持前期就要難。 [B] https://en.wikipedia.org/wiki/Spelunky
- 實作要點：
  - 開場 30–60 秒：黃昏、有路人、完全安全，只教移動與手電筒。
  - 第一隻鬼選規則最直觀的（例如「盯著牠」），第一次違規只扣理智、不死。
  - 規則用校園公告、宿舍門上的便條、社團海報呈現，每則八個字左右。
  - 死亡畫面一句話寫出「你違反了什麼」；同一條規則只在死於它時才顯示。
  - 圖鑑：遇過的鬼才有條目，少數鬼永遠沒有條目。

---

## 12. 死亡與失敗仍然好玩

- 兩個難題（2014-05-05）[A]：
  - 死亡帶來的是鬆一口氣與重複：玩家看懂對手後，恐懼變成「只想過關」。
  - 解法：延後死亡（先被甩開、先累積傷害）；死後改變局面（Amnesia 每次死後會調整地圖，有時產生新的驚嚇）；比死更糟的下場。
  - 怪物看太久會變熟悉：動畫與 AI 的破綻讓牠變成木偶。解法是遮蔽（夜視、模糊、只看到水花）、減少遭遇、換怪種。
  - 來源：https://frictionalgames.blogspot.com/2014/05/alien-isolation-and-two-hardest_5.html ；媒體整理：https://kotaku.com/there-are-things-worse-than-death-in-video-games-1573207459 （2014-05-07）
- Amnesia 在開發後期拿掉死亡：失敗改成「醒來」，部分事件與機制隨之改變；目的是不讓重複消磨衝擊，也不讓玩家靠重玩摸清底層系統。 [A] https://www.gamedeveloper.com/business/gdc-europe-i-amnesia-i-s-grip-delivers-terrifying-tales-of-immersion
- Lethal Company 作者把自己的遊戲定位成一款拿死亡來笑的遊戲（原話見 §14），並說前作是想讓人開心、而不是留下陰影的恐怖。 [A] https://www.pushtotalk.gg/p/how-lethal-company-sold-10-million-copies （2024-01-19）
- 評論提到：隊友死亡時語音會突然中斷。 [弱，僅搜尋摘要] https://pcgamer.com/lethal-companys-co-op-horror-comedy-is-like-phasmophobia-but-immediately-more-chaotic-and-deadly
- R.E.P.O.：每次送貨可以復活死去的隊友；全滅後還有一場決定「最慘的人」的亂鬥。 [弱，玩家評論的搜尋摘要] https://www.taptap.cn/review/44940221
- Darkwood：探索中死亡掉一半物品並標在地圖上；夜裡死亡則隔天早上醒來、少拿獎勵。 [B] https://en.wikipedia.org/wiki/Darkwood
- 實作要點：
  - 一局短，死了五秒內能再開。
  - 被抓不一定立刻死：先一次「掙脫」機會，或掉理智、掉道具。
  - 每種鬼有專屬、偏誇張的結算演出，讓死亡成為笑點與截圖點。
  - 重開時鬼的位置、目標點、補給都重抽。
  - 保留一點跨局進度（圖鑑、外觀、新武器解鎖），失敗也有收穫。

---

## 13. 難度調整

- 調節奏不調數值：L4D 不動敵人的強度，只動出現頻率（§1.1）。評論文章也強調導演做的是「換一場不同的體驗」，並提醒打亂玩家時一定要留有可行的回應手段。 [C] https://www.gamedeveloper.com/design/the-discomfort-zone-the-hidden-potential-of-valve-s-ai-director （2013-02-07）
- 調感官與後台時間：Alien: Isolation 的難度是視覺、聽覺反應幅度與後台時間長短（§2.2）。
- 依進度升級：撿越多越兇（Slender、Baldi）；每晚更積極（FNAF）。見 §3.1、§5
- 依表現加壓：Lethal Company 的連勝條件會提高最低生成數；越接近期限下限越高（§2.3）。
- 玩家自選風險：危險星球報酬高；Phasmophobia 的自訂難度可調鬼速、玩家速度、躲藏點、手電筒、起始理智，越難獎勵倍率越高。 [B] §2.4
- 以牙還牙：The Forest 的敵意跟著玩家的攻擊性走（§2.5）。
- 實作要點：
  - 難度旋鈕依序是：Relax 長度、鬼的感官半徑、後台時間、同時在場預算。最後才動速度；不動「一擊必殺」這類幅度。
  - 新手前兩局固定只出兩種鬼。
  - 連續成功撤離才解鎖更兇的組合。
  - 讓玩家自己選「今晚走哪條路線」來決定風險與報酬。

---

## 14. 喜劇與恐懼的平衡

- Lethal Company 作者的自述 [A]：
  - 以前只顧著嚇人，反而把自己的個性藏起來；他的遊戲一直都是無意間好笑，後來才刻意這樣做。
  - 他把這款遊戲形容為「a game about laughing at death」。
  - 撰文者的觀察：怪物與陷阱夠荒謬，所以害怕之後常常接著朋友的笑聲；威脅讓隊伍四散，最難忘的時刻就在那裡。
  - 另一位獨立開發者認為這是獨立遊戲特有的粗糙感，瑕疵本身變成笑點。
  - 來源：https://www.pushtotalk.gg/p/how-lethal-company-sold-10-million-copies （2024-01-19）
- 《女鬼橋 開魂路》製作人 [A]：刻意放大學生嘻笑打鬧的橋段、加入幽默台詞來調和驚悚，避免玩家因為太恐怖而放棄。評測也提到牆上與廁所的學生塗鴉、校園告示帶來青春幽默感。
  - 來源：https://www.mirrormedia.mg/story/20230324insight001 、https://www.gcores.com/articles/157449
- 時機就是恐怖與喜劇的分界：音效晚一兩秒，恐怖就變成喜劇。 [A] §7
- 幽默理論 [B]：
  - 釋放論：笑是釋放累積的緊張。
  - 良性違反論（2010）：事情同時「違反常理」又「看起來無害」才好笑；心理距離會讓違反顯得無害。
  - 來源：https://en.wikipedia.org/wiki/Theories_of_humor
- 類型研究 [B]：有研究者認為恐怖喜劇等於給觀眾一張許可，讓人可以笑自己害怕的東西；條目引用了哲學論文〈Horror and Humor〉但沒有摘要內容。來源：https://en.wikipedia.org/wiki/Comedy_horror
  - 補充（我對該論文的既有認識，本次未能開啟原文）：恐怖怪物與滑稽角色都是「不合範疇」的存在，差別在有沒有威脅；拿掉威脅，怪物就接近小丑。
- 其他做法 [B／C]：
  - 物理與外型：R.E.P.O. 官方強調連怪物都受重力影響；評測認為垃圾桶造型、說話時一開一合的嘴，以及搬運失手造成的損失，是主要笑點。來源：§10、§3.1
  - 戲仿：Baldi's Basics 用教育遊戲的外皮。來源：§3.1
  - 可愛的膽小：Luigi 在黑暗房間裡緊張地哼歌，清完鬼才改成輕快口哨。來源：https://en.wikipedia.org/wiki/Luigi%27s_Mansion
  - 荒謬的工具：Dead Rising 團隊選擇用比較滑稽的眼光看殭屍，尤其在玩家怎麼對付牠們這件事上。來源：§10
  - The Forest 團隊說不想讓遊戲完全陰暗沉重。來源：§2.5
- 實作要點：
  - 分工：鬼負責恐怖（規則、聲音、不可談判）；玩家的身體、道具與失敗負責好笑。
  - 鬼在獵殺中不能自己變成笑話，否則威脅消失、只剩搞笑。
  - 笑點放在釋放點：剛逃掉、剛死掉、Relax 期。Build Up 期不放。
  - 「荒謬的東西＋認真的後果」是最穩的配方。
  - 文字幽默用校園口吻（公告、便條、社團海報），不要用旁白吐槽。

---

## 15. 武器設計：又恐怖又搞笑（對應使用者的要求）

### 15.1 有來源的原則

1. 武器會把玩家切到「打怪心態」。
   - Penumbra 初代的笨拙武器（槌子、掃帚）讓玩家不是鑽漏洞就是當成射擊遊戲狂死；第二作拿掉武器後變得可怕許多。 [A] https://www.gamedeveloper.com/business/gdc-europe-i-amnesia-i-s-grip-delivers-terrifying-tales-of-immersion
   - 戰鬥只有在製造無力感時才適合（例如很沒用的武器）；光是亮出武器就可能改變心態。 [A] https://www.gamedeveloper.com/design/10-ways-horror-games-need-to-evolve
   - Dead Space 在玩家熟練戰鬥後就不那麼可怕。 [A] https://frictionalgames.blogspot.com/2019/10/9-years-9-lessons-on-horror.html
2. 只能嚇退，不能殺；而且對方會適應。
   - Alien: Isolation 的異形會記錄先前被火焰噴射器噴過的經驗，之後改用嘶吼、躲進通風管伏擊或換角度包抄；被噴夠了會後退再揮擊。 [B] https://www.gamedeveloper.com/design/revisiting-the-ai-of-alien-isolation
   - Phasmophobia 沒有武器，只有十字架（擋一次獵殺）與焚香（短暫阻止獵殺）。 [B／C] §2.4
3. 很弱，而且用了會更糟。
   - Lethal Company 的鏟子每下只有 1 點傷害：狗要 12 下、巨人要 38 下。打 Bracken 會把怒氣直接設到最高；閃光彈對牠只有激怒效果。停車標誌、讓路標誌是「更重的鏟子」。 [C] https://lethal.miraheze.org/wiki/Shovel 、§3.1 各頁
4. 必須正面面對才有效。
   - Fatal Frame 的相機是唯一的防身手段：對得越準、越近、角度越好，傷害越高；在鬼的攻擊即將命中前按下快門傷害最大。 [B] https://en.wikipedia.org/wiki/Fatal_Frame
   - Luigi's Mansion：先用手電筒照暈，再用吸塵器拉扯；血量高的鬼可能掙脫，讓玩家更暴露。 [B] https://en.wikipedia.org/wiki/Luigi%27s_Mansion
   - Alan Wake：光要一直照在敵人身上才能破盾。 [B] §5
5. 操作本身要有壓力。
   - Amnesia: The Bunker 的左輪刻意做得裝填又慢又笨拙；武器同時是工具（破鎖、點火）。 [B] https://en.wikipedia.org/wiki/Amnesia:_The_Bunker
6. 好笑的外型，認真的後果。
   - Dead Rising 有超過 250 種可用物品，從很強到幾乎沒用；近戰武器會壞；交通錐套在殭屍頭上讓牠亂走；玩具槍射的是網球。 [B] §10
   - Lethal Company 連放屁坐墊都有音量值，可能引來聽覺型怪物；包包裡會自己出聲的戰利品也會。 [C] https://lethal.miraheze.org/wiki/Eyeless_Dog
7. 補給放在危險處：燃料、彈藥隨機擺放且有限，每趟外出都是賭注。 [B] §5

### 15.2 可套用的設計樣式

- 一物剋一鬼，但會惹到另一隻：每件武器對應一隻鬼的規則，同時違反另一隻鬼的規則（吵、亮、要盯著看）。
- 每次使用付一種代價：噪音、光、電量、理智、耐久、施放時不能動，至少一項。
- 效果是「時間」不是「擊殺」：定身幾秒、逼退一段距離、讓牠暫時回後台。
- 使用當下把導演的強度推高，短暫安全換來下一波更早。
- 有「完美時機」加成：越晚出手越有效，鼓勵玩家看著鬼逼近。
- 失手要誇張：丟歪、滑倒、黏住自己。好笑是因為後果真的來了。
- 不做擊殺數與戰鬥獎勵；武器只在逃生路線上有意義。
- 同一招對同一隻鬼用第三次，鬼就「學會」（解鎖反制）。

### 15.3 套到東海的示意（未查證，僅說明樣式怎麼用）

- 下列物件只是我對東海的常識性聯想，是否真的是「東海人的梗」、典故為何，須以同資料夾的傳說與名物研究為準。
- 牧場乳品類（投擲或潑灑）：讓「看不見型」的鬼現形數秒；玻璃碎裂聲會引來聽覺型的鬼。
- 夜市小吃類（誘餌）：丟出去引開追兵幾秒；味道或聲音會讓另一隻鬼起疑。
- 教堂鐘聲或校歌類（全域嚇退）：所有鬼退回後台十秒；之後導演直接進 Build Up，且少一段 Relax。
- 課本、學生證、機車安全帽類（格擋一次）：擋下一次抓取後損毀；格擋瞬間的演出做成鬧劇。
- 相機或手機閃光類（必須正面對準）：越晚按越有效；沒電就只剩螢幕微光。

---

## 16. 台灣在地脈絡：校園題材的前例

- 《女鬼橋 開魂路》（大宇資訊，2022-08-25 發行）：
  - 改編自 2020 年電影；評測直接寫明背景是台中東海大學的校園傳說。 [C] https://www.gcores.com/articles/157449
  - 製作人說法 [A]：2021 年取得授權改編；核心是鬼抓人、躲貓貓加解謎探索；第一人稱；可操控六名角色拼湊真相；實地走訪多所大專院校，還原穿堂、宿舍、教室，連社團海報與公告欄都做；加入幽默調和；注意驚嚇密度；上市半年約 10 萬套，售價 299 元。來源：https://www.mirrormedia.mg/story/20230324insight001 （2023-03-24）
  - 評測的負面意見：故事是老套的冤案復仇；躲藏系統與迷路問題；轉頭貼臉式的驚嚇被批為老套；小場景切換的載入反而提供了喘息。 [C] 同上評測
- 電影續集監製把《女鬼橋》系列定位為「都市傳說」，與鄉野奇譚型的恐怖片區隔。 [A] https://www.mirrormedia.mg/story/20231005insight001 （2023-10-13）
- 實作要點：
  - 這個題材已有商業前例，差異化要靠「真實校園地景＋規則型多鬼＋短局撤離＋搞笑武器」。
  - 校園細節（海報、公告、塗鴉）同時是真實感、幽默與規則提示的載體。
  - 避開前例被批評的點：裝飾櫃與可躲櫃不分、追逐迷路、貼臉驚嚇。

---

## 17. three.js 落地備忘（以下是我依上述來源做的推論，不是來源原話）

- 導演每秒更新 2–4 次即可：維護強度（0–1）、狀態機、戰力預算、夜晚時鐘。
- 建議起始值：
  - 峰值門檻 0.9
  - Sustain Peak 3–5 秒
  - Relax 30–45 秒，或玩家朝下一個目標移動超過一定距離
  - 獵殺型鬼的出場間隔 90–180 秒起跳，隨目標完成數縮短
- 生成點：玩家周圍一圈活動區內、不在視錐與視線內的候選點；約四分之三選在玩家背後方向。
- 感官：
  - 視覺用「距離倒數 × 動作倍率（1–3）」累積起疑，超過 1 才追；脫離視線 3 秒才丟失，再搜索約 9 秒。
  - 聽覺用「音量 × 常數」當半徑，中間有遮蔽就減半；蹲走音量為零。
  - 被注視判定用「有視線＋距離內＋在畫面中央一定角度內」。
- 每隻鬼每秒只做少量射線檢查，分幀輪流。
- 聲音：依我對 API 的既有認識（本次未查證），three.js 的 PositionalAudio 底層是 Web Audio 的 PannerNode，可用 HRTF 模式做方向感；心跳、低鳴用距離與視線驅動音量。
- 能見度：指數霧加深色天空，遠處只保留自發光的燈與剪影；手電筒用一盞聚光燈。
- 局長：時鐘 12–15 分鐘；手電筒連續 140–180 秒；安全光圈 3–5 個。

---

## 18. 打不開的來源與未查證線索

- 打不開或內文被截斷（因此相關說法只到 [弱] 或未採用）：
  - Phasmophobia Fandom wiki（402）；Valve 開發者 wiki 的導演腳本頁（403）
  - PC Gamer、GamesRadar、TechRadar 多篇（只回傳標題）
  - Game Studies 兩篇論文（Subnautica、Slender；連線被拒）
  - The News Lens《還願》系列、PTT 規則怪談討論串、巴哈姆特小屋一篇、Cool3C 一篇（403）
  - JSTOR〈Horror and Humor〉（頁面無法載入）
  - 4Gamers 的 R.E.P.O. 報導（只回傳標題）
  - GDC Vault 的〈Building Fear in Alien: Isolation〉（只有場次簡介）
- 未查證、值得後續補查的線索（搜尋額度用盡前來不及查）：
  - Roblox《DOORS》：各實體一條規則，以及死亡後由「引導之光」說明死因的提示設計。
  - Phasmophobia 官方對獵殺寬限期、心跳距離、躲藏點移除規則的最新數值。
  - R.E.P.O. 開發者問答影片中關於恐怖與喜劇取捨的原話（PC Gamer 標題只確認：它不是受 Lethal Company 啟發，起初是單人打掃遊戲）。https://www.pcgamer.com/games/horror/repo-dev-says-it-wasnt-actually-inspired-by-lethal-company-and-started-as-a-singleplayer-cleaning-game-it-was-nice-but-far-from-what-repo-is-now
  - Lethal Company 觀戰與死後語音的確切規則。
  - 赤燭（返校、還願）談聲音與台式恐怖的一手訪談。
  - Spelunky 作者專書中關於「逗留太久就出現的鬼」作為時間壓力的說法（Wikipedia 條目未提）。
- 數值提醒：Lethal Company 與 Phasmophobia 的數字都來自社群拆解或攻略，會隨版本改變；拿來當起始參數可以，不要當成定論。
