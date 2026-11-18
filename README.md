# Dip-buy mean-reversion cbBTC bot

Entry for [btc-race-24h-20261118-1444](https://make.fun/bounty/btc-race-24h-20261118-1444)
— "Race a BTC trading bot live for 24 hours" ($250, bars-replay/v1).

## Strategy

`main.ts` trades Coinbase Wrapped BTC (cbBTC) against USDC on 1-minute
on-chain bars, starting with $1,000 of paper money. It trades rarely and
only on a clear signal:

- **Buy** a 2-hour dip of more than 120 bps (mean reversion: the dip usually
  recovers within hours).
- **Sell** at +200 bps above the entry close, or on a −250 bps stop.
- **Fallback:** if still flat by bar 1400 it buys once — a quarter stake —
  so the run always makes at least one trade (the race window ranks a
  zero-trade bot below every bot that traded). No new buys in the last
  10 bars.

All decisions use exact bigint arithmetic on raw close prices, so two runs
on the same bars produce byte-identical orders. No clock, no network, no
randomness. Standard library only, plus the kit's SDK shim vendored
unchanged under `vendor/` (`sdk/makefun-bars.ts` from the competition kit).

## Local grade

Grade on the kit's published dev window (run from the unpacked kit dir):

```
node cli/makefun.mjs grade-local --kit . --bot <this repo> --driver process
```

## Files

- `main.ts` — the bot
- `vendor/makefun-bars.ts` — the kit's bars-replay SDK shim, byte-for-byte
- `LICENSE` — MIT
