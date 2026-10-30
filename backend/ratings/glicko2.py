"""Glicko-2 rating system, pure Python (no Django imports).

Algorithm: Mark E. Glickman, "Example of the Glicko-2 system", http://www.glicko.net/glicko/glicko2.pdf
(steps 1-8; the volatility step uses the Illinois root finder from step 5). Ported from the legacy
tournaments/glicko2.py with the maths unchanged; differences: dataclasses instead of dicts, no rounding inside the
maths (callers round for display), and the system constant tau is a parameter.

Worked example from the paper (verified by hand, see the delivery notes):
    player 1500 / RD 200 / volatility 0.06, tau 0.5, one rating period against
    1400/30 (win), 1550/100 (loss), 1700/300 (loss)
    => rating 1464.05 (paper prints 1464.06 from rounded intermediates), RD 151.52, volatility 0.05999
    (computed here: 1464.0507 / 151.5165 / 0.059996)

All players of one rating period must be computed from the SAME pre-period ratings: use `compute_period`, which takes
a snapshot and returns the new values without mutating its input.
"""
from __future__ import annotations

import math
from collections.abc import Iterable, Mapping
from dataclasses import dataclass

SCALE = 173.7178  # Glicko-2 scale factor (paper: 173.7178)
DEFAULT_RATING = 1500.0
DEFAULT_RD = 350.0
DEFAULT_VOLATILITY = 0.06
TAU = 0.5
EPSILON = 1e-6
MAX_ITERATIONS = 500


@dataclass(frozen=True)
class Rating:
    rating: float = DEFAULT_RATING
    rd: float = DEFAULT_RD
    volatility: float = DEFAULT_VOLATILITY


@dataclass(frozen=True)
class GameResult:
    """One game seen from the player's side: the opponent's PRE-period rating and RD, and the score (1, 0.5, 0)."""

    opponent_rating: float
    opponent_rd: float
    score: float


def _g(phi: float) -> float:
    return 1 / math.sqrt(1 + (3 * phi * phi) / (math.pi * math.pi))


def _e(mu: float, mu_j: float, phi_j: float) -> float:
    return 1 / (1 + math.exp(-_g(phi_j) * (mu - mu_j)))


def _to_glicko2(rating: float, rd: float) -> tuple[float, float]:
    return (rating - 1500) / SCALE, rd / SCALE


def _from_glicko2(mu: float, phi: float) -> tuple[float, float]:
    return SCALE * mu + 1500, SCALE * phi


def update_rating(player: Rating, results: Iterable[GameResult], tau: float = TAU) -> Rating:
    """New rating after one rating period. With no games only the RD grows (paper step 6 for an idle period)."""
    results = list(results)
    mu, phi = _to_glicko2(player.rating, player.rd)
    sigma = player.volatility

    if not results:
        new_phi = math.sqrt(phi * phi + sigma * sigma)
        new_rating, new_rd = _from_glicko2(mu, new_phi)
        return Rating(new_rating, new_rd, sigma)

    opponents = []
    for res in results:
        mu_j, phi_j = _to_glicko2(res.opponent_rating, res.opponent_rd)
        opponents.append((_g(phi_j), _e(mu, mu_j, phi_j), res.score))

    # Step 3: estimated variance v
    v = 1 / sum(g * g * e * (1 - e) for g, e, _ in opponents)
    # Step 4: estimated improvement delta
    delta = v * sum(g * (score - e) for g, e, score in opponents)

    # Step 5: new volatility (Illinois algorithm)
    a = math.log(sigma * sigma)
    delta_sq = delta * delta
    phi_sq = phi * phi

    def f(x: float) -> float:
        ex = math.exp(x)
        d = phi_sq + v + ex
        return (ex * (delta_sq - phi_sq - v - ex)) / (2 * d * d) - (x - a) / (tau * tau)

    big_a = a
    if delta_sq > phi_sq + v:
        big_b = math.log(delta_sq - phi_sq - v)
    else:
        k = 1
        while f(a - k * tau) < 0:
            k += 1
        big_b = a - k * tau

    f_a = f(big_a)
    f_b = f(big_b)
    iterations = 0
    while abs(big_b - big_a) > EPSILON and iterations < MAX_ITERATIONS:
        c = big_a + ((big_a - big_b) * f_a) / (f_b - f_a)
        f_c = f(c)
        if f_c * f_b <= 0:
            big_a, f_a = big_b, f_b
        else:
            f_a = f_a / 2
        big_b, f_b = c, f_c
        iterations += 1

    new_sigma = math.exp(big_a / 2)

    # Step 6: pre-rating-period RD
    phi_star = math.sqrt(phi_sq + new_sigma * new_sigma)
    # Step 7: new RD and rating
    new_phi = 1 / math.sqrt(1 / (phi_star * phi_star) + 1 / v)
    new_mu = mu + new_phi * new_phi * sum(g * (score - e) for g, e, score in opponents)

    new_rating, new_rd = _from_glicko2(new_mu, new_phi)
    return Rating(new_rating, new_rd, new_sigma)


def compute_period(
    snapshot: Mapping[object, Rating],
    results: Mapping[object, Iterable[GameResult]],
    tau: float = TAU,
) -> dict[object, Rating]:
    """Update every player in `snapshot` from the same pre-period ratings (nobody sees another's new value).

    `results` maps player key -> that player's games (opponent values must come from `snapshot`, see `games_from_pairs`).
    """
    return {key: update_rating(rating, results.get(key, ()), tau) for key, rating in snapshot.items()}


def games_from_pairs(
    snapshot: Mapping[object, Rating],
    pairs: Iterable[tuple[object, object, float]],
) -> dict[object, list[GameResult]]:
    """Build per-player results from (first, second, first_score) tuples using ONLY snapshot values."""
    out: dict[object, list[GameResult]] = {}
    for first, second, first_score in pairs:
        p1, p2 = snapshot[first], snapshot[second]
        out.setdefault(first, []).append(GameResult(p2.rating, p2.rd, first_score))
        out.setdefault(second, []).append(GameResult(p1.rating, p1.rd, 1 - first_score))
    return out
