using System.Collections;
using System.Collections.Generic;
using GameScript;
using TMPro;
using UnityEditor;
using UnityEngine;

public class Tester : MonoBehaviour
{
    #region Inspector Variables
    [SerializeField]
    private GameObject m_ConversationPrefab;

    [SerializeField]
    private GameObject m_ConversationContent;

    [SerializeField]
    private TMP_Dropdown m_ConversationDropdown;

    [SerializeField]
    private TMP_Dropdown m_LocaleDropdown;

    [SerializeField]
    private TesterSettings m_TestSettings;

    [SerializeField]
    private ConversationReference[] m_ConversationReferences;

    [SerializeField]
    private LocaleReference[] m_LocaleReferences;

    [SerializeField]
    private GameScriptRunner m_GameScriptRunner;
    #endregion

    #region Editor
#if UNITY_EDITOR
    private void OnValidate()
    {
        string[] localeGUIDs = AssetDatabase.FindAssets("t: LocaleReference");
        m_LocaleReferences = new LocaleReference[localeGUIDs.Length];
        for (int i = 0; i < localeGUIDs.Length; i++)
        {
            m_LocaleReferences[i] = AssetDatabase.LoadAssetAtPath<LocaleReference>(
                AssetDatabase.GUIDToAssetPath(localeGUIDs[i])
            );
        }
        string[] conversationGUIDs = AssetDatabase.FindAssets("t: ConversationReference");
        m_ConversationReferences = new ConversationReference[conversationGUIDs.Length];
        for (int i = 0; i < conversationGUIDs.Length; i++)
        {
            m_ConversationReferences[i] = AssetDatabase.LoadAssetAtPath<ConversationReference>(
                AssetDatabase.GUIDToAssetPath(conversationGUIDs[i])
            );
        }
    }
#endif
    #endregion

    #region Unity Lifecycle Methods
    private void Awake()
    {
        // Load Conversation Options
        List<TMP_Dropdown.OptionData> conversationOptions = new();
        m_ConversationDropdown.ClearOptions();
        for (int i = 0; i < m_ConversationReferences.Length; i++)
        {
            conversationOptions.Add(new TMP_Dropdown.OptionData(m_ConversationReferences[i].name));
        }
        m_ConversationDropdown.AddOptions(conversationOptions);

        // Load Locale Options
        List<TMP_Dropdown.OptionData> localeOptions = new();
        m_LocaleDropdown.ClearOptions();
        for (int i = 0; i < m_LocaleReferences.Length; i++)
        {
            localeOptions.Add(new TMP_Dropdown.OptionData(m_LocaleReferences[i].name));
        }
        m_LocaleDropdown.AddOptions(localeOptions);
    }

    private async void Start()
    {
        await m_GameScriptRunner.Initialize(destroyCancellationToken);
    }
    #endregion

    #region Handlers
    public void OnStartPressed()
    {
        ConversationReference conversation = m_ConversationReferences[m_ConversationDropdown.value];
        uint conversationId = conversation.Id;

        // Add Conversation to UI
        GameObject newConversationUI = Instantiate(m_ConversationPrefab);
        newConversationUI.transform.SetParent(m_ConversationContent.transform);
        ConversationUI conversationUI = newConversationUI.GetComponent<ConversationUI>();
        conversationUI.Initialize(m_GameScriptRunner, conversationId, OnConversationFinished);
    }

    public void OnLocaleSelected()
    {
        LocaleReference locale = m_LocaleReferences[m_LocaleDropdown.value];
        m_TestSettings.CurrentLocale = m_GameScriptRunner.Database.FindLocale(locale.Id);
    }

    public void OnConversationFinished(ConversationUI conversationUI)
    {
        Destroy(conversationUI.gameObject);
    }
    #endregion
}
