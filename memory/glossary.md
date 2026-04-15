# Glossary — ProTraderSim

## Acronyms & Terms

| Term          | Meaning                                                                    |
| ------------- | -------------------------------------------------------------------------- |
| CFD           | Contract for Difference — the financial product being simulated            |
| KYC           | Know Your Customer — identity verification flow                            |
| IB            | Introducing Broker — affiliate partner with commission tracking            |
| P&L           | Profit & Loss                                                              |
| bps           | Basis points (10000 bps = 100%)                                            |
| BullMQ        | Redis-backed job queue library used for workers                            |
| IPN           | Instant Payment Notification — NowPayments webhook                         |
| OHLCV         | Open, High, Low, Close, Volume — candlestick data                          |
| MoneyString   | String representation of cents (e.g. "10050" = $100.50)                    |
| PriceString   | String representation of scaled price ×100000 (e.g. "108500" = 1.08500)    |
| PRICE_SCALE   | 100000n — BigInt multiplier for price storage                              |
| BPS_SCALE     | 10000n — BigInt multiplier for basis points                                |
| SL            | Stop Loss                                                                  |
| TP            | Take Profit                                                                |
| TRAILING_STOP | Trailing Stop — a stop price that moves with the market to lock in profits |
| SOT           | Stop Out — see STOP_OUT in Close Reasons                                   |

## Warning States

| Code        | Meaning                                                                                            |
| ----------- | -------------------------------------------------------------------------------------------------- |
| MARGIN_CALL | Warning issued when margin level (in basis points, bps) <= marginCallBps; does not close positions |

## Close Reasons

| Code          | Meaning                                                         |
| ------------- | --------------------------------------------------------------- |
| USER          | Trader closed manually                                          |
| STOP_LOSS     | Hit SL level                                                    |
| TAKE_PROFIT   | Hit TP level                                                    |
| TRAILING_STOP | Trailing stop triggered                                         |
| STOP_OUT      | Forced liquidation when margin level < stopOutBps (50% default) |
| ADMIN         | Closed by admin                                                 |
| EXPIRED       | Entry order expired                                             |

## Staff Roles (Hierarchy)

SUPER_ADMIN → ADMIN → IB_TEAM_LEADER → AGENT
