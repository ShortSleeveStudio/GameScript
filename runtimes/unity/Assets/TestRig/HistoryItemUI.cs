using TMPro;
using UnityEngine;

public class HistoryItemUI : MonoBehaviour
{
    #region Inspector Variables
    [SerializeField]
    private TextMeshProUGUI m_ActorText;

    [SerializeField]
    private TextMeshProUGUI m_VoiceText;
    #endregion

    #region API
    public void SetActorName(string actorName) => m_ActorText.text = actorName;

    public void SetVoiceText(string voiceText) => m_VoiceText.text = voiceText;
    #endregion
}
