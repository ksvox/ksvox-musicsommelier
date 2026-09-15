import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="ja">
      <Head>
        {/* Tailwind CSS (CDN) */}
        <script src="https://cdn.tailwindcss.com"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              tailwind.config = {
                theme: {
                  extend: {
                    colors: {
                      sommelier: {
                        dark: '#0f131a',
                        panel: '#171d27',
                        card: '#1e2636',
                        lemon: '#facc15',
                        lemonHover: '#eab308',
                        lemonSoft: '#fef08a',
                        accent: '#38bdf8',
                        creamBg: '#fcfcfb',
                        textDark: '#1e293b'
                      }
                    },
                    fontFamily: {
                      title: ['"Cinzel"', '"Noto Sans JP"', 'sans-serif'],
                      body: ['"Inter"', '"Noto Sans JP"', 'sans-serif']
                    }
                  }
                }
              }
            `,
          }}
        ></script>

        {/* FontAwesome Icons */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />

        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;900&family=Inter:wght@400;500;600;700;800&family=Noto+Sans+JP:wght@400;500;700;900&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body className="min-h-screen pb-16 antialiased relative">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
