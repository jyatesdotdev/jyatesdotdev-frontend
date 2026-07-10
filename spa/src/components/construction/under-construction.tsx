interface UnderConstructionProps {
  section: string;
}

export function UnderConstruction({ section }: UnderConstructionProps) {
  const sectionName = section.toUpperCase();

  return (
    <section
      data-testid="under-construction"
      className="relative isolate h-full overflow-hidden bg-[#05060a] font-mono text-white"
    >
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
        <span className="construction-star left-[7%] top-[18%] text-cyan-300" />
        <span className="construction-star left-[28%] top-[8%] text-fuchsia-400 [animation-delay:0.4s]" />
        <span className="construction-star right-[9%] top-[15%] text-yellow-300 [animation-delay:0.8s]" />
        <span className="construction-star bottom-[21%] left-[4%] text-yellow-300 [animation-delay:1.2s]" />
        <span className="construction-star bottom-[13%] right-[30%] text-cyan-300 [animation-delay:0.2s]" />
      </div>

      <div className="relative z-10 flex h-full flex-col">
        <div className="construction-tape h-1 shrink-0" aria-hidden="true" />
        <div className="shrink-0 overflow-hidden border-y-2 border-black bg-yellow-300 py-1 text-[11px] font-bold text-black">
          <div className="construction-marquee flex w-max whitespace-nowrap">
            <span className="shrink-0 px-5">
              UNDER CONSTRUCTION // HARD HAT AREA // {sectionName}.EXE //&nbsp;
            </span>
            <span className="shrink-0 px-5" aria-hidden="true">
              UNDER CONSTRUCTION // HARD HAT AREA // {sectionName}.EXE //&nbsp;
            </span>
          </div>
        </div>
        <div className="construction-tape h-1 shrink-0" aria-hidden="true" />

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 px-4 py-1 sm:flex-row sm:gap-7 sm:px-8 sm:py-3">
          <div className="h-[146px] w-[190px] shrink-0 sm:h-[250px] sm:w-[286px]">
            <svg
              role="img"
              aria-label="A pixel-art construction worker swinging a hammer"
              viewBox="0 0 280 220"
              className="h-full w-full"
              shapeRendering="crispEdges"
            >
              <title>A pixel-art construction worker swinging a hammer</title>

              <rect x="14" y="196" width="252" height="8" fill="#232838" />
              <rect x="35" y="204" width="210" height="4" fill="#11131b" />

              <g className="construction-worker-bob">
                <rect x="99" y="162" width="16" height="36" fill="#285ba9" />
                <rect x="127" y="162" width="18" height="36" fill="#3978d4" />
                <rect x="94" y="194" width="25" height="10" fill="#202431" />
                <rect x="124" y="194" width="30" height="10" fill="#292f3d" />

                <path d="M101 111 L77 141 L85 151 L112 126 Z" fill="#bd774f" />
                <rect x="74" y="140" width="14" height="16" fill="#bd774f" />

                <polygon points="98,102 137,105 151,119 146,166 101,166 89,125" fill="#f06b32" />
                <polygon points="130,107 151,119 146,166 135,166" fill="#c84f29" />
                <polygon points="106,109 136,111 141,166 102,166" fill="#3978d4" />
                <polygon points="135,111 146,119 141,166 135,166" fill="#285ba9" />
                <path d="M105 109 L107 133 M134 111 L137 133" stroke="#91b9f5" strokeWidth="6" />
                <rect x="110" y="132" width="28" height="5" fill="#91b9f5" />
                <rect x="117" y="148" width="15" height="6" fill="#f3d24e" />

                <rect x="108" y="63" width="35" height="42" fill="#e3a16f" />
                <rect x="101" y="69" width="8" height="27" fill="#bd774f" />
                <rect x="142" y="77" width="10" height="13" fill="#e3a16f" />
                <rect x="135" y="75" width="6" height="7" fill="#202431" />
                <rect x="139" y="94" width="11" height="5" fill="#9c4d42" />
                <rect x="103" y="56" width="46" height="12" fill="#f3d24e" />
                <rect x="111" y="46" width="33" height="13" fill="#ffd94f" />
                <rect x="96" y="65" width="59" height="6" fill="#c68f13" />

                <g className="construction-hammer" data-testid="construction-hammer">
                  <path d="M139 111 L152 126" stroke="#202431" strokeWidth="20" />
                  <path d="M139 111 L152 126" stroke="#f06b32" strokeWidth="15" />
                  <path d="M151 125 L170 133" stroke="#202431" strokeWidth="16" />
                  <path d="M151 125 L170 133" stroke="#e3a16f" strokeWidth="11" />
                  <rect x="164" y="126" width="15" height="15" fill="#e3a16f" />
                  <path d="M171 133 L205 164" stroke="#202431" strokeWidth="10" />
                  <path d="M171 133 L205 164" stroke="#9a6336" strokeWidth="6" />
                  <g transform="translate(208 166) rotate(38)">
                    <rect x="-19" y="-8" width="38" height="16" fill="#515969" />
                    <rect x="-14" y="-8" width="5" height="16" fill="#798292" />
                  </g>
                </g>
              </g>

              <g>
                <rect x="194" y="174" width="72" height="30" fill="#9e4738" />
                <rect x="194" y="174" width="35" height="12" fill="#d56748" />
                <rect x="232" y="174" width="34" height="12" fill="#bd5742" />
                <rect x="194" y="189" width="22" height="12" fill="#bd5742" />
                <rect x="219" y="189" width="47" height="12" fill="#d56748" />
                <rect x="194" y="185" width="72" height="4" fill="#ead8b4" />
                <rect x="216" y="189" width="4" height="12" fill="#ead8b4" />
                <rect x="229" y="174" width="4" height="12" fill="#ead8b4" />
              </g>

              <g className="construction-sparks" aria-hidden="true">
                <rect x="218" y="151" width="5" height="11" fill="#f9e65c" />
                <rect x="229" y="159" width="11" height="5" fill="#44d7e8" />
                <rect x="222" y="168" width="6" height="6" fill="#ef5da8" />
                <rect x="236" y="145" width="5" height="8" fill="#f9e65c" />
              </g>
            </svg>
          </div>

          <div className="max-w-[250px] border-l-4 border-cyan-300 pl-3 text-center sm:text-left">
            <p className="mb-1 text-[10px] text-cyan-300">{sectionName}.EXE / STATUS 503</p>
            <h2 className="construction-blink text-base font-bold text-yellow-300 sm:text-2xl">
              UNDER CONSTRUCTION
            </h2>
            <p className="mt-1 text-[11px] leading-4 text-neutral-300 sm:mt-3 sm:text-xs sm:leading-5">
              Hard hats required. This corner of jyates.dev is still being built.
            </p>
            <p className="mt-1 text-[10px] text-fuchsia-300 sm:mt-2">
              [ check back after the dust settles ]
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-neutral-700 bg-[#10131d] px-3 py-1 text-[9px] text-neutral-400 sm:text-[10px]">
          <span className="text-green-300">* CREW ONLINE</span>
          <span>EST. COMPLETION: SOON-ISH</span>
        </div>
      </div>
    </section>
  );
}
