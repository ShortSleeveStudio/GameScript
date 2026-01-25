#include "Attributes.h"

// Global registries
TArray<FNodeConditionRegistration*> GConditionRegistrations;
TArray<FNodeActionRegistration*> GActionRegistrations;

FNodeConditionRegistration::FNodeConditionRegistration(int32 InNodeId, ConditionDelegate InFunction)
	: NodeId(InNodeId)
	, Function(InFunction)
{
	// Register at static initialization time
	GConditionRegistrations.Add(this);
}

FNodeActionRegistration::FNodeActionRegistration(int32 InNodeId, ActionDelegate InFunction)
	: NodeId(InNodeId)
	, Function(InFunction)
{
	// Register at static initialization time
	GActionRegistrations.Add(this);
}
