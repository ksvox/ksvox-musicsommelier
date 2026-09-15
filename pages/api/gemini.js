// pages/api/gemini.js
// 課題曲AIソムリエ - Gemini API呼び出し用サーバーサイドAPIルート
// 2段階呼び出し方式:
//   ①検索担当: Google検索グラウンディングをONにして5曲を選定(自由文で出力)
//   ②整形担当: 検索なしで①の結果を指定のJSONスキーマに変換

import fs from 'fs';
import path from 'path';

function loadSongListText() {
  const filePath = path.join(process.cwd(), 'data', 'song-list.txt');
  return fs.readFileSync(filePath, 'utf-8');
}

// 「洋楽」または「邦楽」に該当するブロックだけを楽曲リストから抽出する
function filterSongListByLanguage(rawText, lang) {
  const blocks = rawText.split(/\r?\n\r?\n+/).map((b) => b.trim()).filter(Boolean);
  const filtered = blocks.filter((block) => {
    const match = block.match(/曲の種類:\s*(.+)/);
    return match && match[1].includes(lang);
  });
  return filtered.join('\n\n');
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
- 【narrow / 狭め】（1オクターブ前後）
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
7. 【公式MVの確認】各曲について、公式ミュージックビデオがYouTube上に存在するか検索で確認し、存在する場合はそのURLを、存在しない場合はその旨を明記すること。`;
}

function buildPhase1Prompt({ musicType, gender, range, difficulty, songMood, vocalCharacter, vocalSkill, todayStr, songListContext }) {
  const isRecent = musicType.includes('最近の');
  const isWestern = musicType.includes('洋楽');

  let sourceInstruction = '';
  if (isRecent) {
    sourceInstruction = `# 参照データについて
「${musicType}」が指定されています。Google検索を使って、${isWestern ? '海外' : '日本'}の楽曲の中から、今日の日付(${todayStr})を基準に過去5年以内にリリースされた曲を探して候補にすること。`;
  } else {
    sourceInstruction = `# 参照データについて
「${musicType}」が指定されています。以下の「楽曲リスト」を最優先の候補源とし、必要に応じてGoogle検索で公式MVの有無や補足情報を確認すること。

## 楽曲リスト
${songListContext}`;
  }

  return `${buildCharacterAndRules()}

${sourceInstruction}

# 今日の日付
${todayStr}

# ユーザーの入力条件
- 曲の種類: ${musicType}
- 原曲の性別: ${gender}
- 音域: ${range}
- 難易度: ${difficulty}
- 曲の雰囲気: ${songMood}
- 声の雰囲気: ${vocalCharacter}
- 強化したいボーカルスキル: ${vocalSkill}

# 出力形式
前置きは一切抜きで、以下の形式で5曲分を出力すること（JSONではなく読みやすいプレーンテキストでよい）。

【1曲目：曲名 / アーティスト名 (リリース年)】
公式MV: あり(URL) または なし
理由: (選曲基準に合致した理由。250文字程度)
アドバイス: (先生のカンペとAI独自のボーカルテクニック解析を融合させた深いアドバイス。250文字程度)

【2曲目：...】
【3曲目：...】
【4曲目：...】
【5曲目：...】

最後に、門弟の背中を押すお茶目な一言応援メッセージ（150字以内）を1つ書くこと。`;
}

function buildPhase2Prompt(rawText) {
  return `以下は、ボーカルコーチが選定した5曲の課題曲とアドバイスの文章です。この内容を、そのままの情報を保ちつつ、次のJSONスキーマだけに整形してください。
前置き・説明・コードブロック記号（\`\`\`json など）は一切出力せず、有効なJSONのみを返してください。

# JSONスキーマ
{
  "songs": [
    {
      "title": "曲名",
      "artist": "アーティスト名",
      "year": "リリース年(西暦、分からなければ空文字)",
      "mvUrl": "公式MVのYouTube URL。無い場合は空文字",
      "mvStatus": "「公式MVあり」または「公式MVは見つかりません」",
      "reason": "選定理由の全文(原文の情報を削らずそのまま反映)",
      "advice": "アドバイスの全文(原文の情報を削らずそのまま反映)"
    }
  ],
  "closingMessage": "最後のお茶目な応援メッセージ(150字以内)"
}

songsは必ず5件にすること。

# 変換元テキスト
${rawText}`;
}

async function callGemini({ apiKey, model, systemPrompt, userText, useSearch, jsonMode }) {
  const body = {
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
      temperature: 0.6,
    },
  };

  if (useSearch) {
    body.tools = [{ google_search: {} }];
  }
  if (jsonMode) {
    body.generationConfig.responseMimeType = 'application/json';
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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

  let songListContext = '';
  if (!musicType.includes('最近の')) {
    const lang = musicType.includes('洋楽') ? '洋楽' : '邦楽';
    try {
      const rawList = loadSongListText();
      songListContext = filterSongListByLanguage(rawList, lang);
    } catch (err) {
      console.error('song-list.txt read error:', err);
    }
  }

  try {
    // Phase 1: 検索担当(Google検索グラウンディングON)
    const phase1Prompt = buildPhase1Prompt({
      musicType,
      gender,
      range,
      difficulty,
      songMood,
      vocalCharacter,
      vocalSkill,
      todayStr,
      songListContext,
    });

    const phase1Result = await callGemini({
      apiKey,
      model,
      systemPrompt: phase1Prompt,
      userText: '上記の条件に基づいて、課題曲を5曲選定してください。',
      useSearch: true,
      jsonMode: false,
    });

    // Phase 2: 整形担当(検索OFF、JSON化)
    const phase2Prompt = buildPhase2Prompt(phase1Result);
    const phase2Result = await callGemini({
      apiKey,
      model,
      systemPrompt: '与えられたテキストを指定のJSONスキーマに正確に変換するアシスタントです。',
      userText: phase2Prompt,
      useSearch: false,
      jsonMode: true,
    });

    const parsed = extractJson(phase2Result);

    if (!parsed.songs || parsed.songs.length === 0) {
      throw new Error('曲データの整形に失敗しました');
    }

    res.status(200).json(parsed);
  } catch (err) {
    console.error('kadaikyoku-ai-sommelier gemini handler error:', err);
    res.status(500).json({ error: '選曲中にエラーが発生しました。もう一度お試しください。', debugDetail: String(err && err.message ? err.message : err), }); 
  }
}
