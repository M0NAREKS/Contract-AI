import { useEffect, useState } from "react";
import { analyzeContract, uploadContract } from "./Services";
import ClauseList from "./components/Detail/ClauseList";
import RiskSummary from "./components/Detail/RiskSummary";
import { CountUp, DarkVeil, PillNav, SplitText } from "./components/animations";

const HEADER_NAV_ITEMS = [
  {
    label: "Hakkimizda",
    href: "#hakkimizda",
    links: [
      { label: "Vizyonumuz", href: "#" },
      { label: "Ekibimiz", href: "#" },
      { label: "Iletisim", href: "#" },
    ],
  },
  {
    label: "Platform",
    href: "#platform",
    links: [
      { label: "Ozellikler", href: "#" },
      { label: "Nasil Calisir", href: "#" },
      { label: "Guvenlik", href: "#" },
    ],
  },
];

const LOADING_STAGES = [
  "Yukleme (Upload)",
  "Ayristirma (Segmentation)",
  "Siniflandirma (Classification)",
  "Veri Cikarimi (Extraction)",
  "Kural Kontrolu (Rule Checking)",
  "ML Risk Puanlama (Scoring)",
  "Ozet Sunumu (Summary)",
  "Detayli Rapor (Detailed View)",
];

function getRiskLevel(score) {
  if (score >= 0.7) return "Yuksek";
  if (score >= 0.3) return "Orta";
  return "Dusuk";
}

function HeaderNav({ theme, onToggleTheme }) {
  return (
    <header className="topHeader">
      <div className="brand">ContratAi</div>
      <nav className="topNav">
        <PillNav
          items={HEADER_NAV_ITEMS}
          className="headerPillNav"
          initialLoadAnimation={true}
          showLogo={false}
          baseColor="transparent"
          pillColor={theme === "light" ? "#EEEEEE" : "#e2e8f0"}
          hoveredPillTextColor="#f8fafc"
          pillTextColor="#0f172a"
          hoverColor="#2f646a"
        />
        <button
          type="button"
          className="themeToggleButton"
          onClick={onToggleTheme}
          aria-label={theme === "light" ? "Koyu temaya gec" : "Acik temaya gec"}
          title={theme === "light" ? "Koyu tema" : "Acik tema"}
        >
          {theme === "light" ? (
            // Moon icon (minimal crescent)
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <path
                d="M21 12.8A8.8 8.8 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            // Sun icon (minimal + crisp rays)
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2.25v2.5M12 19.25v2.5" />
              <path d="M4.25 4.25l1.75 1.75M18 18l1.75 1.75" />
              <path d="M2.25 12h2.5M19.25 12h2.5" />
              <path d="M4.25 19.75l1.75-1.75M18 6l1.75-1.75" />
            </svg>
          )}
        </button>
      </nav>
    </header>
  );
}

function FooterNav() {
  return (
    <footer className="siteFooter">
      <div className="footerGrid">
        <div className="footerCol">
          <h4>ContratAi</h4>
          <p>Yapay zeka destekli sozlesme analiz ve politika uyum platformu.</p>
        </div>
        <div className="footerCol">
          <h4>Hakkinda</h4>
          <a href="#">Vizyon</a>
          <a href="#">Ekip</a>
          <a href="#">Kariyer</a>
        </div>
        <div className="footerCol">
          <h4>Platform</h4>
          <a href="#">Ozellikler</a>
          <a href="#">Guvenlik</a>
          <a href="#">Surum Notlari</a>
        </div>
        <div className="footerCol">
          <h4>Destek</h4>
          <a href="#">Iletisim</a>
          <a href="#">Yardim Merkezi</a>
          <a href="#">SSS</a>
        </div>
      </div>
      <div className="footerBottom">© 2026 ContratAi. Tum haklari saklidir.</div>
    </footer>
  );
}

function ContractMetaPanel({ responseData, summary, totalClauses }) {
  if (!responseData) return null;

  const dateText = responseData.date
    ? new Date(responseData.date).toLocaleString("tr-TR", { hour12: false })
    : "-";

  const riskScore = Number(summary?.average_ml_risk_score ?? 0);
  const items = [
    { label: "Toplam Madde", value: totalClauses ?? 0 },
    { label: "Toplam Ihlal", value: summary?.violation_count ?? 0 },
    { label: "Toplam Uyari", value: summary?.warning_count ?? 0 },
    { label: "Yuksek Riskli Madde", value: summary?.high_risk_clause_count ?? 0 },
    { label: "Genel Risk Skoru", value: `${Math.round(riskScore * 100)}% (${getRiskLevel(riskScore)})` },
    { label: "Analiz Tarihi", value: dateText },
    { label: "Metin Uzunlugu", value: responseData.text_length ?? 0 },
  ];

  return (
    <section className="panel contractMetaPanel softReveal metaReveal">
      <h2>Analiz Metaverisi</h2>
      <div className="metaGrid">
        {items.map((item) => (
          <article key={item.label} className="metaCard">
            <h4>{item.label}</h4>
            <p>{item.value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function App() {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStageIndex, setLoadingStageIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [responseData, setResponseData] = useState(null);
  const [scrollToClauseNo, setScrollToClauseNo] = useState(null);
  const [theme, setTheme] = useState(() => {
    const stored = window.localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
    return "dark";
  });
  const [currentPage, setCurrentPage] = useState(() =>
    window.location.pathname === "/maddeler" ? "clauses" : "home"
  );

  const darkVeilPreset =
    theme === "light"
      ? {
          hueShift: 0,
          noiseIntensity: 0.025,
          scanlineIntensity: 0.03,
          scanlineFrequency: 1.05,
          speed: 0.36,
          warpAmount: 0.065,
          resolutionScale: 1,
        }
      : {
          hueShift: -20,
          noiseIntensity: 0.04,
          scanlineIntensity: 0.05,
          scanlineFrequency: 1.2,
          speed: 0.4,
          warpAmount: 0.08,
          resolutionScale: 1,
        };

  useEffect(() => {
    const onPopState = () => {
      setCurrentPage(window.location.pathname === "/maddeler" ? "clauses" : "home");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    if (currentPage !== "clauses") return;
    // Ensure we start at top when entering detail page.
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [currentPage]);

  useEffect(() => {
    if (!isLoading) return undefined;

    setLoadingStageIndex(0);
    const stageTimer = window.setInterval(() => {
      setLoadingStageIndex((prev) => Math.min(prev + 1, LOADING_STAGES.length - 1));
    }, 950);

    return () => window.clearInterval(stageTimer);
  }, [isLoading]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setErrorMessage("");
  };
  const handleDragOver = (e) => {
    e.preventDefault(); // Tarayıcının varsayılan davranışını (dosyayı açmasını) engeller
    setIsDragging(true); // Kutuya yeşil bir "hover" efekti vermek için state'i true yapar
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false); // Sürükleme kutudan çıkınca state'i false yapar
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    // Bırakılan dosyayı alır ve state'e kaydeder
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      setErrorMessage("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setResponseData(null);

    if (!selectedFile) {
      setErrorMessage("Lutfen once bir dosya secin.");
      return;
    }

    setIsLoading(true);
    try {
      await uploadContract(selectedFile);
      const data = await analyzeContract(selectedFile);
      setResponseData(data);
    } catch (error) {
      setErrorMessage(error.message || "Beklenmeyen bir hata olustu.");
    } finally {
      setIsLoading(false);
    }
  };

  const clauses = Array.isArray(responseData?.clauses) ? responseData.clauses : [];
  const totalClauses = Number(responseData?.clause_count ?? clauses.length ?? 0);
  const summary = responseData?.summary || {
    violation_count: 0,
    warning_count: 0,
    high_risk_clause_count: 0,
    average_ml_risk_score: 0,
  };

  const navigateToClausesPage = () => {
    setCurrentPage("clauses");
    window.history.pushState({ page: "clauses" }, "", "/maddeler");
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  };

  const navigateToHomePage = () => {
    setCurrentPage("home");
    window.history.pushState({ page: "home" }, "", "/");
  };

  if (currentPage === "clauses") {
    return (
      <div className="appRoot">
        <div className="darkVeilLayer" aria-hidden="true">
          <DarkVeil
            hueShift={darkVeilPreset.hueShift}
            noiseIntensity={darkVeilPreset.noiseIntensity}
            scanlineIntensity={darkVeilPreset.scanlineIntensity}
            scanlineFrequency={darkVeilPreset.scanlineFrequency}
            speed={darkVeilPreset.speed}
            warpAmount={darkVeilPreset.warpAmount}
            resolutionScale={darkVeilPreset.resolutionScale}
          />
        </div>

        <main key="clauses-page" className="page clausesPageTransition clausesPage">
          <section className="hero">
            <div>
              <h1>Sozlesme Maddeleri</h1>
              <p className="subtitle">
                Yüklenen sözleşmeden ayrıştırılan maddeleri buradan inceleyebilirsin.
              </p>
            </div>
            <button type="button" className="secondaryButton navButton" onClick={navigateToHomePage}>
              Sonuc Ekranina Don
            </button>
          </section>

          {responseData && (
            <ContractMetaPanel responseData={responseData} summary={summary} totalClauses={totalClauses} />
          )}

          <section className="panel resultPanel">
            {clauses.length ? (
              <ClauseList clauses={clauses} scrollToClauseNo={scrollToClauseNo} />
            ) : (
              <div className="emptyResult">
                <p>Henuz madde bulunmuyor. Ana sayfadan sozlesme yukleyebilirsin.</p>
              </div>
            )}
          </section>

          {responseData && (
            <RiskSummary
              clauses={clauses}
              onSelectClause={(clauseNo) => {
                setScrollToClauseNo(clauseNo);
              }}
            />
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="appRoot">
      <div className="darkVeilLayer" aria-hidden="true">
        <DarkVeil
          hueShift={darkVeilPreset.hueShift}
          noiseIntensity={darkVeilPreset.noiseIntensity}
          scanlineIntensity={darkVeilPreset.scanlineIntensity}
          scanlineFrequency={darkVeilPreset.scanlineFrequency}
          speed={darkVeilPreset.speed}
          warpAmount={darkVeilPreset.warpAmount}
          resolutionScale={darkVeilPreset.resolutionScale}
        />
      </div>

      <main key="home-page" className="page clausesPageTransition">
        <HeaderNav
          theme={theme}
          onToggleTheme={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
        />

        <section className="landingShowcase">
          <div className="showcaseTitle" role="heading" aria-level={1}>
            <SplitText
              tag="p"
              text="Sözleşmeleri hızlı analiz edin,"
              delay={44}
              duration={0.96}
              ease="power3.out"
              splitType="chars"
              from={{ opacity: 0, y: 34 }}
              to={{ opacity: 1, y: 0 }}
              threshold={0.2}
              rootMargin="-80px"
              textAlign="center"
              className="showcaseTitleBlur"
            />
            <SplitText
              tag="p"
              text="politika uyumunu güvenceye alın."
              delay={44}
              duration={0.96}
              ease="power3.out"
              splitType="chars"
              from={{ opacity: 0, y: 34 }}
              to={{ opacity: 1, y: 0 }}
              threshold={0.2}
              rootMargin="-80px"
              textAlign="center"
              className="showcaseTitleBlur showcaseTitleBlurAccent"
            />
          </div>
        </section>

        <div className="grid">
          <section className="panel">
            <h2>Dosya Yükleme</h2>
            <p className="panelText">Desteklenen formatlar: .pdf, .doc, .docx, .txt</p>

            <form onSubmit={handleSubmit} className="uploadForm">
            <label 
                className={`fileInputWrap ${isDragging ? "dragging" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="uploadPlaceholder">
                  {/* Premium Yükleme İkonu (SVG) */}
                  <svg 
                    viewBox="0 0 24 24" 
                    width="42" 
                    height="42" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="docSvg"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <path d="M12 18v-6"></path>
                    <path d="M9 15l3-3 3 3"></path>
                  </svg>
                  {/* Buton yerine sadece şık bir metin */}
                  <span>Dosya seçmek için tıklayın</span>
                </div>
                
                {/* SİHİRLİ DOKUNUŞ: Asıl dosya seçiciyi tamamen görünmez yapıyoruz */}
                <input 
                  type="file" 
                  accept=".pdf,.doc,.docx,.txt" 
                  onChange={handleFileChange} 
                  style={{ display: "none" }} 
                />
              </label>

              <button type="submit" disabled={isLoading}>
                {isLoading ? "Analiz sürüyor..." : "Sözleşmeyi Yükle ve Analiz Et"}
              </button>

            </form>

            {selectedFile && (
              <div className="fileInfo">
                <span className="status success">Hazır</span>
                <p>{selectedFile.name}</p>
              </div>
            )}

            {errorMessage && (
              <div className="fileInfo">
                <span className="status errorTag">Hata</span>
                <p className="error">{errorMessage}</p>
              </div>
            )}

            {isLoading && (
              <div className="loadingSteps" aria-live="polite">
                <strong>Islem Durumu</strong>
                <ol>
                  {LOADING_STAGES.map((stage, index) => {
                    let stageClass = "";
                    if (index < loadingStageIndex) stageClass = "done";
                    if (index === loadingStageIndex) stageClass = "active";
                    return (
                      <li key={stage} className={stageClass}>
                        {stage}
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </section>

          <section className="panel">
            <h2>Sonuç Görünümü</h2>
            {!responseData && (
              <p className="panelText">Yükleme sonrası backend cevabı burada gösterilecek.</p>
            )}

            {/* YENİ EKLENEN KISIM: Eski metinler yerine 3'lü dinamik grid yapısı */}
            {responseData && (
              <div className="resultArea">
               <div className="resultSummaryGrid">
                  {/* 1. TOPLAM MADDE KARTI */}
                  <article className="resultStatCard safeCard">
                    <div className="cardIconWrap">
                      {/* Döküman İkonu */}
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                      </svg>
                    </div>
                    <div className="cardContent">
                      <h4>Toplam Madde</h4>
                      <p>{totalClauses}</p>
                    </div>
                  </article>

                  {/* 2. TOPLAM İHLAL KARTI (Sıfırdan büyükse kırmızı olur) */}
                  <article className={`resultStatCard ${summary.violation_count > 0 ? "dangerCard" : "safeCard"}`}>
                    <div className="cardIconWrap">
                      {/* Çarpı/İhlal İkonu */}
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                      </svg>
                    </div>
                    <div className="cardContent">
                      <h4>Toplam İhlal</h4>
                      <p className={summary.violation_count > 0 ? "textViolation" : ""}>
                        {summary.violation_count}
                      </p>
                    </div>
                  </article>

                  {/* 3. YÜKSEK RİSK KARTI (Sıfırdan büyükse turuncu olur) */}
                  <article className={`resultStatCard ${summary.high_risk_clause_count > 0 ? "warningCard" : "safeCard"}`}>
                    <div className="cardIconWrap">
                      {/* Uyarı/Risk İkonu */}
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                      </svg>
                    </div>
                    <div className="cardContent">
                      <h4>Yüksek Risk</h4>
                      <p className={summary.high_risk_clause_count > 0 ? "textHighRisk" : ""}>
                        {summary.high_risk_clause_count}
                      </p>
                    </div>
                  </article>
                </div>
              </div>
            )}
            
            {responseData && (
              <div className="resultPanelFooter">
                <button type="button" className="openClausesButton" onClick={navigateToClausesPage}>
                  Sozlesme maddelerine ulasin
                </button>
              </div>
            )}
          </section>
        </div>

        <section className="impactPanel">
          <article className="impactItem">
            <div className="impactIcon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="8" />
                <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3>
              <CountUp from={0} to={100} duration={1.8} className="countUpText" />%
            </h3>
            <p>Inceleme ve onay sureclerinde zaman tasarrufu saglar.</p>
          </article>

          <article className="impactItem">
            <div className="impactIcon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path
                  d="M13 2 5 13h5l-1 9 8-11h-5l1-9z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3>
              <CountUp from={0} to={3} duration={1.8} className="countUpText" />x
            </h3>
            <p>Sozlesme maddelerini manuel yaklasima gore daha hizli analiz eder.</p>
          </article>

          <article className="impactItem">
            <div className="impactIcon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path
                  d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="12" r="2.5" />
              </svg>
            </div>
            <h3>
              <CountUp from={0} to={90} duration={1.8} className="countUpText" />%
            </h3>
            <p>Politika ihlallerini erken tespit ederek maliyet riskini azaltir.</p>
          </article>

          <article className="impactItem">
            <div className="impactIcon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
                <circle cx="9" cy="6" r="2" fill="currentColor" stroke="none" />
                <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
                <circle cx="11" cy="18" r="2" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <h3>
              <CountUp from={0} to={80} duration={1.8} className="countUpText" />%
            </h3>
            <p>Belirsiz degisikliklerin kaybolmasini onleyerek kontrol saglar.</p>
          </article>
        </section>

        <section className="flowPanel">
          <h2 className="flowTitle">
            Tum surec tek yerde, <em>hizli ve kontrollu</em>
          </h2>

          <div className="flowGrid top">
            <div className="flowStep">
              <div className="flowStepIcon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M8 3h6l4 4v14H8z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 3v4h4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 12h6M10 16h6" strokeLinecap="round" />
                </svg>
              </div>
              <span>Arastir</span>
            </div>
            <div className="flowConnector">→</div>
            <div className="flowStep">
              <div className="flowStepIcon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M7 3h10v18l-2-1.5L13 21l-2-1.5L9 21l-2-1.5L5 21V5a2 2 0 0 1 2-2z" />
                  <path d="M9 8h6M9 12h6M9 16h4" strokeLinecap="round" />
                </svg>
              </div>
              <span>Incele</span>
            </div>
            <div className="flowConnector">→</div>
            <div className="flowStep">
              <div className="flowStepIcon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path
                    d="M10 21H6a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h4m0 10V11m0 10 4.5-4.5a2 2 0 0 0 .5-1.3V6.5A2.5 2.5 0 0 0 12.5 4L10 11m0 0h7a2 2 0 0 1 2 2l-1 6a2 2 0 0 1-2 2h-6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span>Onayla</span>
            </div>
          </div>

          <div className="flowCenterBadge">ContratAi Workbench</div>

          <div className="flowGrid bottom">
            <div className="flowStep">
              <div className="flowStepIcon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="3" />
                  <path
                    d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1 1 0 0 1 0 1.4l-1 1a1 1 0 0 1-1.4 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1 1 0 0 1-1.4 0l-1-1a1 1 0 0 1 0-1.4l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1 1 0 0 1 0-1.4l1-1a1 1 0 0 1 1.4 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a1 1 0 0 1 1-1h1.5a1 1 0 0 1 1 1v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1 1 0 0 1 1.4 0l1 1a1 1 0 0 1 0 1.4l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1h-.2a1 1 0 0 0-.9.6z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span>Optimize</span>
            </div>
            <div className="flowConnector">←</div>
            <div className="flowStep">
              <div className="flowStepIcon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="11" cy="11" r="6" />
                  <path d="m20 20-4.2-4.2" strokeLinecap="round" />
                </svg>
              </div>
              <span>Analiz Et</span>
            </div>
            <div className="flowConnector">←</div>
            <div className="flowStep">
              <div className="flowStepIcon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="9" />
                  <path d="m8 12 2.5 2.5L16 9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span>Tamamla</span>
            </div>
          </div>
        </section>

        <FooterNav />
      </main>
    </div>
  );
}

export default App;
