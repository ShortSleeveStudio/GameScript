using System;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class ChoiceUI : MonoBehaviour
{
    #region Inspector Variables
    [SerializeField]
    private Button m_Button;

    [SerializeField]
    private TextMeshProUGUI m_ButtonText;
    #endregion

    #region State
    Action<int> m_Handler;
    int m_Index;
    #endregion

    #region API
    public void SetButtonText(string text) => m_ButtonText.text = text;

    public void RegisterButtonHandler(Action<int> handler, int index)
    {
        m_Handler = handler;
        m_Index = index;
        m_Button.onClick.AddListener(InvokeHandler);
    }
    #endregion

    #region Handlers
    void InvokeHandler() => m_Handler?.Invoke(m_Index);
    #endregion
}
