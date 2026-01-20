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
    AwaitableCompletionSource<NodeRef> m_DecisionSource = new();
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

    public async Awaitable OnSpeech(NodeRef node, CancellationToken token)
    {
        string voiceText = node.VoiceText;
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

    public async Awaitable<NodeRef> OnDecision(IReadOnlyList<NodeRef> choices, CancellationToken token)
    {
        // Check if already cancelled before doing any work
        if (token.IsCancellationRequested)
            throw new OperationCanceledException(token);

        // Present choices to the player
        for (int i = 0; i < choices.Count; i++)
        {
            NodeRef node = choices[i];
            GameObject choiceGO = Instantiate(m_ChoiceItemPrefab);
            ChoiceUI choiceUI = choiceGO.GetComponent<ChoiceUI>();
            string buttonText = node.UIResponseText ?? "";
            choiceUI.SetButtonText(buttonText);
            choiceUI.RegisterButtonHandler(() =>
            {
                m_DecisionSource.TrySetResult(node);
            });
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

    public void OnError(ConversationRef conversation, Exception e) => Debug.LogException(e);

    public void OnConversationCancelled(ConversationRef conversation)
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
    }

    public void OnCleanup(ConversationRef conversation)
    {
        // No cleanup needed for this simple UI
    }
    #endregion
}
