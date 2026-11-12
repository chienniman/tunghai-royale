# 合作恐怖／撤離恐怖／低傳真獨立恐怖遊戲：玩法結構與玩家回饋研究筆記

- 研究日期：2026-11-12（所有「目前」數字皆為此日抓取）
- 用途：把東海大學 3D 校園瀏覽器遊戲（three.js、無 build step）改成「夜間校園傳說鬼怪追殺、玩家撤離」的恐怖撤離遊戲；之後要加上幾個朋友的合作模式；使用者另外要求「東海人的特色武器，又恐怖又搞笑」。
- 寫法：每節 = 一個項目，含事實、玩家回饋、對本專案的實務教訓、來源網址。全部改寫，不照抄原文。

## 0. 研究方法與限制（先讀）

1. **搜尋額度用完**：本回合的網頁搜尋額度（多個代理共用）在約 21 次查詢後耗盡，之後只能「直接開已知網址」。所以後半段證據主要來自：Steam 商店頁、Steam 評論列表（繁中／英文）、Steam Charts、Steam 官方新聞 RSS、Wikipedia（中英）、官方／社群 wiki（miraheze、wiki.gg）、CrazyGames／Poki／itch.io 頁面、MDN／Chrome／CrazyGames 開發者文件。
2. **開不了的頁面**：PC Gamer、GamesRadar、4Gamers 的文章只回傳標題（內文被截）；Fandom wiki 一律 402；itch.io 的「篩選後清單」多數 403；Neowin、Yahoo、Dot Esports、Twinfinite 403。凡是只看到標題或搜尋摘要的說法，下文都標「（僅標題）」或「（搜尋摘要）」。
3. **繁中第一手來源**：巴哈、PTT、Dcard 討論串沒有搜尋就找不到網址，所以繁中玩家聲音以 **Steam 繁體中文評論列表**（第一手）為主；機核（gcores）兩篇是簡中使用者投稿。
4. **Steam 評論數的口徑**：Steam 商店頁現在依語言顯示評分。下表「英文評論」= `?l=english` 頁面顯示的英文評論數；「繁中評論」= `?l=tchinese` 頁面顯示數。全語言總數商店頁不顯示，只有第三方數字（已標註）。
5. **銷量多為第三方估算**（Alinea、AppMagic、Gamalytic、Boxleiter 法），彼此差距很大；只有標「官方」的才是開發商公布。
6. **Vaporlens** 是把 Steam 評論做 AI 彙整的網站（二手、無更新日期），它的「權重」是提及頻率不是百分比；只用來看抱怨的相對大小。

---

## 1. 總表：評分、評論數、價格、同時在線（2026-11-12）

| 遊戲 | 英文評論（好評率／篇數） | 近 30 天 | 繁中評論 | 台灣定價 | 同時在線歷史高峰 | 2026/10 月均在線 |
|---|---|---|---|---|---|---|
| Phasmophobia（2020-09 EA） | 94%／360,943 | 86%／2,313 | 91%／2,379 | NT$328 | 112,241（2020-10） | 10,703 |
| Lethal Company（2023-10 EA） | 97%／276,915 | 90%／913 | 95%／1,436 | NT$188 | 239,369（2023-12） | 2,733 |
| Content Warning（2024-04） | 93%／35,617 | 88%／586 | **77%／204** | NT$139 | 20 萬+（首日，官方／媒體）；Steam Charts 表內最高 63,320 | 755 |
| R.E.P.O.（2025-02 EA） | 96%／141,804 | 93%／6,312 | 93%／2,078 | NT$174 | 266,908（2025-03） | 17,538 |
| The Outlast Trials（2023-05 EA／2024-03 正式） | 93%／45,488 | 90%／5,124 | 87%／1,022 | NT$599 | 144,762（2026-10，原因未查證，疑與 10/20 社群活動或促銷有關） | 25,874（9 月僅 3,591） |
| DEVOUR（2021-01） | 90%／20,810 | 81%／282 | — | NT$188 | 12,145 | 735 |
| Demonologist（2023-03 EA／2023-09） | 83%／10,530 | **60%／205（褒貶不一）** | — | NT$328 | 8,693（2023-04） | 393 |
| Pacify（2019-02） | 87%／11,193 | 73%／75 | — | NT$102 | 3,086 | 130 |
| Labyrinthine（2020-10 EA／2023-08） | 85%／7,568 | **69%／72（褒貶不一）** | — | NT$188 | 2,537 | 150 |
| Escape the Backrooms（2022-08 EA／2025-10-23 1.0） | 88%／47,325 | 81%／2,182 | — | NT$174 | 48,097（2025-10） | 3,910 |
| Dead by Daylight（2016-06） | 79%／269,106 | 74%／3,679 | — | NT$379 | 168,845（2026-06） | 47,884 |
| Iron Lung（2022-03） | 92%／8,584 | 83%／89 | — | NT$152 | — | — |
| FAITH: The Unholy Trinity（2022-10） | 94%／6,078 | 88%／143 | — | NT$210 | — | — |
| SIGNALIS（2022-10） | 96%／21,967 | 95%／520 | — | NT$318 | — | — |
| Mouthwashing（2024-09） | 95%／25,146 | 92%／530 | — | NT$238 | — | — |
| Buckshot Roulette（2024-04 Steam） | 95%／37,048 | 92%／1,769 | — | NT$66 | — | — |

觀察：
- 好評率最高的兩款（Lethal Company 97%、R.E.P.O. 96%）同時是畫面最粗、價格最低（NT$174–188）的；用 Unreal Engine 5 的 Demonologist 只有 83%，近期掉到 60%。
- Content Warning 的繁中好評率（77%）明顯低於英文（93%）；繁中負評幾乎都在講連線、閃退、bug（見 §5）。
- 第三方全語言數字（僅供參考）：R.E.P.O. 全語言 96%／429,742 篇（Raijin，2026-10-26，搜尋摘要）；Phasmophobia 全語言約 66 萬篇（Steam 繁中頁，搜尋摘要，日期不明）。

**教訓**：便宜＋粗糙＋和朋友玩得起來，比畫面好更能換到好評；我們的遊戲免費且在瀏覽器，價格門檻已經是零，真正要拚的是「前幾分鐘就好玩」與「連線／效能不出包」。

來源：
- https://store.steampowered.com/app/739630/Phasmophobia/?l=english ｜ https://store.steampowered.com/app/739630/Phasmophobia/?l=tchinese
- https://store.steampowered.com/app/1966720/Lethal_Company/?l=english ｜ https://store.steampowered.com/app/1966720/Lethal_Company/?l=tchinese
- https://store.steampowered.com/app/2881650/Content_Warning/?l=english ｜ https://store.steampowered.com/app/2881650/Content_Warning/?l=tchinese
- https://store.steampowered.com/app/3241660/REPO/?l=english ｜ https://store.steampowered.com/app/3241660/REPO/?l=tchinese
- https://store.steampowered.com/app/1304930/The_Outlast_Trials/?l=english ｜ https://store.steampowered.com/app/1304930/The_Outlast_Trials/?l=tchinese
- https://store.steampowered.com/app/1274570/DEVOUR/?l=english ｜ https://store.steampowered.com/app/1929610/Demonologist/?l=english ｜ https://store.steampowered.com/app/967050/Pacify/?l=english
- https://store.steampowered.com/app/1302240/Labyrinthine/?l=english ｜ https://store.steampowered.com/app/1943950/Escape_the_Backrooms/?l=english ｜ https://store.steampowered.com/app/381210/Dead_by_Daylight/?l=english
- https://store.steampowered.com/app/1846170/Iron_Lung/?l=english ｜ https://store.steampowered.com/app/1179080/FAITH_The_Unholy_Trinity/?l=english ｜ https://store.steampowered.com/app/1262350/SIGNALIS/?l=english ｜ https://store.steampowered.com/app/2475490/Mouthwashing/?l=english ｜ https://store.steampowered.com/app/2835570/Buckshot_Roulette/?l=english
- Steam Charts：https://steamcharts.com/app/739630 ｜ /app/1966720 ｜ /app/2881650 ｜ /app/3241660 ｜ /app/1304930 ｜ /app/1274570 ｜ /app/1929610 ｜ /app/967050 ｜ /app/1302240 ｜ /app/1943950 ｜ /app/381210

---

## 2. 銷量與市場規模（標明官方或估算）

- **Phasmophobia**：官方 2024-12 約 2,200 萬；2025-07 初 2,500 萬（VGChartz 2025-07-04 報導）；**2026-10-08 官方宣布突破 3,000 萬**（Notebookcheck 2026-10-15 轉述）。主機版上市 104 天賣 200 萬。Alinea 估算 Steam 終身營收近 2.7 億美元、2026 年至今 210 萬套（二手轉述）。
- **Lethal Company**：Push to Talk（2024-01-19）用 Boxleiter 法估超過 1,000 萬套、1 億美元；AppMagic（2026-03-06）估超過 1,900 萬套、2.25 億美元。一人開發，售價 9.99 美元。無官方數字。
- **Content Warning**：官方：首 24 小時免費領取 620 萬份、同時在線 20 萬+；兩週後另賣出 100 萬套（Game Developer 2024-04-15）。GamesRadar 標題稱免費送出 660 萬後兩個月再賣 220 萬（僅標題）。AppMagic 估 1,300 萬下載、7,760 萬美元營收，與官方數字對不太起來，存疑。AppMagic 稱它的 30 日留存掉到約 3%。五人團隊，2024 年 2–4 月開發，多半在首爾的內部 game jam 完成。
- **R.E.P.O.**：無官方數字。Alinea：2025 上半年 1,640 萬套／1.282 億美元（2025-07-31）；AppMagic：2025 全年 1,850 萬套／1.52 億美元；Alinea 2026-10-30 報告（經 otakukart 轉述，單一二手來源）：終身 2,870 萬套／2.135 億美元，2026 年至今 670 萬套。其他估算器低很多（Raijin 約 990 萬、Boxleiter 型約 1,350 萬）。售價 9.99 美元。2025-11 獲 Golden Joystick 最佳搶先體驗遊戲。
- **The Outlast Trials**：官方：EA 首週 50 萬、2023-07 破 100 萬、2024-04 破 200 萬，其後宣布 300 萬玩家（日期不明；搜尋摘要，原頁逾時）。
- **Dead by Daylight**：官方 2026-06（十週年）稱終身 7,000 萬玩家、每日約 100 萬玩家。
- **PEAK**（非恐怖，但同一類「朋友亂鬥」）：2025-06-16 上市，官方 2025-08 中破 1,000 萬；一個月 game jam 做出原型，每 24 小時地圖輪替。
- **Buckshot Roulette**：Steam 版兩週約 100 萬、2024-12 達 400 萬（Wikipedia）；另一統計頁稱 2025-12 達 800 萬（voxbooster 轉述）。一人開發、Godot。
- **Roblox《99 Nights in the Forest》**：同時在線峰值 1,420 萬（PC Gamer 2026-05-07，經 Wikipedia）、2026-04 累計 260 億次造訪；玩法是守營火、救小孩、躲「鹿」。CrazyGames 的恐怖分類把名稱近似的作品（99 Nights: Forest Escape 等）列為熱門。
- **大盤**：Alinea 估 2026 年至今 Steam 恐怖類營收約 13 億美元、年增 17%（二手轉述）；2025 上半年 Steam 合作遊戲營收 41 億美元，新作銷量前五名全是合作遊戲；R.E.P.O. 玩家約一半也玩過 Lethal Company 或 Phasmophobia。
- **「Friendslop」**：2025 年起流行的稱呼，指低門檻、靠朋友互動、近距離語音、物理亂鬥、低傳真 3D、多半 20 美元以下、單人不好玩的合作小品。AppMagic 歸納：多為 5–10 美元、4 人最理想、單局短、少長期養成、為剪輯片段而生；風險是 30 日留存約 3%、熱度輪替快、「要整團朋友都買、都上線」本身就是阻力。

**教訓**：
1. 這類遊戲的購買決定是「朋友叫我買」。瀏覽器遊戲把「買、下載、開房」壓成「貼一個連結」，正好拿掉 AppMagic 點名的最大阻力；合作模式上線時，邀請連結／房號要是第一等功能。
2. 留存本來就低（約 3%），不要為了留存做養成系統；把力氣放在「一局 10–15 分鐘內有故事可講」。

來源：
- https://www.notebookcheck.net/Phasmophobia-hits-30-million-sales-as-Crimson-Eye-returns-and-Steam-is-already-calling-it-another-grindfest.1425352.0.html
- https://www.vgchartz.com/article/465142/phasmophobia-sales-top-25-million-units/ （搜尋摘要）
- https://en.wikipedia.org/wiki/Phasmophobia_(video_game)
- https://www.pushtotalk.gg/p/how-lethal-company-sold-10-million-copies
- https://appmagic.rocks/blog/friendslop-steam-games-2025
- https://www.gamedeveloper.com/business/content-warning-sells-1-million-copies-following-launch-giveaway
- https://www.gamesradar.com/games/co-op/turns-out-you-can-give-away-66-million-copies-of-your-game-add-a-price-later-and-still-sell-22-million-more-in-just-2-months （僅標題）
- https://en.wikipedia.org/wiki/Content_Warning_(video_game)
- https://alineaanalytics.substack.com/p/games-with-co-op-generated-over-4
- https://otakukart.com/r-e-p-o-has-sold-6-7-million-copies-on-steam-in-2026-generating-44-7-million-in-revenue/ （二手、單一來源）
- https://wnhub.io/news/indie/item-47358 （Gamalytic／VG Insights 估算差異，搜尋摘要）
- https://en.wikipedia.org/wiki/R.E.P.O.
- https://gamingbolt.com/the-outlast-trials-has-reached-3-million-players （搜尋摘要）
- https://en.wikipedia.org/wiki/Dead_by_Daylight ｜ https://en.wikipedia.org/wiki/Peak_(video_game) ｜ https://en.wikipedia.org/wiki/Buckshot_Roulette ｜ https://en.wikipedia.org/wiki/99_Nights_in_the_Forest ｜ https://en.wikipedia.org/wiki/Friendslop
- https://voxbooster.com/blog/horror-games-statistics-2026/ （彙整頁，內有自相矛盾處）

---

## 3. Lethal Company（致命公司）

**核心循環／撤離**
- 最多 4 人。受僱於「公司」，到廢棄衛星撿廢料，回公司衛星賣錢。
- **配額**：每輪 3 天內要賣到指定金額；達不到全員被丟進太空、存檔清空。配額每輪增加，公式含「已完成輪數的平方」再加亂數，所以越後面漲越快。提早達標可提早回去，多的廢料可留到下一輪。
- **時鐘**：午夜前要回船，否則自動駕駛會自己開走；船離開時船上沒有活人，當天撿的全部沒了。
- **負重取捨**：最多帶 4 件廢料＋1 個裝備欄；越值錢的越重（收銀機 84 磅、80–159 元），重量拖慢移動、吃體力；雙手物品限制動作。
- **分工**：一人可留在船上看雷達、開門、關地雷砲塔；其他人下去。對講機延伸語音範圍。
- 12 顆衛星，危險的要花錢才能去；天氣（霧、流沙、雷暴、淹水、日蝕）當修飾。

**怪物怎麼區分、玩家怎麼學**（每隻一條「怪談式規則」）
- Coil-Head：有人盯著就不能動；沒人看就高速接近，碰到幾乎必死；不能殺。對策是指定一個人盯。
- Jester：先跟著人，計時到就停下轉發條 35–40 秒，音樂越來越快，彈出後全屋追殺、碰到即死、不能殺；所有活人離開建築才會重置。**單人時計時較長**（多人 13–21 秒、單人 25–42 秒）。
- Ghost Girl：只纏一個人，只有那個人看得到；先是燈閃、鐘聲、喘息竊笑，之後才攻擊；隊友只能靠當事人口述。
- Masked：長得像隊友，會模仿行為靠近，抓到就把人也變成 Masked；戴上面具的玩家也可能被附身。辨識靠小破綻（原地轉圈、雷達顏色）。
- Eyeless Dog：瞎的，靠聲音；聲音有響度與距離衰減，蹲走不出聲；掉東西會出聲，某些廢料（假牙、舊電話、玩具機器人）放在背包也會吵。
- Butler：多人要 8 鏟、單人 2 鏟——**怪物血量也依單人調整**。
- 遊戲內有圖鑑（掃描登錄），但評論彙整顯示新手仍嫌機制沒講清楚（Vaporlens「Wiki 稅」評分 50／需改進）。

**為什麼紅**
- Push to Talk：近距離語音是預設；人一散開就亂；死亡好笑（Zeekerss 自稱這是 "a game about laughing at death"）；刻意的「復古粗糙」把瑕疵變成笑點；純口碑＋實況主。開發者 2012 年從 Roblox 做起，這是他第 20 款遊戲，之前就決定「驚嚇配幽默」。
- 機核投稿（2024-01-11）：新手當搬運工、老手當指揮，角色清楚；低多邊形看似簡陋但和恐怖氛圍很搭；音效資訊量大，可聽聲辨位；隊友死掉時語音突然中斷是沉浸感來源；死後可旁觀，回船後復盤把資訊重新接起來，促使玩家拉朋友。
- 首月同時在線：611 → 3,200 → 12,220 → 43,268（每週一），之後 2023-12 到 239,369。

**玩家抱怨**
- Vaporlens 權重：和朋友好玩 0.65、恐怖喜劇混合 0.41；**無聊重複 0.27**、配對／伺服器 0.13、更新太少 0.11、靠模組補洞 0.09、畫面與操作差 0.09、武器選擇弱 0.05。單人「較不好玩也較難」。
- 英文熱門負評：配額漲到不可能、沒有結局、沒有存檔可回；室內場景變化少；公開房難找（被踢、只收老手）；作者超過半年沒大更新；後來的更新加難度與隨機、拿掉好用工具，新手開場就團滅。
- 繁中熱門負評：連不上線、被踢、bug、**沒有繁中**、不能改鍵、跳躍難操作。繁中好評：紅衣女鬼只有自己看得到很有壓迫感、物理出包和隊友意外是笑點、「人多好玩、人少不好玩」。
- 更新節奏：2024-09 作者自承「沒勁了」先去做別的；2025 只有 V70 一個較大更新；2026-04 的 V80 加了 3 隻怪、**關閉晃頭、切換式衝刺、較低解析度選項**。月均在線從 2023-12 的 10.8 萬掉到 2026-10 的 2,733，V80 當月回到 7,085。

**教訓**
1. 配額＋死線＋「走不走」的抉擇就是整個遊戲；但要有終點與上限，避免「一定會輸」的無力感。
2. 每隻鬼一條規則＋一個聲音前兆＋一個需要特定行為的對策（看／不看／安靜／離開）。校園傳說本來就是規則怪談，直接對應。
3. 單人版要像它一樣偷偷放寬計時與血量。
4. 晃頭開關、低解析度選項不是加分題，是玩家會寫負評的必備項。

來源：
- https://en.wikipedia.org/wiki/Lethal_Company
- https://lethal.miraheze.org/wiki/Quota ｜ /wiki/Jester ｜ /wiki/Coil-Head ｜ /wiki/Ghost_Girl ｜ /wiki/Masked ｜ /wiki/Eyeless_Dog ｜ /wiki/Entities ｜ /wiki/Scrap ｜ /wiki/Shovel
- https://www.pushtotalk.gg/p/how-lethal-company-sold-10-million-copies
- https://www.gcores.com/articles/176116 （簡中使用者投稿）
- https://automaton-media.com/articles/newsjp/20231117-272484/
- https://vaporlens.app/app/1966720/lethal_company.md （AI 彙整）
- https://steamcommunity.com/app/1966720/negativereviews/?browsefilter=toprated&filterLanguage=english
- https://steamcommunity.com/app/1966720/negativereviews/?browsefilter=toprated&filterLanguage=tchinese ｜ https://steamcommunity.com/app/1966720/positivereviews/?browsefilter=toprated&filterLanguage=tchinese
- https://store.steampowered.com/feeds/news/app/1966720/ （官方更新公告）
- https://steamcharts.com/app/1966720

---

## 4. R.E.P.O.

**核心循環／撤離**
- 最多 6 人。用物理抓取工具把值錢物品搬到**撤離點**；每個撤離點有自己的配額，填滿才進下一個，全部完成後回卡車逃走。多搬賺更多但風險更高。
- **物品撞到會掉價，易碎品一碰就毀**；搬運本身就是玩法。
- 關卡是模組化隨機拼裝（房間、物品、怪物配置）。
- 關與關之間到服務站花錢買永久升級、武器、炸藥、補血與能量；商店庫存隨機、數量有限。
- 全隊死光＝整輪重來（評論與學生報紙都點名這點對新手很傷）。
- 近距離語音；角色說話嘴巴會開合；有機器人變聲濾鏡與文字轉語音（沒麥克風也能參與）。
- 商店頁（抓取當日）：4 個關卡、29 種敵人；預計搶先體驗約一年半。2026-10-29 的 v0.5.0 加了新地圖、手把支援、**21 種語言**、表情輪盤。

**怪物**
- 機核投稿（2025-03-25）舉例：循聲攻擊的盲怪、寄生後改變玩家聲音的蟲、盯太久會爆炸的黑影——怪物行為和玩家的聲音、視線互相牽動。繁中好評也特別提到「隊友被寄生後用變調聲音喊你名字」是恐怖與喜劇的結合點。
- Steam 評論彙整：玩家要求怪物教學／圖鑑（0.11），並抱怨要靠外部 wiki。

**開發故事**（Gamepressure 2025-04-24、Game*Spark 2025-04-12 轉述官方影片）
- 瑞典小工作室 semiwork；前作做了六年、賣不好；把剩下的錢全押在這款，沒人用過 Unity，心態是「這次快點失敗」。
- 原型是單人「打掃恐怖遊戲」（每關一個要躲的怪）；發現打掃不好玩 → 搬家公司 → 收稅 → 有人問要不要做多人，才變成現在的樣子。
-（Gamepressure 內文把上市年份寫成 2024、首日峰值寫成 2.7 萬，與其他來源不符，數字不採用。）

**玩家抱怨**
- Vaporlens 權重：和朋友好玩 0.25、持續更新 0.16、好笑的物理 0.14、低配備可跑 0.11；**地圖與任務重複 0.26**、bug 0.16、**怪物過強失衡 0.15**、深度不足 0.15、**單人太難 0.15**、物理操作問題 0.15、人為難度 0.12。情緒第一名是「挫折」（0.28）。
- 英文熱門負評：第 3 階怪太早出現、朋友團一直團滅；第 3 關難度與商店價格陡升；體力回復太慢；獵人型怪隔著房間開槍、聽到遠處聲音就反應；**近戰會打到自己、槍散布太大**；大件物品輕碰就掉價；色盲看不清（畫面暗、色調悶）；晃頭造成暈眩，要求 FOV 與動態選項；單人在更新後更懲罰；「在黑暗重複的場景裡玩捉迷藏，完全靠朋友」。
- 繁中熱門負評：斷線、朋友頻繁掉線、更新後 bug 變多、卡頓、**被朋友團霸凌**、「我沒有朋友」；繁中好評有一大票是「陪兄弟／朋友才買」的梗文。
- 留存：月均在線 2025-03 約 10.5 萬 → 2026-10 約 1.75 萬；**每次大更新都有尖峰**（2025-11 峰值 19.4 萬、2026-05 外觀更新 11.5 萬、2026-10 新地圖 7.1 萬）。GamesRadar 標題稱官方說怪物更新讓它更像「正經的恐怖遊戲」（僅標題）。

**教訓**
1. 「搬東西」加上物理與掉價，是最便宜的喜劇引擎；單人版也成立（一個人抬不動大件 → 取捨）。
2. 玩家最氣的不是可怕，是**不公平的死法**（隔牆被打、太早出高階怪）與**暈、看不清**。
3. 沒麥克風的人也要能參與（表情輪盤、文字、變聲）。
4. 原型先做單人、覺得不好玩就砍，是這款的實際做法；我們的順序（先單人、後合作）有前例。

來源：
- https://en.wikipedia.org/wiki/R.E.P.O.
- https://store.steampowered.com/app/3241660/REPO/?l=english
- https://store.steampowered.com/feeds/news/app/3241660/ （官方更新公告，2026-04 至 2026-11）
- https://www.gcores.com/articles/196536 （簡中使用者投稿）
- https://www.gamepressure.com/newsroom/lets-just-fail-quickly-how-a-game-meant-to-flop-became-a-steam-hi/z07dad
- https://www.gamespark.jp/article/2025/04/12/151423.html
- https://southblueprint.com/42214/entertainment/r-e-p-o-game-review/ （美國高中學生報，2026-03-10）
- https://vaporlens.app/app/3241660/repo.md （AI 彙整）
- https://steamcommunity.com/app/3241660/negativereviews/?browsefilter=toprated&filterLanguage=english
- https://steamcommunity.com/app/3241660/negativereviews/?browsefilter=toprated&filterLanguage=tchinese ｜ https://steamcommunity.com/app/3241660/positivereviews/?browsefilter=toprated&filterLanguage=tchinese
- https://steamcharts.com/app/3241660
- https://www.gamesradar.com/games/co-op/repo-dev-says-its-big-monster-update-turns-it-into-more-a-proper-horror-game-and-reinvigorates-the-entire-gameplay-loop （僅標題）

---

## 5. Content Warning

**核心循環／撤離**
- 2–4 人。坐潛水鐘下到「舊世界」，用手持攝影機拍怪物，回來上傳到虛構影音平台換觀看數與廣告收入，再買裝備。
- **三天內**要達到觀看數配額；每天只能下去一次；每支影片只能上傳一次。失敗 → 裝備與錢全沒、配額重置。
- **氧氣 500 秒**，在潛水鐘外才扣；潛水鐘是安全區兼出口。
- 觀看數看：怪物多危險、在畫面中多明顯、玩家怎麼互動。只有一台攝影機。每人 3 格道具。留在下面的東西永久消失。
- 遊戲會把你們拍的片存下來——等於遊戲自己替玩家做好可分享的剪輯。

**玩家回饋**
- Vaporlens 權重：玩法新奇 0.51、和朋友好玩 0.48、又嚇又好笑 0.29；**很快就重複 0.30、被開發者放棄 0.27、bug 多 0.25**、平衡 0.22、**單人無聊 0.19**、內容不足 0.16。
- 英文熱門負評：第一晚好玩、第五晚就膩；只有一個人拿攝影機，其他人覺得自己沒用；怪物沒有反制手段；攝影機變不成光碟的 bug 讓整趟白做；內容約 10 小時玩完；「開發者說不再更新」。
- 繁中熱門負評：進不了房、卡載入、閃退、人一多撤離就壞、攝影機消失白做工；英文留言抱怨「幾乎沒有武器、內容太少」。
- 官方（2025-11-17）：五人團隊去做別的案子，目前沒有回來做的計畫，並強調這不是 live service。2026-04-01 上主機並開跨平台。**2026-10-19 因疑似惡意內容暫停工作坊**。
- 月均在線：2024-04 15,678 → 2024-06 5,048 → 2024-10 2,115 → 2026-10 755。

**教訓**
1. 「把玩家的蠢事變成可分享的成品」是傳播關鍵；瀏覽器版可以做局末「靈異照片／監視器截圖」結算畫面，一鍵存圖。
2. 單一關鍵道具（只有一台攝影機）會讓其他人沒事做；合作時每個人都要有自己的任務。
3. 關鍵物件消失＝整局白玩，是最毒的 bug；任務物品要有防呆（掉出地圖自動回收）。
4. 早期不要開放玩家上傳內容或模組。

來源：
- https://en.wikipedia.org/wiki/Content_Warning_(video_game)
- https://store.steampowered.com/app/2881650/Content_Warning/?l=english
- https://vaporlens.app/app/2881650/content_warning.md （AI 彙整）
- https://steamcommunity.com/app/2881650/negativereviews/?browsefilter=toprated&filterLanguage=english ｜ https://steamcommunity.com/app/2881650/negativereviews/?browsefilter=toprated&filterLanguage=tchinese
- https://store.steampowered.com/feeds/news/app/2881650/ （官方公告）
- https://steamcharts.com/app/2881650
- https://www.gamedeveloper.com/business/content-warning-sells-1-million-copies-following-launch-giveaway

---

## 6. Phasmophobia（恐鬼症）

**核心循環／撤離**
- 1–4 人接案，到鬧鬼地點找出鬼的種類。目標是「辨識」不是「搬東西」：每種鬼有 3 項證據（共 7 種證據類型），高難度只給 2 項或更少，剩下靠行為判斷。2026-09 時有 30 種鬼。
- 理智值從 100% 開始，在暗處會掉；夠低鬼就「獵殺」：所有出口上鎖，只能跑或躲。十字架可阻止一次獵殺。
- 撤離＝回廂型車、關上車門。答對鬼種拿大部分錢與經驗，加上照片／影片／錄音與支線目標。
- 語音辨識：鬼與部分道具聽得懂關鍵字；獵殺時鬼聽得到麥克風，靠近說話會把它引過來。
- 沒有武器，只有防禦與偵測工具（十字架、焚香、鹽）。
- 官方不做內購與 DLC；CEO 說進度系統的重點是「學會鬼」而不是練滿等。

**玩家回饋**
- Vaporlens 權重：合作社交 0.89、持續更新 0.80、鬼的機制與多樣性 0.52、氛圍 0.43、語音辨識 0.33；技術與最佳化 0.19、鬼 AI 讓人挫折 0.19、**教學差 0.17**、大地圖壓力 0.15、進度不值得 0.15、重複 0.14、EA 拖太久 0.13、**畫面與動畫粗糙 0.11**、單人乏味失衡 0.10、辨識令人困惑 0.10。
- **2026-05-05「玩家角色更新」翻車**：重做角色模型與動畫，上線後大量負評（有報導引 SteamDB 稱五月約 600 好評對近 2,000 負評——單一較弱來源）。英文負評集中在：動畫卡、拿道具有延遲、道具變小難讀、手肘手腕姿勢怪、「比三年前還不精緻」、沒先讓社群測試。官方 5/12 道歉、承認評論有理，之後把 1.0 從 2026 年底延到 2027 下半年。
- 2026-10 萬聖活動被部分玩家罵成「農」：季節活動變成社群刷數值、獎勵無聊。
- 繁中熱門負評：改版把等級與存款清零、夜視鏡畫面晃到暈、角色動作多又關不掉、斷線、畫面太暗、玩熟後變成「鬼在躲玩家」。繁中好評多是「沒朋友不要買」「陪朋友才玩」。
- 月均在線近兩年穩定在 8,000–15,000。

**教訓**
1. 把「認出是哪隻鬼」做成目標，能讓同一張地圖重玩很多次；東海的傳說鬼可以每晚隨機幾隻，讓玩家靠徵兆判斷今晚是誰。
2. 被追時「出口鎖住、只能躲」是便宜又有效的高潮；配合我們的撤離點，可做成「鬼發狂時校門暫時關閉」。
3. 粗糙的畫面玩家可以接受，但**把已習慣的手感改差**會被洗負評；合作版上線時不要動單人版已經好的手感。
4. 沒有武器也能賣 3,000 萬套——武器不是必需品，是加料。

來源：
- https://en.wikipedia.org/wiki/Phasmophobia_(video_game)
- https://store.steampowered.com/app/739630/Phasmophobia/?l=english
- https://www.pcgamesn.com/phasmophobia/live-service-interview （2025-11-13 更新）
- https://www.shacknews.com/article/149107/phasmophobia-player-character-update-apology-patch （2026-05-12）
- https://www.shacknews.com/article/149878/phasmophobia-1-0-interview-e4-2026 （2026-07-02）
- https://kineticgames.co.uk/news/phasmophobia-2026-and-beyond （官方路線圖）
- https://www.notebookcheck.net/Phasmophobia-hits-30-million-sales-as-Crimson-Eye-returns-and-Steam-is-already-calling-it-another-grindfest.1425352.0.html
- https://vaporlens.app/app/739630/phasmophobia.md （AI 彙整）
- https://steamcommunity.com/app/739630/negativereviews/?browsefilter=trendyear&filterLanguage=english
- https://steamcommunity.com/app/739630/negativereviews/?browsefilter=toprated&filterLanguage=tchinese ｜ https://steamcommunity.com/app/739630/positivereviews/?browsefilter=toprated&filterLanguage=tchinese
- https://steamcharts.com/app/739630

---

## 7. The Outlast Trials

**核心循環**
- 1–4 人，單人也能完成所有必要目標。每場「試煉」有主目標與選做的次要目標，結束時評分換經驗。
- **不能打**：靠躲、跑；磚塊與酒瓶只能引開或短暫擊暈；六種「裝置」（透視、治療、煙霧雷、擊暈、擋門等）；夜視鏡要吃稀缺電池。背包 3 格起跳。
- 敵人分一般、特化（丟汽油彈的、戴夜視鏡在暗處獵人的）與各主題關卡的頭目。
- 「變數」修飾每場試煉（多敵人、更警覺、鎖門）。2025-10 加入「入侵」模式（由玩家扮演的冒充者獵殺）。約四十人的團隊、Unreal Engine 4。

**回饋**
- 媒體：Metacritic PC 69、PS5 75；Push Square 指敵人 AI 笨、視覺素材重複。
- Vaporlens 權重：氛圍 0.92、合作設計 0.43；**重複與內容有限 0.46、敵人 AI 不一致 0.43、指引不清 0.42、多人沖淡恐怖 0.42**、技術問題 0.38、單人體驗差 0.34、進度不值得 0.33、**太貴 0.32**、畫面過時 0.30。
- 台灣定價 NT$599，是本表最貴；繁中好評率 87%。
- 繁中實戰心得（搜尋摘要）：吃重的不是「遛鬼」而是地圖熟悉度與機制理解。

**教訓**
1. 人越多越不怕，這是結構性的；要讓合作版仍然可怕，得用「分頭行動」的任務把人拆開（Lethal Company 的做法），而不是加怪。
2. 「指引不清」和「重複」的權重和「氛圍好」一樣大——目標提示要直白。

來源：
- https://en.wikipedia.org/wiki/The_Outlast_Trials
- https://store.steampowered.com/app/1304930/The_Outlast_Trials/?l=english
- https://vaporlens.app/app/1304930/the_outlast_trials.md （AI 彙整）
- https://www.pushsquare.com/reviews/ps5/the-outlast-trials （搜尋摘要）
- https://steamcharts.com/app/1304930

---

## 8. DEVOUR

**核心循環**
- 1–4 人，一局最長約一小時。目標：摧毀 10 個圖騰（山羊、蛋、老鼠等）。早期地圖是「找燃料 → 毀圖騰」；後期地圖要先在一處準備、再到另一處摧毀。
- **進度越多越難**：主惡魔的速度、追擊頻率、抗擊暈都隨已毀圖騰數上升；小怪生成率也大增；部分房間要毀掉一定數量才解鎖。
- 唯一的「武器」是紫外線手電筒：有限電量、會回充，可消滅小怪、讓主惡魔踉蹌，但所需時間越來越長。
- 倒地會被拖走或直接死；全員同時倒地才算輸。鑰匙、門、道具位置隨機。

**回饋**
- 繁中負評：不到 4 人不推薦，難度不隨人數調整；3 人卡在 90%；過場動畫不能跳過、每局重看；後期鬼王比玩家後退還快、手電筒電量不夠；只能裝一個技能、成長感弱；「普通」就很難。
- 繁中好評多是「被女生追的戀愛遊戲」這類梗；也有人說最可怕的是隊友把鬼帶過來。

**教訓**
1. 「收集越多、鬼越兇」是最省成本的節奏曲線，但最後 10% 不能難到不公平；少人時要降難度。
2. 所有過場都要能跳過。
3. 光當武器（有限電量、只能拖時間）很適合夜間校園。

來源：
- https://en.wikipedia.org/wiki/Devour_(video_game)
- https://store.steampowered.com/app/1274570/DEVOUR/?l=english
- https://steamcommunity.com/app/1274570/negativereviews/?browsefilter=toprated&filterLanguage=tchinese ｜ https://steamcommunity.com/app/1274570/positivereviews/?browsefilter=toprated&filterLanguage=tchinese
- https://steamcharts.com/app/1274570

---

## 9. Demonologist

- 1–4 人，辨識邪靈種類後驅魔；Unreal Engine 5；場景會對玩家說的話有反應。
- 英文熱門負評：驚嚇是綁在**地圖**上的腳本，看過一次就沒用，重玩價值比 Phasmophobia 低；地圖靠等級解鎖像在農；開發商轉去做別的遊戲、超過一年沒更新；2.0 強制開光線追蹤，低階顯卡當機；大廳每局要重開、加入就閃退；麥克風失效；美術被指是現成素材包與 AI 圖。
- 結果：整體 83%，近 30 天 60%（褒貶不一），月均在線 393。

**教訓**：畫面最好的一款，口碑最差。腳本式驚嚇只能用一次；驚嚇要綁在「鬼的行為」上而不是「地點」上。不要強制任何吃效能的畫質功能。

來源：
- https://store.steampowered.com/app/1929610/Demonologist/?l=english
- https://steamcommunity.com/app/1929610/negativereviews/?browsefilter=toprated&filterLanguage=english
- https://steamcharts.com/app/1929610

---

## 10. Pacify

- 2019 年，NT$102。鬧鬼的屋子裡有個小女孩惡靈；用娃娃安撫她、把娃娃一個個燒掉、然後逃出去。有合作，也有 PvP（互推會讓對方暈 5 秒並掉鑰匙）。
- 繁中評論：氣氛不錯、和朋友玩會尖叫；**「單人太難、多人太簡單，3–5 小時就膩」**；線索文件不夠明顯；有玩家發現樓梯旁可卡位躲鬼。

**教訓**：「安撫而不是殺死」的核心（用對的東西讓鬼暫時安靜）很適合傳說鬼；但一張地圖、一隻鬼的內容量撐不過幾小時，且難度要隨人數調。

來源：
- https://store.steampowered.com/app/967050/Pacify/?l=english
- https://steamcommunity.com/app/967050/reviews/?browsefilter=toprated&filterLanguage=tchinese
- https://steamcharts.com/app/967050

---

## 11. Labyrinthine

- 1–8 人，樹籬迷宮；有劇情模式與程序生成的「案件」迷宮；30 多種怪、200 多種外觀。
- 英文熱門負評：死亡沒有懲罰（立刻重生）→ 完全不緊張；共用背包讓大家亂衝；**怪物動畫滑稽，破壞沉浸**；沒有教玩家怎麼應付怪；大地圖比中地圖無聊、死路多；怪會卡在要道把人鎖死；謎題是亂猜；「只有第一次可怕」。

**教訓**：死亡要有代價，否則恐怖歸零；粗糙可以，但**怪物的動作不能好笑到出戲**（好笑應該留給玩家與道具）；迷路不是樂趣——我們用真實校園地圖，要給清楚的地標與方向感。

來源：
- https://store.steampowered.com/app/1302240/Labyrinthine/?l=english
- https://steamcommunity.com/app/1302240/negativereviews/?browsefilter=toprated&filterLanguage=english
- https://steamcharts.com/app/1302240

---

## 12. Escape the Backrooms

- 1–4 人，30 多個關卡，每關找出口；**全員都到出口才算過關**。手電筒、食物（回復理智）；理智低於 15% 出現幻覺、歸零死亡。近距離語音，**怪物也聽得到玩家說話**。
- 2025-10-23 出 1.0（當月峰值 48,097），2026 年上主機。
- 回饋：Vaporlens 正面第一是合作體驗（0.88），負面第一是「更新令人失望且多 bug」（0.99）、「品質差、未完成」（0.70）、關卡單調（0.55）。英文負評：某些追逐段要背路線像賭博；怪物沒有反制；模仿怪的聲音提示太弱；交給發行商後只出付費外觀。

**教訓**：「一個都不能少」的撤離規則在朋友團裡很有戲（要回頭救人）；但追逐要有可讀的反制，不能靠背。

來源：
- https://en.wikipedia.org/wiki/Escape_the_Backrooms
- https://store.steampowered.com/app/1943950/Escape_the_Backrooms/?l=english
- https://vaporlens.app/app/1943950/escape_the_backrooms.md （AI 彙整）
- https://steamcommunity.com/app/1943950/negativereviews/?browsefilter=toprated&filterLanguage=english
- https://steamcharts.com/app/1943950

---

## 13. Dead by Daylight（非對稱參考）

**撤離結構**（最成熟的「逃出」範本）
- 4 名逃生者修好 7 台發電機中的 5 台 → 兩道出口門通電（全圖音效提示）。
- **開門要 20 秒**，進度可保留；開關上三顆紅燈在 25／50／75% 亮起，75% 有蜂鳴——等於告訴殺手「有人在開門」。
- 任一道門打開就啟動**兩分鐘的終局倒數**，時間到還沒走的全部死。
- 只剩一人時地上出現逃生口（地窖）；殺手把它關上會直接讓門通電並開始倒數。
- 殺手靠近時逃生者聽到越來越強的心跳；殺手面向有紅光；木板可砸暈殺手。
- 每個殺手一種獨特能力，有些能隱藏心跳。

**回饋**
- 上市時 Metacritic PC 71、主機 58–64；靠十年免費更新、聯名、跨平台撐到現在：官方稱 7,000 萬玩家。Steam 79%（大多好評）。
- 繁中負評（多為千小時玩家）：單排吃虧、組隊語音報位太強；守屍、針對等報復式玩法；平衡反覆改；外掛檢舉無效；新手殺手配到老手。

**教訓**
1. 撤離不要是「走到點就結束」，要是**一段會發出聲音、需要時間、會把鬼引來的操作**，再加一個終局倒數。
2. 心跳聲這類「距離 → 聲音強度」的提示，瀏覽器裡成本極低、效果最好。
3. 真人扮鬼會帶來毒性與平衡地獄；我們的合作版先做純 PvE。

來源：
- https://en.wikipedia.org/wiki/Dead_by_Daylight
- https://deadbydaylight.wiki.gg/wiki/Exit_Gates
- https://store.steampowered.com/app/381210/Dead_by_Daylight/?l=english
- https://steamcommunity.com/app/381210/negativereviews/?browsefilter=toprated&filterLanguage=tchinese
- https://steamcharts.com/app/381210

---

## 14. 低傳真／PS1／VHS 風格恐怖

**Puppet Combo**（一人工作室，2012 年起）
- PS1 風格、坦克式操作、VHS／CRT 濾鏡、80 年代錄影帶恐怖片題材；2017 年起用 Patreon 發行，2021 年成立低傳真恐怖發行品牌。
- 評價：IGN 2022 年最佳 PC 恐怖遊戲榜把它的作品排第二；Kotaku 稱古舊的 3D 畫面帶來經典的毛骨悚然感；也有媒體批評某作玩法簡單重複。Wikipedia 沒有銷量數字。
- Mouthwashing 的成員說是 Puppet Combo 讓她明白不需要頂級畫面也能做出有衝擊的東西。

**Iron Lung**（一人，2022-03，NT$152）
- 一間沒有窗的小潛艇，靠座標與一台畫質很差的相機前進；外面只看得到模糊影像，分不清是怪物還是石頭——**看不清本身就是恐怖來源**。評論一致稱讚音效。
- 英文負評幾乎全是：45 分鐘到 2 小時就結束、價格太高、玩懂後就不怕、操作慢、結尾是一個可預期的突發驚嚇。
- 2026-01-30 改編電影上映，預算 400 萬、票房 5,000 萬美元。

**FAITH**（Airdorf，2017 起分章，2022 合輯）
- 模仿 80 年代初 8 位元畫面、轉描過場、老式合成語音。舊金山紀事報評論：抖動的動畫本身就夠嚇人，而模糊讓玩家不確定攻擊自己的是什麼。OpenCritic 90% 推薦；Steam 94%。

**SIGNALIS**（兩人團隊，2014 開始開發，2022-10）
- PS1 風格、CRT 模式、6 格背包。Metacritic 80–84；Steam 96%。最常見的批評是背包太小與戰鬥。

**Mouthwashing**（2024-09）
- PS1 風格低多邊形。Paste 的評論認為這種畫面邀請玩家自己腦補細節；GamesRadar 說低多邊形底下是 3A 等級的美術指導。Metacritic 88；批評集中在短暫的戰鬥／潛行段落笨拙。

**Buckshot Roulette**（一人、Godot，2023-12 itch → 2024-04 Steam，NT$66）
- 一張桌子、一把霰彈槍；2024-10-31 加 4 人多人。靠 Twitch／TikTok 擴散。

**Haunted PS1**（2018 年成立的開發者社群）
- 每年出仿 PS1 試玩光碟的合輯（2020：17 款、2021：25 款、2022：18 款、2025：24 款），帶起整個低解析恐怖圈。

**Dread X Collection**：DreadXP 自 2020 年起發行的恐怖短篇合輯（多位獨立開發者各做一款）。Wikipedia 沒有集數與開發天數細節，本次無法查證更多。

**Slender: The Eight Pages**（一人、Unity、2012-06 免費）
- 黑森林裡找 8 張紙；只有一支會沒電的手電筒，沒有武器；每撿一張，Slender Man 出現得更頻繁；靠聲音與畫面雜訊預警；盯著看太久就輸。
- 評論普遍稱讚「畫面粗糙但張力十足」；批評是玩法單薄、重複、重玩價值低。靠實況主（誇張尖叫影片）爆紅。

**Voices of the Void**（itch.io，免費／隨喜）：低多邊形，4.9 星／6,022 評分，是 itch 恐怖類最高評分第 2 名。

**粗糙畫面為什麼成立／何時被嫌**
- 成立：(a) 風格一致、(b) 看不清 → 腦補、(c) 聲音扛恐怖、(d) 瑕疵變笑點（合作類）、(e) 一到兩人就做得完，所以能做得夠「怪」。
- 被嫌：(a) 怪物動畫好笑到出戲（Labyrinthine）；(b) 現成素材拼貼感（Demonologist）；(c) 太暗看不清、色盲不友善、晃頭暈（R.E.P.O.、Phasmophobia）；(d) 內容太短卻收費（Iron Lung）；(e) 改版把熟悉的樣子改差（Phasmophobia 2026）。Vaporlens 裡「畫面差」的權重：Lethal Company 0.09、Phasmophobia 0.11、Outlast Trials 0.30（反而是寫實路線的最高）。

**教訓**
1. three.js 做 PS1／VHS 風格是「選擇」不是「將就」：低解析渲染＋霧＋抖色，同時解決效能。
2. 預算花在聲音與一兩個關鍵動作；鬼的動作寧可僵硬詭異，不要滑稽。
3. 一定要給亮度、晃頭、色盲選項。

來源：
- https://en.wikipedia.org/wiki/Puppet_Combo ｜ https://en.wikipedia.org/wiki/Iron_Lung_(video_game) ｜ https://en.wikipedia.org/wiki/Faith:_The_Unholy_Trinity ｜ https://en.wikipedia.org/wiki/Signalis ｜ https://en.wikipedia.org/wiki/Mouthwashing_(video_game) ｜ https://en.wikipedia.org/wiki/Buckshot_Roulette ｜ https://en.wikipedia.org/wiki/Haunted_PS1_Demo_Disc ｜ https://en.wikipedia.org/wiki/Slender:_The_Eight_Pages ｜ https://en.wikipedia.org/wiki/DreadXP
- https://steamcommunity.com/app/1846170/negativereviews/?browsefilter=toprated&filterLanguage=english
- https://mrdrnose.itch.io/votv ｜ https://itch.io/games/top-rated/tag-horror

---

## 15. 瀏覽器恐怖遊戲（CrazyGames、Poki、itch.io HTML5）

**現況（2026-11-12 抓取）**

| 遊戲／平台 | 類型 | 評分與票數 | 讚：倒讚（自行換算） |
|---|---|---|---|
| Exhibit of Sorrows（CrazyGames；Phaser、2D 手繪、幾分鐘） | 互動展覽式心理恐怖 | 9.2；22.8 萬讚／2.2 萬倒讚；itch 4.8 星／2,513 | 約 91% 讚 |
| Haunted School（CrazyGames；Unity、3D） | 學校裡找神父的工具驅逐惡靈女孩；霰彈槍只能暫時趕走她 | 8.9；22.5 萬／3.7 萬 | 約 86% |
| House of Celestina（CrazyGames；Unity、3D） | 找鑰匙逃出屋子 | 8.9；5.3 萬／1.6 萬 | 約 77% |
| Slendrina Must Die: The Forest（CrazyGames；Unity 5.6） | 找 7 把鑰匙＋射擊，主打「很多突發驚嚇」 | 8.8；1.2 萬／2,600 | 約 82% |
| Nightfall Hunt（CrazyGames；HTML5，2026-10） | 黑暗學校裡的類 DbD：駭 5 台電腦開門 | 9.2；3,200／258（樣本小） | 約 93% |
| Fear Response（Poki，3D 解謎逃脫） | 洋館解謎 | 4.1；517,804 票；40.6 萬／11.2 萬 | 約 78% |
| Backrooms Recovery（Poki，2026-08） | 後室逃脫 | 4.4；93,581 票 | 約 86% |
| Horror Dungeon 3D（Poki，僅桌機） | 找 6 把鑰匙逃出城堡 | 4.1；47,577 票 | 約 77% |
| Escape From Spider（Poki，線上多人 io） | 躲大蜘蛛、解謎逃關，可買道具坑別人 | 4.3；218,896 票 | 約 82% |
| last seen online（itch；**three.js**、約一小時） | 翻陌生人舊電腦的解謎恐怖 | 4.8 星／4,318 評分 | — |
| Rotten Machines（itch；Unity WebGL、PSX 風、72 小時 jam） | 黑暗駕駛 | 4.4 星／86 評分 | — |

**他們做錯什麼（證據）**
1. **山寨與公式化**：兩大入口的恐怖分類充斥 IP 仿作（玩具怪射擊、某熊射擊、Slender 系列、Roblox 熱門作的仿作）與「找 N 把鑰匙」逃脫；這類 3D 找鑰匙作品的倒讚率 18–23%，是同類最高。評分最高的反而是短、作者性強、只有一個點子的（Exhibit of Sorrows、last seen online）。
2. **靠突發驚嚇**：平台頁自己把「很多 jumpscare」當賣點；但 Steam 上玩家對腳本式驚嚇的評語是「看過一次就沒用」（Demonologist）、「結尾只是一個 jumpscare」（Iron Lung）。
3. **效能**：Rotten Machines 留言抱怨內顯與舊機器幀數低、滑鼠延遲，要求解析度與陰影選項。CrazyGames 規定在 4GB RAM 的 Chromebook 上跑不順，就會在該平台被停用；Safari 跑不好也會在 Safari 上停用。
4. **載入**：CrazyGames 規定初始下載 ≤ 50MB（要上手機首頁 ≤ 20MB）、到可玩 ≤ 20 秒、新玩家應直接進遊戲，最多點一下。
5. **只做桌機**：Horror Dungeon 3D、House of Celestina 都是桌機限定，直接放棄手機流量。
6. **瀏覽器限制沒處理**：
   - 聲音：瀏覽器在使用者互動前擋有聲播放；AudioContext 會是暫停狀態，要在點擊後 resume；iOS 切到背景再回來會中斷。
   - 滑鼠鎖定：要由點擊觸發；玩家按 Esc 會解除，必須有「點一下繼續」的遮罩；CrazyGames 明文提醒不要用 Esc、Ctrl+W 這種瀏覽器會攔截的鍵。
   - 內嵌 iframe 要另外允許 autoplay、pointer lock、microphone。
   - 敵人沒有後果就不可怕：Rotten Machines 留言說第一次遭遇後敵人失去威脅，因為被撞沒什麼損失。
7. **多人幾乎是空白**：itch 的網頁恐怖熱門榜前 30 名約三分之二是視覺小說，其餘多為解謎與互動小說，沒有一款是即時 3D 合作；入口站的多人恐怖只有 io 式大廳（Escape From Spider）與剛上的類 DbD（Nightfall Hunt）。**「朋友貼連結就進來的 3D 合作撤離恐怖」在瀏覽器上幾乎沒人做。**
8. CrazyGames 的多人規範值得照抄：邀請連結直接進房、略過新手流程；回合制要能原班人馬續下一局；隨時可加入，進行中就先當觀眾；聊天要有過濾。

**教訓**
1. 不要做成「東海版找鑰匙」。瀏覽器恐怖最好的作品都是短、怪、有一個別人沒有的點子——我們的點子是「真的校園＋真的傳說＋東海人的梗」。
2. 開場一個「點擊開始」畫面同時解掉音訊解鎖、滑鼠鎖定、全螢幕三件事。
3. 首包壓在 20MB 內、20 秒內可玩；低解析渲染當預設。
4. 手機先求「能走能看」，不求完整。

來源：
- https://www.crazygames.com/t/horror ｜ https://www.crazygames.com/game/exhibit-of-sorrows ｜ https://www.crazygames.com/game/haunted-school---horror-game ｜ https://www.crazygames.com/game/house-of-celestina ｜ https://www.crazygames.com/game/slendrina-must-die-the-forest ｜ https://www.crazygames.com/game/nightfall-hunt
- https://poki.com/en/scary ｜ https://poki.com/en/g/fear-response ｜ https://poki.com/en/g/backrooms-recovery ｜ https://poki.com/en/g/horror-dungeon-3d ｜ https://poki.com/en/g/escape-from-spider
- https://adayofjoy.itch.io/exhibit-of-sorrows ｜ https://qwook.itch.io/last-seen-online ｜ https://kenforest.itch.io/rotten-machines ｜ https://itch.io/games/platform-web/tag-horror
- https://docs.crazygames.com/requirements/technical/ ｜ https://docs.crazygames.com/requirements/gameplay/ ｜ https://docs.crazygames.com/requirements/quality/ ｜ https://docs.crazygames.com/requirements/multiplayer/
- https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API ｜ https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay ｜ https://developer.chrome.com/blog/autoplay ｜ https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia

---

## 16. 跨遊戲主題整理

### 16.1 撤離循環的共同骨架
1. **進場帶少量裝備** → 2. **在計時與升溫的威脅下收集** → 3. **決定何時走** → 4. **一段有風險的撤離** → 5. **結算、買東西、再來**。
- 計時器：Lethal Company 午夜、Content Warning 氧氣 500 秒、DbD 終局 2 分鐘。
- 配額：Lethal Company 三天一輪、Content Warning 三天觀看數、R.E.P.O. 每個撤離點各一份。
- 升溫：Devour 與 Slender 都是「收集越多、鬼越兇」。
- 損失：沒撤離就全丟（撤離類的定義，見 Wikipedia Extraction shooter）。但「全掉光」是負評常客（機核、R.E.P.O. 評論）。
- Hunt: Showdown（撤離恐怖射擊的原型）：找線索 → 殺頭目 → 拿賞金 → 到隨機撤離點；拿到賞金的人位置會曝光。評論特別稱讚聲音設計：烏鴉、木板、哀嚎的馬都會暴露位置。

**教訓**：單人一局 10–15 分鐘的建議骨架——進校園（1 分）→ 收集配額物（6–8 分，鬼逐步升溫）→ 自選「夠了就走」或「再拿一件」→ 撤離點要站滿一段時間且會發出聲音 → 鬼發狂的終局倒數。死了保留圖鑑與外觀，不保留本局物品。

來源：https://en.wikipedia.org/wiki/Extraction_shooter ｜ https://en.wikipedia.org/wiki/Hunt:_Showdown ｜ 及 §3–§13 各節來源

### 16.2 怪物設計與「學規則」
- 一隻一條規則最好記：看著才不動、只有一個人看得到、只聽聲音、會假扮隊友、轉發條倒數。
- 聲音先於畫面：發條音樂越來越快、心跳、雜訊、燈閃。
- 玩家討厭查 wiki：R.E.P.O. 與 Lethal Company 的「Wiki 稅」都是需改進；Phasmophobia 教學差權重 0.17；Labyrinthine 被嫌沒教怎麼應付怪。
- 規則學會後就不怕（機核、Iron Lung、Labyrinthine「只有第一次可怕」）→ 靠隨機出場名單、每晚不同組合、修飾條件來延壽。
- 不公平 ＞ 可怕：R.E.P.O. 的負評焦點是隔牆被打與太早出高階怪。
- 單人要調：Lethal Company 對單人放寬了 Jester 計時與 Butler 血量。

**教訓**：做一本遊戲內的「東海怪談筆記」，遇過一次就記下徵兆與對策（死亡也算遇過）；每晚從鬼名單抽 2–3 隻；每隻鬼先做聲音前兆再做模型。

### 16.3 聲音與近距離語音
- 正面：語音是恐怖也是喜劇的來源（Push to Talk）；隊友死掉語音中斷（機核）；鬼聽得到麥克風（Phasmophobia、Escape the Backrooms）；嘴巴開合與變聲（R.E.P.O.）。Vaporlens：Lethal Company 近距離語音 0.13、Phasmophobia 語音辨識 0.33。
- 負面：一定要開口，害羞的人被排除（學生報）；麥克風靈敏度害自己被怪鎖定（R.E.P.O.）；語音壞掉（Demonologist、Labyrinthine 早期）；文字轉語音只有英文（機核）；「朋友太吵」（Phasmophobia 繁中）；朋友團霸凌新手（R.E.P.O. 繁中）。
- 瀏覽器：麥克風要 HTTPS＋權限視窗，使用者可能不回應；聲音要互動後才能開始。

**教訓**：單人版先把「聲音系統」做起來（腳步、心跳、鬼的定位音、自己製造的噪音會引鬼）；合作版語音採「按鍵發話＋可關＋表情輪盤／快捷語」，拒絕麥克風權限也能玩。

### 16.4 單人 vs 朋友
- 每一款都一樣：單人較弱。Lethal Company 重複 0.27、R.E.P.O. 單人難 0.15、Content Warning 單人無聊 0.19、Outlast Trials 單人差 0.34、Phasmophobia 單人乏味 0.10；Pacify「單人太難、多人太簡單」；Devour 少於 4 人不推薦。
- 繁中評論的常見梗是「陪朋友才買」「沒朋友不要買」。

**教訓**：我們先上單人，所以單人必須是完整的恐怖遊戲（鬼更少但更專注、計時較寬）；合作版不是「同一關加人」，而是加上需要分頭的任務與會坑到隊友的道具。

### 16.5 節奏、重複、難度、單局長度
- 「重複」是所有合作恐怖的頭號負評；Content Warning 約 10 小時內容玩完。
- 有持續大更新的（R.E.P.O.）每次更新都回流；沒更新的（Content Warning、2024–2025 的 Lethal Company）直線下滑。
- 難度：玩家要自訂難度（R.E.P.O. 負評、Phasmophobia 已有）；第 3 關陡升被罵；全滅整輪重來對新手太重。
- 單局：Devour 最長一小時被嫌拖；Vaporlens 記 Lethal Company 與 R.E.P.O. 一次遊玩約 2 小時（多局）；瀏覽器熱門作是幾分鐘到一小時。

**教訓**：小團隊不要比內容量；用「每日種子」（PEAK 每 24 小時換地圖）＋隨機鬼名單＋夜間修飾（停電、起霧、考試週）做變化；難度三段可選。

### 16.6 Bug、連線、效能
- 繁中負評的最大宗是連線：斷線、進不了房、朋友掉線、被踢。
- 低配備跑得動是加分（Lethal Company 0.18、R.E.P.O. 0.16、Content Warning 0.13）。
- 任務物品消失、存檔清零是最傷的 bug 類型。
- Content Warning 在 2025-11 才補上房號（lobby code）；CrazyGames 要求邀請連結直進。

**教訓**：合作版房間上限 4 人、房號＋連結、斷線可重連回同一局、進行中加入先當觀眾；配額物品掉出邊界自動回到最近的合法位置。

---

## 17. 武器與道具：恐怖又好笑的做法（回應「東海人的特色武器」需求）

**各遊戲怎麼處理武器**
- **R.E.P.O.**（2026-11-01 的清單共 27 種）：
  - 日常物當武器：平底鍋（每下 18、10 次電量）、棒球棍、大鐵鎚、吹葉機（只會吹開與擊暈）。
  - 玩笑武器：充氣槌平常只有 5 點傷害，但爆炸時 250；橡皮鴨會彈跳，彈回來會炸到自己；「人類手榴彈」；用膠帶捆在一起的手榴彈；2026-10 新增「人類槍」。
  - 控場多於殺傷：麻醉槍（0 傷害、長時間昏迷）、衝擊波手榴彈與地雷（只擊退）、電擊棒（短暫擊暈）。
  - **限制**：近戰、槍、法杖都吃電量，用完要回卡車充電，充電要買能量水晶；手榴彈與地雷一次性；爆炸不分敵我；炸到貴重物品會掉價。
  - 負評：近戰會打到自己、槍散布太大；也有人說後期霰彈槍讓怪變簡單（搜尋摘要）。
- **Lethal Company**：鏟子 30 元、每下 1 點傷害；商店說明曾從「自衛用」改成「挖土用」。撿來的停車標誌、讓路標誌功能等同鏟子但重很多（28–42 磅）。很多怪根本殺不死（Jester、Coil-Head）。喇叭、小丑喇叭、放屁墊是會發出聲音的廢料——而聲音會引來瞎眼狗。玩家抱怨「武器選擇弱」的權重只有 0.05。
- **Devour**：紫外線手電筒，有限電量；越後面越難讓惡魔踉蹌。
- **The Outlast Trials**：磚塊、酒瓶，只能引開或短暫擊暈。
- **Phasmophobia**：完全沒有武器，只有十字架、焚香這類防禦品。
- **Pacify**：用娃娃「安撫」而不是攻擊。
- **Haunted School（瀏覽器）**：很早就給霰彈槍，但只能把惡靈暫時趕走，沒子彈就只能跑。
- **Content Warning**：幾乎沒有武器，繁中評論拿「電擊棒」開玩笑，也有人因此嫌內容少。
- **DbD**：木板砸暈、手電筒照盲，都是爭取幾秒。

**歸納出的五條規則**
1. **是日常物，不是軍火**：平底鍋、路標、吹葉機。熟悉的東西拿來打鬼，本身就好笑。
2. **只能拖時間，不能除掉**：擊暈、擊退、趕走幾秒。鬼殺不死，恐怖才留得住。
3. **用量有限且要付代價**：電量、次數、要回安全點補充。
4. **會發出聲音、會波及自己人與戰利品**：這是合作時的笑點來源，單人時則是風險（引來別的鬼）。
5. **留一個荒謬的失敗方式或大獎**：充氣槌偶爾大爆炸、橡皮鴨彈回來炸自己。

**教訓（給東海特色武器）**
- 每件武器 = 一個東海人一看就懂的日常物 ＋ 一個實際功能（擊暈／擊退／誘餌／照明）＋ 一個好笑的副作用（很吵、會反彈、會把自己的配額物弄壞、偶爾失靈）。
- 讓「對的武器配對的鬼」成為知識：某件校園物品只對某個傳說有效，寫進怪談筆記。
- 具體要用哪些東海物品，由校園傳說與學生文化那份筆記決定；本筆記不對東海的事實做任何假設。
- 平衡上先做 3–4 件就夠（R.E.P.O. 首發時也不多），其中至少 1 件是「幾乎沒用但很好笑」的。

來源：
- https://bloxodes.com/wiki/repo/weapons （2026-11-01 更新的攻略站，非官方）
- https://store.steampowered.com/feeds/news/app/3241660/
- https://lethal.miraheze.org/wiki/Shovel ｜ https://lethal.miraheze.org/wiki/Scrap ｜ https://lethal.miraheze.org/wiki/Eyeless_Dog ｜ https://lethal.miraheze.org/wiki/Jester ｜ https://lethal.miraheze.org/wiki/Coil-Head
- https://en.wikipedia.org/wiki/Devour_(video_game) ｜ https://en.wikipedia.org/wiki/The_Outlast_Trials ｜ https://en.wikipedia.org/wiki/Phasmophobia_(video_game)
- https://www.crazygames.com/game/haunted-school---horror-game
- https://steamcommunity.com/app/3241660/negativereviews/?browsefilter=toprated&filterLanguage=english ｜ https://steamcommunity.com/app/2881650/negativereviews/?browsefilter=toprated&filterLanguage=tchinese

---

## 18. 台灣校園傳說改編的先例：女鬼橋 開魂路

- 大宇資訊，2022-08-25，Steam，Unreal Engine，單人。第一人稱躲藏解謎；**沒有武器**，只能觀察、躲、逃。舞台是虛構的「東湖大學」，以十大校園恐怖傳說為賣點，改編自同名電影。
- zh.wikipedia 記載 Steam 約 1,503 則評論、90% 好評（日期不明，僅單一來源）；2023-03 宣布續作。
- 本次沒能開到它的 Steam 頁與媒體評論（找不到正確網址），銷量未查到。

**教訓**：台灣校園傳說恐怖已有商業先例且口碑不差，但走的是單人、寫實、無武器的劇情路線；「粗糙畫面＋撤離＋好笑武器＋之後可合作」這個組合沒有人做過，和它不撞。它用虛構校名；我們用真實校園，敘事上要更小心（交給傳說那份筆記處理）。

來源：https://zh.wikipedia.org/zh-tw/女鬼橋_開魂路

---

## 19. 給本專案的優先順序（濃縮）

1. **一局 10–15 分鐘、點一下就開始**；首包 ≤ 20MB、20 秒內可玩。
2. **配額＋死線＋會出聲的撤離點＋終局倒數**；有終點、有上限。
3. **每隻傳說鬼：一條規則、一個聲音前兆、一個對策**；遊戲內怪談筆記；每晚隨機 2–3 隻。
4. **PS1／VHS 低解析風格當預設**；鬼的動作詭異不滑稽；亮度、晃頭、色盲、解析度選項。
5. **武器是日常物、只拖時間、有限次、很吵、有好笑副作用**；先做 3–4 件。
6. **單人先做完整**，偷偷放寬計時；合作版加「分頭任務」與「會坑隊友的道具」，不是加怪。
7. **合作版**：4 人上限、連結／房號、斷線重連、中途加入當觀眾、按鍵發話＋表情輪盤、先不做真人扮鬼、不開放上傳內容。
8. **不要做的**：找 N 把鑰匙公式、腳本式突發驚嚇當主菜、不能跳過的過場、全滅整輪重來、強制高畫質功能、為留存而做的農。

## 20. 尚未查證／建議後續補查

- R.E.P.O. 官方銷量（目前只有第三方估算，28.7M 這個數字只有一個二手來源）。
- R.E.P.O. 2025-11 的怪物更新內容（只看到標題與在線尖峰）。
- The Outlast Trials 2026-10 同時在線衝到 14.5 萬的原因。
- Devour、Pacify、Labyrinthine、Demonologist、Escape the Backrooms 的官方銷量（未找到）。
- Puppet Combo 各作與 Dread X Collection 的 Steam 評論數（找不到正確商店頁網址）。
- 巴哈、PTT、Dcard 上台灣玩家對這些遊戲的討論串（搜尋額度用完，未能開到）。
- 女鬼橋 系列的 Steam 現況與媒體評論。
