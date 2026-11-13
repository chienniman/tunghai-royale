// 劇本: everything that turns the six fragments in story.js into a night you live
// through — the opening, chapter cards, the people in the present (a roommate on
// the phone, the night guard who has kept a secret for fifty years, and a number
// that should not be able to text you), what the world does at each beat, and
// what you think when you look at things. Pure data, no three.js.
//
// The present is 民國一一四年 (fifty years after the typhoon night in story.js).
// Everyone here is fictional.

export const INTRO = [
  {
    title: '值　夜', meta: '民國一一四年　九月二十二日　下午三點半',
    body: `颱風警報已經發布了。

學校宣布明天停課，宿舍裡的人都在囤泡麵。

你是今年的新生。工讀的第一天，被分配到路思義教堂整理詩歌本。
沒有人告訴你，颱風天可以不用來。`,
  },
  {
    title: '值　夜', meta: '路思義教堂',
    body: `交班的警衛姓伍，大家叫他伍伯。
他把鑰匙交給你的時候，手在抖。

「詩歌本整理完就回宿舍。」他說，「天黑以後，約農路下面那座橋，不要走。」

你問為什麼。

他看著教堂的屋頂，很久沒有說話。

「今天是九月二十二號。」他說。
好像這樣就算回答了。`,
    foot: 'WASD 移動　·　E 互動　·　J 筆記本　·　看到東西就走過去按 E',
  },
];

// Title cards, shown when the story reaches each stage (= number of fragments found).
export const CHAPTERS = [
  ['序　章', '值夜'],
  ['第一章', '她的名字'],
  ['第二章', '四百二十塊'],
  ['第三章', '沒有人把它們放在一起看'],
  ['第四章', '限時'],
  ['第五章', '八百公尺'],
  ['終　章', '橋'],
];

// Phone messages. when: 'start' | 'stage:n' | 'night' | 'end:<ending>'; delay in seconds after the trigger.
export const ROOMMATE = '阿哲', UNKNOWN = '未知號碼';
export const PHONE = [
  { when: 'start', delay: 9, from: ROOMMATE, text: '你真的去工讀喔　颱風天欸' },
  { when: 'start', delay: 17, from: ROOMMATE, text: '幫我看教堂旁邊那台販賣機還有沒有奶茶　我請你' },
  { when: 'stage:1', delay: 5, from: ROOMMATE, text: '什麼照片？拍給我看' },
  { when: 'stage:1', delay: 13, from: ROOMMATE, text: '這很久以前的吧　你在哪撿的' },
  { when: 'night', delay: 4, from: ROOMMATE, text: '天黑了　你還沒回來？' },
  { when: 'night', delay: 12, from: ROOMMATE, text: '學長說晚上聽到小孩笑不要回頭　我是認真的' },
  { when: 'stage:2', delay: 4, from: UNKNOWN, text: '那是我的。', stamp: '00:00' },
  { when: 'stage:2', delay: 14, from: ROOMMATE, text: '你訊號怪怪的　我剛打給你是一個女生接的' },
  { when: 'stage:3', delay: 8, from: ROOMMATE, text: '我查了　民國64年9/22真的有颱風　跟今天同一天' },
  { when: 'stage:4', delay: 5, from: UNKNOWN, text: '他們說的不對。', stamp: '00:00' },
  { when: 'stage:4', delay: 12, from: ROOMMATE, text: '宿舍停電了！！你那邊有電嗎' },
  { when: 'stage:5', delay: 5, from: UNKNOWN, text: '唸給我聽。', stamp: '00:00' },
  { when: 'stage:5', delay: 16, from: ROOMMATE, text: '你不要再撿了啦　快回來' },
  { when: 'stage:6', delay: 5, from: UNKNOWN, text: '橋。', stamp: '00:00' },
  { when: 'stage:6', delay: 14, from: ROOMMATE, text: '雨超大　你到底在哪　我去找你' },
  { when: 'stage:6', delay: 22, from: ROOMMATE, text: '算了我不敢　你自己小心' },
  { when: 'end:release', delay: 6, from: ROOMMATE, text: '欸　雨停了' },
  { when: 'end:release', delay: 12, from: ROOMMATE, text: '月亮好亮' },
  { when: 'end:deliver', delay: 6, from: ROOMMATE, text: '警衛伯伯剛剛走過宿舍　他在哭　可是好像又在笑' },
  { when: 'end:burn', delay: 5, from: UNKNOWN, text: '我記得你了。', stamp: '00:00' },
  { when: 'end:stay', delay: 10, from: ROOMMATE, text: '你怎麼還不回來' },
  { when: 'end:stay', delay: 30, from: ROOMMATE, text: '？' },
];

// 伍伯, the night guard. One conversation per stage; `again` is what he says if you ask twice.
// He is always waiting a little way before the next thing you need to find.
export const GUARD = '伍伯';
export const GUARD_TALK = [
  { lines: ['詩歌本整理完了？', '門口長椅上還有一本。那本很舊了，你輕一點翻。', '……我去巡一圈。'], again: '長椅上那一本。輕一點翻。' },
  {
    lines: ['……你手上那是什麼。', '照片。', '詩歌本裡夾的。……我以為我都收乾淨了。', '第二排最左邊那個，外文系的，聖樂團唱女高音。',
      '不要問我她叫什麼。你去女生宿舍那邊，窗台下面看看。', '我老了，彎不下去。'],
    again: '女生宿舍。窗台下面。',
  },
  {
    lines: ['你找到日記了。', '我那一年十九歲，在總務處當工友。送公文，送信，掃教堂。', '她每天早上五點去牧場擠奶，我每天早上五點掃教堂。',
      '她都會說早安。全校只有她會跟工友說早安。', '乳品小棧後面那個鐵櫃沒有鎖。從來沒有鎖過。'],
    again: '鐵櫃。沒有鎖。',
  },
  {
    lines: ['四百二十塊。', '她是要回來拿的。你看懂了嗎？她是打算回來的。', '後來大家都說她是想不開。校刊也是那個意思。',
      '不是。全校只有我知道不是。', '……你去圖書館翻那一年的校刊。看完再來找我。'],
    again: '圖書館。舊校刊。',
  },
  {
    confession: true,
    lines: ['剪報旁邊那行字是我寫的。「他有來。」', '你要問我怎麼知道。', '因為那封限時信，是我送的。',
      '九月二十二號中午到的。限時信，要馬上送。', '可是風已經很大了。女生宿舍在坡下面。我想說……明天再送。一封信而已。',
      '隔天早上我拿著信走到宿舍門口，舍監在哭。', '我就在信封上寫了「查無此人」。我自己寫的。我把它退回去了。',
      '五十年。我每年九月二十二號都去郵局看那個木箱。信一直在。我一直不敢拿。', '你去拿。'],
    again: '郵局。櫃檯底下的木箱。……我不敢。',
  },
  {
    lines: ['你拆了。……他寫什麼。', '「不去美國了。」', '……她到最後都不知道。', '他是我找到的。搜了三天，在相思林西邊。',
      '手裡握著一個鐵盒，握得很緊，我扳不開。我就……沒有扳。跟土一起埋回去了。', '我想說至少那個是他們的，不要讓學校收走。',
      '樹根應該已經把它包起來了。你去找。'],
    again: '相思林。樹根裡。',
  },
  {
    lines: ['她在上面。', '我每年都來。站在這裡。五十年，沒有走上去過。', '你要怎麼做，是你的事。我沒有資格說話。',
      '……如果你覺得可以，把信給我。', '我欠她一趟。'],
    again: '你決定。我在這裡。',
  },
];
export const GUARD_AFTER = {
  release: '……她走了。我看到了。謝謝你。明天早上五點，我還是會去掃教堂。',
  deliver: '她跟我說早安。五十年了。……你回宿舍去吧，颱風要來了。',
  burn: '……你燒了。那是她的信。——你走吧。不要再讓我看到你。',
  stay: '你也要等？……好。那我陪你們站一下。',
};

// What plays on the radio at the dairy when you find the ledger (a 1975 typhoon bulletin).
export const BROADCAST = [
  '……中央氣象局六十四年九月二十二日十六時發布……',
  '……海上陸上颱風警報……暴風圈今晚接觸本島中部……',
  '……山區嚴防土石坍方……沿溪低窪地區民眾請勿外出……',
  '……重複一次，請勿外出……',
];

// The call you can answer at a phone booth after reading his letter.
export const PHONE_CALL = [
  ['', '（話筒很冰。雜訊後面有很大的風聲。）'],
  ['男聲', '喂？秋棠？聽得到嗎？'],
  ['男聲', '客運停了，我用走的。妳先不要去橋上，風太大。'],
  ['男聲', '……喂？'],
  ['', '（線路斷了。然後另一個聲音，很近，像是貼著你的耳朵。）'],
  ['女聲', '他說什麼。'],
  ['女聲', '他剛剛說什麼。'],
];

// Inner monologue for things you can look at. Arrays are picked from at random.
export const LOOK = {
  booth: ['（話筒裡只有很遠的風聲。）', '（沒有撥號音。這種電話早就沒人用了。）', '（投幣口卡著一枚民國六十幾年的一元硬幣。）'],
  boothNight: ['（有人在另一頭呼吸。你把話筒掛回去。）', '（你聽見自己的名字。你沒有告訴過任何人你在這裡。）'],
  radio: ['（沙沙沙——只有雜訊。）', '（轉到一個台，在播很老的歌。）'],
  vendingEmpty: ['（卡住了。你踹了它一腳，聲音很大。）', '（燈亮了一下又暗掉。什麼都沒掉出來。）'],
  cat: ['（牠讓你摸了兩下，然後走開。）', '（呼嚕呼嚕。）', '（牠看了你一眼，繼續舔腳。）'],
  catAfraid: ['（貓盯著你背後，毛全豎起來了。）', '（牠哈了一口氣。不是對你。）'],
  cow: ['哞。', '（牠嚼著草，完全不在乎颱風。）', '（很溫暖。牛欄裡沒有那種冷。）'],
  fountain: ['（水有一點鐵鏽味，但是是涼的。）'],
  mailbox: ['（綠色的是平信，紅色的是限時。紅色那一邊的投信口被膠帶封住了。）', '（「颱風期間收信時間異動」。這張公告看起來貼了很多年。）'],
  busstop: ['（末班車 22:10。旁邊有人用立可白寫：不要等。）', '（時刻表被雨泡爛了。只認得出「東海別墅」四個字。）'],
  breaker: ['（總開關是開著的。現在沒有停電。）'],
  bike: ['（鏈條有點鬆，但還能騎。）'],
};

// Stones and plaques: each one says something specific.
export const STELES = [
  { label: '文理大道的石碑', text: '（「求真　篤信　力行」。石頭上的青苔長到了「信」字的一半。）' },
  { label: '相思林邊的小石碑', text: '（「民國六十四年颱風　紀念」。下面沒有刻名字。有人放了一罐沒開過的奶茶。）' },
  { label: '橋頭的銅牌', text: '（「約農橋支線人行便橋」。有人用美工刀在旁邊刻了三個字：女鬼橋。更下面，很小的字：對不起。）' },
  { label: '教堂的奠基石', text: '（「一九六三」。聖樂團的照片就是在這塊石頭前面拍的。）' },
  { label: '牧場的木牌', text: '（「工讀生簽到處」。釘子上掛著一件雨衣，硬得像紙板，五十年沒有人來還。）' },
];

// Lines of narration at story beats.
export const BEATS = {
  nightfall: '（你闔上日記的時候，天已經黑了。你不記得自己在這裡站了多久。）',
  bridgeDay: '（白天的橋，只是一座橋。等天黑再來。教堂的鐘可以讓天黑得快一點。）',
  ringing: '（遠處有電話在響。這年頭誰還會打公共電話。）',
  storm: '（雨下來了。跟五十年前同一天，同一個時間。）',
  lead: '（她走在你前面，往橋的方向。她沒有回頭，但是她在等你跟上。）',
};
