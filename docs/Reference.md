# Crowdfunding dApp: Complete Technical Reference

**Subject 12: Decentralized crowdfunding platform with a funding goal and a deadline. The campaign creator and the donors are stored in the Smart Contract.**

This document explains the whole project in detail: the problem, the actors, every rule and its exact condition, the composition of every file, every function, every error message, the tests, the deployment, the security model and the known limits.

---

## Table of contents

1. Project overview
2. Actors and permissions
3. Functional requirements (F1 to F6)
4. Business rules (RG1 to RG5) with exact conditions
5. Campaign lifecycle and state machine
6. Architecture
7. Repository structure and composition of every file
8. Smart contract reference: `Project.sol`
9. Smart contract reference: `Crowdfunding.sol`
10. Test contract: `ReentrancyAttacker.sol`
11. The 50% voting rule explained
12. Security analysis
13. Error message reference
14. Event reference
15. Test suite reference
16. Configuration, deployment and scripts
17. Demonstration scenarios
18. Known limitations and possible improvements
19. Glossary

---

## 1. Project overview

### 1.1 The problem

On a classic crowdfunding platform, an intermediary holds the money and takes a commission. Donors and creators must trust that intermediary: it can freeze funds, change rules, or disappear.

### 1.2 The solution

A **Smart Contract** deployed on a blockchain replaces the intermediary.

- The creator sets a **goal** (amount), a **minimum contribution** and a **deadline**.
- Donations are sent to the contract. The funds are **locked** inside it.
- If the goal is reached at the deadline, the creator may **request a withdrawal**. The donors **vote**. The money is sent only if **at least 50% of the donors approve**.
- If the goal is not reached at the deadline, **each donor can reclaim their own contribution**.

### 1.3 Objectives

| Objective | How it is achieved |
|---|---|
| Transparency | The rules are code, visible by everyone, and the key parameters are `immutable` (they cannot change after deployment). |
| No trusted intermediary | The contract executes automatically; nobody can override it. |
| Donor protection | Withdrawals need donor approval; refunds are guaranteed when the goal is missed. |

### 1.4 Technology stack

| Layer | Technology |
|---|---|
| Smart contracts | Solidity 0.8.24 |
| Development environment | Node.js, Hardhat 2 with Hardhat Toolbox (Ethers, Mocha, Chai) |
| Deployment | Hardhat Ignition |
| Local blockchain | Hardhat Network, `http://127.0.0.1:8545`, chain ID `31337` |

---

## 2. Actors and permissions

| Actor | Who | Can do | Cannot do |
|---|---|---|---|
| **Creator** | The address that called `createProject` | Create a campaign, create withdrawal requests (only if the campaign succeeded), execute an approved withdrawal | Withdraw without approval, withdraw before the deadline, change goal/deadline/minimum |
| **Donor** | Any address that has donated at least once (`contributions > 0`) | Donate (before the deadline), vote on withdrawal requests (once per request), refund (only if the campaign failed) | Vote twice on the same request, get more than their own contribution back |
| **Visitor** | Anyone, even without a wallet connection | Read the public state (goal, total, deadline, donors, requests) | Send transactions |
| **Smart Contract** | `Project` and `Crowdfunding` | Hold funds, count votes, enforce rules, emit events | n/a |

A creator can also be a donor. An address is a "donor" only while `contributions[address] > 0`.

### 2.1 Permission matrix per function

| Function | Creator | Donor | Other address |
|---|---|---|---|
| `contribute()` | yes | yes | yes (becomes a donor) |
| `createWithdrawRequest()` | yes | no | no |
| `voteWithdrawRequest()` | only if also a donor | yes | no |
| `withdrawRequestedAmount()` | yes | no | no |
| `refund()` | only if also a donor | yes | no (nothing to refund) |
| View functions | yes | yes | yes |

---

## 3. Functional requirements

| Ref | Feature | Where implemented |
|---|---|---|
| F1 | Create a campaign (goal, duration, minimum contribution, title, description) | `Crowdfunding.createProject()` |
| F2 | Donate ETH before the deadline (amount >= minimum) | `Project.contribute()` |
| F3 | View a campaign (goal, deadline, total, donors, time left, state) | `Project` getters, `getStatus()`, `timeLeft()`, `getDonors()` |
| F4 | Request a withdrawal if the campaign succeeded (amount, reason, recipient) | `Project.createWithdrawRequest()` |
| F5 | Vote and withdraw (transfer executed if >= 50% approval) | `Project.voteWithdrawRequest()`, `Project.withdrawRequestedAmount()` |
| F6 | Refund if total < goal after the deadline | `Project.refund()` |
 

---

## 4. Business rules with exact conditions

### RG1: Valid creation parameters

- **Statement:** The goal and the minimum contribution are strictly positive; the deadline is in the future.
- **Enforced in:** `Project` constructor.
- **Exact conditions:**
  - `_creator != address(0)` else revert `"Createur invalide"`
  - `_goal > 0` else revert `"Objectif invalide"`
  - `_minContribution > 0` else revert `"Don minimum invalide"`
  - `_duration > 0` else revert `"Duree invalide"`
- **Note:** the contract stores a *duration* and computes `deadline = block.timestamp + _duration`, so the deadline is in the future by construction.

### RG2: Donation window and minimum

- **Statement:** No donation is accepted after the deadline or below the minimum.
- **Enforced in:** `contribute()`.
- **Exact conditions:**
  - `block.timestamp < deadline` else revert `"Campagne terminee"`
  - `msg.value >= minContribution` else revert `"Don trop faible"`
- **Extra:** the contract has no `receive()` or `fallback()`, so a plain ETH transfer is rejected. Donations must go through `contribute()`, so RG2 cannot be bypassed.

### RG3: Funds locked until the deadline

- **Statement:** Funds stay locked in the contract until the end of the collection.
- **Enforced by construction:**
  - `createWithdrawRequest()` requires `getStatus() == Successful`, which is only possible after the deadline.
  - `refund()` requires `getStatus() == Failed`, which is only possible after the deadline.
  - No other function sends ETH.
- **Consequence:** even if the goal is reached early, the campaign stays `Ongoing` until the deadline.

### RG4: 50% approval to withdraw

- **Statement:** On success, a withdrawal needs the approval of at least 50% of the donors.
- **Enforced in:** `withdrawRequestedAmount()`.
- **Exact condition:** `approvals * 2 >= donors.length` else revert `"Moins de 50% d'approbation"`.
- **Why multiplication:** Solidity has no decimals. `approvals * 2 >= donors` is the integer form of `approvals / donors >= 0.5`.
- See section 11 for a worked table.

### RG5: Refund of one's own contribution, once

- **Statement:** On failure, each donor recovers only their own contribution, in one single payment.
- **Enforced in:** `refund()`.
- **Exact conditions:**
  - `getStatus() == Failed` else revert `"Remboursement impossible"`
  - `contributions[msg.sender] > 0` else revert `"Rien a rembourser"`
  - `contributions[msg.sender]` is set to `0` **before** the ETH is sent, so a second call finds nothing to refund.

---

## 5. Campaign lifecycle and state machine

The state is **not stored**. It is **computed** each time by `getStatus()`:

```
if block.timestamp < deadline          -> Ongoing    (0)
else if totalRaised >= goal            -> Successful (2)
else                                   -> Failed     (1)
```

| Value | Name | Meaning |
|---|---|---|
| 0 | Ongoing | Before the deadline. Donations are open. |
| 1 | Failed | Deadline passed and `totalRaised < goal`. Refunds are open. |
| 2 | Successful | Deadline passed and `totalRaised >= goal`. Withdrawal requests are open. |

### 5.1 Why the state is computed and not stored

A stored `state` variable must be updated by a transaction once the deadline passes, and nobody is obliged to send that transaction. The campaign could remain "Ongoing" forever in storage. A computed state is always correct and costs no gas to keep in sync.

### 5.2 Which function works in which state

| Function | Ongoing | Failed | Successful |
|---|---|---|---|
| `contribute()` | allowed | refused (`Campagne terminee`) | refused (`Campagne terminee`) |
| `createWithdrawRequest()` | refused (`Campagne non reussie`) | refused (`Campagne non reussie`) | allowed (creator only) |
| `voteWithdrawRequest()` | refused (no request can exist) | refused (no request can exist) | allowed (donors) |
| `withdrawRequestedAmount()` | refused (no request can exist) | refused (no request can exist) | allowed (creator, with approval) |
| `refund()` | refused (`Remboursement impossible`) | allowed (donors) | refused (`Remboursement impossible`) |

### 5.3 States are final after the deadline

After the deadline nobody can donate, so `totalRaised` can no longer change. A `Failed` campaign stays `Failed` and a `Successful` one stays `Successful`.

### 5.4 Flow diagram

```
                    createProject()
                          |
                       Ongoing  --- contribute() allowed
                          |
                    deadline reached
                   /              \
     totalRaised < goal        totalRaised >= goal
            |                          |
         Failed                   Successful
            |                          |
    each donor: refund()      creator: createWithdrawRequest()
                                       |
                              donors: voteWithdrawRequest()
                                       |
                       approvals*2 >= donors ?
                          no /        \ yes
                      refused      creator: withdrawRequestedAmount()
                                       |
                                  ETH sent to recipient
```

---

## 6. Architecture

```
Hardhat scripts  ->  Smart Contracts (Hardhat node)
```

| Layer | Responsibility |
|---|---|
| Hardhat scripts | Deploy contracts, advance local time and run demonstration scenarios. |
| Hardhat Network | Executes the contracts. Local, resettable, instant blocks. |

### 6.1 Two contracts

- **`Crowdfunding`** is a factory. Each call to `createProject()` deploys a new `Project` and records its address.
- **`Project`** is one campaign. It holds the money and enforces every rule.

One `Project` per campaign isolates funds: a bug or attack on one campaign cannot touch another one.

### 6.2 Reading versus writing

- **Reading** a `view` function costs nothing and returns the value directly.
- **Writing** sends a transaction. The caller must wait for the transaction receipt before continuing.

---

## 7. Repository structure and composition of every file

```
plateforme-crowdfunding-blockchain/
├── contracts/
│   ├── Project.sol
│   ├── Crowdfunding.sol
│   └── mocks/
│       └── ReentrancyAttacker.sol
├── test/
│   ├── Project.js
│   └── Crowdfunding.js
├── ignition/
│   └── modules/
│       └── Crowdfunding.js
├── scripts/
│   ├── fastForward.js
│   └── simulate.js
├── docs/
├── hardhat.config.js
├── package.json
├── .gitignore
└── README.md
```

Generated and git-ignored: `node_modules/`, `artifacts/`, `cache/`, `coverage/`, `ignition/deployments/`.

### 7.1 Root files

| File | Composition and role |
|---|---|
| `package.json` | Project name `plateforme-crowdfunding-blockchain`. Dev dependencies: `hardhat@^2.22.0` and `@nomicfoundation/hardhat-toolbox@^5.0.0`. npm scripts: `compile`, `test`, `coverage`, `node`, `deploy`, `deploy:reset`, `ff`, `simulate`. |
| `hardhat.config.js` | Imports the Toolbox. Solidity version `0.8.24`. Network `localhost` with URL `http://127.0.0.1:8545` and chain ID `31337`. |
| `.gitignore` | Excludes generated folders and `.env`. |
| `README.md` | Entry point: prerequisites, install, deploy, demo tools, folder map, links to `docs/`. |

### 7.2 `contracts/`

| File | Composition and role |
|---|---|
| `Project.sol` | One campaign. Contains: enum `State`, struct `WithdrawRequest`, 4 immutable variables, 3 storage values, 3 mappings/arrays, 5 events, 1 modifier, 1 constructor, 8 public functions. Detailed in section 8. |
| `Crowdfunding.sol` | The factory. Contains: array `projects`, event `ProjectCreated`, functions `createProject`, `getProjects`, `getProjectsCount`. Detailed in section 9. |
| `mocks/ReentrancyAttacker.sol` | Malicious contract used only by tests. Detailed in section 10. |

### 7.3 `test/`

| File | Composition and role |
|---|---|
| `Project.js` | Three fixtures (ongoing, successful, failed) plus a "with request" fixture. Test groups: Deployment, Donations, States and time, Withdrawal request, Vote and withdrawal, Refund, Security (reentrancy). |
| `Crowdfunding.js` | Factory tests: empty at start, creation, event, creator is the caller, several projects, validation errors bubble up. |

### 7.4 `ignition/modules/Crowdfunding.js`

An Ignition module named `CrowdfundingModule` that deploys the `Crowdfunding` factory. Campaigns are created later by users through `createProject()`. After deployment, the address is stored in `ignition/deployments/chain-31337/deployed_addresses.json` under the key `CrowdfundingModule#Crowdfunding`.

### 7.5 `scripts/`

| File | Role | How to run |
|---|---|---|
| `fastForward.js` | Moves the local blockchain clock forward by `SECONDS` seconds (default 3600) and mines a block. Used to reach the deadline during a demo. | `SECONDS=120 npm run ff` |
| `simulate.js` | Plays scenario A (success) and scenario B (failure) with real transactions. Prints `[OK]` or `[REFUSE]` plus the reason for every step. | `npm run simulate` |

---

## 8. Smart contract reference: `Project.sol`

### 8.1 Types

```solidity
enum State { Ongoing, Failed, Successful }   // 0, 1, 2

struct WithdrawRequest {
    uint256 amount;             // wei to send
    string reason;              // why the creator needs it
    address payable recipient;  // who receives the money
    uint256 approvals;          // number of donor votes
    bool executed;              // true once paid
}
```

### 8.2 State variables

| Variable | Type | Mutability | Meaning |
|---|---|---|---|
| `creator` | `address` | immutable | Campaign owner (the caller of `createProject`). |
| `goal` | `uint256` | immutable | Target amount in wei. |
| `minContribution` | `uint256` | immutable | Smallest accepted donation in wei. |
| `deadline` | `uint256` | immutable | Unix timestamp of the end of collection. |
| `title` | `string` | set once | Campaign title. |
| `description` | `string` | set once | Campaign description. |
| `totalRaised` | `uint256` | changes | Sum of all donations. |
| `contributions` | `mapping(address => uint256)` | changes | Amount given by each donor. Set to 0 on refund. |
| `donors` | `address[]` (private) | grows | Donor list; each address appears once. Read through `getDonors()`. |
| `withdrawRequests` | `WithdrawRequest[]` | grows | All requests, index = request id. |
| `hasVoted` | `mapping(uint256 => mapping(address => bool))` | changes | `hasVoted[id][donor]`, the double-vote lock. |

`immutable` values are written once in the constructor and cannot change, which delivers the "rules cannot be modified after deployment" objective and saves gas.

### 8.3 Modifier

`onlyCreator`: `require(msg.sender == creator, "Createur uniquement")`.

### 8.4 Constructor

```
constructor(address _creator, string _title, string _description,
            uint256 _goal, uint256 _minContribution, uint256 _duration)
```

| Step | Check or action |
|---|---|
| 1 | `_creator != address(0)` |
| 2 | `_goal > 0` |
| 3 | `_minContribution > 0` |
| 4 | `_duration > 0` |
| 5 | Store values; `deadline = block.timestamp + _duration` |

The creator is passed as a parameter (not read from `msg.sender`) because the factory deploys the project; otherwise the factory would become the creator and nobody could withdraw.

### 8.5 View functions

| Function | Returns | Detail |
|---|---|---|
| `getStatus()` | `State` | See section 5. |
| `timeLeft()` | `uint256` | `0` once the deadline has passed, else `deadline - block.timestamp`. |
| `getDonors()` | `address[]` | Copy of the donor list. |
| `getWithdrawRequestsCount()` | `uint256` | Number of requests. Used by the UI to loop over requests. |
| `withdrawRequests(id)` | tuple | Auto-generated getter for the public array. |
| `contributions(addr)` | `uint256` | Auto-generated getter. |
| `hasVoted(id, addr)` | `bool` | Auto-generated getter. |

### 8.6 `contribute()` (payable)

**Preconditions (in order):**
1. `block.timestamp < deadline`, else `"Campagne terminee"`.
2. `msg.value >= minContribution`, else `"Don trop faible"`.

**Effects:**
1. If `contributions[msg.sender] == 0`, push the sender to `donors` (first donation only).
2. `contributions[msg.sender] += msg.value`.
3. `totalRaised += msg.value`.
4. Emit `DonationReceived(msg.sender, msg.value)`.

A donor who gives several times is counted once in `donors`, so they have one vote.

### 8.7 `createWithdrawRequest(amount, reason, recipient)`

**Caller:** creator only (`onlyCreator`).

**Preconditions (in order):**
1. `msg.sender == creator`, else `"Createur uniquement"`.
2. `getStatus() == Successful`, else `"Campagne non reussie"`.
3. `recipient != address(0)`, else `"Destinataire invalide"`.
4. `amount > 0 && amount <= address(this).balance`, else `"Montant invalide"`.

**Effects:** push a new `WithdrawRequest(amount, reason, recipient, 0, false)`; emit `WithdrawRequestCreated(id, amount, recipient, reason)` where `id = length - 1`.

The creator may create several requests. Each needs its own votes.

### 8.8 `voteWithdrawRequest(id)`

**Preconditions (in order):**
1. `id < withdrawRequests.length`, else `"Demande inexistante"`.
2. `contributions[msg.sender] > 0`, else `"Pas donateur"`.
3. `!withdrawRequests[id].executed`, else `"Deja execute"`.
4. `!hasVoted[id][msg.sender]`, else `"Deja vote"`.

**Effects:** `hasVoted[id][msg.sender] = true`; `approvals++`; emit `WithdrawVote(id, msg.sender)`.

There is no "vote against". Not voting counts as not approving.

### 8.9 `withdrawRequestedAmount(id)`

**Caller:** creator only.

**Preconditions (in order):**
1. `msg.sender == creator`, else `"Createur uniquement"`.
2. `id < withdrawRequests.length`, else `"Demande inexistante"`.
3. `!r.executed`, else `"Deja execute"`.
4. `r.approvals * 2 >= donors.length`, else `"Moins de 50% d'approbation"`.
5. `address(this).balance >= r.amount`, else `"Solde insuffisant"`.

**Effects (order matters):**
1. `r.executed = true` (**effect first**).
2. `r.recipient.call{value: r.amount}("")` (**interaction last**).
3. `require(ok, "Echec du virement")`: if the transfer fails, the whole transaction reverts, including `executed = true`.
4. Emit `FundsWithdrawn(id, amount, recipient)`.

Check 5 matters when the creator created several requests whose total exceeds the balance: each request passes the check at creation, but only the ones the balance can still cover will pay out.

### 8.10 `refund()`

**Preconditions (in order):**
1. `getStatus() == Failed`, else `"Remboursement impossible"`.
2. `contributions[msg.sender] > 0`, else `"Rien a rembourser"`.

**Effects (order matters):**
1. `amount = contributions[msg.sender]`.
2. `contributions[msg.sender] = 0` (**effect first**).
3. `msg.sender.call{value: amount}("")` (**interaction last**).
4. `require(ok, "Echec du remboursement")`.
5. Emit `Refunded(msg.sender, amount)`.

Only the caller's own contribution is returned, and only once.

---

## 9. Smart contract reference: `Crowdfunding.sol`

| Element | Detail |
|---|---|
| `Project[] public projects` | Every campaign created through the factory. |
| `event ProjectCreated(address indexed project, address indexed creator, string title, uint256 goal, uint256 deadline)` | Emitted at each creation; the UI can listen to it. |
| `createProject(title, description, goal, minContribution, duration)` | Deploys `new Project(msg.sender, ...)`, pushes it, emits the event, returns the address. Validation errors from the `Project` constructor bubble up unchanged. |
| `getProjects()` | Returns the whole array of campaign addresses. |
| `getProjectsCount()` | Returns the number of campaigns. |

`msg.sender` of `createProject` becomes the creator of the new campaign.

---

## 10. Test contract: `ReentrancyAttacker.sol`

This contract exists **only for tests**. It imitates an attacker who tries to be refunded twice.

| Element | Detail |
|---|---|
| `target` | The `Project` under attack. |
| `reentryAttempts` | Counter of how many times the attacker's `receive()` ran. |
| `donate()` | Sends the attacker's ETH to `target.contribute()`. |
| `attack()` | Calls `target.refund()`. |
| `receive()` | Runs when the refund arrives: increments the counter and calls `target.refund()` again inside `try/catch`. |

**What happens in the attack:**

1. The attacker calls `refund()`. The contract sets the attacker's contribution to 0, then sends the ETH.
2. The attacker's `receive()` runs and calls `refund()` again.
3. `contributions[attacker]` is already 0, so the second call reverts with `"Rien a rembourser"`. The `try/catch` swallows it.
4. The attacker receives exactly its own contribution, once.

**Counter-proof:** if the line `contributions[msg.sender] = 0;` is moved after the transfer, the second call succeeds and the test fails. That experiment shows the test is meaningful.

---

## 11. The 50% voting rule explained

The rule is `approvals * 2 >= donors.length`, where `donors.length` is the number of distinct donors and each donor has exactly one vote, regardless of the amount given.

| Donors | Votes needed |
|---|---|
| 1 | 1 |
| 2 | 1 |
| 3 | 2 |
| 4 | 2 |
| 5 | 3 |
| 6 | 3 |
| 10 | 5 |
| 11 | 6 |

The needed number is `ceil(donors / 2)`. Exactly 50% is enough ("at least 50%").

### Why one donor, one vote

The specification speaks of "50% of the donors", not 50% of the money. The consequence (Sybil weakness) is described in section 19.

---

## 12. Security analysis

| Risk | Protection | Where |
|---|---|---|
| Reentrancy on `refund()` | Checks, Effects, Interactions: contribution zeroed before sending ETH | `refund()` |
| Reentrancy on withdrawal | `executed = true` before sending ETH | `withdrawRequestedAmount()` |
| Unauthorized withdrawal | `onlyCreator` and `msg.sender` check | `createWithdrawRequest`, `withdrawRequestedAmount` |
| Double vote | `hasVoted[id][msg.sender]` | `voteWithdrawRequest()` |
| Double refund | Contribution set to 0 | `refund()` |
| Double withdrawal | `executed` flag | `withdrawRequestedAmount()` |
| Abusive spending | At least 50% donor approval; balance rechecked at execution | `withdrawRequestedAmount()` |
| Bypass of donation rules | No `receive()` or `fallback()` | whole contract |
| Changing the rules | `immutable` variables | `Project` |
| Zero addresses | Checked for creator and recipient | constructor, `createWithdrawRequest()` |
| Integer overflow | Solidity 0.8 reverts on overflow by default | whole contract |
| Failed transfers ignored | `require(ok, ...)` on every `call` | `refund`, `withdraw` |

### 12.1 Why `call` and not `transfer`

`transfer` forwards a fixed 2300 gas and can fail with contract recipients. `call` is the current recommended practice, and it is safe here because every state change happens before it.

### 12.2 Trust assumptions

- The creator chooses the recipient of each request, but cannot pay it without donor approval.
- Donors trust the code, not a company. The code must therefore be reviewed and tested.

---

## 13. Error message reference

| Message | Function | Cause |
|---|---|---|
| `Createur invalide` | constructor | Creator is the zero address |
| `Objectif invalide` | constructor | Goal is 0 |
| `Don minimum invalide` | constructor | Minimum contribution is 0 |
| `Duree invalide` | constructor | Duration is 0 |
| `Campagne terminee` | `contribute` | Deadline passed |
| `Don trop faible` | `contribute` | Value below the minimum |
| `Createur uniquement` | `createWithdrawRequest`, `withdrawRequestedAmount` | Caller is not the creator |
| `Campagne non reussie` | `createWithdrawRequest` | State is not Successful |
| `Destinataire invalide` | `createWithdrawRequest` | Recipient is the zero address |
| `Montant invalide` | `createWithdrawRequest` | Amount is 0 or above the balance |
| `Demande inexistante` | `voteWithdrawRequest`, `withdrawRequestedAmount` | Request id out of range |
| `Pas donateur` | `voteWithdrawRequest` | Caller has no contribution |
| `Deja execute` | `voteWithdrawRequest`, `withdrawRequestedAmount` | Request already paid |
| `Deja vote` | `voteWithdrawRequest` | Caller already voted on this request |
| `Moins de 50% d'approbation` | `withdrawRequestedAmount` | `approvals * 2 < donors` |
| `Solde insuffisant` | `withdrawRequestedAmount` | Balance lower than the amount |
| `Echec du virement` | `withdrawRequestedAmount` | Recipient rejected the ETH |
| `Remboursement impossible` | `refund` | State is not Failed |
| `Rien a rembourser` | `refund` | Caller's contribution is 0 |
| `Echec du remboursement` | `refund` | Caller rejected the ETH |

Scripts and other clients can surface these messages directly in error notifications.

---

## 14. Event reference

| Event | Parameters | Emitted by | Used for |
|---|---|---|---|
| `ProjectCreated` | `project` (indexed), `creator` (indexed), `title`, `goal`, `deadline` | `Crowdfunding.createProject` | Listing new campaigns |
| `DonationReceived` | `donor` (indexed), `amount` | `contribute` | Donation history |
| `WithdrawRequestCreated` | `id` (indexed), `amount`, `recipient`, `reason` | `createWithdrawRequest` | Showing requests |
| `WithdrawVote` | `id` (indexed), `voter` (indexed) | `voteWithdrawRequest` | Showing who voted |
| `FundsWithdrawn` | `id` (indexed), `amount`, `recipient` | `withdrawRequestedAmount` | Proof of payment |
| `Refunded` | `donor` (indexed), `amount` | `refund` | Proof of refund |

`indexed` parameters can be used as filters when querying past events (for example, all donations of one donor).

---

## 15. Test suite reference

Commands: `npm test` runs everything; `npm run coverage` measures coverage (target: above 90%).

### 15.1 Method

- One **fixture** per scenario, built with `loadFixture`: ongoing, successful (3 donors, 11 ETH against a 10 ETH goal), failed (3 ETH against 10 ETH), and successful with one withdrawal request.
- Every rule is tested in the **nominal case** and in the **refusal case**, with the exact revert message.
- Real balances are checked with `changeEtherBalance`; events with `emit(...).withArgs(...)`.
- Time is moved with `time.increase()`, so there is no real waiting.

### 15.2 `test/Project.js`

| Group | Cases |
|---|---|
| Deployment (RG1) | Parameters stored; refuses goal 0, minimum 0, duration 0, creator zero address |
| Donations (RG2) | Donation accepted and event emitted; same donor counted once; refuses below minimum, after deadline, direct ETH transfer |
| States and time (RG3) | Successful after deadline if goal met; failed if not; still ongoing before the deadline even when the goal is met; `timeLeft` decreases then equals 0 |
| Withdrawal request (F4) | Refused if not successful, before deadline, by a non-creator, amount above balance, zero recipient; created with event |
| Vote and withdrawal (RG4) | Vote stored with event; refused for non-donor, double vote, unknown request; withdrawal refused at 1 of 3, accepted at 2 of 3; `FundsWithdrawn` event; second withdrawal refused; vote on executed request refused; withdrawal by non-creator refused; unknown request refused; cumulative requests above the balance refused |
| Refund (RG5) | Exact amount returned; `Refunded` event; second refund refused; non-donor refused; refused when successful; refused before deadline; contract balance reaches 0 after all refunds |
| Security | Reentrancy attack returns only the attacker's own contribution |

### 15.3 `test/Crowdfunding.js`

Empty at start; creation emits `ProjectCreated`; the project's creator equals the caller; several projects from different creators; validation errors propagate (`Objectif invalide`).

### 15.4 Coverage of business rules

| Rule | Covered by |
|---|---|
| RG1 | Deployment group |
| RG2 | Donations group |
| RG3 | States group, refund-before-deadline, withdrawal-before-deadline |
| RG4 | Vote and withdrawal group (1 of 3 refused, 2 of 3 accepted) |
| RG5 | Refund group, reentrancy test |

---

## 16. Configuration, deployment and scripts

### 16.1 Setup

```bash
git clone <repository-url>
cd plateforme-crowdfunding-blockchain
npm install
npm run compile
npm test
```

### 16.2 Local deployment

Terminal 1 (leave open):
```bash
npm run node
```
Terminal 2:
```bash
npm run deploy
```

If `npm run node` is restarted, the chain starts again from zero but Ignition remembers the old deployment. Redeploy with:
```bash
npm run deploy:reset
```

### 16.3 Simulating time

```bash
SECONDS=120 npm run ff
```
On Windows PowerShell: `$env:SECONDS=120; npm run ff`.

### 16.4 Automatic simulation

`npm run simulate` deploys a fresh factory and plays both scenarios. Every `[REFUSE]` line must be an **expected** refusal. An expected refusal that shows `[OK]` is a bug.

### 16.5 Multi-computer simulation

The host runs `npx hardhat node --hostname 0.0.0.0`, then deploys. Other machines can connect to the host's RPC at `http://HOST_IP:8545`.
---

## 17. Demonstration scenarios

### Scenario A: successful campaign (goal 5 ETH, duration 60 s)

| # | Actor | Action | Expected result |
|---|---|---|---|
| 1 | Creator | Creates the campaign | Visible everywhere |
| 2 | Donor 1 | Donates 2 ETH | Total 2 ETH |
| 3 | Donor 3 | Donates 0.01 ETH | Error `Don trop faible` |
| 4 | Donors 2 and 3 | Donate 2 ETH each | Total 6 ETH, 3 donors |
| 5 | Creator | Requests a withdrawal | Error `Campagne non reussie` |
| 6 | Anyone | Advances time | State Successful |
| 7 | Donor 1 | Tries to donate | Error `Campagne terminee` |
| 8 | Creator | Requests 4 ETH | Request 0 created |
| 9 | Donor 1 | Votes, then votes again | Second vote: `Deja vote` |
| 10 | Creator | Tries to withdraw | Error `Moins de 50% d'approbation` |
| 11 | Donor 2 | Votes | 2 of 3 |
| 12 | Creator | Withdraws | Recipient receives 4 ETH |
| 13 | Creator | Withdraws again | Error `Deja execute` |

### Scenario B: failed campaign (goal 50 ETH)

| # | Actor | Action | Expected result |
|---|---|---|---|
| 1 | Creator | Creates the campaign | Visible |
| 2 | Donors 1 and 2 | Donate 1 and 2 ETH | Total 3 ETH |
| 3 | Donor 1 | Tries to refund | Error `Remboursement impossible` |
| 4 | Anyone | Advances time | State Failed |
| 5 | Donor 1 | Refunds | Receives exactly 1 ETH |
| 6 | Donor 1 | Refunds again | Error `Rien a rembourser` |
| 7 | Non-donor | Tries to refund | Error `Rien a rembourser` |
| 8 | Donor 2 | Refunds | Receives 2 ETH; contract balance 0 |

### Robustness checks

Restart the node and redeploy; repeat the simulation after advancing time; connect with multiple test accounts.

---

## 18. Known limitations and possible improvements

| Limitation | Explanation | Possible improvement |
|---|---|---|
| Sybil attack | The vote counts addresses, so one person with many addresses (each donating the minimum) can outvote real donors. | Weight votes by the amount given, or require a larger minimum. |
| No voting deadline | A request stays open forever. | Add a voting period and expiry. |
| No "vote against" | Only approvals are counted. | Add rejection votes and a quorum. |
| Free recipient | The creator chooses the recipient of each request. | Show the recipient prominently; restrict to known addresses. |
| Partial milestones | Several requests can be approved up to the balance, with no per-stage structure. | Milestone-based releases. |
| No audit | Not professionally audited; local network only. | Static analysis (Slither), external review, public testnet deployment. |
| Donor list growth | `donors` is an array that grows with every new donor; very large campaigns raise read costs. | Pagination or counting votes by weight instead. |

---

## 19. Glossary

| Term | Meaning |
|---|---|
| Smart Contract | A program stored and executed on a blockchain. |
| ETH | Ether, the currency of Ethereum. |
| wei | Smallest unit of ETH. 1 ETH = 10^18 wei. |
| Hardhat | Development environment for compiling, testing and running contracts. |
| Hardhat Network | Local test blockchain with funded test accounts. |
| Ignition | Hardhat's deployment system, reproducible from a module file. |
| Transaction | A signed action that changes the blockchain state and costs gas. |
| Gas | Fee unit paid for executing a transaction. |
| `msg.sender` | Address that called the current function. |
| `msg.value` | Amount of ETH sent with the call. |
| `immutable` | Variable set once in the constructor, then read-only. |
| `require` | Check that reverts the whole transaction with a message if false. |
| Reentrancy | Attack where a recipient calls back into a contract before its state was updated. |
| Checks, Effects, Interactions | Pattern: verify, update the state, then send ETH. |
| Fixture | A reusable, clean test setup restored for each test. |
| Sybil attack | Gaining influence by creating many fake identities. |
| Factory | A contract that deploys other contracts. |