##Way of Work

### Non-Negotiable Principles

0. **Don't make decisions without me.** No unilateral functionality changes. Don't ignore prior decisions.

1. **Never lose reactivity.** Every change must maintain identical reactive behavior.

2. **Never change functionality without approval.** Stop and discuss behavioral changes first.

3. **Investigate downstream effects.** Trace all consumers before changing code.

4. **Never take the easy way out.** Choose architecturally correct over quick fix.

5. **First principles thinking.** Design as if building fresh with Svelte 5.

6. **Incremental and testable.** Each phase = working, testable application.

7. **Always improving.** Surface improvement opportunities.

8. **Assume nothing.** Deep-dive diff functions with same names for feature parity.

9. **Avoid allocation in runtimes.** The game engine runtimes need to be very careful to avoid runtime allocation. Also, don't use 'var' and use new() where possible.
