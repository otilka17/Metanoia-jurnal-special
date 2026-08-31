// @ts-nocheck
import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en" style={{ height: "100%" }}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <title>Jurnal Părinte</title>
        <link rel="manifest" href="/Metanoia-jurnal-special/manifest.json" />
        <link rel="apple-touch-icon" href="/Metanoia-jurnal-special/apple-touch-icon.png" />
        <meta name="theme-color" content="#5E8B7E" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Jurnal Părinte" />
        {/*
          Disable body scrolling on web to make ScrollView components work correctly.
          If you want to enable scrolling, remove `ScrollViewStyleReset` and
          set `overflow: auto` on the body style below.
        */}
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              body > div:first-child { position: fixed !important; top: 0; left: 0; right: 0; bottom: 0; }
              [role="tablist"] [role="tab"] * { overflow: visible !important; }
              [role="heading"], [role="heading"] * { overflow: visible !important; }
            `,
          }}
        />
      </head>
      <body
        style={{
          margin: 0,
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                function loadTawk(){
                  var Tawk_API=window.Tawk_API||{}, Tawk_LoadStart=new Date();
                  window.Tawk_API=Tawk_API;
                  var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
                  s1.async=true;
                  s1.src='https://embed.tawk.to/69c5607435e8d61c3a875f21/1jkr91d6m';
                  s1.charset='UTF-8';
                  s1.setAttribute('crossorigin','*');
                  s0.parentNode.insertBefore(s1,s0);
                }
                var consent=null;
                try{consent=window.localStorage.getItem('cookie_consent');}catch(e){}
                if(consent==='accepted'){ loadTawk(); return; }
                if(consent==='declined'){ return; }
                var b=document.createElement('div');
                b.id='cookie-consent-banner';
                b.style.cssText='position:fixed;bottom:0;left:0;right:0;background:#2D3A35;color:#fff;padding:16px;z-index:99999;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:12px;font-family:-apple-system,system-ui,sans-serif;font-size:13px;box-shadow:0 -2px 12px rgba(0,0,0,0.2)';
                b.innerHTML='<span style="flex:1;min-width:200px;max-width:520px">Folosim cookie-uri doar pentru widget-ul de chat (Tawk.to). Aplicația în sine nu setează cookie-uri proprii. <a href="/Metanoia-jurnal-special/privacy" style="color:#9FD8C8;text-decoration:underline">Detalii</a></span><button id="cookie-accept-btn" style="background:#5E8B7E;color:#fff;border:none;border-radius:999px;padding:8px 18px;font-weight:600;cursor:pointer">Accept</button><button id="cookie-decline-btn" style="background:transparent;color:#fff;border:1px solid #fff;border-radius:999px;padding:8px 18px;font-weight:600;cursor:pointer">Refuz</button>';
                document.body.appendChild(b);
                document.getElementById('cookie-accept-btn').onclick=function(){
                  try{window.localStorage.setItem('cookie_consent','accepted');}catch(e){}
                  loadTawk();
                  b.remove();
                };
                document.getElementById('cookie-decline-btn').onclick=function(){
                  try{window.localStorage.setItem('cookie_consent','declined');}catch(e){}
                  b.remove();
                };
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
