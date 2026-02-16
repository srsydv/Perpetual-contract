# Perpetual Exchange — Formulas & Examples

This document explains every formula used in the **PerpetualExchange** contract in plain language, with examples so you can follow along as a beginner.

---

## 1. Constants

| Constant | Value | Meaning |
|----------|--------|--------|
| `PRICE_DECIMALS` | 8 | Prices (e.g. ETH/USD) are stored with 8 decimal places. $2000 = 2000×10⁸ |
| `MARGIN_DECIMALS` | 18 | Collateral (COLL) and size (ETH) use 18 decimals (like Ether wei). |
| `MAINTENANCE_MARGIN_BPS` | 500 | Maintenance margin = 500 basis points = **5%**. Below this, the position can be liquidated. |
| `MAX_LEVERAGE` | 20 | Maximum leverage is **20x**. Your notional value cannot exceed 20 × your margin. |

**Basis points (bps):** 1 bps = 0.01%. So 500 bps = 5%.

---

## 2. Notional Value

**What it is:** The “size” of your position in quote currency (USD). Notional = how much the position is “worth” at the current price.

**Formula (in contract):**
```text
notional = (|size| × entryPrice) / 10^PRICE_DECIMALS
```
- `size` = position size in 18 decimals (e.g. 2 ETH = 2×10¹⁸).
- `entryPrice` = price when you opened (or volume‑weighted average), 8 decimals (e.g. $2000 = 2000×10⁸).

**In human terms:**
```text
Notional (USD) = Size (ETH) × Entry price (USD per ETH)
```

**Example:**  
- Size = 2 ETH, entry price = $2,000  
- Notional = 2 × 2,000 = **$4,000**.

The contract stores notional in 18 decimals, so the stored value is proportional to 4,000 × 10¹⁸.

---

## 3. Required Margin (Opening a Position)

**What it is:** Minimum collateral (margin) needed to open a position at a given size and leverage.

**Formula (in contract):**
```text
notional = (sizeAbs × price) / 10^PRICE_DECIMALS
requiredMargin = notional / leverage
```
If `leverage > MAX_LEVERAGE` (20), the contract uses 20 for the division.

**In human terms:**
```text
Notional = Size (ETH) × Price (USD per ETH)
Required margin = Notional / Leverage
```

**Example:**  
- Size = 2 ETH, price = $2,000, leverage = 10x  
- Notional = 2 × 2,000 = $4,000  
- Required margin = 4,000 / 10 = **400 COLL** (assuming 1 COLL = 1 USD for simplicity).

So you need at least 400 units of collateral to open this 2 ETH position with 10x leverage.

---

## 4. Max Position Size (From Your Margin)

**What it is:** For a given margin and leverage, the maximum position size (in ETH) you are allowed to open.

**Formula (in contract):**
```text
maxNotional = (marginAmount × leverage) / 10^MARGIN_DECIMALS
maxSize = (maxNotional × 10^PRICE_DECIMALS) / price
```
- `marginAmount` = collateral in 18 decimals.  
- `price` = current mark price, 8 decimals.

**In human terms:**
```text
Max notional = Margin × Leverage
Max size (ETH) = Max notional / Price
```

**Example:**  
- Margin = 500 COLL, leverage = 10x, price = $2,000  
- Max notional = 500 × 10 = $5,000  
- Max size = 5,000 / 2,000 = **2.5 ETH**.

So with 500 COLL and 10x leverage at $2,000, you can open at most 2.5 ETH.

---

## 5. Max Leverage Check (When Opening / Adding)

**What it is:** The contract only allows opening or increasing a position if total notional does not exceed margin × 20.

**Formula (in contract):**
```text
notional = (|size| × entryPrice) / 10^PRICE_DECIMALS
require(notional <= totalMargin × MAX_LEVERAGE)
```
So: **Notional ≤ Margin × 20**.

**Example:**  
- Margin = 200 COLL, size = 2 ETH, entry price = $2,000  
- Notional = 2 × 2,000 = $4,000  
- 4,000 ≤ 200 × 20 = 4,000 → allowed (at the limit).  
If you had 150 COLL, 4,000 > 3,000 → would revert with `ExceedsMaxLeverage`.

---

## 6. Volume‑Weighted Average Price (VWAP) When Adding to a Position

**What it is:** When you already have a position and you add more size in the **same direction**, the contract updates your **entry price** to a volume‑weighted average of the old and new trades.

**Formula (in contract):**
```text
prevNotional = |pos.size| × pos.entryPrice
newNotional = sizeAbs × price
newEntryPrice = (prevNotional + newNotional) / (|pos.size| + sizeAbs)
```
All in contract decimals (size 18, price 8). The new `entryPrice` is then used for this combined position.

**In human terms:**
```text
New entry price = (Old notional + New notional) / (Old size + New size)
```

**Example:**  
- Existing: 1 ETH long at $2,000 (notional $2,000).  
- Add: 1 ETH long at $2,100 (notional $2,100).  
- New entry = (2,000 + 2,100) / (1 + 1) = **$2,050** per ETH.

So your “average” entry is $2,050 for 2 ETH.

---

## 7. Profit and Loss (PnL)

**What it is:** How much you gain or lose when price moves, for a given size and direction.

**Long:** You profit when exit price > entry price; you lose when exit price < entry price.  
**Short:** You profit when exit price < entry price; you lose when exit price > entry price.

**Formula (in contract):**
```text
// Long (size > 0)
if (exitPrice >= entryPrice)
  pnl = + (sizeAbs × (exitPrice - entryPrice)) / 10^PRICE_DECIMALS
else
  pnl = - (sizeAbs × (entryPrice - exitPrice)) / 10^PRICE_DECIMALS

// Short (size < 0)
if (entryPrice >= exitPrice)
  pnl = + (sizeAbs × (entryPrice - exitPrice)) / 10^PRICE_DECIMALS
else
  pnl = - (sizeAbs × (exitPrice - entryPrice)) / 10^PRICE_DECIMALS
```

**In human terms (long):**
```text
PnL = Size (ETH) × (Exit price − Entry price)
```
(PnL in USD‑equivalent; negative means loss.)

**In human terms (short):**
```text
PnL = Size (ETH) × (Entry price − Exit price)
```

**Example (long):**  
- 2 ETH long, entry $2,000, exit $2,100  
- PnL = 2 × (2,100 − 2,000) = **+200** (profit).

**Example (short):**  
- 2 ETH short, entry $2,000, exit $1,900  
- PnL = 2 × (2,000 − 1,900) = **+200** (profit).

---

## 8. Margin Ratio (Health of Your Position)

**What it is:** Your “health” in basis points. **Equity / Notional**, expressed as a percentage × 100 (e.g. 1000 = 10%). Below **500 bps (5%)** the position can be liquidated.

**Equity:** Your margin plus unrealized PnL.  
- If PnL ≥ 0: equity = margin + PnL.  
- If PnL < 0: equity = margin − |PnL|. (If loss ≥ margin, contract treats equity as 0 for the ratio.)

**Formula (in contract):**
```text
notional = (|size| × entryPrice) / 10^PRICE_DECIMALS
pnl = _pnl(size, entryPrice, currentPrice, |size|)
if (pnl >= 0)  equity = margin + pnl
else           equity = margin - |pnl|   // if |pnl| >= margin then margin ratio = 0
marginRatio (bps) = (equity × 10_000) / notional
```

**In human terms:**
```text
Equity = Margin + PnL   (PnL can be negative)
Margin ratio (%) = (Equity / Notional) × 100
Margin ratio (bps) = (Equity / Notional) × 10_000
```

**Example:**  
- Margin = 500 COLL, size = 2 ETH, entry = $2,000 → notional = $4,000.  
- Price drops to $1,900. Long PnL = 2 × (1,900 − 2,000) = −200.  
- Equity = 500 − 200 = 300.  
- Margin ratio = 300 / 4,000 = 7.5% = **750 bps**.  
Still above 500 bps, so not liquidatable.

If price drops to $1,750:  
- PnL = 2 × (1,750 − 2,000) = −500.  
- Equity = 500 − 500 = 0 → margin ratio = 0 → **liquidatable**.

---

## 9. Liquidation Condition

**What it is:** When your margin ratio falls below the maintenance margin, anyone can liquidate your position.

**Formula (in contract):**
```text
liquidatable = (pos.size != 0) && (marginRatio(pos) < MAINTENANCE_MARGIN_BPS)
```
So: **Position exists and margin ratio < 500 bps (5%).**

**On liquidation:**  
- Your position is closed (size and entry price set to zero).  
- The liquidator receives your **remaining margin** (your collateral for that position).  
- You do not get any of that margin back.

**Example:**  
- Margin = 200, notional = $4,000, price drops so PnL = −200.  
- Equity = 0, margin ratio = 0% < 5% → liquidatable. Liquidator gets the 200 margin.

---

## 10. Closing a Position (Partial or Full)

**What it is:** When you close `sizeToClose` of your position, the contract returns your **margin proportional to the closed size** plus your **PnL** on that part (or subtracts loss from that margin).

**Formulas (in contract):**
```text
marginToReturn = (pos.margin × sizeToClose) / sizeAbs
totalPayout = marginToReturn + PnL   (if PnL >= 0)
if (PnL < 0):
  loss = |PnL|
  if (loss >= marginToReturn)  totalPayout = 0
  else                         totalPayout = marginToReturn - loss
```
- `sizeAbs` = your current full position size.  
- PnL is computed for `sizeToClose` at current `getMarkPrice()`.

**In human terms:**  
You get back the share of margin that belongs to the closed size, plus profit (or minus loss) on that part. If the loss on that part is bigger than that margin share, you get 0 for that close.

**Example:**  
- Position: 2 ETH long, margin = 400, entry = $2,000.  
- Close 1 ETH at exit = $2,100.  
- Margin to return = 400 × (1/2) = 200.  
- PnL = 1 × (2,100 − 2,000) = 100.  
- Total payout = 200 + 100 = **300**.

---

## 11. Add / Remove Margin

**Add margin:**  
- You send more collateral to the contract.  
- `pos.margin` increases by the amount received.  
- No change to size or entry price.  
- Improves your margin ratio (more equity for same notional).

**Remove margin:**  
- You withdraw collateral.  
- `pos.margin` decreases.  
- The contract then checks: **margin ratio must still be ≥ 500 bps (5%)**, otherwise it reverts with `InsufficientMargin`.  
- So you can only remove margin up to the point where equity/notional stays ≥ 5%.

**Formula (remove margin):**
```text
newMargin = pos.margin - amount
require(_marginRatio(pos with newMargin) >= MAINTENANCE_MARGIN_BPS)
```

---

## 12. Stale Price

**What it is:** The contract uses an oracle (price feed). If the feed’s “last updated” time is older than 1 hour, the contract considers the price stale and reverts with `StalePrice()` for `getMarkPrice()` and any action that uses it.

**Formula (in contract):**
```text
(block.timestamp - updatedAt) > 3600   →  revert StalePrice()
```
So: **updatedAt must be within the last 3600 seconds (1 hour).**

---

## Quick reference (human-style)

| Concept | Formula |
|--------|--------|
| Notional | Size (ETH) × Price (USD) |
| Required margin | Notional ÷ Leverage |
| Max size | Margin × Leverage ÷ Price |
| Max leverage check | Notional ≤ Margin × 20 |
| PnL (long) | Size × (Exit − Entry) |
| PnL (short) | Size × (Entry − Exit) |
| Equity | Margin + PnL |
| Margin ratio | (Equity / Notional) × 100% |
| Liquidatable | Margin ratio < 5% |
| Maintenance margin | 5% (500 bps) |

All formulas in the contract use the same decimals (size/margin 18, price 8) so that these human-style relationships hold when values are scaled correctly.
