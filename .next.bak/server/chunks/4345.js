"use strict";exports.id=4345,exports.ids=[4345],exports.modules={9171:(a,b,c)=>{c.d(b,{A:()=>j});var d=c(60687),e=c(43210),f=c(13315),g=c(92576),h=c(63675);let i=(0,e.forwardRef)(({children:a,variant:b="primary",size:c="md",isLoading:i=!1,loading:j=!1,icon:k,iconPosition:l="left",fullWidth:m=!1,rounded:n="lg",pulse:o=!1,glow:p=!1,enableMotion:q=!1,ripple:r=!0,className:s="",disabled:t,onClick:u,...v},w)=>{let{t:x}=(0,h.B)(),y=(0,e.useRef)(null),z=i||j,A=a=>{t||z||(a=>{if(!r)return;let b=y.current||w?.current;if(!b)return;let c=b.getBoundingClientRect(),d=document.createElement("span"),e=Math.max(c.width,c.height),f=a.clientX-c.left-e/2,g=a.clientY-c.top-e/2;d.style.width=d.style.height=e+"px",d.style.left=f+"px",d.style.top=g+"px",d.classList.add("ripple"),b.appendChild(d),setTimeout(()=>{d.remove()},600)})(a),u?.(a)},B=`
    relative overflow-hidden font-semibold ${{sm:"rounded",md:"rounded-md",lg:"rounded-lg",full:"rounded-full"}[n]}
    transition-all duration-300 ease-out
    focus:outline-none focus:ring-2 focus:ring-offset-2 
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    flex items-center justify-center gap-2
    transform active:scale-[0.98]
    ${m?"w-full":""}
    ${o?"animate-pulse":""}
    ${p?"shadow-glow hover:shadow-glow-lg":""}
    before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-300
    hover:before:opacity-100
  `,C={primary:`
      bg-gradient-to-r from-gold-500 to-gold-600 
      hover:from-gold-600 hover:to-gold-700 
      text-navy-900 
      focus:ring-gold-400 focus:ring-offset-navy-800 
      hover:shadow-xl
      shadow-lg shadow-gold-500/20
      before:bg-gradient-to-r before:from-gold-400/20 before:to-transparent
      group
    `,secondary:`
      bg-navy-700/50 hover:bg-navy-600/50 
      text-gold-200 hover:text-gold-100
      border border-gold-500/30 hover:border-gold-500/50
      focus:ring-gold-500 focus:ring-offset-navy-800
      backdrop-blur-sm
      hover:shadow-md hover:shadow-gold-500/10
      before:bg-gradient-to-r before:from-gold-500/10 before:to-transparent
    `,danger:`
      bg-red-600 hover:bg-red-700 
      text-white 
      focus:ring-red-400 focus:ring-offset-navy-800
      hover:shadow-lg shadow-red-500/20
      before:bg-gradient-to-r before:from-red-400/20 before:to-transparent
    `,ghost:`
      bg-transparent hover:bg-gold-500/10
      text-gold-300 hover:text-gold-100
      border border-transparent hover:border-gold-500/20
      focus:ring-gold-500 focus:ring-offset-navy-800
      before:bg-gold-500/5
    `,gradient:`
      bg-gradient-to-r from-purple-500 via-gold-500 to-gold-600
      text-white font-bold
      hover:shadow-2xl
      focus:ring-gold-400 focus:ring-offset-navy-800
      bg-[length:200%_100%] bg-[position:0%_0%]
      hover:bg-[position:100%_0%]
      transition-all duration-500
      before:bg-white/10
    `,outline:`
      bg-transparent 
      text-gold-400 hover:text-gold-300
      border-2 border-gold-500/50 hover:border-gold-400
      hover:bg-gold-500/10
      focus:ring-gold-500 focus:ring-offset-navy-800
      hover:shadow-md hover:shadow-gold-500/20
      before:bg-gold-500/5
    `,subtle:`
      bg-gold-500/10 hover:bg-gold-500/20
      text-gold-300 hover:text-gold-200
      border border-gold-500/20 hover:border-gold-500/30
      focus:ring-gold-500 focus:ring-offset-navy-800
      hover:shadow-sm
      before:bg-gold-500/5
    `,success:`
      bg-gradient-to-r from-green-500 to-green-600
      hover:from-green-600 hover:to-green-700
      text-white
      focus:ring-green-400 focus:ring-offset-navy-800
      hover:shadow-lg
      shadow-md shadow-green-500/20
      before:bg-gradient-to-r before:from-green-400/20 before:to-transparent
    `},D={xs:"px-2 py-1 text-xs",sm:"px-3 py-1.5 text-sm",md:"px-4 py-2 text-base",lg:"px-6 py-3 text-lg",xl:"px-8 py-4 text-xl"},E=(0,d.jsxs)(d.Fragment,{children:[z?(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)(f.A,{size:"xs"===c?"sm":c,className:"mr-1"}),(0,d.jsx)("span",{className:"sr-only",children:x("common.loading")}),(0,d.jsx)("span",{"aria-hidden":"true",children:x("common.loading")})]}):(0,d.jsxs)(d.Fragment,{children:[k&&"left"===l&&(0,d.jsx)("span",{className:"transition-all duration-300 group-hover:scale-110 group-hover:-translate-x-0.5","aria-hidden":"true",children:k}),(0,d.jsxs)("span",{className:"relative z-10",children:[a,"gradient"===b&&(0,d.jsx)("span",{className:"absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"})]}),k&&"right"===l&&(0,d.jsx)("span",{className:"transition-all duration-300 group-hover:scale-110 group-hover:translate-x-0.5","aria-hidden":"true",children:k})]}),(0,d.jsx)("span",{className:"absolute inset-0 rounded-inherit overflow-hidden pointer-events-none",children:(0,d.jsx)("span",{className:"absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"})})]}),{onAnimationStart:F,...G}=v;return q?(0,d.jsx)(g.P.button,{ref:w||y,whileHover:{scale:1.02,y:-2},whileTap:{scale:.98},className:`group ${B} ${C[b]} ${D[c]} ${s}`,disabled:t||z,onClick:A,"data-theme-variant":b,...G,children:E}):(0,d.jsx)("button",{ref:w||y,className:`group ${B} ${C[b]} ${D[c]} hover:-translate-y-0.5 ${s}`,disabled:t||z,onClick:A,"data-theme-variant":b,...G,children:E})});i.displayName="Button";let j=i},12254:(a,b,c)=>{c.d(b,{A:()=>f});var d=c(60687),e=c(30474);function f({className:a="",width:b=64,height:c=64,showText:f=!1}){return(0,d.jsxs)("div",{className:`flex items-center gap-2 ${a}`,children:[(0,d.jsx)(e.default,{src:"/images/swiftbg.png",alt:"SwiftEDU Logo",width:b,height:c,className:"object-contain",priority:!0}),f&&(0,d.jsx)("span",{className:"font-bold text-xl text-gold-500",children:"SWIFTEDU"})]})}},13315:(a,b,c)=>{c.d(b,{A:()=>f});var d=c(60687);c(43210);let e={sm:"w-4 h-4",md:"w-6 h-6",lg:"w-8 h-8",xl:"w-12 h-12"};function f({size:a="md",className:b="",colorClass:c="border-gold-500"}){return(0,d.jsx)("div",{"aria-label":"Carregando",role:"status",className:`animate-spin rounded-full ${e[a]} border-2 ${c} border-t-transparent ${b}`})}},46114:(a,b,c)=>{c.d(b,{Ay:()=>i});var d=c(60687),e=c(43210),f=c(92576);let g={y:-5,transition:{duration:.3,ease:"easeOut"}},h={scale:.95,transition:{duration:.1}};function i({children:a,title:b,subtitle:c,className:i="",padding:j="md",action:k,hoverable:l=!1,onClick:m,variant:n="default",glowColor:o="gold",animate:p=!1,delay:q=0,pulse:r=!1,depth:s=2,backgroundPattern:t=!1,iridescent:u=!1,flipCard:v=!1,backContent:w}){let[x,y]=(0,e.useState)(!1),[z,A]=(0,e.useState)(!1),B={none:"",sm:"p-4",md:"p-6",lg:"p-8",xl:"p-10"},C={gold:"rgba(255,215,0,0.15)",blue:"rgba(59,130,246,0.15)",green:"rgba(34,197,94,0.15)",purple:"rgba(168,85,247,0.15)",red:"rgba(239,68,68,0.15)"},D={1:"card-depth-1",2:"card-depth-2",3:"card-depth-3",4:"card-depth-4",5:"card-depth-5"},E={default:`
      bg-gradient-to-br from-navy-800/90 to-navy-900/90 
      border border-gold-500/20 backdrop-blur-md
      ${l?"hover:border-gold-500/40 hover-lift":""}
    `,gradient:`
      bg-gradient-to-br from-gold-500/10 via-navy-800/90 to-navy-900/90 
      border border-gold-500/30 backdrop-blur-md
      ${l?"hover:border-gold-500/50 hover:from-gold-500/20 hover-lift":""}
    `,outlined:`
      bg-navy-900/50 border-2 border-gold-500/30 backdrop-blur-sm
      ${l?"hover:bg-navy-800/50 hover:border-gold-500/50 hover-lift":""}
    `,elevated:`
      bg-gradient-to-br from-navy-700 to-navy-800 
      border border-gold-500/10
      ${l?"hover:shadow-2xl hover-lift":""}
    `,glass:`
      glass border border-gold-500/20
      ${l?"hover:bg-white/10 hover:border-gold-500/40 hover-lift":""}
    `,interactive:`
      bg-gradient-to-br from-navy-800/80 to-navy-900/80 
      border border-gold-500/30 backdrop-blur-lg
      transform transition-all duration-300
      ${l?"hover:scale-105 hover:border-gold-500/60 hover:shadow-2xl":""}
    `,premium:`
      bg-gradient-to-br from-navy-800/95 via-navy-850/95 to-navy-900/95
      border border-gold-500/30 backdrop-blur-xl
      relative overflow-hidden
      ${l?"hover:border-gold-500/60 hover-scale":""}
    `,holographic:`
      bg-gradient-to-br from-navy-800/90 to-navy-900/90
      border border-transparent backdrop-blur-xl
      relative overflow-hidden
      ${l?"hover-scale":""}
    `},F=(0,d.jsxs)(d.Fragment,{children:[t&&(0,d.jsx)("div",{className:"absolute inset-0 opacity-5",children:(0,d.jsx)("div",{className:"absolute inset-0 bg-repeat",style:{backgroundImage:"url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23FFD700' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",backgroundSize:"30px 30px"}})}),("holographic"===n||u)&&(0,d.jsx)("div",{className:"absolute inset-0 opacity-30 pointer-events-none",children:(0,d.jsx)("div",{className:"absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500",style:{background:"linear-gradient(135deg, #667eea 0%, #764ba2 20%, #f093fb 40%, #f5576c 60%, #ffd700 80%, #667eea 100%)",filter:"blur(40px)",transform:z?"scale(1.1)":"scale(1)",transition:"transform 0.5s ease"}})}),"premium"===n&&(0,d.jsx)("div",{className:"noise-texture"}),(b||k)&&(0,d.jsxs)("div",{className:"flex items-start justify-between mb-4",children:[(0,d.jsxs)("div",{children:[b&&(0,d.jsx)("h3",{className:"text-xl font-bold text-gold gradient-text",children:b}),c&&(0,d.jsx)("p",{className:"text-sm text-gold-300 mt-1",children:c})]}),k&&(0,d.jsx)("div",{children:k})]}),(0,d.jsx)("div",{className:"relative z-10",children:a}),r&&(0,d.jsx)("div",{className:"absolute inset-0 rounded-xl pointer-events-none glow-pulse",style:{boxShadow:`0 0 40px ${C[o]}`}})]});return v&&w?(0,d.jsxs)(f.P.div,{className:`relative ${B[j]} ${i}`,style:{perspective:1e3},initial:!1,animate:{rotateY:180*!!x},transition:{duration:.6,ease:"easeInOut"},onClick:()=>y(!x),children:[(0,d.jsx)(f.P.div,{className:`
            ${E[n]} 
            ${D[s]}
            rounded-xl relative
            ${m?"cursor-pointer":""}
            transition-all-premium
            w-full h-full
          `,style:{backfaceVisibility:"hidden",transform:"rotateY(0deg)"},children:F}),(0,d.jsx)(f.P.div,{className:`
            ${E[n]} 
            ${D[s]}
            rounded-xl absolute inset-0
            ${B[j]}
          `,style:{backfaceVisibility:"hidden",transform:"rotateY(180deg)"},children:w})]}):(0,d.jsx)(f.P.div,{className:`
        ${E[n]} 
        ${B[j]} 
        ${D[s]}
        rounded-xl relative
        ${m?"cursor-pointer":""}
        transition-all-premium
        ${i}
      `,onClick:m,onMouseEnter:()=>A(!0),onMouseLeave:()=>A(!1),initial:!!p&&{opacity:0,y:20},animate:!!p&&{opacity:1,y:0},transition:{delay:q,duration:.5,ease:"easeOut"},whileHover:l?g:void 0,whileTap:m?h:void 0,style:{boxShadow:r?`0 0 40px ${C[o]}`:void 0},children:F})}}};