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
    private GameScriptRunner m_GameScriptRunner;

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
        await m_GameScriptRunner.Initialize(destroyCancellationToken);
        PopulateDropdowns();
    }

    private void PopulateDropdowns()
    {
        Snapshot snapshot = m_GameScriptRunner.Database.Snapshot;
        Manifest manifest = m_GameScriptRunner.Database.Manifest;

        // Load Conversation Options
        List<TMP_Dropdown.OptionData> conversationOptions = new();
        m_ConversationDropdown.ClearOptions();
        for (int i = 0; i < snapshot.Conversations.Count; i++)
        {
            Conversation conv = snapshot.Conversations[i];
            conversationOptions.Add(new TMP_Dropdown.OptionData(conv.Name));
        }
        m_ConversationDropdown.AddOptions(conversationOptions);

        // Load Locale Options
        List<TMP_Dropdown.OptionData> localeOptions = new();
        m_LocaleDropdown.ClearOptions();
        for (int i = 0; i < manifest.Locales.Length; i++)
        {
            ManifestLocale locale = manifest.Locales[i];
            string displayName = !string.IsNullOrEmpty(locale.LocalizedName)
                ? locale.LocalizedName
                : locale.Name;
            localeOptions.Add(new TMP_Dropdown.OptionData(displayName));
        }
        m_LocaleDropdown.AddOptions(localeOptions);

        // Set dropdown to current locale
        int currentLocaleIndex = FindLocaleDropdownIndex(m_GameScriptRunner.Database.CurrentLocale);
        if (currentLocaleIndex >= 0)
        {
            m_LocaleDropdown.SetValueWithoutNotify(currentLocaleIndex);
        }
    }

    private int FindLocaleDropdownIndex(ManifestLocale locale)
    {
        if (locale == null) return -1;
        Manifest manifest = m_GameScriptRunner.Database.Manifest;
        for (int i = 0; i < manifest.Locales.Length; i++)
        {
            if (manifest.Locales[i].Id == locale.Id)
                return i;
        }
        return -1;
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
        conversationUI.Initialize(m_GameScriptRunner, conversationIndex, OnConversationFinished);
    }

    public async void OnLocaleSelected()
    {
        ManifestLocale locale = m_GameScriptRunner.Database.Manifest.Locales[m_LocaleDropdown.value];
        await m_GameScriptRunner.Database.ChangeLocale(locale, destroyCancellationToken);
    }

    public void OnConversationFinished(ConversationUI conversationUI)
    {
        Destroy(conversationUI.gameObject);
    }
    #endregion
}
