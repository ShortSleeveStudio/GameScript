package com.shortsleevestudio.gamescript.settings

import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage
import com.intellij.openapi.project.Project

/**
 * Persistent settings for GameScript.
 * Stores database connection config and editor preferences.
 */
@Service(Service.Level.PROJECT)
@State(
    name = "GameScriptSettings",
    storages = [Storage("gamescript.xml")]
)
class GameScriptSettings : PersistentStateComponent<GameScriptSettings.State> {

    data class State(
        var lastDatabaseType: String? = null,
        var lastSqlitePath: String? = null,
        var lastPostgresHost: String? = null,
        var lastPostgresPort: Int = 5432,
        var lastPostgresDatabase: String? = null,
        var lastPostgresUser: String? = null,
        var codeOutputPath: String = "Assets/Scripts/Dialogue",
        var snapshotOutputPath: String? = null,
        var autoExportEnabled: Boolean = true
    )

    private var myState = State()

    override fun getState(): State = myState

    override fun loadState(state: State) {
        myState = state
    }

    companion object {
        fun getInstance(project: Project): GameScriptSettings =
            project.getService(GameScriptSettings::class.java)
    }
}
