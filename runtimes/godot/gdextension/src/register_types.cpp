#include "register_types.h"

#include <gdextension_interface.h>
#include <godot_cpp/core/defs.hpp>
#include <godot_cpp/godot.hpp>

#include "game_script_manifest.h"
#include "game_script_database.h"
#include "refs/locale_ref.h"
#include "refs/conversation_ref.h"
#include "refs/node_ref.h"
#include "refs/actor_ref.h"
#include "refs/edge_ref.h"
#include "refs/localization_ref.h"
#include "refs/property_ref.h"

using namespace godot;

void initialize_gamescript_module(ModuleInitializationLevel p_level) {
    if (p_level != MODULE_INITIALIZATION_LEVEL_SCENE) {
        return;
    }

    // Register classes
    ClassDB::register_class<GameScriptManifest>();
    ClassDB::register_class<GameScriptDatabase>();
    ClassDB::register_class<LocaleRef>();
    ClassDB::register_class<ConversationRef>();
    ClassDB::register_class<NodeRef>();
    ClassDB::register_class<ActorRef>();
    ClassDB::register_class<EdgeRef>();
    ClassDB::register_class<LocalizationRef>();
    ClassDB::register_class<NodePropertyRef>();
    ClassDB::register_class<ConversationPropertyRef>();
}

void uninitialize_gamescript_module(ModuleInitializationLevel p_level) {
    if (p_level != MODULE_INITIALIZATION_LEVEL_SCENE) {
        return;
    }

    // Cleanup if needed
}

extern "C" {
    // GDExtension entry point
    GDExtensionBool GDE_EXPORT gamescript_library_init(
        GDExtensionInterfaceGetProcAddress p_get_proc_address,
        const GDExtensionClassLibraryPtr p_library,
        GDExtensionInitialization *r_initialization
    ) {
        godot::GDExtensionBinding::InitObject init_obj(p_get_proc_address, p_library, r_initialization);

        init_obj.register_initializer(initialize_gamescript_module);
        init_obj.register_terminator(uninitialize_gamescript_module);
        init_obj.set_minimum_library_initialization_level(MODULE_INITIALIZATION_LEVEL_SCENE);

        return init_obj.init();
    }
}
