using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;
using System.Threading;
using UnityEngine;

namespace GameScript
{
    /// <summary>
    /// The dialogue execution engine. This is a pure C# class that can be instantiated
    /// directly with a database. Use GameScriptBehaviour for Unity Inspector integration.
    /// </summary>
    public sealed class GameScriptRunner
    {
        #region State
        readonly Dictionary<uint, RunnerContext> _contextsActive;
        readonly LinkedList<RunnerContext> _contextsInactive;
        readonly Thread _mainThread;
        readonly GameScriptDatabase _database;
        readonly JumpTable _jumpTable;
        readonly Settings _settings;
        readonly StringBuilder _sharedStringBuilder;

        // Cached CultureInfo derived from snapshot.LocaleName. Nulled when locale changes.
        CultureInfo _cultureInfo;

        // Cached CLDR rule indices for the current locale (avoids per-call string allocations
        // from locale normalization in CldrPluralRules). Invalidated on locale change.
        byte _cardinalRuleIdx;
        byte _ordinalRuleIdx;
        bool _cldrRulesCached;
        #endregion

        #region Constructor
        /// <summary>
        /// Creates a new runner with the specified database and settings.
        /// </summary>
        public GameScriptRunner(GameScriptDatabase database, Settings settings)
        {
            _database = database ?? throw new ArgumentNullException(nameof(database));
            _settings = settings ?? throw new ArgumentNullException(nameof(settings));
            _mainThread = Thread.CurrentThread;
            _contextsActive = new Dictionary<uint, RunnerContext>();
            _contextsInactive = new LinkedList<RunnerContext>();
            _sharedStringBuilder = new StringBuilder(256);

            // Build jump table from snapshot
            _jumpTable = JumpTableBuilder.Build(_database.Snapshot);

            // Invalidate cached CultureInfo when the locale changes
            _database.OnLocaleChanged += OnLocaleChanged;

            // Pre-allocate context pool
            for (uint i = 0; i < _settings.InitialConversationPool; i++)
            {
                _contextsInactive.AddLast(new RunnerContext(_settings));
            }
        }
        #endregion

        #region Public API
        /// <summary>
        /// The database this runner was created with.
        /// </summary>
        public GameScriptDatabase Database => _database;

        /// <summary>
        /// Starts a conversation by index.
        /// </summary>
        public ActiveConversation StartConversation(int conversationIndex, IGameScriptListener listener)
        {
            EnsureMainThread();

            RunnerContext context = ContextAcquire();
            context.Initialize(_database, _jumpTable, conversationIndex, listener, this);

            // Start the conversation - it runs asynchronously and releases itself when done
            _ = RunConversationAsync(context);

            return new ActiveConversation(this, context.SequenceNumber, context.ContextId);
        }

        /// <summary>
        /// Starts a conversation using a ConversationRef.
        /// </summary>
        public ActiveConversation StartConversation(ConversationRef conversation, IGameScriptListener listener)
        {
            return StartConversation(conversation.Index, listener);
        }

        /// <summary>
        /// Starts a conversation by ID.
        /// </summary>
        public ActiveConversation StartConversation(ConversationId conversationId, IGameScriptListener listener)
        {
            ConversationRef conversation = _database.FindConversation(conversationId);
            return StartConversation(conversation.Index, listener);
        }

        /// <summary>
        /// Checks if a conversation is still active.
        /// </summary>
        public bool IsActive(ActiveConversation active)
        {
            EnsureMainThread();
            RunnerContext ctx = FindContextActive(active);
            return ctx != null;
        }

        /// <summary>
        /// Stops a specific conversation.
        /// </summary>
        public void StopConversation(ActiveConversation active)
        {
            EnsureMainThread();
            RunnerContext ctx = FindContextActive(active);
            if (ctx == null)
                return; // Already ended, idempotent

            ctx.Cancel();
        }

        /// <summary>
        /// Stops all active conversations.
        /// </summary>
        public void StopAllConversations()
        {
            EnsureMainThread();

            // Collect context IDs first to avoid modifying dictionary during iteration
            // Cancel modifies _contextsActive via ContextRelease, so we snapshot keys first
            if (_contextsActive.Count == 0) return;

            uint[] contextIds = new uint[_contextsActive.Count];
            _contextsActive.Keys.CopyTo(contextIds, 0);

            foreach (uint contextId in contextIds)
            {
                if (_contextsActive.TryGetValue(contextId, out RunnerContext ctx))
                {
                    ctx.Cancel();
                }
            }
        }
        #endregion

        #region Text Resolution
        /// <summary>
        /// Resolves the text for a localization entry with the given parameters.
        /// Performs gender resolution, plural category selection, variant picking,
        /// and template substitution in a single pass.
        /// </summary>
        /// <param name="localizationIdx">Index into <c>snapshot.Localizations</c>. Returns <c>null</c> if &lt; 0.</param>
        /// <param name="node">The node context (unused in current implementation, reserved for future dynamic gender support).</param>
        /// <param name="parms">Resolution parameters controlling gender, plural, and substitution args.</param>
        /// <returns>The resolved string, or <c>null</c> if no matching variant has text.</returns>
        internal string ResolveText(int localizationIdx, NodeRef node, TextResolutionParams parms)
        {
            if (localizationIdx < 0)
                return null;

            Snapshot snapshot = _database.Snapshot;
            Localization loc = snapshot.Localizations[localizationIdx];

            // 1. Resolve gender
            GenderCategory gender = ResolveGender(loc, parms.GenderOverride, snapshot);

            // 2. Resolve plural category (cardinal or ordinal based on PluralArg.Type)
            PluralCategory plural = PluralCategory.Other;
            if (parms.Plural.HasValue)
            {
                PluralArg pa = parms.Plural.Value;
                EnsureCldrRulesCached(snapshot);
                if (pa.Type == PluralType.Ordinal)
                {
                    // Ordinal rules are integer-only; clamp long to int
                    int ordinalN = (int)Math.Clamp(pa.Value, int.MinValue, int.MaxValue);
                    plural = CldrPluralRules.ApplyOrdinalRule(_ordinalRuleIdx, ordinalN);
                }
                else
                {
                    plural = CldrPluralRules.ApplyRule(_cardinalRuleIdx, pa.Value, pa.Precision);
                }
            }

            // 3. Select variant
            string text = VariantResolver.Resolve(loc, gender, plural);
            if (text == null)
                return null;

            // 4. Template substitution — only when is_templated is set and there are args
            bool hasPlural = parms.Plural.HasValue;
            bool hasArgs   = parms.Args != null && parms.Args.Length > 0;
            if (loc.IsTemplated && (hasPlural || hasArgs))
                text = ApplyTemplate(text, parms);

            return text;
        }

        // Resolves the effective GenderCategory from the localization and optional caller override.
        static GenderCategory ResolveGender(Localization loc, GenderCategory? genderOverride, Snapshot snapshot)
        {
            // Caller-supplied override always wins
            if (genderOverride.HasValue)
                return genderOverride.Value;

            // Derive from subject actor's grammatical gender (subject_actor takes precedence)
            int actorIdx = loc.SubjectActorIdx;
            if (actorIdx >= 0)
            {
                GrammaticalGender gg = snapshot.Actors[actorIdx].GrammaticalGender;
                switch (gg)
                {
                    case GrammaticalGender.Masculine: return GenderCategory.Masculine;
                    case GrammaticalGender.Feminine:  return GenderCategory.Feminine;
                    case GrammaticalGender.Neuter:    return GenderCategory.Neuter;
                    default:                          return GenderCategory.Other; // Other + Dynamic
                }
            }

            // Fall back to direct gender override (GenderCategory.Other when unset)
            return loc.SubjectGender;
        }

        // Single-pass template substitution.
        // Supports {{ → literal '{', }} → literal '}'.
        // {name} placeholders resolved from parms.Plural.Name and parms.Args[].Name.
        // PluralArg value is locale-formatted with integer grouping.
        // Arg values are formatted per their ArgType using C#'s CultureInfo.
        // Unknown placeholders are passed through unchanged.
        // Uses _sharedStringBuilder — not re-entrant; call only from the main thread.
        string ApplyTemplate(string text, TextResolutionParams parms)
        {
            _sharedStringBuilder.Clear();
            CultureInfo culture = GetCultureInfo();

            int len = text.Length;
            int i = 0;
            while (i < len)
            {
                char c = text[i];

                if (c == '{')
                {
                    // Escaped brace: {{ → '{'
                    if (i + 1 < len && text[i + 1] == '{')
                    {
                        _sharedStringBuilder.Append('{');
                        i += 2;
                        continue;
                    }

                    // Scan for matching '}'
                    int start = i + 1;
                    int end = start;
                    while (end < len && text[end] != '}')
                        end++;

                    if (end >= len)
                    {
                        // Malformed — no closing brace; emit rest of string literally
                        _sharedStringBuilder.Append(text, i, len - i);
                        break;
                    }

                    string placeholder = text.Substring(start, end - start);

                    // Try PluralArg first (formatted as locale-aware number)
                    bool resolved = false;
                    if (parms.Plural.HasValue &&
                        string.Equals(parms.Plural.Value.Name, placeholder, StringComparison.Ordinal))
                    {
                        PluralArg pa = parms.Plural.Value;
                        if (pa.Precision > 0)
                        {
                            // Decimal: format with Precision decimal places
                            double displayValue = pa.Value / Pow10(pa.Precision);
                            string format = "N" + pa.Precision.ToString();
                            _sharedStringBuilder.Append(displayValue.ToString(format, culture));
                        }
                        else
                        {
                            // Integer: grouped integer formatting
                            _sharedStringBuilder.Append(pa.Value.ToString("N0", culture));
                        }
                        resolved = true;
                    }

                    // Try typed Args
                    if (!resolved && parms.Args != null)
                    {
                        for (int a = 0; a < parms.Args.Length; a++)
                        {
                            if (string.Equals(parms.Args[a].Name, placeholder, StringComparison.Ordinal))
                            {
                                FormatArg(ref parms.Args[a], culture);
                                resolved = true;
                                break;
                            }
                        }
                    }

                    // Unknown placeholder — pass through unchanged
                    if (!resolved)
                    {
                        _sharedStringBuilder.Append('{');
                        _sharedStringBuilder.Append(placeholder);
                        _sharedStringBuilder.Append('}');
                    }

                    i = end + 1; // skip past '}'
                }
                else if (c == '}')
                {
                    // Escaped brace: }} → '}'
                    if (i + 1 < len && text[i + 1] == '}')
                    {
                        _sharedStringBuilder.Append('}');
                        i += 2;
                    }
                    else
                    {
                        // Lone '}' — emit literally (lenient)
                        _sharedStringBuilder.Append('}');
                        i++;
                    }
                }
                else
                {
                    _sharedStringBuilder.Append(c);
                    i++;
                }
            }

            return _sharedStringBuilder.ToString();
        }

        // Formats a single Arg value into _sharedStringBuilder based on its ArgType.
        void FormatArg(ref Arg arg, CultureInfo culture)
        {
            switch (arg.Type)
            {
                case ArgType.String:
                    if (arg.StringValue != null)
                        _sharedStringBuilder.Append(arg.StringValue);
                    break;

                case ArgType.Int:
                    _sharedStringBuilder.Append(arg.NumericValue.ToString("N0", culture));
                    break;

                case ArgType.Decimal:
                {
                    double value = arg.NumericValue / Pow10(arg.Precision);
                    string format = arg.Precision > 0 ? "N" + arg.Precision.ToString() : "N0";
                    _sharedStringBuilder.Append(value.ToString(format, culture));
                    break;
                }

                case ArgType.Percent:
                {
                    // Value is percentage × 10^precision (e.g., 155 with precision 1 = 15.5%)
                    // Divide by 10^precision to get the percentage, then by 100 for P format
                    double pct = arg.NumericValue / Pow10(arg.Precision) / 100.0;
                    string format = arg.Precision > 0 ? "P" + arg.Precision.ToString() : "P0";
                    _sharedStringBuilder.Append(pct.ToString(format, culture));
                    break;
                }

                case ArgType.Currency:
                {
                    int decimals = Iso4217.GetMinorUnitDigits(arg.CurrencyCode);
                    double value = arg.NumericValue / Pow10(decimals);
                    NumberFormatInfo nfi = (NumberFormatInfo)culture.NumberFormat.Clone();
                    nfi.CurrencyDecimalDigits = decimals;
                    nfi.CurrencySymbol = Iso4217.GetSymbol(arg.CurrencyCode, culture);
                    _sharedStringBuilder.Append(value.ToString("C", nfi));
                    break;
                }

                case ArgType.RawInt:
                    _sharedStringBuilder.Append(arg.NumericValue.ToString());
                    break;
            }
        }

        // Integer power of 10. Precision values are small (0–6 in practice).
        static double Pow10(int exponent)
        {
            switch (exponent)
            {
                case 0: return 1.0;
                case 1: return 10.0;
                case 2: return 100.0;
                case 3: return 1000.0;
                case 4: return 10000.0;
                case 5: return 100000.0;
                case 6: return 1000000.0;
                default: return Math.Pow(10, exponent);
            }
        }

        // Returns a cached CultureInfo derived from the current snapshot's LocaleName.
        // Normalises underscore separators to hyphens for CultureInfo (e.g., "en_US" → "en-US").
        // Falls back to CultureInfo.InvariantCulture for unknown locale codes.
        CultureInfo GetCultureInfo()
        {
            if (_cultureInfo != null)
                return _cultureInfo;

            string localeName = _database.Snapshot?.LocaleName;
            if (string.IsNullOrEmpty(localeName))
            {
                _cultureInfo = CultureInfo.InvariantCulture;
                return _cultureInfo;
            }

            // CultureInfo uses hyphens; snapshot may use underscores
            string normalized = localeName.Replace('_', '-');
            try
            {
                _cultureInfo = new CultureInfo(normalized);
            }
            catch
            {
                _cultureInfo = CultureInfo.InvariantCulture;
            }

            return _cultureInfo;
        }

        // Caches the CLDR cardinal and ordinal rule indices for the current snapshot locale.
        // Called once per locale; invalidated on locale change. Avoids per-call string
        // allocations from locale normalization (separator swap, subtag extraction).
        void EnsureCldrRulesCached(Snapshot snapshot)
        {
            if (_cldrRulesCached)
                return;

            string localeName = snapshot.LocaleName;
            _cardinalRuleIdx = CldrPluralRules.LookupCardinalRule(localeName);
            _ordinalRuleIdx = CldrPluralRules.LookupOrdinalRule(localeName);
            _cldrRulesCached = true;
        }

        void OnLocaleChanged()
        {
            // Invalidate cached CultureInfo and CLDR rules so they are rebuilt on next use
            _cultureInfo = null;
            _cldrRulesCached = false;
        }
        #endregion

        #region Helpers
        async Awaitable RunConversationAsync(RunnerContext context)
        {
            try
            {
                await context.Run();
            }
            catch (Exception e)
            {
                Debug.LogException(e);
            }
            finally
            {
                // Context is done, return to pool
                ContextRelease(context);
            }
        }

        RunnerContext ContextAcquire()
        {
            RunnerContext context;
            if (_contextsInactive.Count == 0)
            {
                context = new RunnerContext(_settings);
            }
            else
            {
                LinkedListNode<RunnerContext> node = _contextsInactive.Last;
                _contextsInactive.RemoveLast();
                context = node.Value;
            }

            // Add to active dictionary using ContextId as key (O(1) insert and lookup)
            _contextsActive.Add(context.ContextId, context);
            return context;
        }

        void ContextRelease(RunnerContext context)
        {
            // O(1) removal from active dictionary
            _contextsActive.Remove(context.ContextId);

            // Return to inactive pool
            _contextsInactive.AddLast(context);
        }

        RunnerContext FindContextActive(ActiveConversation active)
        {
            // O(1) lookup by ContextId
            if (!_contextsActive.TryGetValue(active.ContextId, out RunnerContext context))
                return null;

            // Validate sequence to detect stale handles after context reuse
            if (context.SequenceNumber != active.SequenceNumber)
                return null;

            return context;
        }

        void EnsureMainThread()
        {
            if (_mainThread != Thread.CurrentThread)
                throw new InvalidOperationException("GameScript APIs must be called from the main thread");
        }
        #endregion
    }
}
