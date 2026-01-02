using System;
using System.Collections.Generic;
using System.Threading.Tasks;
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

    [SerializeField]
    private TesterSettings m_TestSettings;
    #endregion

    #region State
    private Action<ConversationUI> m_OnComplete;
    private ActiveConversation m_ActiveConversation;
    private GameScriptRunner m_GameScriptRunner;
    #endregion

    #region Initialization
    public void Initialize(
        GameScriptRunner runner,
        uint conversationId,
        Action<ConversationUI> onComplete
    )
    {
        m_GameScriptRunner = runner;
        m_OnComplete = onComplete;
        m_ActiveConversation = m_GameScriptRunner.StartConversation(conversationId, this);
    }
    #endregion

    #region Handlers
    public void Stop()
    {
        m_GameScriptRunner.StopConversation(m_ActiveConversation);
        m_OnComplete(this);
    }
    #endregion

    #region Runner Listerner
    public void OnConversationEnter(Conversation conversation, ReadyNotifier readyNotifier)
    {
        readyNotifier.OnReady();
    }

    public void OnConversationExit(Conversation conversation, ReadyNotifier readyNotifier)
    {
        for (int i = m_HistoryContent.transform.childCount - 1; i >= 0; i--)
        {
            Destroy(m_HistoryContent.transform.GetChild(i).gameObject);
        }
        readyNotifier.OnReady();
        m_OnComplete(this);
    }

    public void OnNodeExit(List<Node> nodes, DecisionNotifier decisionNotifier)
    {
        for (int i = 0; i < nodes.Count; i++)
        {
            Node node = nodes[i];
            GameObject choiceGO = Instantiate(m_ChoiceItemPrefab);
            ChoiceUI choiceUI = choiceGO.GetComponent<ChoiceUI>();
            string buttonText = "";
            if (node.UIResponseText != null)
                buttonText = node.UIResponseText.GetLocalization(m_TestSettings.CurrentLocale);
            choiceUI.SetButtonText(buttonText);
            choiceUI.RegisterButtonHandler(() =>
            {
                decisionNotifier.OnDecisionMade(node);
            });
            choiceGO.transform.SetParent(m_ChoiceContent.transform);
        }
    }

    public void OnNodeEnter(Node node, ReadyNotifier readyNotifier)
    {
        if (node.VoiceText != null)
        {
            GameObject historyItemGO = Instantiate(m_HistoryItemPrefab);
            HistoryItemUI historyItem = historyItemGO.GetComponent<HistoryItemUI>();
            string actorName =
                node.Actor.LocalizedName != null
                    ? node.Actor.LocalizedName.GetLocalization(m_TestSettings.CurrentLocale)
                    : "<Player Name Missing>";
            string voiceText = node.VoiceText.GetLocalization(m_TestSettings.CurrentLocale);
            historyItem.SetVoiceText(voiceText);
            historyItem.SetActorName(actorName);
            historyItemGO.transform.SetParent(m_HistoryContent.transform);
            Delay(k_ReadTimeMillis, readyNotifier);
        }
        else
            readyNotifier.OnReady();
    }

    public void OnNodeExit(Node node, ReadyNotifier readyNotifier)
    {
        for (int i = m_ChoiceContent.transform.childCount - 1; i >= 0; i--)
        {
            Destroy(m_ChoiceContent.transform.GetChild(i).gameObject);
        }
        readyNotifier.OnReady();
    }

    public void OnError(Conversation conversation, Exception e) => Debug.LogException(e);
    #endregion

    #region Helpers
    private async void Delay(int millis, ReadyNotifier readyNotifier)
    {
        await Task.Delay(millis);
        readyNotifier.OnReady();
    }
    #endregion
}
