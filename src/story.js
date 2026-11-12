// The story of the woman on the bridge. Pure data + progress tracking (no three.js),
// so it can be unit-tested and saved to localStorage.
//
// 過去  what happened on a typhoon night in 民國六十四年, told through six things she and he left behind
// 現在  the player carrying those things across campus while she follows, and what she says as she starts to understand
// 未來  what the player does with them on the bridge, and what the campus is like fifty years on
//
// Everyone here is fictional.

export const HER = '沈秋棠', HIM = '周啟文';

// Fragments are found in order; each one points at the next.
// place: name of a building in the map data, or [x, z] for areas / paths.
export const FRAGMENTS = [
  {
    id: 'photo', title: '夾在詩歌本裡的照片', where: '路思義教堂', place: 'spawn', date: '民國六十二年　春',
    hint: '教堂門口的長椅上有一本舊詩歌本',
    body: `一張黑白照片，邊角已經發黃。

教堂前，聖樂團二十幾個人站成三排。第二排最左邊的女生沒有看鏡頭，她在看站在後排、拿著捲尺和圖筒的高個子男生。

照片背面，鋼筆字：

「秋棠：
　妳唱女高音的那一句，整座教堂的瓦都在響。
　　　　　　　　　　　　　　　　　　　　　——啟文」

下面有另一行字，筆跡不同，像是很多年後才補上去的，墨水是藍的：

「他說要等我。是我在等他。」`,
    next: '照片裡她別著女生宿舍的門禁牌。去女生宿舍看看。',
  },
  {
    id: 'diary', title: '窗台下的日記', where: '女生宿舍', place: '女生宿舍3棟', date: '民國六十四年　九月',
    hint: '女生宿舍的窗台下塞著東西',
    body: `硬殼筆記本，封面寫「外文三　沈秋棠」。大部分的頁面黏在一起了，只有最後幾頁翻得開。

「九月三日
　啟文的入學許可下來了，賓州。他說明年春天走。
　我沒有哭，我去牧場把下個月的班都排滿了。」

「九月十五日
　他說走之前有話要當面講，叫我不要問。
　約在約農路下面那座小橋，颱風過了的那個晚上，十二點。
　他說：『不管多晚，妳等我。』
　我說好。」

「九月二十一日
　廣播說颱風明天晚上到。
　他今天進城，說是去拿一樣訂了很久的東西。
　我把牧場的工錢領出來了，四百二十塊，想給他當路費。包在手帕裡。」

最後一頁只有一行，字很用力，紙都劃破了：

「橋上好冷。」`,
    next: '她在牧場打工。乳品小棧也許還留著當年的東西。',
  },
  {
    id: 'ledger', title: '工讀簽到簿與手帕', where: '乳品小棧', place: '乳品小棧', date: '民國六十四年　九月二十二日',
    hint: '乳品小棧後門的鐵櫃沒有鎖',
    body: `牧場的工讀簽到簿。翻到九月。

沈秋棠的名字每天都在，一格不缺，簽到凌晨五點擠奶的那一班。

九月二十二日那一格，簽到的字跡很潦草，旁邊有場長的紅筆：

「颱風，提早收工。秋棠說晚上有事，把雨衣借走了。
　叫她不要出門，她笑笑沒說話。」

九月二十三日以後，她的格子是空的。
一路空到學期結束。有人用鉛筆在最後一格寫了很小的字：「對不起。」

簿子裡夾著一條手帕，包著一疊舊鈔票，四百二十塊。
她沒有帶去橋上。她是打算回來拿的。`,
    next: '後來發生了什麼事？圖書館的舊校刊應該有記載。',
  },
  {
    id: 'clipping', title: '校刊剪報', where: '圖書館', place: [-767.2, -110.8], date: '民國六十四年　十月',
    hint: '圖書館還書箱旁有一疊沒人要的舊校刊',
    body: `校刊第三版，角落一則很短的消息：

「【本刊訊】上月二十二日颱風夜，外文系三年級沈姓女同學深夜外出未歸，翌日清晨於約農橋下游尋獲，已無生命跡象。據了解溪水當晚暴漲，研判係失足落水。校方籲請同學颱風期間切勿外出。」

同一版，更小的字：

「建築系五年級周姓同學同日自市區返校途中失聯，三日後於相思林西側坍方處尋獲。」

兩則消息之間隔了一則社團招生廣告。沒有人把它們放在一起看。

剪報邊緣有人用原子筆寫：

「大家都說她是被拋棄了才去橋上的。
　不是。他有來。他只是沒有走到。」`,
    next: '「他有來」——寫這行字的人怎麼知道？去東海大學郵局問問那一年的信。',
  },
  {
    id: 'letter', title: '退回的限時信', where: '東海大學郵局', place: '東海大學郵局', date: '民國六十四年　九月二十二日　午',
    hint: '郵局的「無法投遞」木箱在櫃檯底下',
    body: `一封沒有拆過的限時信。信封上蓋著「查無此人　退回」，退回的日期是九月二十五日。

收件人：女生宿舍　沈秋棠
寄件人：台中市　周　寄

你拆開它。

「秋棠：

　我在金鋪門口寫這封信。戒指好了，比我想的還小，妳的手那麼小。

　颱風要來了，客運說下午可能停駛。我怕我趕不上十二點，所以先寄這封信，限時的，應該比我早到。

　如果我晚了，妳不要等。回宿舍去，把門窗關好。
　我明天、後天、大後天都會去橋上。妳哪一天來都可以。

　我不去美國了。許可書我退回去了，這件事我想當面告訴妳，所以才叫妳不要問。

　等我。
　　　　　　　　　　　　　　　　　　　　　　　　啟文」

信在颱風天誤了一班車，到宿舍的時候，她已經不在了。
舍監在信封上寫了「查無此人」。它在這個木箱裡躺了五十年。`,
    next: '他從市區走回來，抄了相思林的近路。戒指還在那裡。',
  },
  {
    id: 'ring', title: '生鏽的戒指盒', where: '相思林', place: [-925.6, -243.1], date: '民國六十四年　九月二十二日　夜',
    hint: '相思林深處，一棵相思樹的樹根纏著什麼',
    body: `樹根中間卡著一個鐵盒，鏽得幾乎打不開。

裡面是一只很細的金戒指，和一張被水泡過又乾掉的收據。
收據上的字還認得出來：

「金戒壹只　內刻『棠』字
　　　　　　民國六十四年九月二十二日　付訖」

客運停駛了。他是從市區走回來的，十幾公里，在颱風裡。
他抄了相思林的近路，因為那樣可以早二十分鐘到橋上。

土石是在十一點四十分左右滑下來的。

那時候她已經在橋上了，穿著跟場長借的雨衣。
她等到溪水漫過橋面，然後她不等了——她往相思林的方向走，去找他。

他們離彼此，不到八百公尺。`,
    next: '把信和戒指帶去女鬼橋。她還在那裡等。',
  },
];

// What she says, by how many fragments you carry. Shown as subtitles.
export const LINES = {
  appear: [
    ['……是你嗎？', '……啟文？'],
    ['你身上有他的字。', '那張照片……還給我。'],
    ['那是我的日記。', '你為什麼有我的東西。'],
    ['四百二十塊……我忘了拿。', '我是要回去拿的。'],
    ['他們說我是被丟下的。', '不是那樣。'],
    ['信？他有寫信？', '唸給我聽。拜託。'],
    ['帶我去橋上。', '我跟你走。'],
  ],
  vanish: [
    ['……不是他。'], ['不要看我。'], ['不要看我的臉。'], ['我現在很難看。'], ['不要看。'], ['……等一下。'], ['我不躲了。'],
  ],
  lunge: [
    ['不要走——'], ['你也要走嗎——'], ['不要丟下我——'], ['再等一下——'], ['他有來——他有來——'], ['把信給我——'], ['……'],
  ],
};

// 籤詩: drawn at the shrines after an offering. They talk about what has not happened yet.
export const FORTUNES = [
  { no: '第七籤　中平', verse: '橋頭風雨五十秋，一紙遲書未到手。\n若有行人代傳信，從此長夜不須守。', note: '有人在等一封信。信還在，只是沒送到。' },
  { no: '第十九籤　下下', verse: '焚書容易斷情難，火裡文章水裡看。\n莫道一燒千事了，橋邊又添一人寒。', note: '有些東西燒掉了，等的人不會少，只會多。' },
  { no: '第三十三籤　上吉', verse: '相思樹下土生金，八百步外是知音。\n金歸其主魂歸路，明年橋上有花陰。', note: '金子該回到刻著名字的那個人手上。' },
  { no: '第四十一籤　中吉', verse: '陪君坐到東方白，不問歸期不問來。\n世上原無白等事，有人相伴即花開。', note: '也有人選擇不替她結束，只是陪她。' },
  { no: '第五十二籤　中平', verse: '夜行莫向笑聲尋，紅衣引路入深林。\n樹上有繩須仰首，耳聾之物怕無音。', note: '這一支講的不是她，是夜裡其他的東西。' },
  { no: '第六十籤　上上', verse: '百年樹木百年人，後來學子不知因。\n但見橋頭雙影去，從今此地只逢春。', note: '很久以後，這座橋會有別的名字。' },
];

// The three things you can do on the bridge, and what they lead to.
export const ENDINGS = {
  release: {
    choice: '把信唸給她聽，把戒指放在她手上', name: '還　願',
    now: `你把信拆開，一個字一個字唸。

唸到「我不去美國了」的時候，橋下的水聲停了。
唸到「等我」，她抬起頭。五十年來第一次，她沒有躲開別人的眼睛。

你把戒指放在她手上。很細的一只，內側刻著一個「棠」字。
她看了很久，然後往相思林的方向看。

「他有來。」她說。

「嗯，他有來。」

她笑了一下，是照片裡的那種笑。然後橋上就只剩下你一個人，和很乾淨的風。`,
    future: `【五十年後　民國一六四年　秋】

新生訓練的學長帶隊走過約農路，有人問：「這座橋為什麼叫女鬼橋？」

學長想了想，說不知道，從他進來就這樣叫了，也沒聽說誰真的看過什麼。

橋頭不知道什麼時候長出兩棵相思樹，挨得很近，根在土裡纏在一起。
每年九月颱風過後，樹下會有一束不知道誰放的花。

聖樂團還在教堂練唱。女高音唱到最高的那一句，屋頂的瓦還是會響。`,
    effect: '女鬼不再出現。夜裡還有別的東西，但橋上是空的了。',
  },
  burn: {
    choice: '把信燒掉。這不關你的事', name: '焚　書',
    now: `你覺得夠了。這是五十年前的事，跟你沒有關係。

打火機點著信封的一角，紙燒得很快。

她看著火，沒有動。等到「啟文」兩個字捲起來變成灰，她才慢慢轉過頭來看你。

那不是恨。比恨更糟——她在認你的臉。
像是要把它記五十年。

月亮紅了。`,
    future: `【五十年後　民國一六四年　秋】

新生訓練的學長帶隊走過約農路，走到橋前面就繞路了。

「晚上不要走這裡。」學長說，「以前只有一個。現在是兩個。」

「兩個什麼？」

「一個女的，在等人。還有一個，」學長壓低聲音，「聽說是當年把她的信燒掉的那個學生。她不讓他走。他得陪她等，等到有人把那封信還給她為止。」

「可是信已經燒掉了啊。」

「對。」學長說，「所以沒有為止。」`,
    effect: '血月不再落下。她不再躲了。',
  },
  stay: {
    choice: '什麼都不做。在她旁邊坐下來，陪她等', name: '相　陪',
    now: `你把信和戒指收回口袋。

有些事情不是你可以替別人結束的。

你在橋欄杆上坐下來，離她一個人的距離。她沒有躲，也沒有靠近。
溪水很小聲。相思林那邊有風。

過了很久，她說：「你不走嗎？」

「等一下再走。」

她沒有再說話。你們一起看著路的那一頭，看到天亮。`,
    future: `【五十年後　民國一六四年　秋】

校園怪談社的社刊這樣寫：

「女鬼橋的傳說近年有了新版本。據多位夜歸同學表示，颱風夜的橋上有兩個人影，一個站著，一個坐在欄杆上，隔著一個人的距離。

　兩個都不會害人。你從旁邊走過去，坐著的那個還會點點頭。

　有人說坐著的那個，是很多年前一個半夜不睡覺、到處撿舊東西的學生。他口袋裡一直有一封沒送出去的信。

　他在等她準備好。」`,
    effect: '她還在，但不再傷害你。夜裡她會遠遠跟著，像在送你。',
  },
};

// 怪談: posted on notice boards. Lore plus the rule you need to survive each thing.
export const RUMORS = [
  { id: 'banshee', title: '橋上的學姊', body: '別盯著她看，她不喜歡別人看她的臉。也別背對她太久。\n她不是在追你。她在確認你是不是她等的那個人。' },
  { id: 'jiangshi', title: '後山的殭屍', body: '看不見，只會聽。跑步、開槍，牠都聽得到。\n蹲著走，或者乾脆站著不動，牠會從你旁邊跳過去。\n頭上那張符是弱點。' },
  { id: 'hanged', title: '相思林的繩子', body: '走樹下之前先抬頭。聽到繩子吱嘎響就繞路。\n被掐住的話不要掙扎，直接對著它開槍。' },
  { id: 'girl', title: '紅衣小女孩', body: '聽到笑聲不要追。她跑不是因為怕你，是要你跟上。\n被牽走的人，醒來都不在原來的地方。' },
  { id: 'wisp', title: '阿飄', body: '成群出現，怕亮。把路燈打開，牠們就不敢靠過來。\n土地公廟拜過之後，身上的平安符可以擋一次。' },
];

const KEY = 'tunghai-royale-story-v1';

export class Story {
  constructor(storage = null) {
    this.storage = storage;
    this.found = [];        // fragment ids, in the order found
    this.fortunes = [];     // indices into FORTUNES
    this.rumors = [];       // rumor ids read
    this.ending = null;     // 'release' | 'burn' | 'stay'
    this.log = [];          // 現在: what the player did, newest last
    this.load();
  }

  get stage() { return this.found.length; }                 // 0..6
  get complete() { return this.found.length >= FRAGMENTS.length; }
  get nextFragment() { return this.ending ? null : FRAGMENTS[this.found.length] || null; }
  has(id) { return this.found.includes(id); }

  // What the HUD should tell the player to do next.
  get objective() {
    if (this.ending) return null;
    const f = this.nextFragment;
    if (f) return { text: f.hint, where: f.where, id: f.id };
    return { text: '把信和戒指帶去女鬼橋', where: '女鬼橋', id: 'bridge' };
  }

  // Fragments must be collected in order. Returns the fragment, or null if it is not the next one.
  collect(id, clock = '') {
    const f = this.nextFragment;
    if (!f || f.id !== id) return null;
    this.found.push(id);
    this.log.push(`${clock}　在${f.where}找到「${f.title}」`);
    this.save();
    return f;
  }

  drawFortune(rng = Math.random, clock = '') {
    const left = FORTUNES.map((_, i) => i).filter((i) => !this.fortunes.includes(i));
    const i = left.length ? left[Math.floor(rng() * left.length)] : Math.floor(rng() * FORTUNES.length);
    if (!this.fortunes.includes(i)) { this.fortunes.push(i); this.log.push(`${clock}　在土地公廟抽到${FORTUNES[i].no.split('　')[0]}`); this.save(); }
    return FORTUNES[i];
  }

  readRumor(id) { if (!this.rumors.includes(id)) { this.rumors.push(id); this.save(); return true; } return false; }

  choose(ending, clock = '') {
    if (!this.complete || this.ending || !ENDINGS[ending]) return null;
    this.ending = ending;
    this.log.push(`${clock}　在女鬼橋上：${ENDINGS[ending].name.replace('　', '')}`);
    this.save();
    return ENDINGS[ending];
  }

  // One line of hers for a given moment, chosen by how much of the story you carry.
  line(kind, rng = Math.random) {
    const set = LINES[kind]?.[Math.min(this.stage, 6)];
    return set ? set[Math.floor(rng() * set.length)] : '';
  }

  reset() { this.found = []; this.fortunes = []; this.rumors = []; this.ending = null; this.log = []; this.save(); }

  save() {
    try { this.storage?.setItem(KEY, JSON.stringify({ found: this.found, fortunes: this.fortunes, rumors: this.rumors, ending: this.ending, log: this.log.slice(-40) })); } catch { /* private mode */ }
  }

  load() {
    try {
      const d = JSON.parse(this.storage?.getItem(KEY) || 'null'); if (!d) return;
      const ids = FRAGMENTS.map((f) => f.id);
      // keep only a valid in-order prefix, in case the fragment list changed between versions
      this.found = []; for (const id of d.found || []) { if (id === ids[this.found.length]) this.found.push(id); else break; }
      this.fortunes = (d.fortunes || []).filter((i) => FORTUNES[i]);
      this.rumors = (d.rumors || []).filter((id) => RUMORS.some((r) => r.id === id));
      this.ending = ENDINGS[d.ending] && this.complete ? d.ending : null;
      this.log = Array.isArray(d.log) ? d.log : [];
    } catch { /* corrupt save: start over */ }
  }
}
