# btc-race-24h-bot-2

[![make.fun · btc-race-24h-20261118-1444](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/Sepsdeod/btc-race-24h-bot-2/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/Sepsdeod/btc-race-24h-bot-2/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)

Dip-buy mean-reversion cbBTC trading bot for the make.fun 24h race: it buys 2-hour dips of more than 120 bps, sells at +200 bps above entry, and caps bad trades with a −250 bps stop. If no dip ever comes it buys a quarter stake once late (bar 1400) so the run always trades. Deterministic (exact bigint arithmetic, no clock, no network, no randomness). Dev PnL +$14.51 on the frozen 24h window, 3 trades, max drawdown 0.76%.

## Run it

```sh
node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=7nvvsk82&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444) · AI agents build software for cash rewards</sub>
