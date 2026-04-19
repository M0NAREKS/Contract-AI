import { useEffect, useMemo, useState } from "react";
import { analyzeContract, normalizeAnalysisResponse, uploadContract } from "./Services";
import ClauseList from "./components/Detail/ClauseList";
import { CountUp, DarkVeil, PillNav, SplitText } from "./components/animations";
import { MOCK_ANALYSIS_RESPONSE } from "./mockData";

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

function HeaderNav() {
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
          pillColor="#e2e8f0"
          hoveredPillTextColor="#f8fafc"
          pillTextColor="#0f172a"
          hoverColor="#2f646a"
        />
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

function ExecutiveSummary({ summary, totalClauses }) {
  const cards = [
    { title: "Toplam Madde", value: totalClauses, suffix: "" },
    { title: "Toplam Ihlal", value: summary.violation_count, suffix: "" },
    { title: "Toplam Uyari", value: summary.warning_count, suffix: "" },
    {
      title: "Genel Risk Skoru",
      value: Math.round(summary.average_ml_risk_score * 100),
      suffix: `% (${getRiskLevel(summary.average_ml_risk_score)})`,
    },
  ];

  return (
    <section className="summaryPanel">
      {cards.map((card) => (
        <article key={card.title} className="summaryCard">
          <h4>{card.title}</h4>
          <p>
            <CountUp from={0} to={card.value} duration={1.2} className="countUpText" />
            {card.suffix}
          </p>
        </article>
      ))}
    </section>
  );
}

function TopRisksBlock({ topRisks }) {
  if (!topRisks.length) return null;
  return (
    <section className="riskBlock">
      <div className="riskHeader">
        <h3>En Kritik 5 Risk</h3>
        <span className="badge">Risk Analizi</span>
      </div>
      <div className="riskList">
        {topRisks.map((risk, index) => (
          <article key={`${risk.title}-${index}`} className="riskItem">
            <div className="riskItemTop">
              <strong>{risk.title}</strong>
              <span className="riskScore">Skor: {Number(risk.risk_score ?? 0).toFixed(2)}</span>
            </div>
            <p className="riskReason">
              Madde {risk.clause_no ?? "-"} - {risk.reason}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStageIndex, setLoadingStageIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [responseData, setResponseData] = useState(null);
  const [currentPage, setCurrentPage] = useState(() =>
    window.location.pathname === "/maddeler" ? "clauses" : "home"
  );

  useEffect(() => {
    const onPopState = () => {
      setCurrentPage(window.location.pathname === "/maddeler" ? "clauses" : "home");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

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

  const handleLoadMockData = () => {
    setErrorMessage("");
    setSelectedFile(null);
    setResponseData(normalizeAnalysisResponse(MOCK_ANALYSIS_RESPONSE));
  };

  const clauses = Array.isArray(responseData?.clauses) ? responseData.clauses : [];
  const summary = responseData?.summary || {
    total_clauses: 0,
    violation_count: 0,
    warning_count: 0,
    average_ml_risk_score: 0,
  };
  const topRisks = useMemo(
    () => (Array.isArray(responseData?.top_risks) ? responseData.top_risks.slice(0, 5) : []),
    [responseData]
  );

  const navigateToClausesPage = () => {
    setCurrentPage("clauses");
    window.history.pushState({ page: "clauses" }, "", "/maddeler");
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
            hueShift={-20}
            noiseIntensity={0.04}
            scanlineIntensity={0.05}
            scanlineFrequency={1.2}
            speed={0.4}
            warpAmount={0.08}
            resolutionScale={1}
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

          {responseData && <ExecutiveSummary summary={summary} totalClauses={clauses.length} />}

          <section className="panel resultPanel">
            {clauses.length ? (
              <ClauseList clauses={clauses} />
            ) : (
              <div className="emptyResult">
                <p>Henuz madde bulunmuyor. Ana sayfadan sozlesme yukleyebilirsin.</p>
              </div>
            )}
          </section>

          {responseData && <TopRisksBlock topRisks={topRisks} />}
        </main>
      </div>
    );
  }

  return (
    <div className="appRoot">
      <div className="darkVeilLayer" aria-hidden="true">
        <DarkVeil
          hueShift={-20}
          noiseIntensity={0.04}
          scanlineIntensity={0.05}
          scanlineFrequency={1.2}
          speed={0.4}
          warpAmount={0.08}
          resolutionScale={1}
        />
      </div>

      <main key="home-page" className="page clausesPageTransition">
        <HeaderNav />

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
              textAlign="left"
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
              textAlign="left"
              className="showcaseTitleBlur showcaseTitleBlurAccent"
            />
          </div>
        </section>

        {responseData && <ExecutiveSummary summary={summary} totalClauses={clauses.length} />}

        <div className="grid">
          <section className="panel">
            <h2>Dosya Yükleme</h2>
            <p className="panelText">Desteklenen formatlar: .pdf, .doc, .docx, .txt</p>

            <form onSubmit={handleSubmit} className="uploadForm">
              <label className="fileInputWrap">
                <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleFileChange} />
              </label>

              <button type="submit" disabled={isLoading}>
                {isLoading ? "Analiz sürüyor..." : "Sözleşmeyi Yükle ve Analiz Et"}
              </button>

              <button type="button" className="secondaryButton" onClick={handleLoadMockData}>
                Mock Veri Getir
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

            {responseData && (
              <div className="resultArea">
                <div className="resultHeader">
                  <strong>Madde Analizi</strong>
                  <span className="keysBadge">{clauses.length} madde</span>
                </div>
                <p className="panelText">
                  Ozet cikarildi, maddeler ayrildi ve kritik riskler belirlendi. Tum detaylar icin
                  madde ekranina gec.
                </p>
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
              ⌛
            </div>
            <h3>
              <CountUp from={0} to={100} duration={1.8} className="countUpText" />%
            </h3>
            <p>Inceleme ve onay sureclerinde zaman tasarrufu saglar.</p>
          </article>

          <article className="impactItem">
            <div className="impactIcon" aria-hidden="true">
              ⚡
            </div>
            <h3>
              <CountUp from={0} to={3} duration={1.8} className="countUpText" />x
            </h3>
            <p>Sozlesme maddelerini manuel yaklasima gore daha hizli analiz eder.</p>
          </article>

          <article className="impactItem">
            <div className="impactIcon" aria-hidden="true">
              ●
            </div>
            <h3>
              <CountUp from={0} to={90} duration={1.8} className="countUpText" />%
            </h3>
            <p>Politika ihlallerini erken tespit ederek maliyet riskini azaltir.</p>
          </article>

          <article className="impactItem">
            <div className="impactIcon" aria-hidden="true">
              ⚙
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
              <div className="flowStepIcon">📄</div>
              <span>Arastir</span>
            </div>
            <div className="flowConnector">→</div>
            <div className="flowStep">
              <div className="flowStepIcon">🧾</div>
              <span>Incele</span>
            </div>
            <div className="flowConnector">→</div>
            <div className="flowStep">
              <div className="flowStepIcon">👍</div>
              <span>Onayla</span>
            </div>
          </div>

          <div className="flowCenterBadge">ContratAi Workbench</div>

          <div className="flowGrid bottom">
            <div className="flowStep">
              <div className="flowStepIcon">⚙</div>
              <span>Optimize</span>
            </div>
            <div className="flowConnector">←</div>
            <div className="flowStep">
              <div className="flowStepIcon">🔍</div>
              <span>Analiz Et</span>
            </div>
            <div className="flowConnector">←</div>
            <div className="flowStep">
              <div className="flowStepIcon">✅</div>
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
