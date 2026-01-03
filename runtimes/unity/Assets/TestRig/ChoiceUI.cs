using TMPro;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.UI;

public class ChoiceUI : MonoBehaviour
{
    #region Inspector Variables
    [SerializeField]
    private Button m_Button;

    [SerializeField]
    private TextMeshProUGUI m_ButtonText;
    #endregion

    #region API
    public void SetButtonText(string text) => m_ButtonText.text = text;

    public void RegisterButtonHandler(UnityAction onButtonPress) =>
        m_Button.onClick.AddListener(onButtonPress);
    #endregion
}
