// Dip-buy mean-reversion bot for cbBTC (agent-fun/bars-replay/v1).
//
// Reading of the dev window (24h ending at the opening): BTC fell ~280 bps
// on the day, but not in a straight line — a sharp first-hour drop of ~140
// bps, a flat middle, a ~200 bps rally over four hours, then a drift down
// into a final-hour slide. Two facts shape this bot:
//
// 1. A full-size round trip costs ~26-40 bps (4 bps fee + 2 bps slippage +
//    the order's own price impact on a ~$1M-deep pool), so a trade must
//    catch a move well above that. Small, frequent trades bleed out.
// 2. The window's only clean edge is the big V: buy a real dip, ride the
//    recovery. Chasing every 40-60 bps wiggle loses to costs (verified by
//    sweeping the dev bars: tight take-profits and short lookbacks all end
//    negative once realistic costs are charged).
//
// So this bot trades rarely and only on a clear signal: it buys a 2-hour dip
// of more than 120 bps, sells at +200 bps above its entry (the size of the
// dev window's rally), and caps a bad trade with a -250 bps stop. If no dip
// ever comes it buys once very late (bar 1400, 40 minutes left) so the run
// always makes at least one trade — the race window ranks a bot with zero
// trades below every bot that traded, so a late guaranteed trade is worth
// more than the small expected loss of a 40-minute hold. It never buys in
// the last 10 bars, where a fill would leave no time to work.
//
// All decisions use exact bigint arithmetic on the raw close prices, so two
// runs on the same bars produce byte-identical orders. No clock, no network,
// no randomness.

import { runBars } from './vendor/makefun-bars.ts';
import type { BarsState, Batch, OrderInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
/** Bars of history a dip is measured over (120 one-minute bars = 2 hours). */
const LOOKBACK_BARS = 120;
/** Buy when the trailing LOOKBACK_BARS return is below this, in bps. */
const DIP_BPS = -120n;
/** Sell when the close is this far above the entry close, in bps. */
const TAKE_PROFIT_BPS = 200n;
/** Sell when the close is this far below the entry close, in bps. */
const STOP_BPS = -250n;
/** If still flat by this batch, buy once so the run always trades. */
const FALLBACK_BAR = 1400;
/** The fallback buy risks only this share of cash (in bps): a blind buy 40
 *  minutes before the close is there to guarantee a trade, not to bet the
 *  whole stake on a coin flip — a quarter stake keeps the eligibility while
 *  capping the damage if the close slides the way it did on the dev window. */
const FALLBACK_FRACTION_BPS = 2500n;
/** No new buys at or after this batch (a late fill has no room to work). */
const LAST_BUY_BAR = 1430;
/** Per-order slippage bound from the latest close, in bps. */
const MAX_SLIPPAGE_BPS = 100;
/** A buy must spend at least this much (the harness's 1 USDC minimum). */
const MIN_BUY_QUOTE_UNITS = 1_000_000n;

const BPS = 10000n;

/** Raw closes of CBBTC, in the order their bars arrived. */
const closes: bigint[] = [];
/** True from the moment a buy is decided until a sell is decided. */
let holding = false;
/** The close of the bar on which the current position's buy was decided. */
let entryClose: bigint | null = null;

function returnBps(now: bigint, then: bigint): bigint {
  return ((now - then) * BPS) / then;
}

function onBatch(state: BarsState, batch: Batch): OrderInput[] {
  // Reconcile with the fills of the orders decided on the previous batch: a
  // rejected buy means we never held, a rejected sell means we still hold.
  for (const fill of batch.fills) {
    if (fill.symbol !== SYMBOL) continue;
    if (fill.status !== 'rejected') continue;
    if (fill.side === 'buy') {
      holding = false;
      entryClose = null;
    } else if (fill.side === 'sell') {
      holding = true;
    }
  }

  const bar = batch.bars.find((b) => b.symbol === SYMBOL);
  if (bar === undefined) return []; // CBBTC missing this minute: no signal.
  const close = BigInt(bar.c);
  closes.push(close);

  if (state.warmingUp) return []; // warm-up batches cannot trade.
  if (closes.length <= LOOKBACK_BARS) return []; // not enough history yet.

  if (!holding) {
    const dip = returnBps(close, closes[closes.length - 1 - LOOKBACK_BARS]!);
    const fallback = state.seq >= FALLBACK_BAR;
    if ((dip < DIP_BPS || fallback) && state.seq <= LAST_BUY_BAR && state.cash >= MIN_BUY_QUOTE_UNITS) {
      holding = true;
      entryClose = close;
      // A dip buy goes all in; the late fallback buy risks a quarter stake.
      const notional = fallback ? (state.cash * FALLBACK_FRACTION_BPS) / BPS : state.cash;
      return [
        {
          side: 'buy',
          symbol: SYMBOL,
          notional_quote_units: notional,
          max_slippage_bps: MAX_SLIPPAGE_BPS,
        },
      ];
    }
    return [];
  }

  // Holding: exit on take-profit or stop, measured from the entry close.
  if (entryClose === null) return [];
  const ret = returnBps(close, entryClose);
  if (ret > TAKE_PROFIT_BPS || ret < STOP_BPS) {
    const position = state.positions.get(SYMBOL);
    if (position === undefined || position.qty === 0n) return []; // fill not landed yet; retry next bar.
    holding = false;
    entryClose = null;
    return [
      {
        side: 'sell',
        symbol: SYMBOL,
        qty: position.qty,
        max_slippage_bps: MAX_SLIPPAGE_BPS,
      },
    ];
  }
  return [];
}

await runBars({ onBatch });
