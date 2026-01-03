using System;
using System.Collections.Generic;
using GameScript;
using UnityEngine;
using UnityEngine.UI;

public class ConversationUI : MonoBehaviour, IGameScriptListener
{
    #region Constants
    private const int k_ReadTimeMillis = 1000;
    #endregion

    #region Inspector Variables
    [SerializeField]
    private GameObject m_HistoryContent;

    [SerializeField]
    private GameObject m_HistoryItemPrefab;

    [SerializeField]
    private GameObject m_ChoiceContent;

    [SerializeField]
    private GameObject m_ChoiceItemPrefab;

    [SerializeField]
    private ScrollRect m_HistoryScrollRect;
    #endregion

    #region State
    private Action<ConversationUI> m_OnComplete;
    private ActiveConversation m_ActiveConversation;
    private GameScriptRunner m_GameScriptRunner;
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
    public void OnConversationEnter(ConversationRef conversation, ReadyNotifier readyNotifier)
    {
        readyNotifier.OnReady();
    }

    public void OnConversationExit(ConversationRef conversation, ReadyNotifier readyNotifier)
    {
        for (int i = m_HistoryContent.transform.childCount - 1; i >= 0; i--)
        {
            Destroy(m_HistoryContent.transform.GetChild(i).gameObject);
        }
        readyNotifier.OnReady();
        m_OnComplete(this);
    }

    public void OnNodeExit(IReadOnlyList<NodeRef> choices, DecisionNotifier decisionNotifier)
    {
        for (int i = 0; i < choices.Count; i++)
        {
            NodeRef node = choices[i];
            GameObject choiceGO = Instantiate(m_ChoiceItemPrefab);
            ChoiceUI choiceUI = choiceGO.GetComponent<ChoiceUI>();
            string buttonText = node.UIResponseText ?? "";
            choiceUI.SetButtonText(buttonText);
            choiceUI.RegisterButtonHandler(() =>
            {
                decisionNotifier.OnDecisionMade(node);
            });
            choiceGO.transform.SetParent(m_ChoiceContent.transform);
        }
    }

    public void OnNodeEnter(NodeRef node, ReadyNotifier readyNotifier)
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
            Delay(k_ReadTimeMillis, readyNotifier);
        }
        else
        {
            readyNotifier.OnReady();
        }
    }

    public void OnNodeExit(NodeRef currentNode, ReadyNotifier readyNotifier)
    {
        for (int i = m_ChoiceContent.transform.childCount - 1; i >= 0; i--)
        {
            Destroy(m_ChoiceContent.transform.GetChild(i).gameObject);
        }
        readyNotifier.OnReady();
    }

    public void OnError(ConversationRef conversation, Exception e) => Debug.LogException(e);
    #endregion

    #region Helpers
    private async void Delay(int millis, ReadyNotifier readyNotifier)
    {
        await Awaitable.WaitForSecondsAsync(millis / 1000f);
        readyNotifier.OnReady();
    }
    #endregion
}
