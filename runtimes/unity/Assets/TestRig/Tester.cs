using System.Collections.Generic;
using GameScript;
using TMPro;
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
    private GameScriptBehaviour m_GameScriptBehaviour;

    [SerializeField]
    private LocaleId m_LocaleId;

    [SerializeField]
    private ConversationId m_ConversationId;

    [SerializeField]
    private ActorId m_ActorId;

    [SerializeField]
    private LocalizationId m_LocalizationId;
    #endregion

    #region Unity Lifecycle Methods
    private async void Start()
    {
        await m_GameScriptBehaviour.Initialize(destroyCancellationToken);
        PopulateDropdowns();
    }

    private void PopulateDropdowns()
    {
        GameScriptDatabase database = m_GameScriptBehaviour.Database;

        // Load Conversation Options
        List<TMP_Dropdown.OptionData> conversationOptions = new();
        m_ConversationDropdown.ClearOptions();
        int conversationCount = database.ConversationCount;
        for (int i = 0; i < conversationCount; i++)
        {
            ConversationRef conv = database.GetConversation(i);
            conversationOptions.Add(new TMP_Dropdown.OptionData(conv.Name));
        }
        m_ConversationDropdown.AddOptions(conversationOptions);

        // Load Locale Options
        List<TMP_Dropdown.OptionData> localeOptions = new();
        m_LocaleDropdown.ClearOptions();
        int localeCount = database.LocaleCount;
        for (int i = 0; i < localeCount; i++)
        {
            LocaleRef locale = database.GetLocale(i);
            string displayName = !string.IsNullOrEmpty(locale.LocalizedName)
                ? locale.LocalizedName
                : locale.Name;
            localeOptions.Add(new TMP_Dropdown.OptionData(displayName));
        }
        m_LocaleDropdown.AddOptions(localeOptions);

        // Set dropdown to current locale
        m_LocaleDropdown.SetValueWithoutNotify(database.CurrentLocale.Index);
    }
    #endregion

    #region Handlers
    public void OnStartPressed()
    {
        int conversationIndex = m_ConversationDropdown.value;

        // Add Conversation to UI
        GameObject newConversationUI = Instantiate(m_ConversationPrefab);
        newConversationUI.transform.SetParent(m_ConversationContent.transform);
        ConversationUI conversationUI = newConversationUI.GetComponent<ConversationUI>();
        conversationUI.Initialize(m_GameScriptBehaviour.Runner, conversationIndex, OnConversationFinished);
    }

    public async void OnLocaleSelected()
    {
        LocaleRef locale = m_GameScriptBehaviour.Database.GetLocale(m_LocaleDropdown.value);
        await m_GameScriptBehaviour.Database.ChangeLocale(locale, destroyCancellationToken);
    }

    public void OnConversationFinished(ConversationUI conversationUI)
    {
        Destroy(conversationUI.gameObject);
    }
    #endregion
}
