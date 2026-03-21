using System;
using System.Collections.Generic;
using System.Threading;
using GameScript;
using UnityEngine;
using UnityEngine.UI;

public class ConversationUI : MonoBehaviour, IGameScriptListener
{
    #region Constants
    const float ReadTimeSeconds = 1f;
    #endregion

    #region Inspector Variables
    [SerializeField]
    GameObject m_HistoryContent;

    [SerializeField]
    GameObject m_HistoryItemPrefab;

    [SerializeField]
    GameObject m_ChoiceContent;

    [SerializeField]
    GameObject m_ChoiceItemPrefab;

    [SerializeField]
    ScrollRect m_HistoryScrollRect;
    #endregion

    #region State
    Action<ConversationUI> m_OnComplete;
    ActiveConversation m_ActiveConversation;
    GameScriptRunner m_GameScriptRunner;
    AwaitableCompletionSource<ChoiceRef> m_DecisionSource = new();
    List<ChoiceRef> m_CurrentChoices = new();
    #endregion

    #region Initialization
    public void Initialize(
        GameScriptRunner runner,
        int conversationIndex,
        Action<ConversationUI> onComplete
    )
    {
        m_GameScriptRunner = runner;
        m_OnComplete = onComplete;
        m_ActiveConversation = m_GameScriptRunner.StartConversation(conversationIndex, this);
    }
    #endregion

    #region Handlers
    public void Stop()
    {
        m_GameScriptRunner.StopConversation(m_ActiveConversation);
        m_OnComplete(this);
    }
    #endregion

    #region Resolution Params
    public TextResolutionParams OnSpeechParams(LocalizationRef localization, NodeRef node)
    {
        return BuildResolutionParams(localization, node);
    }

    public TextResolutionParams OnDecisionParams(LocalizationRef localization, NodeRef choiceNode)
    {
        return BuildResolutionParams(localization, choiceNode);
    }

    TextResolutionParams BuildResolutionParams(LocalizationRef localization, NodeRef node)
    {
        // Check the localization's SUBJECT actor (who the text is about), not the
        // node's speaker actor. Provide feminine override for dynamic subject actors.
        GenderCategory? genderOverride = null;
        int subjectIdx = localization.SubjectActorIdx;
        if (subjectIdx >= 0)
        {
            ActorRef subjectActor = m_GameScriptRunner.Database.GetActor(subjectIdx);
            if (subjectActor.GrammaticalGender == GrammaticalGender.Dynamic)
                genderOverride = GenderCategory.Feminine;
        }

        // is_templated now lives on the localization, not as a node property
        if (!localization.IsTemplated)
        {
            if (genderOverride.HasValue)
                return new TextResolutionParams { GenderOverride = genderOverride };
            return default;
        }

        // Read template args from node properties
        string templateName = null;
        bool hasCount = false;
        int count = 0;

        int propCount = node.PropertyCount;
        for (int i = 0; i < propCount; i++)
        {
            NodePropertyRef prop = node.GetProperty(i);
            if (prop.Name == "TemplateString" && prop.TryGetString(out string name))
            {
                templateName = name;
            }
            else if (prop.Name == "Count" && prop.TryGetInt(out int val))
            {
                hasCount = true;
                count = val;
            }
        }

        if (string.IsNullOrEmpty(templateName))
        {
            if (genderOverride.HasValue)
                return new TextResolutionParams { GenderOverride = genderOverride };
            return default;
        }

        if (hasCount)
        {
            return new TextResolutionParams
            {
                GenderOverride = genderOverride,
                Plural = new PluralArg(templateName, count),
            };
        }

        return new TextResolutionParams
        {
            GenderOverride = genderOverride,
            Args = new[] { Arg.String(templateName, "TESTING") },
        };
    }
    #endregion

    #region Runner Listener
    public Awaitable OnConversationEnter(ConversationRef conversation, CancellationToken token)
    {
        return AwaitableUtility.Completed();
    }

    public Awaitable OnConversationExit(ConversationRef conversation, CancellationToken token)
    {
        for (int i = m_HistoryContent.transform.childCount - 1; i >= 0; i--)
        {
            Destroy(m_HistoryContent.transform.GetChild(i).gameObject);
        }
        m_OnComplete(this);
        return AwaitableUtility.Completed();
    }

    public Awaitable OnNodeEnter(NodeRef node, CancellationToken token)
    {
        return AwaitableUtility.Completed();
    }

    public async Awaitable OnSpeech(NodeRef node, string voiceText, CancellationToken token)
    {
        if (!string.IsNullOrEmpty(voiceText))
        {
            GameObject historyItemGO = Instantiate(m_HistoryItemPrefab);
            HistoryItemUI historyItem = historyItemGO.GetComponent<HistoryItemUI>();
            ActorRef actor = node.Actor;
            string actorName = actor.LocalizedName ?? actor.Name ?? "<Actor Missing>";
            historyItem.SetVoiceText(voiceText);
            historyItem.SetActorName(actorName);
            historyItemGO.transform.SetParent(m_HistoryContent.transform);
            await Awaitable.WaitForSecondsAsync(ReadTimeSeconds, token);
        }
    }

    public async Awaitable<ChoiceRef> OnDecision(
        IReadOnlyList<ChoiceRef> choices,
        CancellationToken token
    )
    {
        // Check if already cancelled before doing any work
        if (token.IsCancellationRequested)
            throw new OperationCanceledException(token);

        // Store choices so button handlers can reference by index (no closure allocation)
        m_CurrentChoices.Clear();
        for (int i = 0; i < choices.Count; i++)
        {
            m_CurrentChoices.Add(choices[i]);
        }

        // Present choices to the player
        for (int i = 0; i < choices.Count; i++)
        {
            ChoiceRef choice = choices[i];
            GameObject choiceGO = Instantiate(m_ChoiceItemPrefab);
            ChoiceUI choiceUI = choiceGO.GetComponent<ChoiceUI>();
            string buttonText = choice.UIResponseText ?? "";
            choiceUI.SetButtonText(buttonText);
            choiceUI.RegisterButtonHandler(OnChoiceSelected, i);
            choiceGO.transform.SetParent(m_ChoiceContent.transform);
        }

        try
        {
            // Await player choice. OnConversationCancelled will call TrySetCanceled() if cancelled.
            return await m_DecisionSource.Awaitable;
        }
        finally
        {
            // Always reset, whether completed normally or cancelled
            m_DecisionSource.Reset();
            m_CurrentChoices.Clear();
        }
    }

    void OnChoiceSelected(int choiceIndex)
    {
        if (choiceIndex >= 0 && choiceIndex < m_CurrentChoices.Count)
        {
            m_DecisionSource.TrySetResult(m_CurrentChoices[choiceIndex]);
        }
    }

    public Awaitable OnNodeExit(NodeRef currentNode, CancellationToken token)
    {
        for (int i = m_ChoiceContent.transform.childCount - 1; i >= 0; i--)
        {
            Destroy(m_ChoiceContent.transform.GetChild(i).gameObject);
        }
        return AwaitableUtility.Completed();
    }

    public Awaitable OnConversationCancelled(ConversationRef conversation)
    {
        // Unblock any pending decision
        m_DecisionSource.TrySetCanceled();

        // Clean up UI when conversation is forcibly stopped
        for (int i = m_HistoryContent.transform.childCount - 1; i >= 0; i--)
        {
            Destroy(m_HistoryContent.transform.GetChild(i).gameObject);
        }
        for (int i = m_ChoiceContent.transform.childCount - 1; i >= 0; i--)
        {
            Destroy(m_ChoiceContent.transform.GetChild(i).gameObject);
        }

        // Could add fade-out animation here:
        // await FadeOutUIAsync();

        return AwaitableUtility.Completed();
    }

    public Awaitable OnError(ConversationRef conversation, Exception e)
    {
        Debug.LogException(e);

        // Could show error UI here:
        // await ShowErrorMessageAsync(e.Message);

        return AwaitableUtility.Completed();
    }

    public Awaitable OnCleanup(ConversationRef conversation)
    {
        // No cleanup needed for this simple UI
        return AwaitableUtility.Completed();
    }
    #endregion
}
