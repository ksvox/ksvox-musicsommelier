import { useState, useRef } from 'react';
import Head from 'next/head';

const PLAYLISTS = [
  {
    title: '洋楽アカペラカバー Vol.1 - R&B & Soul',
    id: 'PLtNoF8CCU5z0ZPs3uxjaGdjpiLlq7sp5Y',
    url: 'https://youtube.com/playlist?list=PLtNoF8CCU5z0ZPs3uxjaGdjpiLlq7sp5Y&si=T6mhazTkuuuurcmI',
  },
  {
    title: '洋楽アカペラカバー Vol.2 - Pop Classics',
    id: 'PLtNoF8CCU5z35_1tLIo6eNrKdVQfLwcEu',
    url: 'https://youtube.com/playlist?list=PLtNoF8CCU5z35_1tLIo6eNrKdVQfLwcEu&si=lfhhTvuRwhHQQJ7S',
  },
  {
    title: '洋楽アカペラカバー Vol.3 - Vocal Harmonies',
    id: 'PLtNoF8CCU5z1E3SI3im5Zj3GDjt9zgn-I',
    url: 'https://youtube.com/playlist?list=PLtNoF8CCU5z1E3SI3im5Zj3GDjt9zgn-I&si=DHnhKjTzE21jpJPp',
  },
  {
    title: '洋楽アカペラカバー Vol.4 - Groove & Rhythm',
    id: 'PLeFbgYYwODHukrnoh6o4C2B4QX2PqTeQ0',
    url: 'https://youtube.com/playlist?list=PLeFbgYYwODHukrnoh6o4C2B4QX2PqTeQ0&si=2h_AXZjde-1gp9nF',
  },
  {
    title: '洋楽アカペラカバー Vol.5 - Acoustic & Chill',
    id: 'PLeFbgYYwODHtqtfyPbZ5LAzHIJjTiFaDw',
    url: 'https://youtube.com/playlist?list=PLeFbgYYwODHtqtfyPbZ5LAzHIJjTiFaDw&si=wH5PrZugO3gtEP6s',
  },
  {
    title: '洋楽アカペラカバー Vol.6 - Ballad & Emotional',
    id: 'PLeFbgYYwODHv-jWYHG51cQEG51Ij3KBPT',
    url: 'https://youtube.com/playlist?list=PLeFbgYYwODHv-jWYHG51cQEG51Ij3KBPT&si=5cQXFZvRs-rqOq92',
  },
  {
    title: '洋楽アカペラカバー Vol.7 - Special Masterclass',
    id: 'PLeFbgYYwODHv4sqMVrn3bU8RbYrvzRWkE',
    url: 'https://youtube.com/playlist?list=PLeFbgYYwODHv4sqMVrn3bU8RbYrvzRWkE&si=I7peaCFcoNLabhO3',
  },
];

function ChoiceButtonGroup({ options, value, onChange, columns = 2 }) {
  return (
    <div className={`grid grid-cols-${columns} gap-2`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`choice-btn py-2.5 rounded-xl border border-gray-700 bg-slate-900/90 transition flex items-center justify-center gap-1 text-xs ${
            value === opt.value ? 'active' : ''
          }`}
        >
          {opt.icon && <i className={`fa-solid ${opt.icon}`}></i>} {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function Home() {
  const [musicType, setMusicType] = useState('洋楽スタンダード');
  const [gender, setGender] = useState('女性');
  const [range, setRange] = useState('普通');
  const [difficulty, setDifficulty] = useState('普通');
  const [songMood, setSongMood] = useState('おしゃれ');
  const [vocalCharacter, setVocalCharacter] = useState('指定なし');
  const [vocalSkill, setVocalSkill] = useState('リズム感＆グルーヴ');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState(null);
  const [playlistIndex, setPlaylistIndex] = useState(0);
  const resultRef = useRef(null);

  const handleSamplePreset = () => {
    setMusicType('洋楽スタンダード');
    setSongMood('おしゃれ');
    setVocalCharacter('シルキー(裏声系)');
    setVocalSkill('リズム感＆グルーヴ');
    setGender('女性');
    setRange('普通');
    setDifficulty('普通');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          musicType,
          gender,
          range,
          difficulty,
          songMood,
          vocalCharacter,
          vocalSkill,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data?.error || '選曲中にエラーが発生しました。もう一度お試しください。');
        setLoading(false);
        return;
      }

      setResult(data);
      setLoading(false);

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error(err);
      setErrorMsg('通信エラーが発生しました。もう一度お試しください。');
      setLoading(false);
    }
  };

  const handleSaveTxt = () => {
    if (!result) return;

    let fileText = `========================================
 課題曲AIソムリエ - 選定結果レポート
 提供：ボーカル道場K's VOX
========================================
■ 選択条件 (Preferences)
・曲の種類: ${musicType}
・原曲の性別: ${gender}
・音域: ${range}
・難易度: ${difficulty}
・曲の雰囲気: ${songMood}
・声の雰囲気: ${vocalCharacter}
・強化したいスキル: ${vocalSkill}

========================================
【選定課題曲 5選】
========================================
`;

    result.songs.forEach((song, i) => {
      fileText += `----------------------------------------
【${i + 1}曲目：${song.title} / ${song.artist} (${song.year})】
・公式動画URL: ${song.mvUrl || '公式MVは見つかりません'}
・理由: ${song.reason}
・アドバイス: ${song.advice}

`;
    });

    fileText += `========================================
${result.closingMessage || ''}
========================================
門弟制ボーカルスクール K's VOX
https://www.ksvox.net/
========================================`;

    const blob = new Blob([fileText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KsVOX_Sommelier_Songs_${musicType}_${gender}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const currentPlaylist = PLAYLISTS[playlistIndex];
  const summaryTag = `${musicType} / ${gender}`;

  return (
    <>
      <Head>
        <title>課題曲AIソムリエ | K&apos;s VOX</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="max-w-md md:max-w-3xl mx-auto px-4 pt-6 space-y-6 relative z-10">
        {/* HEADER */}
        <header className="sommelier-panel rounded-2xl p-5 md:p-6 lemon-glow-border relative overflow-hidden shadow-2xl">
          <div className="absolute right-4 bottom-2 flex items-end gap-1 h-12 opacity-30 pointer-events-none select-none">
            <div className="equalizer-bar w-1.5 h-10 rounded-full bg-gradient-to-t from-cyan-400 to-blue-500 origin-bottom"></div>
            <div className="equalizer-bar w-1.5 h-6 rounded-full bg-gradient-to-t from-pink-500 to-rose-400 origin-bottom"></div>
            <div className="equalizer-bar w-1.5 h-12 rounded-full bg-gradient-to-t from-yellow-300 to-amber-500 origin-bottom"></div>
            <div className="equalizer-bar w-1.5 h-8 rounded-full bg-gradient-to-t from-emerald-400 to-teal-500 origin-bottom"></div>
            <div className="equalizer-bar w-1.5 h-11 rounded-full bg-gradient-to-t from-purple-500 to-indigo-500 origin-bottom"></div>
            <div className="equalizer-bar w-1.5 h-5 rounded-full bg-gradient-to-t from-cyan-400 to-sky-300 origin-bottom"></div>
            <div className="equalizer-bar w-1.5 h-9 rounded-full bg-gradient-to-t from-pink-400 to-purple-400 origin-bottom"></div>
            <div className="equalizer-bar w-1.5 h-7 rounded-full bg-gradient-to-t from-yellow-400 to-orange-400 origin-bottom"></div>
          </div>

          <div className="flex items-center justify-between border-b border-gray-700/80 pb-4 mb-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-sommelier-lemon flex items-center justify-center p-0.5 shadow-lg shadow-yellow-500/20 flex-shrink-0">
                <img
                  src="/logo.png"
                  alt="課題曲AIソムリエ Logo"
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-black font-title tracking-tight text-white">
                    課題曲<span className="text-sommelier-lemon">AIソムリエ</span>
                  </h1>
                  <span className="bg-sommelier-lemon text-sommelier-dark font-black text-[10px] px-2 py-0.5 rounded shadow">
                    Ver2.0
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-medium mt-0.5">
                  ボーカル分析AIがあなたの声質・スキルに最適な課題曲を厳選テイスティング
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-300 pt-1 relative z-10">
            <span className="flex items-center gap-1.5 font-medium">
              <i className="fa-solid fa-sliders text-sommelier-lemon"></i> 条件を選択するとAIがお勧めの曲を5曲選曲します。
            </span>
            <span className="text-sommelier-lemon font-bold hidden sm:inline">K&apos;s VOX APPLICATION</span>
          </div>
        </header>

        {/* INPUT SECTION */}
        <section className="sommelier-panel rounded-2xl p-5 md:p-6 shadow-2xl space-y-5 relative overflow-hidden">
          <div className="absolute right-2 top-10 text-yellow-500/5 text-8xl pointer-events-none select-none">
            <i className="fa-solid fa-music"></i>
          </div>
          <div className="absolute left-2 bottom-10 text-yellow-500/5 text-8xl pointer-events-none select-none">
            <i className="fa-solid fa-record-vinyl"></i>
          </div>

          <div className="flex items-center justify-between border-b border-gray-700/80 pb-3 relative z-10">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <i className="fa-solid fa-list-check text-sommelier-lemon"></i> 条件の選択
            </h2>
            <button
              type="button"
              onClick={handleSamplePreset}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-sommelier-lemon px-3 py-1.5 rounded-lg border border-sommelier-lemon/30 transition flex items-center gap-1"
            >
              <i className="fa-solid fa-wand-magic-sparkles"></i> おまかせ設定
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs md:text-sm relative z-10">
            {/* ① 曲の種類 */}
            <div>
              <label className="block text-gray-300 font-semibold mb-1.5 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-sommelier-lemon/20 text-sommelier-lemon text-xs flex items-center justify-center font-bold">
                  1
                </span>
                曲の種類
              </label>
              <select
                value={musicType}
                onChange={(e) => setMusicType(e.target.value)}
                className="w-full bg-slate-900/90 border border-gray-700 text-white rounded-xl p-3 focus:outline-none focus:border-sommelier-lemon transition"
              >
                <option value="最近の洋楽">最近の洋楽</option>
                <option value="洋楽スタンダード">洋楽スタンダード</option>
                <option value="最近の邦楽">最近の邦楽</option>
                <option value="邦楽スタンダード">邦楽スタンダード</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* ② 原曲の性別 */}
              <div>
                <label className="block text-gray-300 font-semibold mb-1.5 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-sommelier-lemon/20 text-sommelier-lemon text-xs flex items-center justify-center font-bold">
                    2
                  </span>
                  原曲の性別
                </label>
                <ChoiceButtonGroup
                  options={[
                    { value: '女性', label: '女性', icon: 'fa-venus' },
                    { value: '男性', label: '男性', icon: 'fa-mars' },
                  ]}
                  value={gender}
                  onChange={setGender}
                  columns={2}
                />
              </div>

              {/* ③ 音域 */}
              <div>
                <label className="block text-gray-300 font-semibold mb-1.5 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-sommelier-lemon/20 text-sommelier-lemon text-xs flex items-center justify-center font-bold">
                    3
                  </span>
                  音域
                </label>
                <ChoiceButtonGroup
                  options={[
                    { value: '広め', label: '広め' },
                    { value: '普通', label: '普通' },
                    { value: '狭め', label: '狭め' },
                  ]}
                  value={range}
                  onChange={setRange}
                  columns={3}
                />
              </div>
            </div>

            {/* ④ 難易度 */}
            <div>
              <label className="block text-gray-300 font-semibold mb-1.5 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-sommelier-lemon/20 text-sommelier-lemon text-xs flex items-center justify-center font-bold">
                  4
                </span>
                難易度
              </label>
              <ChoiceButtonGroup
                options={[
                  { value: '高め', label: '高め (Pro)' },
                  { value: '普通', label: '普通 (Standard)' },
                  { value: '低め', label: '低め (Basic)' },
                ]}
                value={difficulty}
                onChange={setDifficulty}
                columns={3}
              />
            </div>

            {/* ⑤ 曲の雰囲気 */}
            <div>
              <label className="block text-gray-300 font-semibold mb-1.5 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-sommelier-lemon/20 text-sommelier-lemon text-xs flex items-center justify-center font-bold">
                  5
                </span>
                曲の雰囲気
              </label>
              <select
                value={songMood}
                onChange={(e) => setSongMood(e.target.value)}
                className="w-full bg-slate-900/90 border border-gray-700 text-white rounded-xl p-3 focus:outline-none focus:border-sommelier-lemon transition"
              >
                <option value="おしゃれ">おしゃれ</option>
                <option value="踊れる">踊れる</option>
                <option value="泣ける">泣ける</option>
                <option value="励まされる">励まされる</option>
                <option value="癒される">癒される</option>
                <option value="指定なし">指定なし</option>
              </select>
            </div>

            {/* ⑥ 声の雰囲気 */}
            <div>
              <label className="block text-gray-300 font-semibold mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-sommelier-lemon/20 text-sommelier-lemon text-xs flex items-center justify-center font-bold">
                    6
                  </span>
                  声の雰囲気
                </span>
                <span className="text-[11px] text-gray-400 font-normal">※未選択可</span>
              </label>
              <select
                value={vocalCharacter}
                onChange={(e) => setVocalCharacter(e.target.value)}
                className="w-full bg-slate-900/90 border border-gray-700 text-white rounded-xl p-3 focus:outline-none focus:border-sommelier-lemon transition"
              >
                <option value="指定なし">指定なし</option>
                <option value="パワフル(地声系)">パワフル(地声系)</option>
                <option value="シルキー(裏声系)">シルキー(裏声系)</option>
                <option value="ハスキー系">ハスキー系</option>
                <option value="マイルド系">マイルド系</option>
              </select>
            </div>

            {/* ⑦ 強化したいボーカルスキル */}
            <div>
              <label className="block text-gray-300 font-semibold mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-sommelier-lemon/20 text-sommelier-lemon text-xs flex items-center justify-center font-bold">
                    7
                  </span>
                  強化したいボーカルスキル
                </span>
                <span className="text-[11px] text-gray-400 font-normal">※未選択可</span>
              </label>
              <select
                value={vocalSkill}
                onChange={(e) => setVocalSkill(e.target.value)}
                className="w-full bg-slate-900/90 border border-gray-700 text-white rounded-xl p-3 focus:outline-none focus:border-sommelier-lemon transition"
              >
                <option value="リズム感＆グルーヴ">リズム感＆グルーヴ</option>
                <option value="表現力＆ダイナミクス">表現力＆ダイナミクス</option>
                <option value="音程の正しさ">音程の正しさ</option>
                <option value="ロングトーン＆ブレスコントロール">ロングトーン＆ブレスコントロール</option>
                <option value="指定なし">指定なし</option>
              </select>
            </div>

            {errorMsg && <p className="text-xs font-bold text-rose-400">{errorMsg}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 rounded-xl font-bold text-sommelier-dark text-base bg-sommelier-lemon hover:bg-sommelier-lemonHover shadow-lg shadow-yellow-500/20 transition transform active:scale-95 flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              <i className="fa-solid fa-wine-bottle"></i>{' '}
              {loading ? '選定中...' : '課題曲候補を5曲選定する'}
            </button>
          </form>
        </section>

        {/* OUTPUT SECTION */}
        {(loading || result) && (
          <section
            ref={resultRef}
            className="sommelier-output-panel rounded-2xl p-5 md:p-6 text-sommelier-textDark shadow-2xl space-y-6 border-2 border-yellow-500/40 relative overflow-hidden"
          >
            <div className="absolute right-3 top-12 text-slate-400/15 text-8xl pointer-events-none select-none">
              <i className="fa-solid fa-microphone-lines"></i>
            </div>
            <div className="absolute left-3 bottom-12 text-slate-400/15 text-8xl pointer-events-none select-none">
              <i className="fa-solid fa-music"></i>
            </div>

            <div className="flex items-center justify-between border-b-2 border-slate-200 pb-3 relative z-10">
              <div className="flex items-center gap-2">
                <span className="bg-sommelier-dark text-sommelier-lemon text-xs font-black px-3 py-1 rounded-md tracking-wider flex items-center gap-1 shadow">
                  <i className="fa-solid fa-award"></i> SOMMELIER RECOMMENDATIONS
                </span>
                <h2 className="font-bold text-lg text-slate-900">選定課題曲レポート</h2>
              </div>
              <span className="text-xs font-bold text-slate-700 bg-yellow-100/90 px-2.5 py-1 rounded-full border border-yellow-300">
                {summaryTag}
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center space-y-3 relative z-10">
                <i className="fa-solid fa-wine-glass-empty fa-spin text-4xl text-yellow-600"></i>
                <p className="text-sm font-bold text-slate-700">
                  条件に合致するベスト課題曲を5曲ソムリエ選曲中...
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-5 relative z-10">
                  {result.songs.map((song, i) => (
                    <div
                      key={i}
                      className="bg-white/95 p-4 sm:p-5 rounded-xl shadow-sm border border-slate-200/80 space-y-3 backdrop-blur-sm"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-2.5 gap-2">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-black tracking-wider text-yellow-800 bg-yellow-100/90 px-2 py-0.5 rounded">
                            TASK SONG #{i + 1}
                          </span>
                          <h3 className="text-base sm:text-lg font-black text-slate-900">
                            【{i + 1}曲目：{song.title} / {song.artist} ({song.year})】
                          </h3>
                        </div>
                        <div className="flex-shrink-0">
                          {song.mvUrl ? (
                            <a
                              href={song.mvUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-md transition border border-red-200"
                            >
                              <i className="fa-brands fa-youtube text-sm"></i> 公式MVを視聴する{' '}
                              <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-medium bg-slate-100 px-2.5 py-1 rounded-md">
                              <i className="fa-solid fa-video-slash"></i> 公式MVは見つかりません
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 text-xs sm:text-sm">
                        <div className="bg-amber-50/80 p-3 rounded-lg border border-amber-200/70">
                          <strong className="text-amber-900 font-bold block mb-1 flex items-center gap-1">
                            <i className="fa-solid fa-bullseye text-yellow-600"></i> 選定理由 (Reason)
                          </strong>
                          <p className="text-slate-800 leading-relaxed font-medium">{song.reason}</p>
                        </div>

                        <div className="bg-slate-50/90 p-3 rounded-lg border border-slate-200">
                          <strong className="text-slate-900 font-bold block mb-1 flex items-center gap-1">
                            <i className="fa-solid fa-graduation-cap text-yellow-600"></i> ボーカルAI ＆ K&apos;s VOXアドバイス
                          </strong>
                          <p className="text-slate-700 leading-relaxed font-medium">{song.advice}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {result.closingMessage && (
                  <div className="relative z-10 bg-yellow-50 border-2 border-dashed border-yellow-300 rounded-xl p-4 text-center">
                    <p className="text-sm font-bold text-amber-900 leading-relaxed">
                      <i className="fa-solid fa-comment-dots text-yellow-600 mr-1.5"></i>
                      {result.closingMessage}
                    </p>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 relative z-10">
                  <button
                    type="button"
                    onClick={handleSaveTxt}
                    className="w-full py-3.5 px-4 rounded-xl font-bold text-slate-800 bg-slate-200/80 hover:bg-slate-300 border border-slate-300 transition shadow-sm flex items-center justify-center gap-2 text-sm"
                  >
                    <i className="fa-solid fa-file-arrow-down text-yellow-700"></i> 分析結果をテキストで保存
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {/* PR SECTION */}
        <section className="space-y-4 pt-1">
          <div className="sommelier-panel rounded-2xl p-3.5 sm:p-4 shadow-xl border-t-2 border-sommelier-lemon">
            <div className="flex items-center justify-between mb-2">
              <a
                href="https://www.youtube.com/@Ksvox"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold tracking-wider text-white hover:text-sommelier-lemon transition uppercase flex items-center gap-2 group"
              >
                <i className="fa-brands fa-youtube text-red-500 text-lg group-hover:scale-110 transition"></i>
                <span className="underline decoration-red-500/50">K&apos;s VOX YouTubeチャンネル</span>
                <i className="fa-solid fa-arrow-up-right-from-square text-[10px] text-gray-400"></i>
              </a>
              <span className="text-[10px] font-bold text-sommelier-lemon bg-yellow-950/80 px-2 py-0.5 rounded border border-yellow-700/50">
                洋楽アカペラカバー集
              </span>
            </div>

            <div className="bg-slate-900/90 rounded-xl p-2.5 border border-gray-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-[11px] font-bold bg-sommelier-lemon text-sommelier-dark px-1.5 py-0.5 rounded flex-shrink-0">
                    {playlistIndex + 1} / {PLAYLISTS.length}
                  </span>
                  <h3 className="text-xs font-bold text-white truncate max-w-[180px] sm:max-w-md">
                    {currentPlaylist.title}
                  </h3>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setPlaylistIndex((i) => (i - 1 + PLAYLISTS.length) % PLAYLISTS.length)
                    }
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition border border-gray-700"
                  >
                    <i className="fa-solid fa-chevron-left text-[10px]"></i>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlaylistIndex((i) => (i + 1) % PLAYLISTS.length)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition border border-gray-700"
                  >
                    <i className="fa-solid fa-chevron-right text-[10px]"></i>
                  </button>
                </div>
              </div>

              <div className="relative w-full rounded-lg overflow-hidden bg-black border border-gray-800 max-h-48 sm:max-h-60 aspect-[21/9] sm:aspect-video">
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube-nocookie.com/embed/videoseries?list=${currentPlaylist.id}`}
                  title="K's VOX YouTube Playlist"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>

              <div className="flex justify-end pt-0.5">
                <a
                  href={currentPlaylist.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] sm:text-[11px] text-sommelier-lemon hover:underline flex items-center gap-1"
                >
                  YouTubeでこの再生リストを開く <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
                </a>
              </div>
            </div>
          </div>

          <a
            href="https://www.ksvox.net/apply/"
            target="_blank"
            rel="noopener noreferrer"
            className="block group relative overflow-hidden rounded-2xl p-0.5 bg-gradient-to-r from-sommelier-lemon via-amber-400 to-amber-600 shadow-lg hover:shadow-yellow-500/20 transition transform hover:-translate-y-0.5"
          >
            <div className="pr-banner-bg bg-sommelier-panel/90 rounded-[14px] p-3.5 sm:p-4 flex items-center justify-between gap-3 relative z-10">
              <div className="space-y-1 relative z-10">
                <span className="text-[10px] font-black tracking-widest bg-yellow-400 text-sommelier-dark px-2 py-0.5 rounded shadow">
                  門弟制ボーカルスクール
                </span>
                <h3 className="text-xs sm:text-sm font-extrabold text-white group-hover:text-sommelier-lemon transition leading-snug drop-shadow">
                  本気で歌が上手くなりたいなら、
                  <br className="hidden sm:block" />
                  門弟制ボーカルスクールK&apos;s VOXへ
                </h3>
              </div>
              <div className="flex-shrink-0 bg-sommelier-lemon text-sommelier-dark font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1 shadow group-hover:bg-yellow-300 transition relative z-10">
                詳細 <i className="fa-solid fa-arrow-right"></i>
              </div>
            </div>
          </a>

          <footer className="text-center pt-1">
            <a
              href="https://www.ksvox.net"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-sommelier-lemon transition font-medium inline-flex items-center gap-1"
            >
              提供：ボーカル道場K&apos;s VOX <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
            </a>
          </footer>
        </section>
      </div>
    </>
  );
}
