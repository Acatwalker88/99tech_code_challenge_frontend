import React, { useEffect, useMemo, useRef, useState } from "react";
import logo from "./assets/99Tech.webp";
const PRICES_URL = "https://interview.switcheo.com/prices.json";
const ICON_BASE = "https://raw.githubusercontent.com/Switcheo/token-icons/main/tokens/";

function clampNumber(n, min, max) {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function formatNumber(value, maxDp = 8) {
  if (!Number.isFinite(value)) return "";
  const s = value.toLocaleString(undefined, {
    maximumFractionDigits: maxDp,
    minimumFractionDigits: 0
  });
  return s;
}

function parseAmount(input) {
  if (typeof input !== "string") return NaN;
  const cleaned = input.replace(/,/g, "").trim();
  if (!cleaned) return NaN;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

function useClickOutside(ref, onOutside) {
  useEffect(() => {
    function onDown(e) {
      const el = ref.current;
      if (!el) return;
      if (!el.contains(e.target)) onOutside();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [ref, onOutside]);
}

function Pill({ children }) {
  return <span className="pill">{children}</span>;
}

function TokenIcon({ symbol, size = 22 }) {
  const [broken, setBroken] = useState(false);
  const src = broken ? "" : `${ICON_BASE}${symbol}.svg`;
  return (
    <span className="tokenIcon" style={{ width: size, height: size }}>
      {src ? (
        <img
          src={src}
          alt={`${symbol} icon`}
          width={size}
          height={size}
          onError={() => setBroken(true)}
        />
      ) : (
        <span className="tokenFallback" aria-hidden="true">
          {String(symbol || "?").slice(0, 1)}
        </span>
      )}
    </span>
  );
}

function TokenSelect({ value, onChange, options, disabled, label }) {
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  useClickOutside(wrapRef, () => setOpen(false));

  const selected = useMemo(
    () => options.find((o) => o.currency === value) || options[0],
    [options, value]
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return options;
    return options.filter((o) => o.currency.toLowerCase().includes(s));
  }, [options, q]);

  function pick(sym) {
    onChange(sym);
    setOpen(false);
    setQ("");
  }

  return (
    <div className="tokenSelect" ref={wrapRef} aria-label={label}>
      <button
        type="button"
        className="tokenSelectBtn"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <TokenIcon symbol={selected?.currency} />
        <span className="tokenSelectSymbol">{selected?.currency || ""}</span>
        <span className="chev" aria-hidden="true">▾</span>
      </button>

      {open ? (
        <div className="tokenPopover" role="dialog" aria-label="Choose token">
          <div className="tokenSearchRow">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search token"
              className="tokenSearch"
              autoFocus
            />
          </div>

          <div className="tokenList" role="listbox" aria-label="Token list">
            {filtered.length === 0 ? (
              <div className="tokenEmpty">No tokens found.</div>
            ) : (
              filtered.map((o) => (
                <button
                  type="button"
                  key={o.currency}
                  className={"tokenRow" + (o.currency === value ? " active" : "")}
                  onClick={() => pick(o.currency)}
                  role="option"
                  aria-selected={o.currency === value}
                >
                  <TokenIcon symbol={o.currency} />
                  <div className="tokenRowText">
                    <div className="tokenRowSym">{o.currency}</div>
                    <div className="tokenRowSub">
                      ${formatNumber(o.price, 6)}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Toast({ kind = "success", title, body, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={"toast " + kind} role="status" aria-live="polite">
      <div className="toastTitle">{title}</div>
      <div className="toastBody">{body}</div>
      <button type="button" className="toastClose" onClick={onClose} aria-label="Close">
        ×
      </button>
    </div>
  );
}

function getMockBalances(tokens) {
  const out = {};
  const seed = Math.floor(Math.random() * 1e9);
  let x = seed;
  function rnd() {
    x = (x * 1664525 + 1013904223) % 4294967296;
    return x / 4294967296;
  }
  tokens.forEach((t) => {
    // 0.1 to 250 units, skewed lower
    const base = Math.pow(rnd(), 2.2) * 250;
    const min = t.currency === "USDC" || t.currency === "USDT" ? 50 : 0.15;
    out[t.currency] = Number((min + base).toFixed(6));
  });
  return out;
}

export default function App() {
  const [tokens, setTokens] = useState([]);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [pricesError, setPricesError] = useState("");

  const [fromToken, setFromToken] = useState("");
  const [toToken, setToToken] = useState("");
  const [fromAmountText, setFromAmountText] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const [balances, setBalances] = useState({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingPrices(true);
      setPricesError("");
      try {
        const res = await fetch(PRICES_URL, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const cleaned = Array.isArray(data)
          ? data
              .filter((t) => t && t.currency && Number.isFinite(t.price))
              .map((t) => ({ currency: String(t.currency), price: Number(t.price) }))
              .sort((a, b) => a.currency.localeCompare(b.currency))
          : [];
        if (!cancelled) {
          setTokens(cleaned);
          const initialFrom = cleaned.find((t) => t.currency === "ETH")?.currency || cleaned[0]?.currency || "";
          const initialTo = cleaned.find((t) => t.currency === "USDC")?.currency || cleaned[1]?.currency || cleaned[0]?.currency || "";
          setFromToken(initialFrom);
          setToToken(initialTo);
          setBalances(getMockBalances(cleaned));
        }
      } catch (e) {
        if (!cancelled) {
          setPricesError("Could not load prices. Check your connection and refresh.");
          setTokens([]);
        }
      } finally {
        if (!cancelled) setLoadingPrices(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const fromPrice = useMemo(() => tokens.find((t) => t.currency === fromToken)?.price ?? NaN, [tokens, fromToken]);
  const toPrice = useMemo(() => tokens.find((t) => t.currency === toToken)?.price ?? NaN, [tokens, toToken]);

  const fromAmount = useMemo(() => parseAmount(fromAmountText), [fromAmountText]);

  const receiveAmount = useMemo(() => {
    if (!Number.isFinite(fromAmount) || fromAmount <= 0) return NaN;
    if (!Number.isFinite(fromPrice) || !Number.isFinite(toPrice) || toPrice <= 0) return NaN;
    const usd = fromAmount * fromPrice;
    return usd / toPrice;
  }, [fromAmount, fromPrice, toPrice]);

  const rate = useMemo(() => {
    if (!Number.isFinite(fromPrice) || !Number.isFinite(toPrice) || toPrice <= 0) return NaN;
    return fromPrice / toPrice;
  }, [fromPrice, toPrice]);

  const fromBal = balances[fromToken] ?? 0;

  const feeRate = 0.0025;
  const fee = useMemo(() => {
    if (!Number.isFinite(receiveAmount) || receiveAmount <= 0) return NaN;
    return receiveAmount * feeRate;
  }, [receiveAmount]);

  const receiveAfterFee = useMemo(() => {
    if (!Number.isFinite(receiveAmount) || !Number.isFinite(fee)) return NaN;
    return Math.max(0, receiveAmount - fee);
  }, [receiveAmount, fee]);

  const validation = useMemo(() => {
    if (loadingPrices) return { ok: false, msg: "" };
    if (pricesError) return { ok: false, msg: pricesError };
    if (!fromToken || !toToken) return { ok: false, msg: "Choose two tokens." };
    if (fromToken === toToken) return { ok: false, msg: "Choose different tokens." };
    if (!Number.isFinite(fromAmount)) return { ok: false, msg: "Enter an amount." };
    if (fromAmount <= 0) return { ok: false, msg: "Amount must be greater than 0." };
    if (fromAmount > fromBal) return { ok: false, msg: "Insufficient balance." };
    if (!Number.isFinite(receiveAmount) || receiveAmount <= 0) return { ok: false, msg: "Could not compute the quote." };
    return { ok: true, msg: "" };
  }, [loadingPrices, pricesError, fromToken, toToken, fromAmount, fromBal, receiveAmount]);

  function onSwapTokens() {
    setFromToken((prev) => {
      const a = prev;
      setToToken(a);
      return toToken;
    });
  }

  function setMax() {
    const max = fromBal;
    setFromAmountText(max ? String(max) : "");
  }

  async function submit() {
    if (!validation.ok || submitting) return;

    setSubmitting(true);
    setToast(null);

    try {
      await new Promise((r) => setTimeout(r, 1400));

      // Update balances as a mock "successful swap"
      setBalances((prev) => {
        const next = { ...prev };
        next[fromToken] = Number((Math.max(0, (prev[fromToken] ?? 0) - fromAmount)).toFixed(6));
        const add = Number.isFinite(receiveAfterFee) ? receiveAfterFee : 0;
        next[toToken] = Number(((prev[toToken] ?? 0) + add).toFixed(6));
        return next;
      });

      setFromAmountText("");
      setToast({
        kind: "success",
        title: "Swap submitted",
        body: `${formatNumber(fromAmount, 8)} ${fromToken} to about ${formatNumber(receiveAfterFee, 8)} ${toToken}`
      });
    } catch (e) {
      setToast({
        kind: "error",
        title: "Swap failed",
        body: "Please try again."
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <div className="bgGlow" aria-hidden="true" />
    <div className="neonFrame">
      <div className="card">
        <header className="header">
          <div className="brand">
            <div className="logo" aria-hidden="true"> <img src={logo} alt="Logo" className="logoImg" /> </div>
            <div>
              <div className="title">99Tech Currency Swap</div>
              <div className="subtitle">Live prices. Instant quote. Diverse tokens.</div>
            </div>
          </div>
          <div className="headerRight">
            {Number.isFinite(rate) ? (
              <Pill>
                1 {fromToken} = {formatNumber(rate, 8)} {toToken}
              </Pill>
            ) : (
              <Pill>Fetching prices</Pill>
            )}
          </div>
        </header>

        <div className="form">
          <section className="panel">
            <div className="panelTop">
              <div className="panelLabel">You pay</div>
              <div className="panelMeta">
                Balance: {formatNumber(fromBal, 6)} {fromToken}
                <button type="button" className="linkBtn" onClick={setMax} disabled={loadingPrices || submitting}>
                  Max
                </button>
              </div>
            </div>

            <div className={"row " + (!validation.ok && validation.msg && fromAmount > fromBal ? "rowError" : "")}>
              <div className="amountBox">
                <input
                  inputMode="decimal"
                  className="amountInput"
                  placeholder="0.0"
                  value={fromAmountText}
                  onChange={(e) => {
                    const v = e.target.value;
                    // allow digits, dot, commas
                    if (/^[0-9.,]*$/.test(v)) setFromAmountText(v);
                  }}
                  disabled={loadingPrices || submitting}
                  aria-label="From amount"
                />
                <div className="amountHint">
                  {Number.isFinite(fromAmount) && Number.isFinite(fromPrice) ? (
                    <span className="muted">
                      ≈ ${formatNumber(fromAmount * fromPrice, 2)}
                    </span>
                  ) : (
                    <span className="muted"> </span>
                  )}
                </div>
              </div>

              <TokenSelect
                value={fromToken}
                onChange={(v) => setFromToken(v)}
                options={tokens}
                disabled={loadingPrices || submitting}
                label="From token"
              />
            </div>
          </section>

          <div className="swapMid">
            <button
              type="button"
              className="swapBtn"
              onClick={onSwapTokens}
              disabled={loadingPrices || submitting || !fromToken || !toToken}
              aria-label="Swap tokens"
              title="Swap tokens"
            >
              ⇅
            </button>
          </div>

          <section className="panel">
            <div className="panelTop">
              <div className="panelLabel">You receive</div>
              <div className="panelMeta">
                Fee: {Number.isFinite(fee) ? formatNumber(fee, 8) : "0"} {toToken}
              </div>
            </div>

            <div className="row">
              <div className="amountBox">
                <div className="amountRead">
                  {Number.isFinite(receiveAfterFee) ? formatNumber(receiveAfterFee, 8) : "0"}
                </div>
                <div className="amountHint">
                  {Number.isFinite(receiveAfterFee) && Number.isFinite(toPrice) ? (
                    <span className="muted">
                      ≈ ${formatNumber(receiveAfterFee * toPrice, 2)}
                    </span>
                  ) : (
                    <span className="muted"> </span>
                  )}
                </div>
              </div>

              <TokenSelect
                value={toToken}
                onChange={(v) => setToToken(v)}
                options={tokens}
                disabled={loadingPrices || submitting}
                label="To token"
              />
            </div>
          </section>

          <div className="divider" />

          <section className="summary">
            <div className="summaryRow">
              <div className="muted">Rate</div>
              <div className="right">
                {Number.isFinite(rate) ? (
                  <span>
                    1 {fromToken} = {formatNumber(rate, 8)} {toToken}
                  </span>
                ) : (
                  <span className="muted">-</span>
                )}
              </div>
            </div>
            <div className="summaryRow">
              <div className="muted">Network delay</div>
              <div className="right">Mocked 1.4s</div>
            </div>
            <div className="summaryRow">
              <div className="muted">Slippage</div>
              <div className="right">0.00%</div>
            </div>

            {pricesError ? <div className="errorBanner">{pricesError}</div> : null}
            {!pricesError && !validation.ok && validation.msg ? (
              <div className="errorBanner">{validation.msg}</div>
            ) : null}

            <button
              type="button"
              className="primary"
              onClick={submit}
              disabled={!validation.ok || submitting}
            >
              {submitting ? "Swapping..." : "Swap"}
            </button>

            <div className="foot">
              Prices from Switcheo interview endpoint. Icons from Switcheo token-icons repo.
            </div>
          </section>
        </div>
      </div>
    </div>

      {toast ? (
        <Toast
          kind={toast.kind}
          title={toast.title}
          body={toast.body}
          onClose={() => setToast(null)}
        />
      ) : null}
    </div>
  );
}