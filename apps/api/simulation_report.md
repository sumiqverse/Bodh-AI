# BodhAI Adaptive Engine Simulation Report

Generated on: 2026-10-25 17:29:18 UTC

## Executive Summary

| Persona                       | Questions | Accuracy | Rapid Guesses | Mastered | Partial | Not Learned | Mean P(Mastery) |
| :---------------------------- | :-------: | :------: | :-----------: | :------: | :-----: | :---------: | :-------------: |
| **Fast Learner**              |    25     |  72.0%   |       0       |    1     |    1    |     14      |      0.387      |
| **Prerequisite Gap Student**  |    25     |  44.0%   |       3       |    0     |    2    |     14      |      0.352      |
| **Inconsistent Student**      |    25     |  36.0%   |       3       |    0     |    1    |     15      |      0.316      |
| **Guesser / Anxious Student** |    25     |  40.0%   |      11       |    0     |    2    |     14      |      0.351      |

## Detailed Persona Analysis

### Fast Learner (`fast_learner`)

- **Questions Answered**: 25
- **Correct Responses**: 18 / 25 (72.0%)
- **Rapid Guesses Flagged (< 3.0s)**: 0
- **Skip-aheads Triggered (P > 0.95)**: 6
- **Test Gates Cleared**: 6
- **Skills Mastered (1)**: MATH-C8-RAT-04
- **Root Causes Identified**: MATH-C6-FRACT-01

#### Sample Sequence of Adaptive Decisions

| Step | Skill            | Diff | Correct | Time (s) | P(Mastery) | State         | Rationale                                             |
| :--: | :--------------- | :--: | :-----: | :------: | :--------: | :------------ | :---------------------------------------------------- |
|  1   | `MATH-C8-RAT-01` |  1   |  FAIL   |  25.96   |   0.1458   | `not_learned` | Selected MATH-C8-RAT-01 (learning unmastered found... |
|  2   | `MATH-C8-RAT-01` |  2   |  PASS   |  12.73   |   0.491    | `not_learned` | Selected MATH-C8-RAT-01 (learning unmastered found... |
|  3   | `MATH-C8-RAT-01` |  1   |  PASS   |  28.71   |   0.8315   | `partial`     | Selected MATH-C8-RAT-01 (learning unmastered found... |
|  4   | `MATH-C8-RAT-01` |  4   |  PASS   |   6.22   |   0.9612   | `partial`     | Selected MATH-C8-RAT-01 (advancing partial compete... |
|  5   | `MATH-C8-RAT-01` |  5   |  FAIL   |  15.79   |   0.7803   | `partial`     | Selected MATH-C8-RAT-01 (advancing partial compete... |
|  6   | `MATH-C8-RAT-01` |  3   |  PASS   |   6.16   |   0.947    | `partial`     | Selected MATH-C8-RAT-01 (advancing partial compete... |

### Prerequisite Gap Student (`prerequisite_gap`)

- **Questions Answered**: 25
- **Correct Responses**: 11 / 25 (44.0%)
- **Rapid Guesses Flagged (< 3.0s)**: 3
- **Skip-aheads Triggered (P > 0.95)**: 0
- **Test Gates Cleared**: 0
- **Skills Mastered (0)**: None
- **Root Causes Identified**: MATH-C6-FRACT-01

#### Sample Sequence of Adaptive Decisions

| Step | Skill            | Diff | Correct | Time (s) | P(Mastery) | State         | Rationale                                             |
| :--: | :--------------- | :--: | :-----: | :------: | :--------: | :------------ | :---------------------------------------------------- |
|  1   | `MATH-C8-RAT-01` |  1   |  FAIL   |  31.52   |   0.1458   | `not_learned` | Selected MATH-C8-RAT-01 (learning unmastered found... |
|  2   | `MATH-C8-RAT-01` |  2   |  FAIL   |   1.11   |   0.1919   | `not_learned` | Selected MATH-C8-RAT-01 (learning unmastered found... |
|  3   | `MATH-C8-RAT-01` |  3   |  PASS   |  23.88   |   0.5649   | `partial`     | Selected MATH-C8-RAT-01 (learning unmastered found... |
|  4   | `MATH-C8-RAT-01` |  1   |  FAIL   |   29.6   |   0.2257   | `not_learned` | Selected MATH-C8-RAT-01 (advancing partial compete... |
|  5   | `MATH-C8-RAT-01` |  4   |  FAIL   |   1.18   |   0.2431   | `not_learned` | Selected MATH-C8-RAT-01 (learning unmastered found... |
|  6   | `MATH-C8-RAT-01` |  5   |  PASS   |   9.28   |   0.6319   | `partial`     | Selected MATH-C8-RAT-01 (learning unmastered found... |

### Inconsistent Student (`inconsistent`)

- **Questions Answered**: 25
- **Correct Responses**: 9 / 25 (36.0%)
- **Rapid Guesses Flagged (< 3.0s)**: 3
- **Skip-aheads Triggered (P > 0.95)**: 2
- **Test Gates Cleared**: 2
- **Skills Mastered (0)**: None
- **Root Causes Identified**: MATH-C6-FRACT-01

#### Sample Sequence of Adaptive Decisions

| Step | Skill            | Diff | Correct | Time (s) | P(Mastery) | State         | Rationale                                             |
| :--: | :--------------- | :--: | :-----: | :------: | :--------: | :------------ | :---------------------------------------------------- |
|  1   | `MATH-C8-RAT-01` |  1   |  FAIL   |  13.62   |   0.1458   | `not_learned` | Selected MATH-C8-RAT-01 (learning unmastered found... |
|  2   | `MATH-C8-RAT-01` |  2   |  FAIL   |   1.62   |   0.1919   | `not_learned` | Selected MATH-C8-RAT-01 (learning unmastered found... |
|  3   | `MATH-C8-RAT-01` |  3   |  FAIL   |  28.12   |   0.1259   | `not_learned` | Selected MATH-C8-RAT-01 (learning unmastered found... |
|  4   | `MATH-C8-RAT-01` |  4   |  FAIL   |   13.4   |   0.1159   | `not_learned` | Selected MATH-C8-RAT-01 (learning unmastered found... |
|  5   | `MATH-C8-RAT-01` |  5   |  FAIL   |  19.88   |   0.1145   | `not_learned` | Selected MATH-C8-RAT-01 (learning unmastered found... |
|  6   | `MATH-C8-RAT-01` |  1   |  PASS   |  32.93   |   0.4311   | `partial`     | Selected MATH-C8-RAT-01 (learning unmastered found... |

### Guesser / Anxious Student (`guesser`)

- **Questions Answered**: 25
- **Correct Responses**: 10 / 25 (40.0%)
- **Rapid Guesses Flagged (< 3.0s)**: 11
- **Skip-aheads Triggered (P > 0.95)**: 5
- **Test Gates Cleared**: 8
- **Skills Mastered (0)**: None
- **Root Causes Identified**: MATH-C6-FRACT-01

#### Sample Sequence of Adaptive Decisions

| Step | Skill            | Diff | Correct | Time (s) | P(Mastery) | State         | Rationale                                             |
| :--: | :--------------- | :--: | :-----: | :------: | :--------: | :------------ | :---------------------------------------------------- |
|  1   | `MATH-C8-RAT-01` |  1   |  FAIL   |   1.0    |   0.2915   | `not_learned` | Selected MATH-C8-RAT-01 (learning unmastered found... |
|  2   | `MATH-C8-RAT-01` |  1   |  FAIL   |   1.08   |   0.2859   | `not_learned` | Selected MATH-C8-RAT-01 (learning unmastered found... |
|  3   | `MATH-C8-RAT-01` |  1   |  FAIL   |   1.09   |   0.2823   | `not_learned` | Selected MATH-C8-RAT-01 (learning unmastered found... |
|  4   | `MATH-C8-RAT-01` |  1   |  PASS   |   1.26   |   0.6751   | `partial`     | Selected MATH-C8-RAT-01 (learning unmastered found... |
|  5   | `MATH-C8-RAT-01` |  2   |  FAIL   |   2.09   |   0.5599   | `partial`     | Selected MATH-C8-RAT-01 (advancing partial compete... |
|  6   | `MATH-C8-RAT-01` |  2   |  FAIL   |  27.21   |   0.2235   | `not_learned` | Selected MATH-C8-RAT-01 (advancing partial compete... |
