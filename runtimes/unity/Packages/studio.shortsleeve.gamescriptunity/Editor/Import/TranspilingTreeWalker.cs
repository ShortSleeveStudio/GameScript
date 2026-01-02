using System;
using System.Collections.Generic;
using System.Text;
using Antlr4.Runtime;
using Antlr4.Runtime.Tree;
using static GameScript.StringWriter;

namespace GameScript
{
    class TranspilingTreeWalker
    {
        private bool m_IsBlock;
        private bool m_IsCondition;
        private HashSet<string> m_FlagCache;
        private StringBuilder m_Accumulator;
        private List<ScheduledBlockBuilder> m_ScheduledBlocks;
        private Routines m_Routine;

        private TranspilingTreeWalker(HashSet<string> flagCache, Routines routine)
        {
            m_FlagCache = flagCache;
            m_Accumulator = new();
            m_IsCondition = routine.is_condition;
            m_ScheduledBlocks = new();
            m_Routine = routine;
        }

        public static string Transpile(Routines routine, HashSet<string> flagCache)
        {
            // Trim and special case empty
            string code = routine.code.Trim();
            if (code.Length == 0)
            {
                if (!routine.is_condition)
                    return "";
                return "ctx.SetConditionResult(true);";
            }

            // Create parser
            TranspileErrorListener errorListener = new();
            ICharStream stream = CharStreams.fromString(code);
            CSharpRoutineLexer lexer = new CSharpRoutineLexer(stream);
            ITokenStream tokens = new CommonTokenStream(lexer);
            CSharpRoutineParser parser = new(tokens) { BuildParseTree = true, };
            lexer.RemoveErrorListeners();
            parser.RemoveErrorListeners();
            parser.AddErrorListener(errorListener);

            // Transpile
            try
            {
                IParseTree tree = routine.is_condition ? parser.expression() : parser.routine();
                TranspilingTreeWalker walker = new(flagCache, routine);
                walker.WalkEntry(tree);
                return walker.ToString();
            }
            catch (Exception)
            {
                string message =
                    $"Transpilation error in routine {routine.id} at "
                    + $"line: {errorListener.ErrorLine} "
                    + $"column: {errorListener.ErrorColumn} "
                    + $"message: {errorListener.ErrorMessage}"
                    + $"code: {code}";
                throw new Exception(message);
            }
        }

        public override string ToString() => m_Accumulator.ToString();

        private static bool IsEOF(IParseTree tree)
        {
            return tree is ITerminalNode
                && ((ITerminalNode)tree).Symbol.Type == CSharpRoutineParser.Eof;
        }

        #region Walk
        private void WalkEntry(IParseTree tree)
        {
            // Determine routine type
            m_IsBlock = IsBlockOrCondition(tree);

            // Walk
            if (m_IsCondition)
            {
                AppendNoLine(m_Accumulator, 0, "ctx.SetConditionResult");
                AppendNoLine(m_Accumulator, 0, "(");
            }
            Walk(tree);
            if (m_IsCondition)
            {
                AppendNoLine(m_Accumulator, 0, ");");
            }
        }

        private bool IsBlockOrCondition(IParseTree routineTree)
        {
            if (m_Routine.is_condition)
                return true;
            if (routineTree.ChildCount == 0)
                return true;

            // Get first child
            IParseTree routineChild = routineTree.GetChild(0);

            // This is a terminal node
            if (IsEOF(routineChild))
                return true;

            switch (routineChild)
            {
                case CSharpRoutineParser.Scheduled_blockContext:
                    return false;
                case CSharpRoutineParser.BlockContext:
                    return true;
                default:
                    throw new Exception(
                        $"Routine began with {routineChild.GetType()} instead of scheduled/block"
                    );
            }
        }

        private void Walk(IParseTree routineTree)
        {
            switch (routineTree)
            {
                case IErrorNode errorNode:
                    throw new Exception(errorNode.ToString());
                case ITerminalNode terminalNode:
                    if (terminalNode.Symbol.Type != CSharpRoutineParser.Eof)
                    {
                        if (m_IsBlock)
                        {
                            AppendNoLine(m_Accumulator, 0, terminalNode.Symbol.Text);
                        }
                        else
                        {
                            AppendNoLine(m_ScheduledBlocks[^1].Code, 0, terminalNode.Symbol.Text);
                        }
                    }
                    break;
                case IRuleNode ruleNode:
                    HandleRuleNode(ruleNode);
                    break;
                default:
                    throw new Exception($"Unknown node type: {routineTree}");
            }
        }

        private void HandleRuleNode(IRuleNode ruleNode)
        {
            switch (ruleNode)
            {
                case CSharpRoutineParser.RoutineContext routineContext:
                    HandleRoutine(routineContext);
                    break;
                case CSharpRoutineParser.Scheduled_block_openContext scheduledBlockOpenContext:
                    HandleScheduledBlockOpen(scheduledBlockOpenContext);
                    break;
                case CSharpRoutineParser.Scheduled_block_closeContext scheduledBlockCloseContext:
                    HandleScheduledBlockClose(scheduledBlockCloseContext);
                    break;
                case CSharpRoutineParser.Declaration_statementContext declarationContext:
                    HandleDeclaration(declarationContext);
                    break;
                case CSharpRoutineParser.Normal_nameContext normalNameContext:
                    HandleNormalName(normalNameContext);
                    break;
                case CSharpRoutineParser.Special_nameContext specialNameContext:
                    HandleSpecialName(specialNameContext);
                    break;
                default:
                    HandleNodeDefault(ruleNode);
                    break;
            }
        }
        #endregion

        #region Routine
        private void HandleRoutine(CSharpRoutineParser.RoutineContext routineContext)
        {
            // Write sequence number
            AppendLine(m_Accumulator, 0, "uint seq = ctx.SequenceNumber;");

            // Walk to tree to gather scheduled blocks
            int childCount = routineContext.ChildCount;
            for (int i = 0; i < childCount; i++)
            {
                Walk(routineContext.GetChild(i));
            }

            // Write routine body
            if (m_ScheduledBlocks.Count > 0)
            {
                AppendLine(m_Accumulator, 0, $"ctx.SetBlocksInUse({m_ScheduledBlocks.Count});");
            }
            for (int i = 0; i < m_ScheduledBlocks.Count; i++)
            {
                // Grab Scheduled Block
                ScheduledBlockBuilder scheduledBlock = m_ScheduledBlocks[i];

                // Execution Flag Condition Check
                AppendNoLine(m_Accumulator, 0, $"if (!ctx.HaveBlockFlagsFired({i})");
                if (scheduledBlock.EntryFlags.Count > 0)
                {
                    foreach (string entryFlag in scheduledBlock.EntryFlags)
                    {
                        AppendNoLine(
                            m_Accumulator,
                            0,
                            $" && ctx.IsFlagSet((int){EditorConstants.k_RoutineFlagEnum}.{entryFlag})"
                        );
                    }
                }
                AppendLine(m_Accumulator, 0, ")");

                // Execution code start
                AppendLine(m_Accumulator, 0, "{");

                // Execution code
                AppendLine(m_Accumulator, 1, $"if (!ctx.IsBlockExecuted({i}))");
                AppendLine(m_Accumulator, 1, "{");
                string[] splits = scheduledBlock.Code.ToString().Split(";");
                for (int j = 0; j < splits.Length; j++)
                {
                    string trimmed = splits[j].TrimEnd();
                    if (string.IsNullOrEmpty(trimmed))
                        continue;
                    AppendLine(m_Accumulator, 2, trimmed + ';');
                }
                AppendLine(m_Accumulator, 2, $"if (ctx.SequenceNumber != seq) return;");
                AppendLine(m_Accumulator, 2, $"ctx.SetBlockExecuted({i});");
                AppendLine(m_Accumulator, 1, "}");
                if (scheduledBlock.ExitFlags.Count > 0)
                {
                    AppendLine(m_Accumulator, 1, $"if (ctx.HaveBlockSignalsFired({i}))");
                    AppendLine(m_Accumulator, 1, "{");
                    foreach (string exitFlag in scheduledBlock.ExitFlags)
                    {
                        AppendLine(
                            m_Accumulator,
                            2,
                            $"ctx.SetFlag((int){EditorConstants.k_RoutineFlagEnum}.{exitFlag});"
                        );
                    }
                    AppendLine(m_Accumulator, 2, $"ctx.SetBlockFlagsFired({i});");
                    AppendLine(m_Accumulator, 1, "}");
                }

                // Execution code end
                AppendLine(m_Accumulator, 0, "}");
            }
        }
        #endregion

        #region Scheduled Blocks
        private void HandleScheduledBlockOpen(
            CSharpRoutineParser.Scheduled_block_openContext scheduledBlockOpenContext
        )
        {
            // Sanity
            if (m_IsCondition)
            {
                throw new Exception("Scheduled blocks are not allowed in conditions");
            }

            // Add Scheduled Block Builder
            ScheduledBlockBuilder scheduledBlockBuilder = new(m_ScheduledBlocks.Count);
            m_ScheduledBlocks.Add(scheduledBlockBuilder);

            // Add flags to block
            AddFlagListToBlock(scheduledBlockOpenContext.flag_list(), scheduledBlockBuilder, true);
        }

        private void HandleScheduledBlockClose(
            CSharpRoutineParser.Scheduled_block_closeContext scheduledBlockCloseContext
        )
        {
            // Sanity
            if (m_IsCondition)
            {
                throw new Exception("Scheduled blocks are not allowed in conditions");
            }

            // Add flags to block
            AddFlagListToBlock(
                scheduledBlockCloseContext.flag_list(),
                m_ScheduledBlocks[^1],
                false
            );
        }

        private void AddFlagListToBlock(
            CSharpRoutineParser.Flag_listContext flagList,
            ScheduledBlockBuilder builder,
            bool isEntry
        )
        {
            if (flagList != null && flagList.ChildCount > 0)
            {
                for (int i = 0; i < flagList.ChildCount; i++)
                {
                    // Sanity
                    if (flagList.children[i] is not ITerminalNode identifier)
                    {
                        throw new Exception(
                            "Scheduled block flag list must be a comma separated list"
                        );
                    }

                    // Grab flag name and skip commas
                    string flag = identifier.GetText();
                    if (flag == ",")
                        continue;

                    // Add flag to flag cache
                    m_FlagCache.Add(flag);

                    // Add flag to scheduled block builder (idempotent)
                    if (isEntry)
                        builder.EntryFlags.Add(flag);
                    else
                        builder.ExitFlags.Add(flag);
                }
            }
        }
        #endregion

        #region Declarations & Names
        private void HandleDeclaration(
            CSharpRoutineParser.Declaration_statementContext declarationContext
        )
        {
            StringBuilder builder = m_IsBlock ? m_Accumulator : m_ScheduledBlocks[^1].Code;
            Walk(declarationContext.type());
            AppendNoLine(builder, 0, " ");
            Walk(declarationContext.declarator_init());
            AppendNoLine(builder, 0, ";");
        }

        private void HandleNormalName(CSharpRoutineParser.Normal_nameContext normalNameContext)
        {
            string name = normalNameContext.GetText();
            StringBuilder builder = m_IsBlock ? m_Accumulator : m_ScheduledBlocks[^1].Code;
            if (name == "seq")
                AppendNoLine(builder, 0, "_seq");
            else if (name == "ctx")
                AppendNoLine(builder, 0, "_ctx");
            else
                AppendNoLine(builder, 0, name);
        }

        private void HandleSpecialName(CSharpRoutineParser.Special_nameContext specialNameContext)
        {
            if (specialNameContext.ChildCount != 1)
                throw new Exception("Too many special name children");
            IParseTree child = specialNameContext.GetChild(0);
            if (!(child is ITerminalNode))
                throw new Exception("Special name was not a terminal node");
            ITerminalNode terminalNode = child as ITerminalNode;
            switch (terminalNode.Symbol.Type)
            {
                case CSharpRoutineParser.NODE:
                    if (m_IsBlock || m_IsCondition)
                        AppendNoLine(m_Accumulator, 0, "ctx.GetCurrentNode(seq)");
                    else
                        AppendNoLine(m_ScheduledBlocks[^1].Code, 0, "ctx.GetCurrentNode(seq)");
                    break;
                case CSharpRoutineParser.LEASE:
                    EnsureNotCondition("@lease is not allowed in conditions");
                    int currentBlock = m_ScheduledBlocks.Count - 1;
                    ScheduledBlockBuilder block = m_ScheduledBlocks[currentBlock];
                    AppendNoLine(block.Code, 0, $"ctx.AcquireLease({currentBlock}, seq)");
                    break;
                default:
                    throw new Exception(
                        $"Special named contained unknown terminal node: {terminalNode.Symbol.Type}"
                    );
            }
        }
        #endregion

        #region Default Nodes
        private void HandleNodeDefault(IRuleNode ruleNode)
        {
            int childCount = ruleNode.ChildCount;
            for (int i = 0; i < childCount; ++i)
            {
                Walk(ruleNode.GetChild(i));
            }
        }
        #endregion

        #region Helper - Methods
        private void EnsureNotCondition(string errorMessage)
        {
            if (m_IsCondition)
                throw new Exception(errorMessage);
        }
        #endregion

        #region Helper - Classes/Structs
        private class ScheduledBlockBuilder
        {
            public int ScheduledBlockID { get; private set; }
            public HashSet<string> ExitFlags { get; }
            public HashSet<string> EntryFlags { get; }
            public StringBuilder Code { get; }

            public ScheduledBlockBuilder(int blockId)
            {
                Code = new();
                ExitFlags = new();
                EntryFlags = new();
                ScheduledBlockID = blockId;
            }
        }
        #endregion
    }
}
