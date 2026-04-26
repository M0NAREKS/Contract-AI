import { useEffect, useMemo, useState } from "react";
import ClauseItem from "./ClauseItem";
import { AnimatedList } from "../animations";

function ClauseList({ clauses, scrollToClauseNo }) {
  const [openIndex, setOpenIndex] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingClauseNo, setPendingClauseNo] = useState(null);
  const PAGE_SIZE = 5;

  if (!clauses.length) {
    return (
      <div className="emptyResult">
        <p>Bu analizde gosterilecek bir madde bulunamadi.</p>
      </div>
    );
  }

  const orderedClauses = useMemo(() => {
    return [...clauses].sort((a, b) => {
      const aNo = Number(a?.order_index ?? a?.clause_no ?? 0);
      const bNo = Number(b?.order_index ?? b?.clause_no ?? 0);
      return aNo - bNo;
    });
  }, [clauses]);

  const totalPages = Math.max(1, Math.ceil(orderedClauses.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const paginatedClauses = orderedClauses.slice(pageStartIndex, pageStartIndex + PAGE_SIZE);

  useEffect(() => {
    if (scrollToClauseNo === null || scrollToClauseNo === undefined) return;
    setPendingClauseNo(scrollToClauseNo);
  }, [scrollToClauseNo]);

  useEffect(() => {
    if (pendingClauseNo === null || pendingClauseNo === undefined) return;

    const targetIndex = orderedClauses.findIndex((clause, idx) => {
      const clauseNo = clause?.order_index ?? clause?.clause_no ?? idx + 1;
      return String(clauseNo) === String(pendingClauseNo);
    });

    if (targetIndex < 0) {
      setPendingClauseNo(null);
      return;
    }

    const targetPage = Math.floor(targetIndex / PAGE_SIZE) + 1;

    setCurrentPage((prev) => (prev === targetPage ? prev : targetPage));
    setOpenIndex(targetIndex);

    window.setTimeout(() => {
      const listSection = document.querySelector(".phase");
      if (listSection) {
        listSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      const targetEl = document.getElementById(`clause-${pendingClauseNo}`);
      const scrollContainer = document.querySelector(".clauseAnimatedContainer .scroll-list");

      if (targetEl && scrollContainer) {
        const containerRect = scrollContainer.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        const deltaTop = targetRect.top - containerRect.top;
        const padding = 14;
        scrollContainer.scrollTo({
          top: scrollContainer.scrollTop + deltaTop - padding,
          behavior: "smooth",
        });
      } else if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 60);

    setPendingClauseNo(null);
  }, [orderedClauses, pendingClauseNo]);

  return (
    <section className="phase">
      <div className="phaseHeader">
        <h3>Sozlesme Maddeleri</h3>
        <span className="badge">
          {orderedClauses.length} Madde - Sayfa {safeCurrentPage}/{totalPages}
        </span>
      </div>

      <AnimatedList
        items={paginatedClauses}
        showGradients={true}
        enableArrowNavigation={true}
        displayScrollbar={true}
        className="clauseAnimatedContainer"
        itemClassName="clauseAnimatedItem"
        renderItem={(clause, index) => {
          const globalIndex = pageStartIndex + index;
          const clauseId = clause?.order_index ?? clause?.clause_no ?? globalIndex + 1;
          return (
            <ClauseItem
              key={`${clauseId}-${index}`}
              clause={clause}
              displayIndex={globalIndex + 1}
              isOpen={openIndex === globalIndex}
              onToggle={() => setOpenIndex((prev) => (prev === globalIndex ? null : globalIndex))}
              anchorId={`clause-${clauseId}`}
            />
          );
        }}
      />

      {totalPages > 1 && (
        <div className="paginationBar">
          <button
            type="button"
            className="secondaryButton pageButton"
            onClick={() => {
              setCurrentPage((prev) => Math.max(1, prev - 1));
              setOpenIndex(null);
            }}
            disabled={safeCurrentPage === 1}
          >
            Onceki
          </button>
          <span className="pageIndicator">
            Sayfa {safeCurrentPage} / {totalPages}
          </span>
          <button
            type="button"
            className="secondaryButton pageButton"
            onClick={() => {
              setCurrentPage((prev) => Math.min(totalPages, prev + 1));
              setOpenIndex(null);
            }}
            disabled={safeCurrentPage === totalPages}
          >
            Sonraki
          </button>
        </div>
      )}
    </section>
  );
}

export default ClauseList;
