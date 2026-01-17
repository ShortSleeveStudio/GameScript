#ifndef GAMESCRIPT_REGISTER_TYPES_H
#define GAMESCRIPT_REGISTER_TYPES_H

#include <godot_cpp/core/class_db.hpp>

using namespace godot;

void initialize_gamescript_module(ModuleInitializationLevel p_level);
void uninitialize_gamescript_module(ModuleInitializationLevel p_level);

#endif // GAMESCRIPT_REGISTER_TYPES_H
