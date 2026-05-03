import { useCallback, useEffect, useRef, useState } from "react";
import { sendContractChatMessage } from "../../Services";

/** Kapama animasyonu ile App.css gecis suresi uyumlu */
const DRAWER_TRANSITION_MS = 380;

export function ContractChatDrawer({ open, onClose, contractId, contractText }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [rendered, setRendered] = useState(open);
  const [visible, setVisible] = useState(false);
  const listEndRef = useRef(null);

  useEffect(() => {
    if (open) {
      setRendered(true);
      setVisible(false);
      let innerId = 0;
      const outerId = requestAnimationFrame(() => {
        innerId = requestAnimationFrame(() => setVisible(true));
      });
      return () => {
        cancelAnimationFrame(outerId);
        cancelAnimationFrame(innerId);
      };
    }
    setVisible(false);
    const t = window.setTimeout(() => setRendered(false), DRAWER_TRANSITION_MS);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!rendered || !visible) return;
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [rendered, visible, messages]);

  useEffect(() => {
    if (!rendered) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [rendered, onClose]);

  useEffect(() => {
    if (!rendered) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [rendered]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setError("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setSending(true);
    try {
      const answer = await sendContractChatMessage({
        contractId,
        contractText: contractText || "",
        userMessage: text,
      });
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch (err) {
      setMessages((prev) => prev.slice(0, -1));
      setInput(text);
      setError(err?.message || "Mesaj gonderilemedi.");
    } finally {
      setSending(false);
    }
  }, [contractId, contractText, input, sending]);

  if (!rendered) return null;

  return (
    <div
      className={`chatDrawerRoot${visible ? " chatDrawerRoot--visible" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!visible}
      aria-label="Sozlesme asistani"
    >
      <button type="button" className="chatDrawerBackdrop" aria-label="Kapat" onClick={onClose} tabIndex={visible ? 0 : -1} />
      <div className="chatDrawerPanel">
        <div className="chatDrawerHead">
          <h2 className="chatDrawerTitle">Sozlesme asistani</h2>
          <button type="button" className="chatDrawerClose" onClick={onClose} aria-label="Paneli kapat" tabIndex={visible ? 0 : -1}>
            ×
          </button>
        </div>
        <p className="chatDrawerHint">
          {contractText?.trim()
            ? "Son analizdeki madde metinleri baglam olarak kullanilir."
            : "Once bir sozlesme analizi yaparsaniz baglam daha zengin olur; yine de genel sorular sorabilirsiniz."}
        </p>
        <div className="chatDrawerMessages" role="log" aria-live="polite">
          {messages.length === 0 ? (
            <p className="chatDrawerEmpty">Sozlesme veya hukuk ile ilgili sorunuzu yazin.</p>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`chatBubble chatBubble--${m.role}`}>
                <span className="chatBubbleRole">{m.role === "user" ? "Siz" : "Asistan"}</span>
                <div className="chatBubbleText">{m.content}</div>
              </div>
            ))
          )}
          <div ref={listEndRef} />
        </div>
        {error ? (
          <p className="chatDrawerError" role="alert">
            {error}
          </p>
        ) : null}
        <div className="chatDrawerComposer">
          <textarea
            className="chatDrawerInput"
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Sorunuzu yazin..."
            disabled={sending || !visible}
            tabIndex={visible ? 0 : -1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            type="button"
            className="chatDrawerSend"
            onClick={handleSend}
            disabled={sending || !input.trim() || !visible}
            tabIndex={visible ? 0 : -1}
          >
            {sending ? "..." : "Gonder"}
          </button>
        </div>
      </div>
    </div>
  );
}
