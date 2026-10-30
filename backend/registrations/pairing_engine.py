"""Pairing engine (contract C07). Pure functions: no database, no clock, deterministic for the same input.

Two methods:
  * swiss            rated Swiss style: score groups, rating order, no repeat pairings where possible, colour balance.
  * social_balanced  similar-strength games, no repeat pairings where possible, colour balance. Standings are ignored.

This is a pragmatic engine, NOT an implementation of the FIDE Dutch system: PG makes no FIDE compliance claim
(EVENT-ENGINE "Rated tournament"). Byes go to the player with the fewest earlier byes, then the lowest score, then
the lowest rating. When a perfect no-rematch matching cannot be found within the search budget, rematches are allowed
as a last resort and reported in `Draft.rematches`.
"""
from __future__ import annotations

from dataclasses import dataclass, field

METHODS = ('swiss', 'social_balanced')
DEFAULT_RATING = 1500
NODE_BUDGET = 20000


@dataclass(frozen=True)
class Player:
    id: object
    rating: int = DEFAULT_RATING
    score: float = 0.0


@dataclass
class History:
    """What the engine needs to know about earlier rounds (final or not, published rounds only)."""
    played: set = field(default_factory=set)        # frozenset({a, b}) of players who already met
    colours: dict = field(default_factory=dict)     # player id -> list of 'W' / 'B' in round order
    byes: dict = field(default_factory=dict)        # player id -> number of byes so far


@dataclass
class Draft:
    boards: list                                    # [(white_id, black_id)] in board order
    byes: list                                      # [player_id]
    rematches: int


def _rank_key(p: Player):
    return (-p.score, -p.rating, str(p.id))


def _pick_bye(players, history: History):
    return min(players, key=lambda p: (history.byes.get(p.id, 0), p.score, p.rating, str(p.id)))


def _match(order, cost, played, budget):
    """Depth-first perfect matching over `order`. The first unpaired player tries partners cheapest first and skips
    rematches. Returns a list of index pairs or None when none exists within the node budget."""
    n = len(order)
    used = [False] * n
    pairs: list = []
    nodes = [0]

    def solve() -> bool:
        i = 0
        while i < n and used[i]:
            i += 1
        if i == n:
            return True
        nodes[0] += 1
        if nodes[0] > budget:
            return False
        used[i] = True
        candidates = sorted((j for j in range(i + 1, n) if not used[j]),
                            key=lambda j: (cost(order[i], order[j], i, j), j))
        for j in candidates:
            if frozenset((order[i].id, order[j].id)) in played:
                continue
            used[j] = True
            pairs.append((i, j))
            if solve():
                return True
            pairs.pop()
            used[j] = False
            if nodes[0] > budget:
                break
        used[i] = False
        return False

    return list(pairs) if solve() else None


def _greedy(order, cost):
    """Fallback that always finishes: pair the first free player with the cheapest free partner (rematches allowed)."""
    free = list(range(len(order)))
    pairs = []
    while len(free) >= 2:
        i = free.pop(0)
        j = min(free, key=lambda k: (cost(order[i], order[k], i, k), k))
        free.remove(j)
        pairs.append((i, j))
    return pairs


def _colours(a: Player, b: Player, history: History, tiebreak_white_first: bool):
    """Returns (white, black). Never a third equal colour in a row when avoidable, then balance whites against
    blacks, then give the player who had black most recently white, then the higher-ranked player alternates."""
    def facts(p):
        seq = history.colours.get(p.id, [])
        whites, blacks = seq.count('W'), seq.count('B')
        run = 0
        if seq:
            last = seq[-1]
            for c in reversed(seq):
                if c != last:
                    break
                run += 1
            return whites - blacks, last, run
        return 0, None, 0

    bal_a, last_a, run_a = facts(a)
    bal_b, last_b, run_b = facts(b)
    need_a = 'B' if (last_a == 'W' and run_a >= 2) else 'W' if (last_a == 'B' and run_a >= 2) else None
    need_b = 'B' if (last_b == 'W' and run_b >= 2) else 'W' if (last_b == 'B' and run_b >= 2) else None
    if need_a and need_a != need_b:
        return (a, b) if need_a == 'W' else (b, a)
    if need_b and need_b != need_a:
        return (b, a) if need_b == 'W' else (a, b)
    if bal_a != bal_b:
        return (a, b) if bal_a < bal_b else (b, a)
    if last_a != last_b and last_a and last_b:
        return (a, b) if last_a == 'B' else (b, a)
    return (a, b) if tiebreak_white_first else (b, a)


def build_round(players, history: History, *, method: str, round_no: int) -> Draft:
    """Pair `players` (a list of Player). Boards come back strongest first (score, then rating for swiss; rating for
    social). Raises ValueError for an unknown method or fewer than 2 players with no sensible output."""
    if method not in METHODS:
        raise ValueError(f'Unknown pairing method {method!r}.')
    players = list(players)
    if len(players) < 1:
        return Draft(boards=[], byes=[], rematches=0)

    byes = []
    pool = players
    if len(pool) % 2 == 1:
        bye = _pick_bye(pool, history)
        byes.append(bye.id)
        pool = [p for p in pool if p.id != bye.id]

    if method == 'swiss':
        order = sorted(pool, key=_rank_key)
        first_round = not history.played and all(p.score == 0 for p in order)
        if first_round:
            half = len(order) // 2
            index_pairs = [(i, half + i) for i in range(half)]  # top half against bottom half
            rematches = 0
        else:
            def cost(a, b, i, j):
                return abs(a.score - b.score) * 1000 + (j - i)
            index_pairs, rematches = _solve(order, cost, history)
    else:
        order = sorted(pool, key=lambda p: (-p.rating, str(p.id)))

        def cost(a, b, i, j):
            return abs(a.rating - b.rating)
        index_pairs, rematches = _solve(order, cost, history)

    boards = []
    for i, j in index_pairs:
        a, b = order[i], order[j]
        white, black = _colours(a, b, history, tiebreak_white_first=(len(boards) + round_no) % 2 == 0)
        boards.append((white.id, black.id))
    return Draft(boards=boards, byes=byes, rematches=rematches)


def _solve(order, cost, history: History):
    pairs = _match(order, cost, history.played, NODE_BUDGET)
    if pairs is not None:
        return pairs, 0
    pairs = _greedy(order, cost)
    rematches = sum(1 for i, j in pairs if frozenset((order[i].id, order[j].id)) in history.played)
    return pairs, rematches
