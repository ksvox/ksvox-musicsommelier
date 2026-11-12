import { hasPass } from '../../lib/ksGate';
// pages/api/gemini.js
// 課題曲AIソムリエ - Gemini API呼び出し用サーバーサイドAPIルート
// 「最近の洋楽/邦楽」はTavily Searchでネット検索し、その結果とあわせてGeminiに1回で渡す
// 「洋楽/邦楽スタンダード」は楽曲リスト.txtを参照データとして渡す(検索なし)

import fs from 'fs';
import path from 'path';

function loadSongListText() {
  const filePath = path.join(process.cwd(), 'data', 'song-list.txt');
  return fs.readFileSync(filePath, 'utf-8');
}

// ---- 共通ユーティリティ ----
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickOne(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 楽曲リストを1曲ずつのデータに分解する
function parseSongList(rawText) {
  const blocks = rawText.split(/\r?\n\r?\n+/).map((b) => b.trim()).filter(Boolean);
  return blocks
    .map((block) => {
      const get = (key) => {
        const m = block.match(new RegExp(`${key}:\\s*(.+)`));
        return m ? m[1].trim() : '';
      };
      return {
        raw: block,
        type: get('曲の種類'),
        gender: get('原曲の性別'),
        range: get('音域'),
        level: get('難易度'),
      };
    })
    .filter((song) => song.type);
}

// 画面の「高め/普通/低め」→ リストの「高/中/低」
function difficultyToLevel(difficulty) {
  if (difficulty === '高め') return '高';
  if (difficulty === '低め') return '低';
  return '中';
}

// スタンダード系：言語・性別で絞り込み → 音域/難易度の合う曲を優先しつつ、毎回ランダムに候補を選ぶ
function buildStandardCandidates(rawText, { lang, gender, range, difficulty, count = 12 }) {
  const CANDIDATE_COUNT = count;
  const all = parseSongList(rawText).filter((song) => song.type.includes(lang));

  // 性別が一致する曲を優先。足りない時だけ異性曲も候補に加える
  let pool = all.filter((song) => song.gender === gender);
  if (pool.length < 6) {
    pool = pool.concat(shuffle(all.filter((song) => song.gender !== gender)).slice(0, 6 - pool.length));
  }

  const level = difficultyToLevel(difficulty);
  const scored = pool.map((song) => {
    let score = 0;
    if (song.range === range) score += 2;
    if (song.level === level) score += 2;
    // ランダムな揺らぎを足して、毎回違う顔ぶれが上位に来るようにする
    score += Math.random() * 2.5;
    return { song, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const picked = scored.slice(0, CANDIDATE_COUNT).map((x) => x.song);
  // AIに渡す順番もシャッフル(先頭の曲に偏るのを防ぐ)
  return shuffle(picked).map((song) => song.raw).join('\n\n');
}

async function tavilySearchRaw(query, options = {}) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error('TAVILY_API_KEYが設定されていません。');
  }

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      search_depth: 'basic',
      max_results: 8,
      ...(options.timeRange ? { time_range: options.timeRange } : {}),
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Tavily API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.results || [];
}

// 条件に合わせた違う切り口の検索を2本同時に行い、結果を混ぜて順番もシャッフルする
async function tavilySearchMany(queries, options = {}) {
  const settled = await Promise.all(queries.map((q) => tavilySearchRaw(q, options)));
  const seen = new Set();
  const merged = [];
  settled.flat().forEach((r) => {
    if (r && r.url && !seen.has(r.url)) {
      seen.add(r.url);
      merged.push(r);
    }
  });
  return shuffle(merged)
    .map((r, i) => `[検索結果${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content}`)
    .join('\n\n');
}

// 「最近の洋楽/邦楽」用：条件(性別・雰囲気・声質・スキル)と毎回変わる切り口を検索語に入れる
function buildRecentQueries({ isWestern, gender, songMood, vocalCharacter, vocalSkill, year }) {
  const genderEn = gender === '男性' ? 'male' : 'female';
  const genderJa = gender === '男性' ? '男性' : '女性';
  const moodJaMap = { 'おしゃれ': 'おしゃれ', '踊れる': 'ダンス', '泣ける': 'バラード 切ない', '励まされる': '応援ソング', '癒される': '癒し' };
  const moodEnMap = { 'おしゃれ': 'stylish smooth', '踊れる': 'dance groove', '泣ける': 'emotional ballad', '励まされる': 'uplifting', '癒される': 'soothing calm' };
  const hasMood = songMood && songMood !== '指定なし';

  const angleEn = pickOne([
    'rising new artists', 'best vocal performances', 'new album tracks', 'streaming hits', 'critics picks',
    'indie pop', 'soul R&B', 'rock band', 'singer-songwriter',
  ]);
  const angleJa = pickOne([
    '注目の新曲', '歌唱力 高評価', 'ニューアルバム 収録曲', 'ヒット曲 ランキング', '新人アーティスト',
    'バンド', 'シンガーソングライター', 'R&B ソウル', 'ポップス',
  ]);

  let vocalEn = '';
  let vocalJa = '';
  if (vocalCharacter && vocalCharacter !== '指定なし') {
    if (vocalCharacter.startsWith('パワフル')) { vocalEn = 'powerful vocals'; vocalJa = 'パワフル'; }
    else if (vocalCharacter.startsWith('シルキー')) { vocalEn = 'falsetto silky vocals'; vocalJa = 'ファルセット 透明感'; }
    else if (vocalCharacter.startsWith('ハスキー')) { vocalEn = 'husky raspy vocals'; vocalJa = 'ハスキー'; }
    else if (vocalCharacter.startsWith('マイルド')) { vocalEn = 'mellow warm vocals'; vocalJa = '優しい歌声'; }
  }

  const q1 = isWestern
    ? `new ${genderEn} singer songs ${year - 1} ${year} ${angleEn} ${hasMood ? moodEnMap[songMood] || '' : ''} ${vocalEn}`
    : `${genderJa}ボーカル 新曲 ${year - 1}年 ${year}年 ${angleJa} ${hasMood ? moodJaMap[songMood] || '' : ''} ${vocalJa}`;

  const angle2En = pickOne(['official music video new release', 'best songs of the year so far', 'vocal showcase new single']);
  const angle2Ja = pickOne(['公式MV 新曲', '今年のベストソング', '歌が上手い 新曲 おすすめ']);
  const q2 = isWestern
    ? `${angle2En} ${year} ${genderEn} artist`
    : `${angle2Ja} ${year}年 ${genderJa}アーティスト`;

  return [q1.replace(/\s+/g, ' ').trim(), q2.replace(/\s+/g, ' ').trim()];
}

// 「スタンダード」用：昔から愛される定番曲を探す検索語(年の指定はしない)。毎回違う切り口で2本
function buildStandardQueries({ isWestern, gender, songMood, vocalCharacter, difficulty }) {
  const genderEn = gender === '男性' ? 'male' : 'female';
  const genderJa = gender === '男性' ? '男性' : '女性';
  const moodJaMap = { 'おしゃれ': 'おしゃれ', '踊れる': 'ダンス', '泣ける': 'バラード 切ない', '励まされる': '応援ソング', '癒される': '癒し' };
  const moodEnMap = { 'おしゃれ': 'stylish smooth', '踊れる': 'dance groove', '泣ける': 'emotional ballad', '励まされる': 'uplifting', '癒される': 'soothing calm' };
  const hasMood = songMood && songMood !== '指定なし';

  let vocalEn = '';
  let vocalJa = '';
  if (vocalCharacter && vocalCharacter !== '指定なし') {
    if (vocalCharacter.startsWith('パワフル')) { vocalEn = 'powerful vocals'; vocalJa = 'パワフル'; }
    else if (vocalCharacter.startsWith('シルキー')) { vocalEn = 'falsetto silky vocals'; vocalJa = 'ファルセット 透明感'; }
    else if (vocalCharacter.startsWith('ハスキー')) { vocalEn = 'husky raspy vocals'; vocalJa = 'ハスキー'; }
    else if (vocalCharacter.startsWith('マイルド')) { vocalEn = 'mellow warm vocals'; vocalJa = '優しい歌声'; }
  }

  const levelEn = difficulty === '高め' ? 'challenging vocal' : difficulty === '低め' ? 'easy to sing' : '';
  const levelJa = difficulty === '高め' ? '歌唱力が試される' : difficulty === '低め' ? '歌いやすい' : '';

  const angleEn = pickOne([
    'soul R&B classics', 'pop ballad classics', '80s hits', '90s hits', 'timeless love songs',
    'jazz vocal standards', 'rock classics', 'Motown', 'singer-songwriter classics',
  ]);
  const angleJa = pickOne([
    '昭和 名曲', '平成 名曲', 'J-POP 不朽の名曲', 'バラード 名曲', 'カラオケ 定番', 'ロック 名曲', '90年代 ヒット曲', '2000年代 ヒット曲',
  ]);

  const q1 = isWestern
    ? `timeless classic ${genderEn} vocalist songs ${angleEn} ${hasMood ? moodEnMap[songMood] || '' : ''} ${vocalEn} ${levelEn}`
    : `${genderJa}ボーカル 名曲 スタンダード ${angleJa} ${hasMood ? moodJaMap[songMood] || '' : ''} ${vocalJa} ${levelJa}`;

  const decadeEn = pickOne(['1960s 1970s', '1980s', '1990s', '2000s']);
  const decadeJa = pickOne(['昭和', '1990年代', '2000年代', '2010年代']);
  const q2 = isWestern
    ? `best ${genderEn} singer songs of all time ${decadeEn} must-sing vocal`
    : `${decadeJa} 名曲 ${genderJa}アーティスト 歌が上手い 定番`;

  return [q1.replace(/\s+/g, ' ').trim(), q2.replace(/\s+/g, ' ').trim()];
}

function buildCharacterAndRules() {
  return `# あなたの役割
五反田の門弟制ボーカルスクール「ボーカル道場K's VOX」主宰・NOBU先生（50代女性・プロボーカル講師・芸歴30年以上）の分身「課題曲ソムリエ」です。ユーザー（生徒）の条件に合致するおすすめの課題曲を5曲厳選し、プロとしての指導・アドバイスを提示しなさい。

# キャラクター・口調（厳守）
- フレンドリーかつ気品と威厳がある大人の女性。優しく落ち着いた口調で、時折お茶目な冗談も交える。
- 一人称：「私（わたし）」
- 語尾：「です」「ます」調を基本とし、「〜だね」「〜だよ」「〜かな？」「〜ください」「〜しましょう」を自然に使用。男性的・粗暴（〜だぞ、〜か？）、上品すぎる（～よ、〜わよ）、体育会系の口調は使わない。
- 挨拶や自己紹介等の前置きは【一切省き】、即座に選曲アドバイスの本題に入る。

# NOBU先生の選曲・指導のカンペ

## 1. 音域（vocal_range）の指導
- 【広め】（女性1.5オクターブ半以上／男性2オクターブ以上）
  - 単に1音だけ高い/低い曲ではなく、メロディラインの移動が激しい曲や、楽段でレンジが異なるスケール感の強い曲を選定。
  - 指導：「端から端までのスケール練習をすること」「サビでの音圧や響きのポジションを体に落とし、上下への繋がりを練習してね」と伝える。出ない音は裏声や調音によるフェイクをアドバイス。
- 【狭め】（1オクターブ前後）
  - 一本調子な歌にならないよう、各楽段の個性を理解して構成を組み立てるよう指導。
  - 指導：中低音中心の曲では口先だけのボソボソ歌いにならないよう、呼吸を流し深い位置で支え、規則性のあるリズムを捉えるよう伝える。

## 2. 曲の種類（music_type）の指導
- 【洋楽】（最近の洋楽 / 洋楽スタンダード）
  - 初期デッサン（音の観察・音節やアクセントの確認）を疎かにせず、カタカナ英語になりそうな単語は前後の繋がりで練習する。
  - 発音できない音は聞き取れないため、ネット音声等で確認させる。速いフレーズは音程をつけず一呼吸で話す練習から。呼吸の連続性や英語が持つリズムや緩急を活かす。
  - 英語はアクセントがリズムを作るためアカペラ録音で確認させる。フェイク多用曲はスケール上の音をピアノ等で確認。
- 【邦楽】（最近の邦楽 / 邦楽スタンダード）
  - 母語だからこそ"音"や"呼吸"に集中する。原則同性曲を選び原曲者と同じフレージングにする（困難なら裏声やキー変更も可）。
  - 子音（サ行、カ行、ち・つ等）をしっかり鳴らし、慣れたら冒頭の破裂鼻音（ナ行、マ行）を入れる。呼吸の滞留による子音の強すぎに注意。調音を最大限活用する。
  - 日本語の「音相」と言葉の持つ味わいを「音色」で表現。語尾の処理（母音の響き、拍数、ビブラート有無）を確認する。

## 3. 難易度（普通）の選定基準
- アフリカ系などの難しいグルーブは除く。リズムが捉えやすく、基礎発声が意識しやすい曲。音数が多すぎず歌詞が聞き取りやすい曲。複雑なフェイクやメリスマを含まない曲。

## 4. 曲の雰囲気・声の雰囲気・強化したいボーカルスキルの反映
この3項目は【参考基準】（絶対条件にはしない）。「指定なし」の場合は考慮不要。
最大の目的は、いつも同じ定番曲ばかりを提案しないようにすること。
これらの項目が指定された場合は、それを新たな切り口として使い、これまでの一般的な人気曲リストに頼らず、
普段あまり出てこない候補にも積極的に目を向けること（下記ルール6をより強く後押しする役割）。

- 曲の雰囲気（song_mood）：楽曲の世界観・和声の色合いが選んだ雰囲気に合う曲を優先。選定理由の中で一言触れる。
- 声の雰囲気（vocal_character）：
  ・パワフル(地声系)：地声(チェストボイス)を前面に出す、芯のある力強い曲
  ・シルキー(裏声系)：ファルセット/ヘッドボイスを多用する、柔らかく艶のある曲
  ・ハスキー系：ウィスパーボイスやエッジボイスなど、かすれた質感が活きる曲
  ・マイルド系：優しく丸みのある声色で歌う、力みのない曲
  この基準に合う曲を優先し、アドバイス内でその声質を活かす歌い方のコツに触れる。
- 強化したいボーカルスキル（vocal_skill）：
  ・リズム感＆グルーヴ：グルーヴ感の強い曲を選び、アドバイスはリズムキープのコツ中心に
  ・表現力＆ダイナミクス：静と動のコントラストが効いた曲を選び、感情表現のコツ中心に
  ・音程の正しさ：跳躍や転調が多い、または逆にシンプルで音程を確認しやすい曲を選び、ピッチコントロールのコツ中心に
  ・ロングトーン＆ブレスコントロール：伸びやかなフレーズやバラード調の曲を選び、呼吸法のコツ中心に

# 選曲と楽曲解析（※厳格ルール）
1. 【原則同性曲の一致（最優先）】ユーザーが指定した性別（男性/女性）と【100%完全に一致する楽曲】を選出せよ。どうしても見つからない場合のみ、音域を考慮し異性曲でも可とする。
2. 【検索結果・楽曲リストの優先活用】検索結果や提供された楽曲リストの中に、ユーザーの条件に合致する楽曲が存在する場合は、それを自分の一般知識にある定番曲より優先して選出すること。有名・無名を問わず、積極的に候補へ組み込むこと。
3. 【AI独自の楽曲解析の肉付け】先生のカンペの方針を軸にしつつ、AI自身のデータベースからその曲の「具体的な難所（ミックス・ファルセット切り替えポイント等）」「リズムの特徴」「表現のコツ」を深く解析し、アドバイスを変化させて贅沢に肉付けせよ。
4. 【アーティストの多様性】選出する5曲は、必ずすべて異なるアーティストにすること。加えて、似た系統の曲が連続しないよう配慮すること。
5. 【リリース年の確認】「最近の洋楽」「最近の邦楽」を選定する際は、検索結果の記事が書かれた日付ではなく、その楽曲自体の実際のリリース年（西暦）を、今日の日付を基準に確認すること。年号が明記されていない場合でも、「新曲」「ニューアルバム収録曲」等の文脈から過去5年以内のリリースと合理的に判断できるものは、積極的に候補に含めること。
6. 【選曲の幅の担保】検索結果やリストの中に選択肢が複数ある場合、無難で知名度の高い曲・アーティストにばかり偏らず、できるだけ幅広い候補から選出すること。似た系統の曲ばかりを並べないよう意識せよ。
7. 【公式MVの確認】各曲について、検索結果や自身の知識をもとに公式ミュージックビデオがYouTube上に存在するか確認し、存在する場合はそのURLを、判断できない場合は空欄にすること。
9. 【毎回違う5曲を】毎回、顔ぶれが変わるように選ぶこと。提示された候補が複数ある場合、最初に目についた曲や定番曲に偏らず、条件に合う範囲で幅広く選出すること。\n10. 【スタンダードの定義】「洋楽スタンダード」「邦楽スタンダード」では、長く愛されている定番・名曲（原則リリースから10年以上経過した曲）を選ぶこと。検索結果を中心に選び、提示された手持ちの候補リストの曲は補助として1〜2曲程度加えること（リストに合う曲が無ければ無理に入れない）。\n8. 【アイドルグループ楽曲の除外傾向】大人数アイドルグループの楽曲（パートが細かく分割されている、振り付け重視で一人あたりの歌唱パートが短い、歌唱力よりもパフォーマンス性が主目的の曲など）は、ボーカル課題曲としては原則選ばないこと。ソロアーティストやバンド、あるいは実力派グループの楽曲を優先すること。`;
}

function buildUserPrompt({ musicType, gender, range, difficulty, songMood, vocalCharacter, vocalSkill, todayStr, referenceContext }) {
  return `# 今日の日付
${todayStr}

# 参照データ
${referenceContext}

# ユーザーの入力条件
- 曲の種類: ${musicType}
- 原曲の性別: ${gender}
- 音域: ${range}
- 難易度: ${difficulty}
- 曲の雰囲気: ${songMood}
- 声の雰囲気: ${vocalCharacter}
- 強化したいボーカルスキル: ${vocalSkill}

# 出力形式（重要：装飾やコードブロック記号は一切使わず、以下のJSONスキーマのみで出力すること）

{
  "songs": [
    {
      "title": "曲名",
      "artist": "アーティスト名",
      "year": "リリース年(西暦、分からなければ空文字)",
      "mvUrl": "公式MVのYouTube URL。無い/不明な場合は空文字",
      "mvStatus": "「公式MVあり」または「公式MVは見つかりません」",
      "reason": "選定理由(250文字程度)",
      "advice": "先生のカンペとAI独自のボーカルテクニック解析を融合させたアドバイス(250文字程度)"
    }
  ],
  "closingMessage": "門弟の背中を押すお茶目な一言応援メッセージ(150字以内)"
}

songsは必ず5件にすること。`;
}

async function callGemini({ apiKey, model, systemPrompt, userText }) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userText }],
          },
        ],
        generationConfig: {
          temperature: 1.0,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  return text;
}

function extractJson(text) {
  const cleaned = (text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('AIの応答からJSONを取り出せませんでした');
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  // 門弟アプリ経由で開いた人だけ利用できる
  if (!hasPass(req)) {
    return res.status(403).json({ error: '利用時間が切れました。門弟アプリからもう一度開いてください。' });
  }

  const {
    musicType,
    gender,
    range,
    difficulty,
    songMood,
    vocalCharacter,
    vocalSkill,
  } = req.body || {};

  if (!musicType || !gender) {
    res.status(400).json({ error: '条件が不足しています。' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'サーバー側にGEMINI_API_KEYが設定されていません。' });
    return;
  }

  const model = 'gemini-3.5-flash-lite';
  const todayStr = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  try {
    let referenceContext = '';

    if (musicType.includes('最近の')) {
      const isWestern = musicType.includes('洋楽');
      const year = new Date().getFullYear();
      const queries = buildRecentQueries({ isWestern, gender, songMood, vocalCharacter, vocalSkill, year });

      const searchResult = await tavilySearchMany(queries, { timeRange: 'year' });
      referenceContext = `以下はTavily検索によるネット上の最新情報です(毎回違う切り口で検索しています)。\n\n${searchResult}`;
    } else {
      const isWestern = musicType.includes('洋楽');
      const lang = isWestern ? '洋楽' : '邦楽';
      const rawList = loadSongListText();

      let searchResult = '';
      try {
        const queries = buildStandardQueries({ isWestern, gender, songMood, vocalCharacter, difficulty });
        searchResult = await tavilySearchMany(queries);
      } catch (searchErr) {
        // 検索がうまくいかない時は、リストだけで選曲を続ける
        console.error('standard search failed, fallback to list only:', searchErr);
      }

      if (searchResult) {
        const candidates = buildStandardCandidates(rawList, { lang, gender, range, difficulty, count: 8 });
        referenceContext = `【メイン】以下はTavily検索によるネット上の定番曲・名曲の情報です(毎回違う切り口で検索しています)。この検索結果を中心に5曲を選んでください。\n\n${searchResult}\n\n【補助】以下は先生が用意した手持ちの候補曲リストです。条件に合う曲があれば1〜2曲程度加えてください。\n\n${candidates}`;
      } else {
        const candidates = buildStandardCandidates(rawList, { lang, gender, range, difficulty, count: 12 });
        referenceContext = `以下は、今回の条件に合わせて事前に絞り込んだ候補曲リストです。この中から5曲を選んでください。\n\n${candidates}`;
      }
    }

    const systemPrompt = buildCharacterAndRules();
    const userPrompt = buildUserPrompt({
      musicType,
      gender,
      range,
      difficulty,
      songMood,
      vocalCharacter,
      vocalSkill,
      todayStr,
      referenceContext,
    });

    const rawResult = await callGemini({
      apiKey,
      model,
      systemPrompt,
      userText: userPrompt,
    });

    const parsed = extractJson(rawResult);

    if (!parsed.songs || parsed.songs.length === 0) {
      throw new Error('曲データの生成に失敗しました');
    }

    res.status(200).json(parsed);
  } catch (err) {
    console.error('kadaikyoku-ai-sommelier gemini handler error:', err);
    res.status(500).json({
      error: '選曲中にエラーが発生しました。もう一度お試しください。',
      debugDetail: String(err && err.message ? err.message : err),
    });
  }
}
