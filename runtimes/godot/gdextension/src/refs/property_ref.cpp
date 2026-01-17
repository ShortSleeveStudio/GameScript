#include "property_ref.h"
#include "../game_script_database.h"

namespace godot {

// ============================================================================
// NodePropertyRef
// ============================================================================

void NodePropertyRef::_bind_methods() {
    ClassDB::bind_method(D_METHOD("get_name"), &NodePropertyRef::get_name);
    ClassDB::bind_method(D_METHOD("get_type"), &NodePropertyRef::get_type);
    ClassDB::bind_method(D_METHOD("get_string_value"), &NodePropertyRef::get_string_value);
    ClassDB::bind_method(D_METHOD("get_int_value"), &NodePropertyRef::get_int_value);
    ClassDB::bind_method(D_METHOD("get_float_value"), &NodePropertyRef::get_float_value);
    ClassDB::bind_method(D_METHOD("get_bool_value"), &NodePropertyRef::get_bool_value);
    ClassDB::bind_method(D_METHOD("is_valid"), &NodePropertyRef::is_valid);

    ADD_PROPERTY(PropertyInfo(Variant::STRING, "name"), "", "get_name");
    ADD_PROPERTY(PropertyInfo(Variant::INT, "type"), "", "get_type");

    // Property type constants
    ClassDB::bind_integer_constant(get_class_static(), "", "PROPERTY_TYPE_STRING", PROPERTY_TYPE_STRING);
    ClassDB::bind_integer_constant(get_class_static(), "", "PROPERTY_TYPE_INTEGER", PROPERTY_TYPE_INTEGER);
    ClassDB::bind_integer_constant(get_class_static(), "", "PROPERTY_TYPE_DECIMAL", PROPERTY_TYPE_DECIMAL);
    ClassDB::bind_integer_constant(get_class_static(), "", "PROPERTY_TYPE_BOOLEAN", PROPERTY_TYPE_BOOLEAN);
}

NodePropertyRef::NodePropertyRef() : _database(nullptr), _node_index(-1), _property_index(-1) {
}

NodePropertyRef::~NodePropertyRef() {
}

void NodePropertyRef::_init(GameScriptDatabase* database, int node_index, int property_index) {
    _database = database;
    _node_index = node_index;
    _property_index = property_index;
}

const GameScript::NodeProperty* NodePropertyRef::_get_property() const {
    if (!is_valid()) return nullptr;
    const auto* snapshot = _database->get_snapshot();
    const auto* node = snapshot->nodes()->Get(_node_index);
    if (!node || !node->properties()) return nullptr;
    return node->properties()->Get(_property_index);
}

const GameScript::PropertyTemplate* NodePropertyRef::_get_template() const {
    const auto* prop = _get_property();
    if (!prop) return nullptr;

    int template_idx = prop->template_idx();
    const auto* snapshot = _database->get_snapshot();
    if (!snapshot->property_templates() ||
        template_idx < 0 || template_idx >= static_cast<int>(snapshot->property_templates()->size())) {
        return nullptr;
    }
    return snapshot->property_templates()->Get(template_idx);
}

String NodePropertyRef::get_name() const {
    const auto* templ = _get_template();
    if (!templ || !templ->name()) return String();
    return String::utf8(templ->name()->c_str());
}

int NodePropertyRef::get_type() const {
    const auto* templ = _get_template();
    return templ ? static_cast<int>(templ->type()) : 0;
}

String NodePropertyRef::get_string_value() const {
    const auto* prop = _get_property();
    if (!prop || prop->value_type() != GameScript::PropertyValue_string_val) return String();

    const auto* str = prop->value_as_string_val();
    if (!str) return String();
    return String::utf8(str->c_str());
}

int NodePropertyRef::get_int_value() const {
    const auto* prop = _get_property();
    if (!prop || prop->value_type() != GameScript::PropertyValue_int_val) return 0;

    const auto* val = prop->value_as_int_val();
    return val ? val->value() : 0;
}

float NodePropertyRef::get_float_value() const {
    const auto* prop = _get_property();
    if (!prop || prop->value_type() != GameScript::PropertyValue_decimal_val) return 0.0f;

    const auto* val = prop->value_as_decimal_val();
    return val ? val->value() : 0.0f;
}

bool NodePropertyRef::get_bool_value() const {
    const auto* prop = _get_property();
    if (!prop || prop->value_type() != GameScript::PropertyValue_bool_val) return false;

    const auto* val = prop->value_as_bool_val();
    return val ? val->value() : false;
}

bool NodePropertyRef::try_get_string(String& out_value) const {
    const auto* prop = _get_property();
    if (!prop || prop->value_type() != GameScript::PropertyValue_string_val) return false;

    const auto* str = prop->value_as_string_val();
    if (!str) return false;
    out_value = String::utf8(str->c_str());
    return true;
}

bool NodePropertyRef::try_get_int(int& out_value) const {
    const auto* prop = _get_property();
    if (!prop || prop->value_type() != GameScript::PropertyValue_int_val) return false;

    const auto* val = prop->value_as_int_val();
    if (!val) return false;
    out_value = val->value();
    return true;
}

bool NodePropertyRef::try_get_float(float& out_value) const {
    const auto* prop = _get_property();
    if (!prop || prop->value_type() != GameScript::PropertyValue_decimal_val) return false;

    const auto* val = prop->value_as_decimal_val();
    if (!val) return false;
    out_value = val->value();
    return true;
}

bool NodePropertyRef::try_get_bool(bool& out_value) const {
    const auto* prop = _get_property();
    if (!prop || prop->value_type() != GameScript::PropertyValue_bool_val) return false;

    const auto* val = prop->value_as_bool_val();
    if (!val) return false;
    out_value = val->value();
    return true;
}

bool NodePropertyRef::is_valid() const {
    return _database != nullptr && _node_index >= 0 && _property_index >= 0 &&
           _database->get_snapshot() != nullptr;
}

// ============================================================================
// ConversationPropertyRef
// ============================================================================

void ConversationPropertyRef::_bind_methods() {
    ClassDB::bind_method(D_METHOD("get_name"), &ConversationPropertyRef::get_name);
    ClassDB::bind_method(D_METHOD("get_type"), &ConversationPropertyRef::get_type);
    ClassDB::bind_method(D_METHOD("get_string_value"), &ConversationPropertyRef::get_string_value);
    ClassDB::bind_method(D_METHOD("get_int_value"), &ConversationPropertyRef::get_int_value);
    ClassDB::bind_method(D_METHOD("get_float_value"), &ConversationPropertyRef::get_float_value);
    ClassDB::bind_method(D_METHOD("get_bool_value"), &ConversationPropertyRef::get_bool_value);
    ClassDB::bind_method(D_METHOD("is_valid"), &ConversationPropertyRef::is_valid);

    ADD_PROPERTY(PropertyInfo(Variant::STRING, "name"), "", "get_name");
    ADD_PROPERTY(PropertyInfo(Variant::INT, "type"), "", "get_type");

    // Property type constants
    ClassDB::bind_integer_constant(get_class_static(), "", "PROPERTY_TYPE_STRING", PROPERTY_TYPE_STRING);
    ClassDB::bind_integer_constant(get_class_static(), "", "PROPERTY_TYPE_INTEGER", PROPERTY_TYPE_INTEGER);
    ClassDB::bind_integer_constant(get_class_static(), "", "PROPERTY_TYPE_DECIMAL", PROPERTY_TYPE_DECIMAL);
    ClassDB::bind_integer_constant(get_class_static(), "", "PROPERTY_TYPE_BOOLEAN", PROPERTY_TYPE_BOOLEAN);
}

ConversationPropertyRef::ConversationPropertyRef()
    : _database(nullptr), _conversation_index(-1), _property_index(-1) {
}

ConversationPropertyRef::~ConversationPropertyRef() {
}

void ConversationPropertyRef::_init(GameScriptDatabase* database, int conversation_index, int property_index) {
    _database = database;
    _conversation_index = conversation_index;
    _property_index = property_index;
}

const GameScript::ConversationProperty* ConversationPropertyRef::_get_property() const {
    if (!is_valid()) return nullptr;
    const auto* snapshot = _database->get_snapshot();
    const auto* conv = snapshot->conversations()->Get(_conversation_index);
    if (!conv || !conv->properties()) return nullptr;
    return conv->properties()->Get(_property_index);
}

const GameScript::PropertyTemplate* ConversationPropertyRef::_get_template() const {
    const auto* prop = _get_property();
    if (!prop) return nullptr;

    int template_idx = prop->template_idx();
    const auto* snapshot = _database->get_snapshot();
    if (!snapshot->property_templates() ||
        template_idx < 0 || template_idx >= static_cast<int>(snapshot->property_templates()->size())) {
        return nullptr;
    }
    return snapshot->property_templates()->Get(template_idx);
}

String ConversationPropertyRef::get_name() const {
    const auto* templ = _get_template();
    if (!templ || !templ->name()) return String();
    return String::utf8(templ->name()->c_str());
}

int ConversationPropertyRef::get_type() const {
    const auto* templ = _get_template();
    return templ ? static_cast<int>(templ->type()) : 0;
}

String ConversationPropertyRef::get_string_value() const {
    const auto* prop = _get_property();
    if (!prop || prop->value_type() != GameScript::PropertyValue_string_val) return String();

    const auto* str = prop->value_as_string_val();
    if (!str) return String();
    return String::utf8(str->c_str());
}

int ConversationPropertyRef::get_int_value() const {
    const auto* prop = _get_property();
    if (!prop || prop->value_type() != GameScript::PropertyValue_int_val) return 0;

    const auto* val = prop->value_as_int_val();
    return val ? val->value() : 0;
}

float ConversationPropertyRef::get_float_value() const {
    const auto* prop = _get_property();
    if (!prop || prop->value_type() != GameScript::PropertyValue_decimal_val) return 0.0f;

    const auto* val = prop->value_as_decimal_val();
    return val ? val->value() : 0.0f;
}

bool ConversationPropertyRef::get_bool_value() const {
    const auto* prop = _get_property();
    if (!prop || prop->value_type() != GameScript::PropertyValue_bool_val) return false;

    const auto* val = prop->value_as_bool_val();
    return val ? val->value() : false;
}

bool ConversationPropertyRef::try_get_string(String& out_value) const {
    const auto* prop = _get_property();
    if (!prop || prop->value_type() != GameScript::PropertyValue_string_val) return false;

    const auto* str = prop->value_as_string_val();
    if (!str) return false;
    out_value = String::utf8(str->c_str());
    return true;
}

bool ConversationPropertyRef::try_get_int(int& out_value) const {
    const auto* prop = _get_property();
    if (!prop || prop->value_type() != GameScript::PropertyValue_int_val) return false;

    const auto* val = prop->value_as_int_val();
    if (!val) return false;
    out_value = val->value();
    return true;
}

bool ConversationPropertyRef::try_get_float(float& out_value) const {
    const auto* prop = _get_property();
    if (!prop || prop->value_type() != GameScript::PropertyValue_decimal_val) return false;

    const auto* val = prop->value_as_decimal_val();
    if (!val) return false;
    out_value = val->value();
    return true;
}

bool ConversationPropertyRef::try_get_bool(bool& out_value) const {
    const auto* prop = _get_property();
    if (!prop || prop->value_type() != GameScript::PropertyValue_bool_val) return false;

    const auto* val = prop->value_as_bool_val();
    if (!val) return false;
    out_value = val->value();
    return true;
}

bool ConversationPropertyRef::is_valid() const {
    return _database != nullptr && _conversation_index >= 0 && _property_index >= 0 &&
           _database->get_snapshot() != nullptr;
}

} // namespace godot
